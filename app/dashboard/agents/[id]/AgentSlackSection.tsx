'use client'

import { useState, useRef } from 'react'
import { Loader2, Trash2, Upload, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Doc { file_name: string; created_at: string }

interface Props {
  agentId: string
  initialInstructions: string
}

export default function AgentSlackSection({ agentId, initialInstructions }: Props) {
  // ── Instructions ───────────────────────────────────────────────────────────
  const [instructions, setInstructions] = useState(initialInstructions)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const saveInstructions = async () => {
    setSaving(true)
    setSaved(false)
    await fetch(`/api/agents/${agentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system_instructions: instructions }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Documents ──────────────────────────────────────────────────────────────
  const [docs, setDocs] = useState<Doc[] | null>(null)
  const [docsLoading, setDocsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const loadDocs = async () => {
    setDocsLoading(true)
    const res = await fetch(`/api/agents/${agentId}/documents`)
    const data = await res.json()
    setDocs(Array.isArray(data) ? data : [])
    setDocsLoading(false)
  }

  // Lazy-load docs on first open
  const [docsOpen, setDocsOpen] = useState(false)
  const toggleDocs = () => {
    if (!docsOpen && docs === null) loadDocs()
    setDocsOpen(v => !v)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/agents/${agentId}/documents`, { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) {
      setUploadError(data.error || 'Upload failed')
    } else {
      await loadDocs()
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDelete = async (fileName: string) => {
    await fetch(`/api/agents/${agentId}/documents?file_name=${encodeURIComponent(fileName)}`, { method: 'DELETE' })
    setDocs(prev => prev?.filter(d => d.file_name !== fileName) ?? [])
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/50">
        <h2 className="text-sm font-semibold text-zinc-200 mb-1">Agent instructions</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Tell your agent how to respond, what tone to use, or focus areas. This shapes every reply.
        </p>
        <textarea
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder="e.g. Focus on increasing free trial sign-ups. Be concise and data-driven. Always suggest A/B test ideas."
          rows={4}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
        />
        <div className="flex items-center gap-3 mt-2">
          <Button
            onClick={saveInstructions}
            disabled={saving}
            size="sm"
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Save
          </Button>
          {saved && <span className="text-xs text-emerald-400">Saved</span>}
        </div>
      </div>

      {/* Knowledge base */}
      <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/50">
        <button
          onClick={toggleDocs}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-200">Knowledge base</h2>
          </div>
          <span className="text-xs text-zinc-500">{docsOpen ? '▲' : '▼'}</span>
        </button>

        {docsOpen && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-zinc-500">
              Upload PDFs, text files, or docs. Your agent will use them to answer questions in Slack.
            </p>

            {/* Upload */}
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleUpload}
                className="hidden"
                id="doc-upload"
              />
              <label
                htmlFor="doc-upload"
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                  uploading
                    ? 'border-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {uploading
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
                  : <><Upload className="h-3.5 w-3.5" /> Upload file</>
                }
              </label>
              <span className="text-xs text-zinc-600 ml-2">PDF, TXT, MD · max 10MB</span>
              {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
            </div>

            {/* Doc list */}
            {docsLoading ? (
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : docs && docs.length === 0 ? (
              <p className="text-xs text-zinc-600">No documents yet.</p>
            ) : (
              <ul className="space-y-2">
                {(docs || []).map(doc => (
                  <li key={doc.file_name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-zinc-300 truncate">{doc.file_name}</span>
                    <button
                      onClick={() => handleDelete(doc.file_name)}
                      className="text-zinc-600 hover:text-red-400 shrink-0"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
