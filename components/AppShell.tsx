import Link from 'next/link'
import { LogOut, Sparkles } from 'lucide-react'
import { Logo } from '@/components/logo'
import { DashboardSidebarNav } from '@/components/DashboardSidebarNav'
import { createClient } from '@/lib/supabase/server'

/**
 * Shared sidebar shell used by both /dashboard and /products layouts.
 * Fetches products, agents, and completed-project linkage server-side.
 */
export async function AppShell({
  children,
  adminEmail,
}: {
  children: React.ReactNode
  adminEmail?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <>{children}</>

  const [{ data: products }, { data: agents }, { data: completedProjects }] = await Promise.all([
    supabase.from('products').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('agents').select('id, name, status, product_id, type, url').eq('user_id', user.id).neq('status', 'draft').order('created_at', { ascending: false }),
    supabase.from('projects').select('id, url, strategy_json').eq('user_id', user.id).eq('onboarding_completed', true),
  ])

  const projectIdByProductId = new Map<string, string>()
  const goalByProductId = new Map<string, string>()
  for (const proj of completedProjects ?? []) {
    const ctx = ((proj.strategy_json as Record<string, unknown>)?.onboarding_context as Record<string, unknown> | undefined)
    const cpid = ctx?.created_product_id
    if (typeof cpid === 'string' && cpid) {
      projectIdByProductId.set(cpid, proj.id)
      if (typeof ctx?.goal === 'string' && ctx.goal) goalByProductId.set(cpid, ctx.goal)
    }
  }

  const agentsByProduct = new Map<string, { id: string; name: string; status: string | null; type?: string | null }[]>()
  const ungrouped: { id: string; name: string; status: string | null; type?: string | null }[] = []
  for (const agent of agents ?? []) {
    const stub = { id: agent.id, name: agent.name, status: agent.status, type: (agent as Record<string, unknown>).type as string | null }
    if (agent.product_id) {
      const list = agentsByProduct.get(agent.product_id) ?? []
      list.push(stub)
      agentsByProduct.set(agent.product_id, list)
    } else {
      ungrouped.push(stub)
    }
  }

  const urlByProductId = new Map<string, string>()
  for (const proj of completedProjects ?? []) {
    const ctx = ((proj.strategy_json as Record<string, unknown>)?.onboarding_context as Record<string, unknown> | undefined)
    const cpid = ctx?.created_product_id
    const projUrl = (proj as Record<string, unknown>).url
    if (typeof cpid === 'string' && cpid && typeof projUrl === 'string' && projUrl) {
      urlByProductId.set(cpid, projUrl)
    }
  }

  const productGroups = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    agents: agentsByProduct.get(p.id) ?? [],
    projectId: projectIdByProductId.get(p.id) ?? null,
    goal: goalByProductId.get(p.id) ?? null,
    productUrl: urlByProductId.get(p.id) ?? null,
  }))

  const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle()
  const displayName = profile?.full_name || profile?.email?.split('@')[0] || user.email?.split('@')[0] || 'User'
  const initial = displayName.charAt(0).toUpperCase()
  const email = profile?.email ?? user.email ?? ''

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-14 shrink-0 flex-col border-r border-border py-4 md:w-64">
        <div className="mb-6 px-3 md:px-4">
          <Link href="/dashboard" className="flex items-center gap-[10px] rounded-md py-1.5 px-1 transition-colors hover:bg-muted">
            <Logo size={28} className="shrink-0" />
            <span className="hidden font-medium text-foreground text-sm tracking-[0.05em] md:block font-sans">NorthStar</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-2">
          {user.email === adminEmail && (
            <Link href="/admin/brain" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-violet-400 transition-colors hover:bg-violet-950/50 hover:text-violet-300 group mb-1">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="hidden flex-1 md:block font-medium">SuperAgent</span>
            </Link>
          )}
          <DashboardSidebarNav products={productGroups} ungroupedAgents={ungrouped} />
        </nav>

        <div className="mt-4 space-y-1 border-t border-border px-2 pt-4">
          <div className="flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-muted cursor-default">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white">
              {initial}
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-xs font-medium text-foreground">{displayName}</p>
              <p className="truncate text-[10px] text-muted-foreground">{email}</p>
            </div>
          </div>
          <Link href="/auth/signout" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <LogOut className="h-4 w-4" />
            <span className="hidden md:block">Sign out</span>
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  )
}
