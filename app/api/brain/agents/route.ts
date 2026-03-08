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

// GET /api/brain/agents — all agents across all users with hypothesis counts + last_active
export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const supabase = serviceClient()

  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, name, url, status, main_kpi, created_at, user_id, context_summary')
    .neq('status', 'draft')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!agents || agents.length === 0) return NextResponse.json([])

  const agentIds = agents.map(a => a.id)

  // Fetch hypothesis counts + most recent updated_at per agent in parallel with logs
  const [{ data: hypRows }, { data: logRows }] = await Promise.all([
    supabase
      .from('agent_hypotheses')
      .select('agent_id, status, updated_at')
      .in('agent_id', agentIds),
    supabase
      .from('agent_logs')
      .select('agent_id, created_at')
      .in('agent_id', agentIds)
      .order('created_at', { ascending: false }),
  ])

  // Fetch owner emails
  const userIds = Array.from(new Set(agents.map(a => a.user_id)))
  const emailMap: Record<string, string> = {}
  for (const uid of userIds) {
    const { data } = await supabase.auth.admin.getUserById(uid)
    if (data?.user?.email) emailMap[uid] = data.user.email
  }

  // Aggregate hypothesis counts + latest hypothesis activity per agent
  const hypCounts: Record<string, Record<string, number>> = {}
  const hypLatest: Record<string, string> = {}
  for (const h of hypRows ?? []) {
    if (!hypCounts[h.agent_id]) hypCounts[h.agent_id] = {}
    hypCounts[h.agent_id][h.status] = (hypCounts[h.agent_id][h.status] ?? 0) + 1
    if (!hypLatest[h.agent_id] || h.updated_at > hypLatest[h.agent_id]) {
      hypLatest[h.agent_id] = h.updated_at
    }
  }

  // Most recent log per agent
  const logLatest: Record<string, string> = {}
  for (const l of logRows ?? []) {
    if (!logLatest[l.agent_id]) logLatest[l.agent_id] = l.created_at
  }

  // Per-user last_active = max timestamp across all their agents (created, log, hyp update)
  const userLastActive: Record<string, string> = {}
  for (const a of agents) {
    const candidates = [a.created_at, logLatest[a.id], hypLatest[a.id]].filter(Boolean) as string[]
    const latest = candidates.sort().at(-1)!
    if (!userLastActive[a.user_id] || latest > userLastActive[a.user_id]) {
      userLastActive[a.user_id] = latest
    }
  }

  const result = agents.map(a => ({
    ...a,
    owner_email: emailMap[a.user_id] ?? a.user_id,
    hypotheses: hypCounts[a.id] ?? {},
    last_active: userLastActive[a.user_id] ?? a.created_at,
  }))

  return NextResponse.json(result)
}
