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
    .select('id, name, url, github_repo, posthog_api_key, posthog_project_id, target_element, status, step, created_at')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    name?: string
    url?: string
    github_repo?: string
    posthog_api_key?: string
    posthog_project_id?: string
    target_element?: { type: string; text: string; position: Record<string, number> }
    status?: string
    step?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only include fields that were explicitly provided
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.name === 'string') update.name = body.name.trim()
  if (typeof body.url === 'string') update.url = body.url.trim() || null
  if ('github_repo' in body) update.github_repo = typeof body.github_repo === 'string' ? body.github_repo.trim() : null
  if ('posthog_api_key' in body) update.posthog_api_key = typeof body.posthog_api_key === 'string' ? body.posthog_api_key.trim() : null
  if ('posthog_project_id' in body) update.posthog_project_id = typeof body.posthog_project_id === 'string' ? body.posthog_project_id.trim() : null
  if ('target_element' in body) update.target_element = body.target_element ?? null
  if (typeof body.step === 'number') update.step = body.step
  if (typeof body.status === 'string') update.status = body.status

  const { data, error } = await supabase
    .from('agents')
    .update(update)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('id, name, url, status, step, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
