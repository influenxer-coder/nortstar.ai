import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const POSTHOG_API_BASE = (
  (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com')
    .replace('us.i.posthog.com', 'us.posthog.com')
    .replace('eu.i.posthog.com', 'eu.posthog.com')
    .replace(/\/$/, '')
)

async function hogql(apiKey: string, projectId: string, sql: string): Promise<unknown[][] | null> {
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

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent } = await supabase
    .from('agents')
    .select('posthog_api_key, posthog_project_id, analytics_config, target_element, main_kpi, url')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Resolve credentials — may be in analytics_config for older agents
  const apiKey: string | null = agent.posthog_api_key
    ?? (agent.analytics_config as Record<string, Record<string, string>> | null)?.posthog?.api_key
    ?? null
  const projectId: string | null = agent.posthog_project_id
    ?? (agent.analytics_config as Record<string, Record<string, string>> | null)?.posthog?.project_id
    ?? null

  if (!apiKey || !projectId) {
    return NextResponse.json({ error: 'PostHog not connected' }, { status: 400 })
  }

  // KPI text for funnel matching
  const kpiText = (agent.target_element as { text?: string } | null)?.text ?? agent.main_kpi ?? ''

  const [summaryRows, dailyRows, eventRows, pageRows, funnelRows] = await Promise.all([
    // 1. Overall summary: sessions + unique users (last 90 days)
    hogql(apiKey, projectId,
      `SELECT count(distinct $session_id) as sessions, count(distinct distinct_id) as users
       FROM events
       WHERE timestamp > now() - interval 90 day`
    ),

    // 2. Daily sessions for sparkline (last 90 days, pageview events)
    hogql(apiKey, projectId,
      `SELECT toDate(timestamp) as day, count(distinct $session_id) as sessions
       FROM events
       WHERE timestamp > now() - interval 90 day AND event = '$pageview'
       GROUP BY day ORDER BY day ASC`
    ),

    // 3. Top custom events (exclude PostHog internals starting with $)
    hogql(apiKey, projectId,
      `SELECT event, count() as cnt, count(distinct distinct_id) as users
       FROM events
       WHERE timestamp > now() - interval 90 day AND event NOT LIKE '$%'
       GROUP BY event ORDER BY cnt DESC LIMIT 12`
    ),

    // 4. Top pages by sessions
    hogql(apiKey, projectId,
      `SELECT properties.$current_url, count(distinct $session_id) as sessions
       FROM events
       WHERE timestamp > now() - interval 90 day AND event = '$pageview'
         AND properties.$current_url IS NOT NULL
       GROUP BY properties.$current_url ORDER BY sessions DESC LIMIT 10`
    ),

    // 5. KPI funnel: sessions with any event matching the KPI target text
    kpiText
      ? hogql(apiKey, projectId,
          `SELECT
             count(distinct $session_id) as total_sessions,
             countIf(event ILIKE '%${kpiText.replace(/'/g, '')}%') as kpi_events,
             count(distinct if(event ILIKE '%${kpiText.replace(/'/g, '')}%', distinct_id, null)) as kpi_users
           FROM events
           WHERE timestamp > now() - interval 90 day`
        )
      : Promise.resolve(null),
  ])

  const summary = summaryRows?.[0] as [number, number] | undefined
  const dailySessions = (dailyRows ?? []).map(r => ({
    day: r[0] as string,
    sessions: Number(r[1]),
  }))
  const topEvents = (eventRows ?? []).map(r => ({
    event: r[0] as string,
    count: Number(r[1]),
    users: Number(r[2]),
  }))
  const topPages = (pageRows ?? []).map(r => ({
    url: r[0] as string,
    sessions: Number(r[1]),
  }))
  const funnel = funnelRows?.[0] as [number, number, number] | undefined

  return NextResponse.json({
    sessions: Number(summary?.[0] ?? 0),
    unique_users: Number(summary?.[1] ?? 0),
    daily_sessions: dailySessions,
    top_events: topEvents,
    top_pages: topPages,
    funnel: funnel
      ? { total_sessions: Number(funnel[0]), kpi_events: Number(funnel[1]), kpi_users: Number(funnel[2]), kpi_text: kpiText }
      : null,
  })
}
