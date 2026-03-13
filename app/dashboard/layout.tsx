import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogOut, Sparkles } from 'lucide-react'
import { Logo } from '@/components/logo'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebarNav } from '@/components/DashboardSidebarNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (profile && !profile.onboarding_completed) redirect('/onboarding')

  const [{ data: products }, { data: agents }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('agents')
      .select('id, name, status, product_id')
      .eq('user_id', user.id)
      .neq('status', 'draft')
      .order('created_at', { ascending: false }),
  ])

  const productList = products ?? []
  const agentList = agents ?? []
  const agentsByProduct = new Map<string, { id: string; name: string; status: string | null }[]>()
  const ungrouped: { id: string; name: string; status: string | null }[] = []

  for (const agent of agentList) {
    const stub = { id: agent.id, name: agent.name, status: agent.status }
    if (agent.product_id) {
      const list = agentsByProduct.get(agent.product_id) ?? []
      list.push(stub)
      agentsByProduct.set(agent.product_id, list)
    } else {
      ungrouped.push(stub)
    }
  }

  const productGroups = productList.map((p) => ({
    id: p.id,
    name: p.name,
    agents: agentsByProduct.get(p.id) ?? [],
  }))

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || user.email?.split('@')[0] || 'User'
  const initial = displayName.charAt(0).toUpperCase()
  const email = profile?.email ?? user.email ?? ''

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <aside className="flex w-14 shrink-0 flex-col border-r border-zinc-900 py-4 md:w-56">
        <div className="mb-6 px-3 md:px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-[10px] rounded-md py-1.5 px-1 transition-colors hover:bg-zinc-900"
          >
            <Logo size={28} className="shrink-0" />
            <span className="hidden font-medium text-zinc-100 text-sm tracking-[0.05em] md:block font-sans">NorthStar</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-2">
          {/* SuperAgent — admin only */}
          {user.email === process.env.ADMIN_EMAIL && (
            <Link
              href="/admin/brain"
              className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-violet-400 transition-colors hover:bg-violet-950/50 hover:text-violet-300 group mb-1"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="hidden flex-1 md:block font-medium">SuperAgent</span>
            </Link>
          )}
          <DashboardSidebarNav products={productGroups} ungroupedAgents={ungrouped} />
        </nav>

        <div className="mt-4 space-y-1 border-t border-zinc-900 px-2 pt-4">
          <div className="flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-zinc-900 cursor-default">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white">
              {initial}
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-xs font-medium text-zinc-300">{displayName}</p>
              <p className="truncate text-[10px] text-zinc-600">{email}</p>
            </div>
          </div>
          <Link
            href="/auth/signout"
            className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-900 hover:text-zinc-400"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:block">Sign out</span>
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  )
}
