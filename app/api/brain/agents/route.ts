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

// GET /api/brain/agents — all agents across all users with hypothesis counts
export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const supabase = serviceClient()

  // Fetch all agents with owner email from auth.users
  const { data: agents, error } = await supabase
    .from('agents')
    .select(`
      id,
      name,
      url,
      status,
      main_kpi,
      created_at,
      user_id,
      context_summary
    `)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!agents || agents.length === 0) return NextResponse.json([])

  // Fetch hypothesis counts per agent
  const agentIds = agents.map(a => a.id)
  const { data: hypRows } = await supabase
    .from('agent_hypotheses')
    .select('agent_id, status')
    .in('agent_id', agentIds)

  // Fetch owner emails from auth.users via admin API
  const userIds = [...new Set(agents.map(a => a.user_id))]
  const emailMap: Record<string, string> = {}
  for (const uid of userIds) {
    const { data } = await supabase.auth.admin.getUserById(uid)
    if (data?.user?.email) emailMap[uid] = data.user.email
  }

  // Aggregate hypothesis counts by agent
  const hypCounts: Record<string, Record<string, number>> = {}
  for (const h of hypRows ?? []) {
    if (!hypCounts[h.agent_id]) hypCounts[h.agent_id] = {}
    hypCounts[h.agent_id][h.status] = (hypCounts[h.agent_id][h.status] ?? 0) + 1
  }

  const result = agents.map(a => ({
    ...a,
    owner_email: emailMap[a.user_id] ?? a.user_id,
    hypotheses: hypCounts[a.id] ?? {},
  }))

  return NextResponse.json(result)
}
