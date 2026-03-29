import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── Provider query interfaces ───────────────────────────────────────────────

type AnalyticsResult = {
  available: boolean
  provider: string
  page_url: string
  pathname: string
  period: string
  total_pageviews: number
  top_clicks: { element_text: string; tag_name: string; click_count: number; pct: number }[]
  top_navigation: { next_page: string; nav_count: number }[]
}

// ── PostHog ─────────────────────────────────────────────────────────────────

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

async function fetchPostHog(apiKey: string, projectId: string, pathname: string): Promise<Omit<AnalyticsResult, 'available' | 'provider' | 'page_url' | 'period'>> {
  const clicksQuery = `
    SELECT properties.$el_text AS element_text, properties.tag_name AS tag_name, count() AS click_count
    FROM events
    WHERE event = '$autocapture'
      AND properties.$current_url LIKE '%${pathname}%'
      AND timestamp > now() - interval 30 day
      AND properties.$el_text != ''
    GROUP BY element_text, tag_name
    ORDER BY click_count DESC
    LIMIT 15`

  const navQuery = `
    SELECT properties.$pathname AS next_page, count() AS nav_count
    FROM events
    WHERE event = '$pageview'
      AND properties.$referrer LIKE '%${pathname}%'
      AND properties.$pathname != '${pathname}'
      AND timestamp > now() - interval 30 day
    GROUP BY next_page
    ORDER BY nav_count DESC
    LIMIT 10`

  const pvQuery = `
    SELECT count() AS total_views
    FROM events
    WHERE event = '$pageview'
      AND properties.$pathname = '${pathname}'
      AND timestamp > now() - interval 30 day`

  const [clicks, navigation, pageviews] = await Promise.all([
    queryPostHog(apiKey, projectId, clicksQuery),
    queryPostHog(apiKey, projectId, navQuery),
    queryPostHog(apiKey, projectId, pvQuery),
  ])

  const topClicks = (clicks ?? []).map(row => ({
    element_text: String(row[0] ?? ''), tag_name: String(row[1] ?? ''), click_count: Number(row[2] ?? 0),
  })).filter(c => c.element_text.trim())

  const maxClicks = topClicks[0]?.click_count ?? 1

  return {
    pathname,
    total_pageviews: Number(pageviews?.[0]?.[0] ?? 0),
    top_clicks: topClicks.map(c => ({ ...c, pct: Math.round((c.click_count / maxClicks) * 100) })),
    top_navigation: (navigation ?? []).map(row => ({
      next_page: String(row[0] ?? ''), nav_count: Number(row[1] ?? 0),
    })).filter(n => n.next_page.trim()),
  }
}

// ── Mixpanel ────────────────────────────────────────────────────────────────

