import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('agents')
    .select('id, product_id, name, url, github_repo, posthog_api_key, posthog_project_id, target_element, analytics_config, status, step, slack_team_id, slack_user_id, slack_channel_id, system_instructions, context_summary, created_at')
    .eq('id', (await params).id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    target_element?: { type: string; text: string; position: Record<string, number> }
    analytics_config?: Record<string, Record<string, string>>
    status?: string
    step?: number
    slack_bot_token?: string | null
    slack_team_id?: string | null
    slack_user_id?: string | null
    slack_channel_id?: string | null
    system_instructions?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id } = await params

  // Only include fields that were explicitly provided
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.name === 'string') update.name = body.name.trim()
  if ('product_id' in body) update.product_id = body.product_id != null && typeof body.product_id === 'string' ? body.product_id.trim() || null : null
  if (typeof body.url === 'string') update.url = body.url.trim() || null
  if ('github_repo' in body) update.github_repo = typeof body.github_repo === 'string' ? body.github_repo.trim() : null
  if ('posthog_api_key' in body) update.posthog_api_key = typeof body.posthog_api_key === 'string' ? body.posthog_api_key.trim() : null
  if ('posthog_project_id' in body) update.posthog_project_id = typeof body.posthog_project_id === 'string' ? body.posthog_project_id.trim() : null
  if ('target_element' in body) update.target_element = body.target_element ?? null
  if ('analytics_config' in body) {
    update.analytics_config = body.analytics_config ?? null
    // Also promote PostHog credentials to dedicated columns for backward compat
    const phConfig = body.analytics_config?.posthog
    if (phConfig) {
      if (phConfig.api_key) update.posthog_api_key = phConfig.api_key
      if (phConfig.project_id) update.posthog_project_id = phConfig.project_id
    }
  }
  if (typeof body.step === 'number') update.step = body.step
  if (typeof body.status === 'string') update.status = body.status
  if ('slack_bot_token' in body) update.slack_bot_token = body.slack_bot_token ?? null
  if ('slack_team_id' in body) update.slack_team_id = body.slack_team_id ?? null
  if ('slack_user_id' in body) update.slack_user_id = body.slack_user_id ?? null
  if ('slack_channel_id' in body) update.slack_channel_id = body.slack_channel_id ?? null
  if ('system_instructions' in body) update.system_instructions = body.system_instructions ?? null

  const { data, error } = await supabase
    .from('agents')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, url, status, step, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
