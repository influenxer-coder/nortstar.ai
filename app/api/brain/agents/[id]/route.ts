import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function requireAdmin() {
  const supabase = createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!user || !adminEmail || user.email !== adminEmail) return null
  return user
}

// GET /api/brain/agents/[id] — full agent detail: agent + hypotheses + logs + learning events
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const supabase = serviceClient()

  const [
    { data: agent },
    { data: hypotheses },
    { data: logs },
    { data: events },
  ] = await Promise.all([
    supabase.from('agents').select('*').eq('id', params.id).single(),
    supabase
      .from('agent_hypotheses')
      .select('id, title, source, hypothesis, suggested_change, impact_score, status, pr_url, created_at, updated_at')
      .eq('agent_id', params.id)
      .order('impact_score', { ascending: false }),
    supabase
      .from('agent_logs')
      .select('id, step_name, message, status, created_at')
      .eq('agent_id', params.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('learning_events')
      .select('id, outcome, hypothesis_title, suggested_change, correction, pattern_extracted, created_at')
      .eq('agent_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch owner email
  const { data: ownerData } = await supabase.auth.admin.getUserById(agent.user_id)

  return NextResponse.json({
    agent: { ...agent, owner_email: ownerData?.user?.email ?? agent.user_id },
    hypotheses: hypotheses ?? [],
    logs: logs ?? [],
    learning_events: events ?? [],
  })
}