async function fetchMixpanel(projectToken: string, pathname: string): Promise<Omit<AnalyticsResult, 'available' | 'provider' | 'page_url' | 'period'>> {
  // Mixpanel JQL / Insights API requires a service account or API secret.
  // projectToken is the client-side token — can query the Export API for raw events.
  // For now, try the Insights API with the token as basic auth.
  const topClicks: AnalyticsResult['top_clicks'] = []
  const topNavigation: AnalyticsResult['top_navigation'] = []
  let totalPageviews = 0

  try {
    // Query top events on this page via Mixpanel Insights API
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]

    // Top events segmented by element text for this page
    const res = await fetch(
      `https://data.mixpanel.com/api/2.0/export?from_date=${thirtyDaysAgo}&to_date=${today}&event=["$web_event"]&where=properties["$current_url"] has "${pathname}"&limit=5000`,
      {
        headers: { Authorization: `Basic ${Buffer.from(`${projectToken}:`).toString('base64')}` },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (res.ok) {
      const text = await res.text()
      const lines = text.split('\n').filter(l => l.trim())
      const clickCounts: Record<string, number> = {}
      const navCounts: Record<string, number> = {}

      for (const line of lines) {
        try {
          const event = JSON.parse(line) as { event: string; properties: Record<string, string> }
          const elText = event.properties?.['$el_text'] ?? ''
          const currentPath = event.properties?.['$current_url'] ?? ''

          if (currentPath.includes(pathname)) {
            totalPageviews++
            if (elText) clickCounts[elText] = (clickCounts[elText] ?? 0) + 1
          }

          // Navigation: pageviews that came from our page
          if (event.event === 'Page View' || event.event === '$mp_web_page_view') {
            const refPath = event.properties?.['$referrer'] ?? ''
            const destPath = event.properties?.['$current_url'] ?? ''
            if (refPath.includes(pathname) && !destPath.includes(pathname)) {
              try { const p = new URL(destPath).pathname; navCounts[p] = (navCounts[p] ?? 0) + 1 } catch { /* */ }
            }
          }
        } catch { /* skip bad lines */ }
      }

      const sorted = Object.entries(clickCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)
      const maxC = sorted[0]?.[1] ?? 1
      for (const [text, count] of sorted) {
        topClicks.push({ element_text: text, tag_name: '', click_count: count, pct: Math.round((count / maxC) * 100) })
      }
      for (const [page, count] of Object.entries(navCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
        topNavigation.push({ next_page: page, nav_count: count })
      }
    }
  } catch { /* Mixpanel query failed, return empty */ }

  return { pathname, total_pageviews: totalPageviews, top_clicks: topClicks, top_navigation: topNavigation }
}

// ── Google Analytics (GA4) ──────────────────────────────────────────────────

async function fetchGA4(measurementId: string, pathname: string): Promise<Omit<AnalyticsResult, 'available' | 'provider' | 'page_url' | 'period'>> {
  // GA4 Data API requires OAuth or service account credentials.
  // measurementId (G-XXXXX) alone cannot query data.
  // Return a placeholder indicating GA4 was detected but can't be queried yet.
  return {
    pathname,
    total_pageviews: 0,
    top_clicks: [],
    top_navigation: [],
  }
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { page_url } = await req.json() as { page_url?: string }
  if (!page_url) return NextResponse.json({ error: 'page_url required' }, { status: 400 })

  let pathname = '/'
  try { pathname = new URL(page_url).pathname } catch { /* */ }

  // Find analytics credentials — check agents and projects
  const { data: agents } = await supabase
    .from('agents')
    .select('posthog_api_key, posthog_project_id, analytics_config')
    .eq('user_id', user.id)
    .limit(20)

  // Try PostHog first (most common, richest data)
  const phAgent = agents?.find(a => a.posthog_api_key && a.posthog_project_id)
  if (phAgent?.posthog_api_key && phAgent?.posthog_project_id) {
    const data = await fetchPostHog(phAgent.posthog_api_key as string, phAgent.posthog_project_id as string, pathname)
    return NextResponse.json({
      available: true, provider: 'posthog', page_url, period: '30d', ...data,
    })
  }

  // Try Mixpanel
  const mxAgent = agents?.find(a => {
    const config = (a.analytics_config ?? {}) as Record<string, Record<string, string>>
    return config.mixpanel?.project_token
  })
  if (mxAgent) {
    const config = (mxAgent.analytics_config as Record<string, Record<string, string>>)
    const token = config.mixpanel?.project_token
    if (token) {
      const data = await fetchMixpanel(token, pathname)
      return NextResponse.json({
        available: true, provider: 'mixpanel', page_url, period: '30d', ...data,
      })
    }
  }

  // Try GA4 (limited — needs OAuth, can only report detection)
  const gaAgent = agents?.find(a => {
    const config = (a.analytics_config ?? {}) as Record<string, Record<string, string>>
    return config.ga4?.measurement_id
  })
  if (gaAgent) {
    const config = (gaAgent.analytics_config as Record<string, Record<string, string>>)
    const measurementId = config.ga4?.measurement_id
    if (measurementId) {
      const data = await fetchGA4(measurementId, pathname)
      return NextResponse.json({
        available: true, provider: 'ga4', page_url, period: '30d', ...data,
        note: 'GA4 detected but requires OAuth service account for data access. Connect in settings.',
      })
    }
  }

  return NextResponse.json({ available: false, reason: 'No analytics credentials found' })
}
