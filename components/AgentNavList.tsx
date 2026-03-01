'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'

interface AgentStub { id: string; name: string; status: string | null }

export function AgentNavList({ agents }: { agents: AgentStub[] }) {
  const pathname = usePathname()

  return (
    <div className="mt-1 space-y-0.5">
      <Link
        href="/dashboard/agents/new"
        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden md:block">New agent</span>
      </Link>
      {agents.map(agent => {
        const isActive = pathname.includes(agent.id)
        return (
          <Link
            key={agent.id}
            href={`/dashboard/agents/${agent.id}`}
            className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors ${
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
        )
      })}
    </div>
  )
}
