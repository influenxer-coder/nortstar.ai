import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { analyzeAgent } from '@/lib/analyze-agent'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, url, github_repo, posthog_api_key, posthog_project_id, target_element, main_kpi, project_id, goal')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch GitHub token (stored by GitHub OAuth flow)
  const { data: ctx } = await supabase
    .from('user_context')
    .select('value')
    .eq('user_id', user.id)
    .eq('context_type', 'github')
    .eq('key', 'access_token')
    .single()
  const githubToken = ctx?.value ?? null

  // Run analysis asynchronously — service role so Supabase writes work without cookies
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as any

  waitUntil(analyzeAgent(serviceSupabase, params.id, agent, githubToken))

  return NextResponse.json({ ok: true, started: true })
}
