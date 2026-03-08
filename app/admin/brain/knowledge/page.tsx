'use client'

import { useEffect, useState, useCallback } from 'react'

interface KnowledgeRow {
  id: string
  vertical: string
  page_type: string
  framework_type: string
  source: string
  confidence: number
  sample_size: number
  created_at: string
}

export default function KnowledgePage() {
  const [rows, setRows] = useState<KnowledgeRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingConf, setEditingConf] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set('search', search)
    const res = await fetch(`/api/brain/knowledge?${params}`)
    const data = await res.json()
    setRows(data.rows ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [page, search])

  useEffect(() => { load() }, [load])

  async function saveConfidence(id: string) {
    const conf = parseFloat(editingConf)
    if (isNaN(conf) || conf < 0 || conf > 1) return
    await fetch(`/api/brain/knowledge/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confidence: conf }),
    })
    setRows(prev => prev.map(r => r.id === id ? { ...r, confidence: conf } : r))
    setEditingId(null)
  }

  async function deleteRow(id: string) {
    await fetch(`/api/brain/knowledge/${id}`, { method: 'DELETE' })
    setRows(prev => prev.filter(r => r.id !== id))
    setTotal(t => t - 1)
  }

  const limit = 50
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Knowledge Base</h1>
        <span className="text-sm text-zinc-500">{total.toLocaleString()} chunks</span>
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search by framework type…"
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 w-72"
        />
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950 sticky top-0">
            <tr>
              {['Source', 'Vertical', 'Framework', 'Confidence', 'n', 'Added', ''].map(h => (
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
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-600 text-sm">No knowledge chunks yet.</td>
              </tr>
            ) : rows.map(row => (
              <tr key={row.id} className="border-t border-zinc-800 hover:bg-zinc-900/30">
                <td className="px-4 py-2.5 text-zinc-300 max-w-[180px] truncate">{row.source}</td>
                <td className="px-4 py-2.5 text-zinc-400">{row.vertical}</td>
                <td className="px-4 py-2.5 text-zinc-300">{row.framework_type}</td>
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
                      <button
                        onClick={() => saveConfidence(row.id)}
                        className="text-xs text-emerald-400 hover:text-emerald-300"
                      >
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
                <td className="px-4 py-2.5 text-zinc-500 text-xs">{new Date(row.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="text-xs text-red-500 hover:text-red-400"
                  >
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
