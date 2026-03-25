'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface AgentStub { id: string; name: string; status: string | null }

export function AgentNavList({ agents }: { agents: AgentStub[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (agentId: string) => {
    setDeletingId(agentId)
    await fetch(`/api/agents/${agentId}`, { method: 'DELETE' })
    setDeletingId(null)
    setConfirmId(null)
    if (pathname.includes(agentId)) {
      router.push('/dashboard/agents')
    }
    router.refresh()
  }

  return (
    <div className="mt-1 space-y-0.5">
      <Link
        href="/dashboard/agents/new"
        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden md:block">Improve</span>
      </Link>
      {agents.map(agent => {
        const isActive = pathname.includes(agent.id)
        const isConfirming = confirmId === agent.id
        const isDeleting = deletingId === agent.id

        return (
          <div key={agent.id} className="group relative flex items-center">
            <Link
              href={`/dashboard/agents/${agent.id}`}
              onClick={() => setConfirmId(null)}
              className={`flex-1 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors min-w-0 ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              <div className={`w-4 h-4 rounded shrink-0 flex items-center justify-center text-[9px] font-bold ${
                isActive ? 'bg-violet-500 text-white' : 'bg-zinc-700 text-zinc-400'
              }`}>
                {agent.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:block truncate">{agent.name}</span>
            </Link>

            {/* Delete controls — desktop only */}
            <div className="hidden md:flex items-center shrink-0 pr-1">
              {isConfirming ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(agent.id)}
                    disabled={isDeleting}
                    className="text-[10px] font-medium text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? '…' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="text-[10px] text-zinc-600 hover:text-zinc-400 px-1 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={e => { e.preventDefault(); setConfirmId(agent.id) }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-all"
                  title="Delete agent"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
