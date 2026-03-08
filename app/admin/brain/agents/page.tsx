'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface AgentRow {
  id: string
  name: string
  url: string | null
  status: string | null
  main_kpi: string | null
  owner_email: string
  created_at: string
  last_active: string
  hypotheses: Record<string, number>
}

const STATUS_COLORS: Record<string, string> = {
  Active: 'text-emerald-400',
  Analyzing: 'text-yellow-400',
  Error: 'text-red-400',
}

function daysAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days}d ago`
}

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/brain/agents')
      .then(r => r.json())
      .then(data => { setAgents(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  // Deduplicate by owner for last_active display
  const ownerLastActive: Record<string, string> = {}
  for (const a of agents) {
    if (!ownerLastActive[a.owner_email] || a.last_active > ownerLastActive[a.owner_email]) {
      ownerLastActive[a.owner_email] = a.last_active
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">All Agents</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">{agents.length} agents across all users</span>
          <Link
            href="/dashboard/agents/new"
            className="px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors"
          >
            + New agent
          </Link>
        </div>
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950 sticky top-0">
            <tr>
              {['Owner', 'Last active', 'Agent', 'URL', 'KPI', 'Status', 'Hypotheses', ''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs uppercase text-zinc-500 tracking-wider font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-600 text-sm">Loading…</td>
              </tr>
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-600 text-sm">No agents yet.</td>
              </tr>
            ) : agents.map(agent => {
              const total = Object.values(agent.hypotheses).reduce((a, b) => a + b, 0)
              const accepted = agent.hypotheses['accepted'] ?? 0
              const rejected = agent.hypotheses['rejected'] ?? 0
              const proposed = agent.hypotheses['proposed'] ?? 0
              return (
                <tr key={agent.id} className="border-t border-zinc-800 hover:bg-zinc-900/30">
                  <td className="px-4 py-3 text-zinc-400 text-xs max-w-[140px] truncate">{agent.owner_email}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`${
                      ownerLastActive[agent.owner_email] &&
                      Date.now() - new Date(ownerLastActive[agent.owner_email]).getTime() < 1000 * 60 * 60 * 24 * 3
                        ? 'text-emerald-400'
                        : 'text-zinc-500'
                    }`}>
                      {daysAgo(agent.last_active)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-100 font-medium">{agent.name}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs max-w-[140px] truncate">
                    {agent.url ? (
                      <a href={agent.url} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300">
                        {agent.url.replace(/^https?:\/\//, '')}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs max-w-[110px] truncate">{agent.main_kpi ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${STATUS_COLORS[agent.status ?? ''] ?? 'text-zinc-500'}`}>
                      {agent.status ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {total === 0 ? (
                      <span className="text-zinc-600 text-xs">none</span>
                    ) : (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-400">{total}</span>
                        {accepted > 0 && <span className="text-emerald-400">✓{accepted}</span>}
                        {rejected > 0 && <span className="text-red-400">✗{rejected}</span>}
                        {proposed > 0 && <span className="text-zinc-500">◇{proposed}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/brain/agents/${agent.id}`} className="text-xs text-violet-400 hover:text-violet-300">
                      View →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
