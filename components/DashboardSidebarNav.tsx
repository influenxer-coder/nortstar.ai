'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Plus, Trash2, LayoutDashboard, FolderOpen, Bot, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const AgentNavSection = dynamic(() => import('./AgentNavSection'), { ssr: false })

export type AgentStub = { id: string; name: string; status: string | null }

type ProductGroup = {
  id: string
  name: string
  agents: AgentStub[]
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
            isActive ? 'bg-zinc-800' : 'hover:bg-zinc-900'
          }`}
          style={{ height: 28 }}
        >
          <div
            className={`w-4 h-4 rounded shrink-0 flex items-center justify-center text-[9px] font-bold ${
              isActive ? 'bg-violet-500 text-white' : 'bg-zinc-700 text-zinc-400'
            }`}
          >
            {agent.name.charAt(0).toUpperCase()}
          </div>
          <span
            className="hidden md:block truncate"
            style={{ fontSize: 13, fontWeight: 500, color: isActive ? '#fff' : '#888' }}
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
                className="text-[10px] text-zinc-600 hover:text-zinc-400 px-1">
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={e => { e.preventDefault(); setConfirming(true) }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-all"
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

  return (
    <div className="space-y-1">
      {/* Home */}
      <Link
        href="/dashboard"
        className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
          pathname === '/dashboard' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100'
        }`}
      >
        <LayoutDashboard className="h-4 w-4 shrink-0" />
        <span className="hidden flex-1 md:block">Home</span>
      </Link>

      {/* Products */}
      {products.map((product) => (
        <div key={product.id} className="mt-3">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <span className="hidden text-xs font-medium text-zinc-400 truncate md:block">{product.name}</span>
          </div>
          <div className="mt-0.5 space-y-0.5">
            {product.agents.map((agent) => (
              <AgentTreeNode key={agent.id} agent={agent} isActive={pathname.includes(agent.id)} />
            ))}
            <Link
              href={`/dashboard/agents/new?product_id=${encodeURIComponent(product.id)}`}
              className="flex items-center gap-2.5 rounded-md pl-6 pr-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden md:block">Add agent</span>
            </Link>
          </div>
        </div>
      ))}

      {/* Ungrouped agents */}
      {ungroupedAgents.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Bot className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <span className="hidden text-xs font-medium text-zinc-400 md:block">Ungrouped</span>
          </div>
          <div className="mt-0.5 space-y-0.5">
            {ungroupedAgents.map((agent) => (
              <AgentTreeNode key={agent.id} agent={agent} isActive={pathname.includes(agent.id)} />
            ))}
          </div>
        </div>
      )}

      {/* New agent */}
      <div className="mt-3 pt-2 border-t border-zinc-900">
        <Link
          href="/dashboard/agents/new"
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:block">New agent</span>
        </Link>
      </div>
    </div>
  )
}
