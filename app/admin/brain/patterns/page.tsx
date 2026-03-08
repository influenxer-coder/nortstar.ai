'use client'

import { useEffect, useState, useCallback } from 'react'

const VERTICALS = ['b2b_saas', 'consumer', 'marketplace', 'fintech', 'universal']
const PAGE_TYPES = ['pricing', 'onboarding', 'checkout', 'landing', 'dashboard', 'feature', 'other']

interface PatternRow {
  id: string
  vertical: string
  page_type: string
  pattern: string
  confidence: number
  sample_size: number
  updated_at: string
}

export default function PatternsPage() {
  const [rows, setRows] = useState<PatternRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingConf, setEditingConf] = useState('')

  // Add-pattern form
  const [adding, setAdding] = useState(false)
  const [newVertical, setNewVertical] = useState('b2b_saas')
  const [newPageType, setNewPageType] = useState('pricing')
  const [newPattern, setNewPattern] = useState('')
  const [newConf, setNewConf] = useState('0.5')
  const [addLoading, setAddLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/brain/patterns?page=${page}`)
    const data = await res.json()
    setRows(data.rows ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [page])

  useEffect(() => { load() }, [load])

  async function saveConfidence(id: string) {
    const conf = parseFloat(editingConf)
    if (isNaN(conf) || conf < 0 || conf > 1) return
    await fetch(`/api/brain/patterns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confidence: conf }),
    })
    setRows(prev => prev.map(r => r.id === id ? { ...r, confidence: conf } : r))
    setEditingId(null)
  }

  async function deleteRow(id: string) {
    await fetch(`/api/brain/patterns/${id}`, { method: 'DELETE' })
    setRows(prev => prev.filter(r => r.id !== id))
    setTotal(t => t - 1)
  }

  async function addPattern(e: React.FormEvent) {
    e.preventDefault()
    if (!newPattern.trim()) return
    setAddLoading(true)
    const res = await fetch('/api/brain/patterns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vertical: newVertical,
        page_type: newPageType,
        pattern: newPattern,
        confidence: parseFloat(newConf) || 0.5,
      }),
    })
    if (res.ok) {
      setNewPattern('')
      setAdding(false)
      load()
    }
    setAddLoading(false)
  }

  const limit = 50
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Skill Patterns</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">{total.toLocaleString()} patterns</span>
          <button
            onClick={() => setAdding(a => !a)}
            className="px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors"
          >
            + Add pattern
          </button>
        </div>
      </div>

      {adding && (
        <form onSubmit={addPattern} className="mb-6 p-4 bg-zinc-900 border border-zinc-700 rounded-lg flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Vertical</label>
            <select value={newVertical} onChange={e => setNewVertical(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none">
              {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Page type</label>
            <select value={newPageType} onChange={e => setNewPageType(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none">
              {PAGE_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-64">
            <label className="block text-xs text-zinc-500 mb-1">Pattern</label>
            <input value={newPattern} onChange={e => setNewPattern(e.target.value)}
              placeholder="Describe the reusable pattern…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Confidence</label>
            <input type="number" step="0.01" min="0" max="1" value={newConf}
              onChange={e => setNewConf(e.target.value)}
              className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none" />
          </div>
          <button type="submit" disabled={addLoading || !newPattern.trim()}
            className="px-3 py-1.5 bg-emerald-700 text-white text-sm rounded hover:bg-emerald-600 disabled:opacity-50 transition-colors">
            {addLoading ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => setAdding(false)}
            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200">
            Cancel
          </button>
        </form>
      )}

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950 sticky top-0">
            <tr>
              {['Vertical', 'Page type', 'Pattern', 'Confidence', 'n', 'Updated', ''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs uppercase text-zinc-500 tracking-wider font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-600 text-sm">Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-600 text-sm">
                  No patterns yet. Patterns are generated automatically as hypotheses are accepted/rejected.
                </td>
              </tr>
            ) : rows.map(row => (
              <tr key={row.id} className="border-t border-zinc-800 hover:bg-zinc-900/30">
                <td className="px-4 py-2.5 text-zinc-400">{row.vertical}</td>
                <td className="px-4 py-2.5 text-zinc-400">{row.page_type}</td>
                <td className="px-4 py-2.5 text-zinc-200 max-w-xs">{row.pattern}</td>
                <td className="px-4 py-2.5">
                  {editingId === row.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={editingConf}
                        onChange={e => setEditingConf(e.target.value)}
                        className="w-16 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-xs text-zinc-200 focus:outline-none"
                        autoFocus
                      />
                      <button onClick={() => saveConfidence(row.id)} className="text-xs text-emerald-400 hover:text-emerald-300">
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingId(row.id); setEditingConf(String(row.confidence)) }}
                      className="text-violet-400 hover:text-violet-300 font-medium"
                    >
                      {(row.confidence * 100).toFixed(0)}%
                    </button>
                  )}
                </td>
                <td className="px-4 py-2.5 text-zinc-500">{row.sample_size}</td>
                <td className="px-4 py-2.5 text-zinc-500 text-xs">{new Date(row.updated_at).toLocaleDateString()}</td>
                <td className="px-4 py-2.5">
                  <button onClick={() => deleteRow(row.id)} className="text-xs text-red-500 hover:text-red-400">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-3 mt-4 text-sm text-zinc-400">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span>Page {page + 1} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
