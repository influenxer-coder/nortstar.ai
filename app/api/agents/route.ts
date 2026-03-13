import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('agents')
    .select('id, user_id, product_id, name, url, github_repo, posthog_api_key, posthog_project_id, target_element, status, created_at, main_kpi, google_drive_roadmap_url')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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
    url?: string
    github_repo?: string
    posthog_api_key?: string
    posthog_project_id?: string
    analytics_config?: Record<string, Record<string, string>>
    target_element?: { type: string; text: string; position: Record<string, number> }
    status?: string
    step?: number
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
  const posthog_api_key = typeof body.posthog_api_key === 'string'
    ? body.posthog_api_key.trim()
    : (analytics_config?.posthog?.api_key ?? null)
  const posthog_project_id = typeof body.posthog_project_id === 'string'
    ? body.posthog_project_id.trim()
    : (analytics_config?.posthog?.project_id ?? null)
  const target_element = body.target_element && typeof body.target_element === 'object'
    ? body.target_element
    : null
  const status = body.status === 'draft' ? 'draft' : 'Analyzing'
  const step = typeof body.step === 'number' ? body.step : 0

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
      main_kpi: 'Conversion', // legacy column; new flow uses target_element
      google_drive_roadmap_url: null,
    })
    .select('id, name, url, status, step, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
