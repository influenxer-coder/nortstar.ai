'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Hypothesis {
  id: string
  title: string
  source: string
  hypothesis: string
  suggested_change: string | null
  impact_score: number
  status: string
  pr_url: string | null
  created_at: string
  updated_at: string
}

interface Log {
  id: string
  step_name: string
  message: string
  status: string
  created_at: string
}

interface LearningEvent {
  id: string
  outcome: string
  hypothesis_title: string
  suggested_change: string
  correction: string | null
  pattern_extracted: { pattern: string; framework: string } | null
  created_at: string
}

interface AgentDetail {
  agent: {
    id: string
    name: string
    url: string | null
    status: string | null
    main_kpi: string | null
    owner_email: string
    created_at: string
    context_summary: string | null
  }
  hypotheses: Hypothesis[]
  logs: Log[]
  learning_events: LearningEvent[]
}

const STATUS_BADGE: Record<string, string> = {
  proposed: 'bg-zinc-800 text-zinc-400',
  accepted: 'bg-emerald-950 text-emerald-400',
  rejected: 'bg-red-950 text-red-400',
  shipped: 'bg-violet-950 text-violet-400',
}

const LOG_STATUS_COLOR: Record<string, string> = {
  running: 'text-yellow-400',
  done: 'text-emerald-400',
  error: 'text-red-400',
}

const OUTCOME_COLOR: Record<string, string> = {
  accepted: 'text-emerald-400',
  rejected: 'text-red-400',
  corrected: 'text-yellow-400',
}

export default function AdminAgentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<AgentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'hypotheses' | 'logs' | 'learning'>('hypotheses')

  useEffect(() => {
    fetch(`/api/brain/agents/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [id])

  if (loading) return <div className="text-zinc-500 text-sm">Loading…</div>
  if (!data) return <div className="text-red-400 text-sm">Failed to load agent.</div>

  const { agent, hypotheses, logs, learning_events } = data

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-5">
        <Link href="/admin/brain/agents" className="hover:text-zinc-300">All Agents</Link>
        <span>/</span>
        <span className="text-zinc-300">{agent.name}</span>
      </div>

      {/* Agent header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">{agent.name}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{agent.owner_email}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-zinc-500">{agent.status}</span>
            <a
              href={`/dashboard/agents/${agent.id}`}
              className="px-3 py-1.5 text-xs bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 transition-colors"
            >
              Open workspace →
            </a>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">URL</p>
            {agent.url ? (
              <a href={agent.url} target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-white truncate block text-xs">
                {agent.url.replace(/^https?:\/\//, '')}
              </a>
            ) : <span className="text-zinc-600 text-xs">—</span>}
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">KPI</p>
            <p className="text-zinc-300 text-xs">{agent.main_kpi ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Created</p>
            <p className="text-zinc-300 text-xs">{new Date(agent.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        {agent.context_summary && (
          <details className="mt-4">
            <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300 select-none">Context summary</summary>
            <pre className="mt-2 text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">{agent.context_summary}</pre>
          </details>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-zinc-800">
        {([
          ['hypotheses', `Hypotheses (${hypotheses.length})`],
          ['logs', `Analysis logs (${logs.length})`],
          ['learning', `Learning events (${learning_events.length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              tab === key
                ? 'border-violet-500 text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Hypotheses tab */}
      {tab === 'hypotheses' && (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          {hypotheses.length === 0 ? (
            <p className="px-4 py-8 text-center text-zinc-600 text-sm">No hypotheses yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-950">
                <tr>
                  {['Title', 'Source', 'Impact', 'Status', 'Updated'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs uppercase text-zinc-500 tracking-wider font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hypotheses.map(h => (
                  <tr key={h.id} className="border-t border-zinc-800 hover:bg-zinc-900/30">
                    <td className="px-4 py-3 text-zinc-200 max-w-[220px]">
                      <p className="font-medium">{h.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{h.hypothesis}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{h.source}</td>
                    <td className="px-4 py-3">
                      <span className="text-violet-400">{'●'.repeat(h.impact_score)}{'○'.repeat(5 - h.impact_score)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[h.status] ?? 'bg-zinc-800 text-zinc-400'}`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">{new Date(h.updated_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Logs tab */}
      {tab === 'logs' && (
        <div className="space-y-1">
          {logs.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-8">No logs yet.</p>
          ) : logs.map(log => (
            <div key={log.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-zinc-900/30">
              <span className={`text-xs font-mono mt-0.5 shrink-0 ${LOG_STATUS_COLOR[log.status] ?? 'text-zinc-500'}`}>
                {log.status === 'running' ? '⟳' : log.status === 'done' ? '✓' : '✗'}
              </span>
              <div>
                <p className="text-xs text-zinc-300">{log.message}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">{log.step_name} · {new Date(log.created_at).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Learning events tab */}
      {tab === 'learning' && (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          {learning_events.length === 0 ? (
            <p className="px-4 py-8 text-center text-zinc-600 text-sm">No learning events yet. Accept or reject hypotheses to generate them.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-950">
                <tr>
                  {['Outcome', 'Hypothesis', 'Pattern extracted', 'Date'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs uppercase text-zinc-500 tracking-wider font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {learning_events.map(e => (
                  <tr key={e.id} className="border-t border-zinc-800 hover:bg-zinc-900/30">
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${OUTCOME_COLOR[e.outcome] ?? 'text-zinc-400'}`}>
                        {e.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[240px]">
                      <p className="text-zinc-200 text-xs font-medium">{e.hypothesis_title}</p>
                      <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{e.suggested_change}</p>
                      {e.correction && (
                        <p className="text-yellow-400 text-xs mt-0.5 italic">Correction: {e.correction}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {e.pattern_extracted ? (
                        <div>
                          <p className="text-zinc-300 text-xs">{e.pattern_extracted.pattern}</p>
                          <p className="text-zinc-600 text-[10px] mt-0.5">{e.pattern_extracted.framework}</p>
                        </div>
                      ) : <span className="text-zinc-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">{new Date(e.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
