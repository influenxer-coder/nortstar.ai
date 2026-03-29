import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')
  const type = searchParams.get('type')
  const agentGoal = searchParams.get('goal')

  let query = supabase
    .from('agents')
    .select('id, user_id, product_id, project_id, name, url, github_repo, posthog_api_key, posthog_project_id, target_element, status, created_at, main_kpi, type, goal, google_drive_roadmap_url')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (projectId) query = query.eq('project_id', projectId)
  if (type) query = query.eq('type', type)
  if (agentGoal) query = query.eq('goal', agentGoal)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Wrap in { agents: [...] } when filtered, return flat array for backwards compat when unfiltered
  if (projectId || type || agentGoal) {
    return NextResponse.json({ agents: data ?? [] })
  }
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    name?: string
    product_id?: string | null
    project_id?: string | null
    url?: string
    github_repo?: string
    posthog_api_key?: string
    posthog_project_id?: string
    analytics_config?: Record<string, unknown>
    target_element?: { type: string; text: string; position?: Record<string, number> }
    status?: string
    step?: number
    type?: string
    goal?: string
    main_kpi?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const product_id = body.product_id != null && typeof body.product_id === 'string' ? body.product_id.trim() || null : null
  const url = typeof body.url === 'string' ? body.url.trim() : ''
  const github_repo = typeof body.github_repo === 'string' ? body.github_repo.trim() : null
  const analytics_config = body.analytics_config && typeof body.analytics_config === 'object' ? body.analytics_config : null
  // Prefer explicit posthog fields; fall back to analytics_config.posthog for agents created via the creation flow
  const phConfig = (analytics_config as Record<string, Record<string, string>> | null)?.posthog
  const posthog_api_key = typeof body.posthog_api_key === 'string'
    ? body.posthog_api_key.trim()
    : (phConfig?.api_key ?? null)
  const posthog_project_id = typeof body.posthog_project_id === 'string'
    ? body.posthog_project_id.trim()
    : (phConfig?.project_id ?? null)
  const target_element = body.target_element && typeof body.target_element === 'object'
    ? body.target_element
    : null
  const status = body.status === 'draft' ? 'draft' : 'Analyzing'
  const step = typeof body.step === 'number' ? body.step : 0
  const type = body.type === 'page_optimization' ? 'page_optimization' : 'agent'
  const agentGoal = typeof body.goal === 'string' ? body.goal.trim() : null
  const project_id = body.project_id != null && typeof body.project_id === 'string' ? body.project_id.trim() || null : null
  const main_kpi = typeof body.main_kpi === 'string' ? body.main_kpi.trim() : 'Conversion'

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('agents')
    .insert({
      user_id: user.id,
      product_id: product_id || null,
      name,
      url: url || null,
      github_repo,
      posthog_api_key,
      posthog_project_id,
      target_element,
      status,
      step,
      type,
      goal: agentGoal,
      project_id,
      main_kpi,
      analytics_config,
      google_drive_roadmap_url: null,
    })
    .select('id, name, url, status, step, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
