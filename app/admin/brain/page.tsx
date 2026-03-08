'use client'

import { useEffect, useState } from 'react'

interface Stats {
  knowledge_base: number
  learning_events: number
  skill_weights: number
  top_patterns: Array<{
    vertical: string
    page_type: string
    pattern: string
    confidence: number
    sample_size: number
  }>
}

export default function BrainDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/brain/stats')
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-zinc-500 text-sm">Loading…</div>
  }

  if (!stats) {
    return <div className="text-red-400 text-sm">Failed to load stats.</div>
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold text-white mb-6">Brain Dashboard</h1>

      {/* Counters */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Knowledge chunks', value: stats.knowledge_base },
          { label: 'Learning events', value: stats.learning_events },
          { label: 'Skill weights', value: stats.skill_weights },
        ].map(({ label, value }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
            <p className="text-sm text-zinc-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Top patterns */}
      <h2 className="text-sm font-semibold uppercase text-zinc-500 tracking-wider mb-3">
        Top 10 patterns by confidence
      </h2>
      {stats.top_patterns.length === 0 ? (
        <p className="text-zinc-600 text-sm">No patterns yet. Accept or reject hypotheses to start learning.</p>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950">
              <tr>
                {['Vertical', 'Page type', 'Pattern', 'Confidence', 'n'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs uppercase text-zinc-500 tracking-wider font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.top_patterns.map((p, i) => (
                <tr key={i} className="border-t border-zinc-800 hover:bg-zinc-900/30">
                  <td className="px-4 py-2.5 text-zinc-400">{p.vertical}</td>
                  <td className="px-4 py-2.5 text-zinc-400">{p.page_type}</td>
                  <td className="px-4 py-2.5 text-zinc-200 max-w-xs truncate">{p.pattern}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-violet-400 font-medium">{(p.confidence * 100).toFixed(0)}%</span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500">{p.sample_size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
