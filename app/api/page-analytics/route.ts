import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const POSTHOG_API_BASE = (
  (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com')
    .replace('us.i.posthog.com', 'us.posthog.com')
    .replace('eu.i.posthog.com', 'eu.posthog.com')
    .replace(/\/$/, '')
)

async function queryPostHog(apiKey: string, projectId: string, sql: string): Promise<unknown[][] | null> {
  try {
    const res = await fetch(`${POSTHOG_API_BASE}/api/projects/${projectId}/query/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql } }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data.results) ? data.results : null
  } catch {
    return null
  }
}

/**
 * POST /api/page-analytics
 * Body: { page_url: string }
 *
 * Returns top clicked elements and navigation paths for the given page URL.
 * Uses PostHog credentials from the user's agents.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { page_url } = await req.json() as { page_url?: string }
  if (!page_url) return NextResponse.json({ error: 'page_url required' }, { status: 400 })

  // Find PostHog credentials from user's agents
  const { data: agents } = await supabase
    .from('agents')
    .select('posthog_api_key, posthog_project_id')
    .eq('user_id', user.id)
    .limit(20)

  const agent = agents?.find(a => a.posthog_api_key && a.posthog_project_id)
  if (!agent?.posthog_api_key || !agent?.posthog_project_id) {
    return NextResponse.json({ available: false, reason: 'No PostHog credentials found' })
  }

  const apiKey = agent.posthog_api_key as string
  const projectId = agent.posthog_project_id as string

  // Parse the URL to get the pathname for matching
  let pathname = '/'
  try {
    pathname = new URL(page_url).pathname
  } catch { /* use default */ }

  // Query 1: Top clicked elements on this page (last 30 days)
  const clicksQuery = `
    SELECT
      properties.$el_text AS element_text,
      properties.tag_name AS tag_name,
      count() AS click_count
    FROM events
    WHERE event = '$autocapture'
      AND properties.$current_url LIKE '%${pathname}%'
      AND timestamp > now() - interval 30 day
      AND properties.$el_text != ''
    GROUP BY element_text, tag_name
    ORDER BY click_count DESC
    LIMIT 15
  `

  // Query 2: Top navigation paths FROM this page (last 30 days)
  const navQuery = `
    SELECT
      properties.$pathname AS next_page,
      count() AS nav_count
    FROM events
    WHERE event = '$pageview'
      AND properties.$referrer LIKE '%${pathname}%'
      AND properties.$pathname != '${pathname}'
      AND timestamp > now() - interval 30 day
    GROUP BY next_page
    ORDER BY nav_count DESC
    LIMIT 10
  `

  // Query 3: Total pageviews for this page (last 30 days)
  const pvQuery = `
    SELECT count() AS total_views
    FROM events
    WHERE event = '$pageview'
      AND properties.$pathname = '${pathname}'
      AND timestamp > now() - interval 30 day
  `

  const [clicks, navigation, pageviews] = await Promise.all([
    queryPostHog(apiKey, projectId, clicksQuery),
    queryPostHog(apiKey, projectId, navQuery),
    queryPostHog(apiKey, projectId, pvQuery),
  ])

  const topClicks = (clicks ?? []).map(row => ({
    element_text: String(row[0] ?? ''),
    tag_name: String(row[1] ?? ''),
    click_count: Number(row[2] ?? 0),
  })).filter(c => c.element_text.trim())

  const topNavigation = (navigation ?? []).map(row => ({
    next_page: String(row[0] ?? ''),
    nav_count: Number(row[1] ?? 0),
  })).filter(n => n.next_page.trim())

  const totalPageviews = Number(pageviews?.[0]?.[0] ?? 0)

  // Calculate max for relative sizing
  const maxClicks = topClicks[0]?.click_count ?? 1

  return NextResponse.json({
    available: true,
    page_url,
    pathname,
    period: '30d',
    total_pageviews: totalPageviews,
    top_clicks: topClicks.map(c => ({
      ...c,
      pct: Math.round((c.click_count / maxClicks) * 100),
    })),
    top_navigation: topNavigation,
  })
}
