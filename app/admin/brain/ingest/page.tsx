'use client'

import { useState, useRef } from 'react'

const VERTICALS = ['b2b_saas', 'consumer', 'marketplace', 'fintech', 'universal']

interface IngestResult {
  inserted: number
  embedded: boolean
}

export default function IngestPage() {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [vertical, setVertical] = useState('universal')
  const [frameworkType, setFrameworkType] = useState('')
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<IngestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (f && !source) setSource(f.name.replace(/\.[^.]+$/, ''))
    // For non-PDF files, also read text into textarea for preview
    if (f && !f.name.endsWith('.pdf')) {
      f.text().then(t => setText(t))
    } else {
      setText('') // PDF: text extracted server-side
    }
  }

  const isPdf = file?.name.endsWith('.pdf')
  const canSubmit = !loading && frameworkType.trim() && source.trim() && (file || text.trim())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      let res: Response

      if (file) {
        // Always use FormData when a file is selected (handles PDF server-side)
        const fd = new FormData()
        fd.append('file', file)
        fd.append('vertical', vertical)
        fd.append('framework_type', frameworkType)
        fd.append('source', source)
        res = await fetch('/api/brain/knowledge', { method: 'POST', body: fd })
      } else {
        // Text paste — JSON
        res = await fetch('/api/brain/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, vertical, framework_type: frameworkType, source }),
        })
      }

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Ingest failed')
      } else {
        setResult(data as IngestResult)
        setText('')
        setFile(null)
        setFrameworkType('')
        setSource('')
        if (fileRef.current) fileRef.current.value = ''
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-white mb-6">Ingest Knowledge</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* File upload */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Upload file (.pdf, .txt, .md)</label>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.pdf"
            onChange={handleFileChange}
            className="text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
          />
          {isPdf && file && (
            <p className="mt-1.5 text-xs text-violet-400">PDF selected — text will be extracted server-side ({(file.size / 1024).toFixed(0)} KB)</p>
          )}
        </div>

        {/* Text area — hidden for PDF uploads */}
        {!isPdf && (
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Raw text</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={10}
              placeholder="Paste book content or document text here…"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-y"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Vertical</label>
            <select
              value={vertical}
              onChange={e => setVertical(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
            >
              {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Framework type</label>
            <input
              value={frameworkType}
              onChange={e => setFrameworkType(e.target.value)}
              placeholder="e.g. JTBD, friction_audit, value_prop"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Source name</label>
          <input
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="e.g. Hooked by Nir Eyal, promoted_pattern"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Ingesting…' : 'Ingest'}
        </button>
      </form>

      {result && (
        <div className="mt-5 p-4 bg-emerald-950/40 border border-emerald-800 rounded-lg text-sm text-emerald-300">
          Inserted {result.inserted} chunks.{result.embedded ? ' Embeddings generated.' : ' No VOYAGE_API_KEY — embeddings skipped.'}
        </div>
      )}

      {error && (
        <div className="mt-5 p-4 bg-red-950/40 border border-red-800 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  )
}
