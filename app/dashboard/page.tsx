import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardHome from './DashboardHome'
import type { ProductWithAgents, UngroupedAgents } from './DashboardHome'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || user.email?.split('@')[0] || 'User'

  const [{ data: products }, { data: agents }, { data: inProgressProjects }, { data: completedProjects }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('agents')
      .select('id, name, status, url, product_id')
      .eq('user_id', user.id)
      .neq('status', 'draft')
      .order('created_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, name, onboarding_step, updated_at')
      .eq('user_id', user.id)
      .eq('onboarding_completed', false)
      .order('updated_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, strategy_json')
      .eq('user_id', user.id)
      .eq('onboarding_completed', true),
  ])

  const productList = products ?? []
  const agentList = agents ?? []

  const agentsByProduct = new Map<string, { id: string; name: string; status: string | null; url: string | null }[]>()
  const ungrouped: UngroupedAgents = []

  for (const agent of agentList) {
    const row = {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      url: agent.url ?? null,
    }
    if (agent.product_id) {
      const list = agentsByProduct.get(agent.product_id) ?? []
      list.push(row)
      agentsByProduct.set(agent.product_id, list)
    } else {
      ungrouped.push(row)
    }
  }

  // Build map: products.id → projects.id (via strategy_json.onboarding_context.created_product_id)
  const projectIdByProductId = new Map<string, string>()
  for (const proj of completedProjects ?? []) {
    const ctx = ((proj.strategy_json as Record<string, unknown>)?.onboarding_context as Record<string, unknown> | undefined)
    const createdProductId = ctx?.created_product_id
    if (typeof createdProductId === 'string' && createdProductId) {
      projectIdByProductId.set(createdProductId, proj.id)
    }
  }

  const productsWithAgents: ProductWithAgents[] = productList.map((p) => ({
    id: p.id,
    name: p.name,
    created_at: p.created_at,
    agents: agentsByProduct.get(p.id) ?? [],
    projectId: projectIdByProductId.get(p.id) ?? null,
  }))

  return (
    <DashboardHome
      products={productsWithAgents}
      ungroupedAgents={ungrouped}
      userDisplayName={displayName}
      dbInProgressProjects={inProgressProjects ?? []}
    />
  )
}
