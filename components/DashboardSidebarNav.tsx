'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Plus, Trash2, LayoutDashboard, FolderOpen, Bot, ChevronRight, Lightbulb } from 'lucide-react'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { getProductMeta, faviconUrl } from '@/lib/product-meta'

const AgentNavSection = dynamic(() => import('./AgentNavSection'), { ssr: false })

export type AgentStub = { id: string; name: string; status: string | null }

type ProductGroup = {
  id: string
  name: string
  agents: AgentStub[]
  projectId?: string | null
  goal?: string | null
  productUrl?: string | null
}

type Props = {
  products: ProductGroup[]
  ungroupedAgents: AgentStub[]
}

// ── Agent tree node (row + collapsible sub-nav) ────────────────────────────────

function AgentTreeNode({ agent, isActive }: { agent: AgentStub; isActive: boolean }) {
  const [treeOpen, setTreeOpen] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Hydrate from localStorage (mount-only to avoid SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`ns_tree_${agent.id}_open`)
      if (stored !== null) setTreeOpen(stored !== 'false')
    } catch {}
  }, [agent.id])

  const toggleTree = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const next = !treeOpen
    setTreeOpen(next)
    try { localStorage.setItem(`ns_tree_${agent.id}_open`, String(next)) } catch {}
  }

  const handleDelete = async () => {
    setDeleting(true)
    await fetch(`/api/agents/${agent.id}`, { method: 'DELETE' })
    setDeleting(false)
    setConfirming(false)
    if (pathname.includes(agent.id)) router.push('/dashboard')
    router.refresh()
  }

  return (
    <div>
      {/* Agent row */}
      <div className="group relative flex items-center gap-0.5">

        {/* Collapse chevron — visible only when active */}
        <button
          onClick={toggleTree}
          className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ visibility: isActive ? 'visible' : 'hidden' }}
          title={treeOpen ? 'Collapse' : 'Expand'}
        >
          <ChevronRight
            style={{
              width: 10, height: 10, color: '#555',
              transition: 'transform 0.15s',
              transform: (isActive && treeOpen) ? 'rotate(90deg)' : 'none',
            }}
          />
        </button>

        {/* Agent name link */}
        <Link
          href={`/dashboard/agents/${agent.id}`}
          onClick={() => setConfirming(false)}
          className={`flex-1 flex items-center gap-2 pl-1 pr-2 rounded-md transition-colors min-w-0 ${
            isActive ? 'bg-accent' : 'hover:bg-muted'
          }`}
          style={{ height: 28 }}
        >
          <div
            className={`w-4 h-4 rounded shrink-0 flex items-center justify-center text-[9px] font-bold ${
              isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {agent.name.charAt(0).toUpperCase()}
          </div>
          <span
            className="hidden md:block truncate"
            style={{ fontSize: 13, fontWeight: 500, color: isActive ? '#1f2328' : '#535963' }}
          >
            {agent.name}
          </span>
        </Link>

        {/* Delete */}
        <div className="hidden md:flex items-center shrink-0 pr-1">
          {confirming ? (
            <>
              <button onClick={handleDelete} disabled={deleting}
                className="text-[10px] font-medium text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded bg-red-500/10 disabled:opacity-50">
                {deleting ? '…' : 'Delete'}
              </button>
              <button onClick={() => setConfirming(false)}
                className="text-[10px] text-muted-foreground hover:text-foreground px-1">
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={e => { e.preventDefault(); setConfirming(true) }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-muted transition-all"
              title="Delete agent"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Collapsible sub-nav tree */}
      {isActive && treeOpen && <AgentNavSection agentId={agent.id} />}
    </div>
  )
}

// ── Sidebar nav ────────────────────────────────────────────────────────────────

export function DashboardSidebarNav({ products, ungroupedAgents }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function startGoalSelection(product: ProductGroup) {
    if (!product.projectId) return
    try {
      const res = await fetch(`/api/projects/${product.projectId}`)
      if (!res.ok) throw new Error('Could not load project')
      const project = await res.json() as { id: string; strategy_json?: Record<string, unknown> }
      const strategy = (project.strategy_json ?? {}) as Record<string, unknown>
      const match = (strategy.match as Record<string, unknown> | undefined) ?? {}
      const ctx = (strategy.onboarding_context as Record<string, unknown> | undefined) ?? {}

      localStorage.setItem('northstar_onboarding', JSON.stringify({
        project_id: product.projectId,
        created_product_id: product.id,
        url: product.productUrl ?? ctx.url ?? null,
        subvertical_id: ctx.subvertical_id ?? match.subvertical_id ?? null,
        subvertical_name: ctx.subvertical_name ?? product.name ?? null,
        vertical_name: ctx.vertical_name ?? match.vertical_name ?? null,
        selected_competitors: ctx.selected_competitors ?? [],
        analysis_result: {
          ...(strategy as Record<string, unknown>),
        },
        goal: product.goal ?? ctx.goal ?? null,
        onboarding_step: 3,
        timestamp: Date.now(),
      }))

      router.push('/onboarding/goal')
    } catch {
      router.push('/dashboard')
    }
  }

  return (
    <div className="space-y-1">
      {/* Home */}
      <Link
        href="/dashboard"
        className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
          pathname === '/dashboard' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <LayoutDashboard className="h-4 w-4 shrink-0" />
        <span className="hidden flex-1 md:block">Home</span>
      </Link>

      {/* Products */}
      {products.map((product) => {
        const meta = getProductMeta(product.name)
        const favicon = faviconUrl(product.productUrl)
        const displayName = meta?.officialName ?? product.name
        const isActive = !!product.projectId && pathname === `/products/${product.projectId}`
        return (
        <div key={product.id} className="mt-3">
          <div className="flex items-center gap-2 px-2 py-1.5">
            {favicon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={favicon} alt={displayName} width={14} height={14} style={{ borderRadius: 3, flexShrink: 0 }} />
            ) : (
              <FolderOpen className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
            )}
            {product.projectId ? (
              <Link
                href={`/products/${product.projectId}`}
                className={`hidden text-xs font-semibold truncate md:block transition-colors ${
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {displayName}
              </Link>
            ) : (
              <span className="hidden text-xs font-medium text-muted-foreground truncate md:block">{displayName}</span>
            )}
          </div>
          <div className="mt-0.5 space-y-0.5">
            {product.projectId && product.goal && (
              <Link
                href={`/products/${product.projectId}/opportunities`}
                className={`flex items-center gap-2 pl-5 pr-2 rounded-md transition-colors ${
                  pathname === `/products/${product.projectId}/opportunities` ? 'bg-accent' : 'hover:bg-muted'
                }`}
                style={{ height: 28 }}
              >
                <Lightbulb className="h-3 w-3 shrink-0 text-amber-500" />
                <span
                  className="hidden md:block truncate"
                  style={{ fontSize: 13, fontWeight: 500, color: pathname === `/products/${product.projectId}/opportunities` ? '#1f2328' : '#535963' }}
                >
                  {product.goal}
                </span>
              </Link>
            )}
            {product.agents.map((agent) => (
              <AgentTreeNode key={agent.id} agent={agent} isActive={pathname.includes(agent.id)} />
            ))}
            <button
              type="button"
              onClick={() => void startGoalSelection(product)}
              className="flex items-center gap-2.5 rounded-md pl-6 pr-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full text-left"
              disabled={!product.projectId}
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden md:block">Track new goal</span>
            </button>
          </div>
        </div>
        )
      })}

      {/* Ungrouped agents */}
      {ungroupedAgents.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Bot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="hidden text-xs font-medium text-muted-foreground md:block">Screen Optimization Agents</span>
          </div>
          <div className="mt-0.5 space-y-0.5">
            {ungroupedAgents.map((agent) => (
              <AgentTreeNode key={agent.id} agent={agent} isActive={pathname.includes(agent.id)} />
            ))}
          </div>
        </div>
      )}

      {/* New agent */}
      <div className="mt-3 pt-2 border-t border-border">
        <button
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          type="button"
          onClick={() => {
            try {
              const id = localStorage.getItem('northstar_current_project_id')
              if (!id) { router.push('/dashboard'); return }
              router.push(`/products/${id}/opportunities`)
            } catch {
              router.push('/dashboard')
            }
          }}
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:block">Improve</span>
        </button>
      </div>
    </div>
  )
}
