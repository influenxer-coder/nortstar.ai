'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  CheckCircle2, XCircle, MessageSquare, GitBranch, BarChart2,
  FileText, Upload, Trash2, Loader2, RefreshCw, ChevronRight,
  Sparkles, Copy, Check, Eye, X,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { Agent, Hypothesis } from '@/lib/types'
import AgentAnalysisLogs from './AgentAnalysisLogs'
import SimulationPanel from './SimulationPanel'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Doc { file_name: string; created_at: string }
interface ChatMsg { role: 'user' | 'assistant'; content: string; tool_called?: string }

interface Props {
  agent: Agent
  agents: { id: string; name: string; status: string | null }[]
  initialHypotheses: Hypothesis[]
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function ImpactDots({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className={`w-2 h-2 rounded-full ${i <= score ? 'bg-violet-500' : 'bg-zinc-700'}`} />
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    proposed: 'bg-zinc-800 text-zinc-400',
    accepted: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/10 text-red-400',
    shipped: 'bg-violet-500/20 text-violet-400',
  }
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${map[status] ?? map.proposed}`}>
      {status}
    </span>
  )
}

// ─── Main workspace ───────────────────────────────────────────────────────────

export default function AgentWorkspace({ agent, initialHypotheses }: Props) {
  // ── Hypothesis state ───────────────────────────────────────────────────────
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>(initialHypotheses)
  const [askHypId, setAskHypId] = useState<string | null>(null)
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMsg[]>>({})
  const [chatInput, setChatInput] = useState<Record<string, string>>({})
  const [chatLoading, setChatLoading] = useState<Record<string, boolean>>({})

  // ── Sources state ──────────────────────────────────────────────────────────
  const [docs, setDocs] = useState<Doc[] | null>(null)
  const [docsLoading, setDocsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [instructions, setInstructions] = useState(agent.system_instructions ?? '')
  const [instructionsSaving, setInstructionsSaving] = useState(false)
  const [instructionsSaved, setInstructionsSaved] = useState(false)

  // ── View / collapse state ──────────────────────────────────────────────────
  const [view, setView] = useState<'none' | 'hypotheses' | 'analytics'>('hypotheses')
  const [briefingOpen, setBriefingOpen] = useState(!!agent.context_summary)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  // ── Analysis state ─────────────────────────────────────────────────────────
  const [reanalyzing, setReanalyzing] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Copy state ─────────────────────────────────────────────────────────────
  const [copied, setCopied] = useState<string | null>(null)

  // ── Preview state ──────────────────────────────────────────────────────────
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewLoading, setPreviewLoading] = useState<string | null>(null) // hid being loaded
  const [previewHypId, setPreviewHypId] = useState<string | null>(null)
  const [previewChatInput, setPreviewChatInput] = useState('')
  const [previewChatLoading, setPreviewChatLoading] = useState(false)
  const [previewRegenerating, setPreviewRegenerating] = useState(false)
  const previewChatEndRef = useRef<HTMLDivElement>(null)

  // ── PostHog connect state ──────────────────────────────────────────────────
  const resolvedPhKey = agent.posthog_api_key ?? agent.analytics_config?.posthog?.api_key ?? null
  const resolvedPhProject = agent.posthog_project_id ?? agent.analytics_config?.posthog?.project_id ?? null
  const [phKey, setPhKey] = useState<string | null>(resolvedPhKey)
  const [phProject, setPhProject] = useState<string | null>(resolvedPhProject)
  const [phExpanded, setPhExpanded] = useState(false)
  const [phForm, setPhForm] = useState({ api_key: '', project_id: '' })
  const [phSaving, setPhSaving] = useState(false)
  const [phError, setPhError] = useState('')

  const handlePhConnect = async () => {
    if (!phForm.api_key.trim() || !phForm.project_id.trim()) { setPhError('Both fields are required'); return }
    setPhSaving(true); setPhError('')
    const vRes = await fetch('/api/posthog/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posthog_api_key: phForm.api_key.trim(), posthog_project_id: phForm.project_id.trim() }),
    })
    const vData = await vRes.json()
    if (!vData.valid) { setPhError(vData.error ?? 'Invalid credentials'); setPhSaving(false); return }
    await fetch(`/api/agents/${agent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posthog_api_key: phForm.api_key.trim(), posthog_project_id: phForm.project_id.trim() }),
    })
    setPhKey(phForm.api_key.trim()); setPhProject(phForm.project_id.trim())
    setPhExpanded(false); setPhSaving(false); setPhForm({ api_key: '', project_id: '' })
  }

  // ── Load docs on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    setDocsLoading(true)
    fetch(`/api/agents/${agent.id}/documents`)
      .then(r => r.json())
      .then(data => setDocs(Array.isArray(data) ? data : []))
      .catch(() => setDocs([]))
      .finally(() => setDocsLoading(false))
  }, [agent.id])

  // ── Hypothesis actions ─────────────────────────────────────────────────────
  const updateStatus = async (hid: string, status: string) => {
    setHypotheses(prev => prev.map(h => h.id === hid ? { ...h, status: status as Hypothesis['status'] } : h))
    await fetch(`/api/agents/${agent.id}/hypotheses/${hid}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
  }

  const handleAsk = async (hid: string) => {
    const message = chatInput[hid]?.trim()
    if (!message || chatLoading[hid]) return
    const history = chatHistory[hid] ?? []
    const newHistory: ChatMsg[] = [...history, { role: 'user', content: message }]
    setChatHistory(prev => ({ ...prev, [hid]: newHistory }))
    setChatInput(prev => ({ ...prev, [hid]: '' }))
    setChatLoading(prev => ({ ...prev, [hid]: true }))
    try {
      const res = await fetch(`/api/agents/${agent.id}/hypotheses/${hid}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }),
      })
      const data = await res.json()
      setChatHistory(prev => ({ ...prev, [hid]: [...newHistory, { role: 'assistant', content: data.reply ?? 'No response', tool_called: data.tool_called }] }))
    } catch {
      setChatHistory(prev => ({ ...prev, [hid]: [...newHistory, { role: 'assistant', content: 'Failed to get a response. Try again.' }] }))
    } finally {
      setChatLoading(prev => ({ ...prev, [hid]: false }))
    }
  }

  // ── Preview ────────────────────────────────────────────────────────────────
  const handlePreview = async (hid: string, title: string) => {
    if (previewLoading) return
    setPreviewLoading(hid)
    setPreviewHypId(hid)
    setPreviewTitle(title)
    setPreviewHtml(null)
    // Load chat history for this hypothesis if not already loaded
    if (!chatHistory[hid]) {
      try {
        const res = await fetch(`/api/agents/${agent.id}/hypotheses/${hid}/chat`)
        const data = await res.json()
        if (data.messages?.length) setChatHistory(prev => ({ ...prev, [hid]: data.messages }))
      } catch { /* silent */ }
    }
    try {
      const res = await fetch(`/api/agents/${agent.id}/hypotheses/${hid}/preview`, { method: 'POST' })
      const data = await res.json()
      setPreviewHtml(data.html ?? '<p>No preview generated.</p>')
    } catch {
      setPreviewHtml('<p style="color:red">Failed to generate preview.</p>')
    } finally {
      setPreviewLoading(null)
    }
  }

  const handleRegeneratePreview = async () => {
    if (!previewHypId || previewRegenerating) return
    setPreviewRegenerating(true)
    setPreviewHtml(null)
    try {
      const res = await fetch(`/api/agents/${agent.id}/hypotheses/${previewHypId}/preview`, { method: 'POST' })
      const data = await res.json()
      setPreviewHtml(data.html ?? '<p>No preview generated.</p>')
    } catch {
      setPreviewHtml('<p style="color:red">Failed to generate preview.</p>')
    } finally {
      setPreviewRegenerating(false)
    }
  }

  const handlePreviewChat = async () => {
    const hid = previewHypId
    if (!hid || !previewChatInput.trim() || previewChatLoading) return
    const message = previewChatInput.trim()
    const history = chatHistory[hid] ?? []
    const newHistory: ChatMsg[] = [...history, { role: 'user', content: message }]
    setChatHistory(prev => ({ ...prev, [hid]: newHistory }))
    setPreviewChatInput('')
    setPreviewChatLoading(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}/hypotheses/${hid}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }),
      })
      const data = await res.json()
      setChatHistory(prev => ({ ...prev, [hid]: [...newHistory, { role: 'assistant', content: data.reply ?? 'No response', tool_called: data.tool_called }] }))
      // Auto-regenerate preview if hypothesis was updated OR user asked for a preview
      const wantsPreview = /preview|show me|regenerate|refresh/i.test(message)
      if (data.tool_called === 'update_hypothesis' || wantsPreview) {
        await handleRegeneratePreview()
      }
    } catch {
      setChatHistory(prev => ({ ...prev, [hid]: [...newHistory, { role: 'assistant', content: 'Failed to get a response.' }] }))
    } finally {
      setPreviewChatLoading(false)
    }
  }

  // Scroll preview chat to bottom when messages change
  useEffect(() => {
    if (previewHypId) previewChatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, previewHypId])

  // ── Re-analyze ─────────────────────────────────────────────────────────────
  const handleReanalyze = useCallback(async () => {
    setReanalyzing(true)
    setHypotheses([])
    await fetch(`/api/agents/${agent.id}/analyze`, { method: 'POST' })
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/agents/${agent.id}/hypotheses`)
      if (res.ok) {
        const data: Hypothesis[] = await res.json()
        if (data.length > 0) {
          setHypotheses(data); setReanalyzing(false)
          if (pollRef.current) clearInterval(pollRef.current)
        }
      }
    }, 4000)
  }, [agent.id])

  useEffect(() => {
    fetch(`/api/agents/${agent.id}/hypotheses`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setHypotheses(data) })
      .catch(() => {})
  }, [agent.id])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  // ── Document actions ───────────────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true); setUploadError('')
    const form = new FormData(); form.append('file', file)
    const res = await fetch(`/api/agents/${agent.id}/documents`, { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) { setUploadError(data.error || 'Upload failed') } else {
      const docsRes = await fetch(`/api/agents/${agent.id}/documents`)
      setDocs(Array.isArray(await docsRes.json()) ? await (await fetch(`/api/agents/${agent.id}/documents`)).json() : [])
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDeleteDoc = async (fileName: string) => {
    await fetch(`/api/agents/${agent.id}/documents?file_name=${encodeURIComponent(fileName)}`, { method: 'DELETE' })
    setDocs(prev => prev?.filter(d => d.file_name !== fileName) ?? [])
  }

  const saveInstructions = async () => {
    setInstructionsSaving(true)
    await fetch(`/api/agents/${agent.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_instructions: instructions }),
    })
    setInstructionsSaving(false); setInstructionsSaved(true)
    setTimeout(() => setInstructionsSaved(false), 2000)
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 2000) })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasHypotheses = hypotheses.length > 0
  const targetDesc = agent.target_element?.text ?? null

  return (
    <>
    <div className="flex h-screen overflow-hidden bg-[#09090B]">

      {/* ── Left sources panel ───────────────────────────────────────────────── */}
      <div className="w-56 shrink-0 border-r border-zinc-800 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3 space-y-5">

          {/* Analytics */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5 px-1">Analytics</p>
            <div
              className={phKey ? 'cursor-pointer' : ''}
              onClick={phKey ? () => setView(v => v === 'analytics' ? 'hypotheses' : 'analytics') : undefined}
            >
              <div className="flex items-center justify-between gap-2 py-1.5 px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <BarChart2 className={`h-3.5 w-3.5 shrink-0 ${phKey ? 'text-emerald-400' : 'text-zinc-600'}`} />
                  <span className={`text-xs truncate ${phKey ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    {phKey ? `PostHog${phProject ? ` · ${phProject}` : ''}` : 'PostHog'}
                  </span>
                  {phKey && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                </div>
                {!phKey && (
                  <button onClick={() => setPhExpanded(v => !v)} className="text-[10px] text-violet-400 hover:text-violet-300 shrink-0">
                    Connect
                  </button>
                )}
              </div>
            </div>
            {phExpanded && !phKey && (
              <div className="mt-2 px-1 space-y-2">
                <p className="text-[10px] text-zinc-500 leading-relaxed">Find your keys in PostHog → Settings → Project.</p>
                <input
                  value={phForm.api_key}
                  onChange={e => setPhForm(f => ({ ...f, api_key: e.target.value }))}
                  placeholder="API Key  (phx_...)"
                  className="w-full rounded bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs px-2 py-1.5 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <input
                  value={phForm.project_id}
                  onChange={e => setPhForm(f => ({ ...f, project_id: e.target.value }))}
                  placeholder="Project ID  (e.g. 12345)"
                  className="w-full rounded bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs px-2 py-1.5 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                {phError && <p className="text-[10px] text-red-400">{phError}</p>}
                <div className="flex gap-2">
                  <button onClick={handlePhConnect} disabled={phSaving}
                    className="flex-1 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-medium disabled:opacity-50 transition-colors">
                    {phSaving ? 'Connecting…' : 'Connect'}
                  </button>
                  <button onClick={() => { setPhExpanded(false); setPhError(''); setPhForm({ api_key: '', project_id: '' }) }}
                    className="px-2 py-1 rounded border border-zinc-700 text-zinc-500 text-[10px] hover:text-zinc-300 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Codebase */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5 px-1">Codebase</p>
            <div className="flex items-center justify-between gap-2 py-1.5 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <GitBranch className={`h-3.5 w-3.5 shrink-0 ${agent.github_repo ? 'text-emerald-400' : 'text-zinc-600'}`} />
                <span className={`text-xs truncate ${agent.github_repo ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {agent.github_repo ?? 'GitHub'}
                </span>
                {agent.github_repo && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </div>
              {!agent.github_repo && (
                <a href="/dashboard/agents/new" className="text-[10px] text-violet-400 hover:text-violet-300 shrink-0">Connect</a>
              )}
            </div>
          </div>

          {/* Slack */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5 px-1">Slack</p>
            <div className="flex items-center justify-between gap-2 py-1.5 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${agent.slack_channel_id ? 'text-emerald-400' : 'text-zinc-600'}`} />
                <span className={`text-xs truncate ${agent.slack_channel_id ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {agent.slack_channel_id ? 'Workspace connected' : 'Not connected'}
                </span>
                {agent.slack_channel_id && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </div>
              <a href={`/api/auth/slack?agent_id=${agent.id}`} className="text-[10px] text-violet-400 hover:text-violet-300 shrink-0">
                {agent.slack_channel_id ? 'Reconnect' : 'Connect'}
              </a>
            </div>
          </div>

          {/* Documents */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5 px-1">Documents</p>
            {docsLoading ? (
              <div className="flex items-center gap-1.5 text-zinc-600 text-xs px-1 py-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="space-y-0.5">
                {(docs ?? []).map(doc => (
                  <div key={doc.file_name} className="flex items-center gap-2 group py-1 px-1 rounded hover:bg-zinc-800/40">
                    <FileText className="h-3 w-3 text-zinc-600 shrink-0" />
                    <span className="text-xs text-zinc-400 truncate flex-1">{doc.file_name}</span>
                    <button onClick={() => handleDeleteDoc(doc.file_name)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 shrink-0 transition-opacity">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <input ref={fileRef} type="file" accept=".pdf,.txt,.md" onChange={handleUpload} className="hidden" id="ws-doc-upload" />
                <label htmlFor="ws-doc-upload"
                  className={`flex items-center gap-1.5 text-xs px-1 py-1.5 rounded cursor-pointer transition-colors ${uploading ? 'text-zinc-600' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'}`}>
                  {uploading ? <><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</> : <><Upload className="h-3 w-3" /> Upload file</>}
                </label>
                {uploadError && <p className="text-[10px] text-red-400 px-1">{uploadError}</p>}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5 px-1">Instructions</p>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="e.g. Focus on sign-up rate. Be concise. Always suggest A/B ideas."
              rows={3}
              className="w-full rounded bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs px-2 py-1.5 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
            />
            <button onClick={saveInstructions} disabled={instructionsSaving}
              className="mt-1.5 text-[10px] text-violet-400 hover:text-violet-300 disabled:opacity-50">
              {instructionsSaving ? 'Saving…' : instructionsSaved ? '✓ Saved' : 'Save instructions'}
            </button>
          </div>

        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="border-b border-zinc-800 h-14 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-sm font-semibold text-zinc-100 shrink-0">{agent.name}</h1>
            {agent.status && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                agent.status === 'Ready' || agent.status === 'Analyzing' ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800 text-zinc-400'
              }`}>{agent.status}</span>
            )}
            {targetDesc && (
              <span className="text-xs text-zinc-500 hidden sm:block shrink-0">
                → <span className="text-zinc-400">{targetDesc}</span>
              </span>
            )}
            {agent.url && (
              <a href={agent.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-zinc-600 hover:text-zinc-400 truncate max-w-[200px] hidden md:block">
                {agent.url}
              </a>
            )}
          </div>
          <button onClick={handleReanalyze} disabled={reanalyzing}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-md px-3 py-1.5 transition-colors disabled:opacity-40 shrink-0">
            <RefreshCw className={`h-3 w-3 ${reanalyzing ? 'animate-spin' : ''}`} />
            {reanalyzing ? 'Analyzing…' : 'Re-analyze'}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto">

          {/* ── Pre-launch Simulation ───────────────────────────────────────── */}
          <SimulationPanel
            agentId={agent.id}
            agentUrl={agent.url ?? null}
            targetText={agent.target_element?.text ?? null}
          />

          {/* ── Agent Briefing (collapsible) ────────────────────────────────── */}
          <div className="border-b border-zinc-800/60">
            <div
              className="flex items-center justify-between px-6 py-3 cursor-pointer select-none hover:bg-zinc-900/30 transition-colors"
              onClick={() => setBriefingOpen(o => !o)}
            >
              <div className="flex items-center gap-2">
                <ChevronRight className={`h-3.5 w-3.5 text-zinc-600 transition-transform duration-150 ${briefingOpen ? 'rotate-90' : ''}`} />
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Agent Briefing</p>
                <div className="flex items-center gap-1 ml-2">
                  {[
                    { label: 'GitHub', active: !!agent.github_repo },
                    { label: 'PostHog', active: !!phKey },
                    { label: 'Slack', active: !!agent.slack_channel_id },
                    { label: `${docs?.length ?? 0} docs`, active: (docs?.length ?? 0) > 0 },
                  ].filter(s => s.active).map(src => (
                    <span key={src.label} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-500">
                      {src.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {briefingOpen && (
              <div className="px-6 pb-5">
                {agent.context_summary ? (
                  <div className="prose prose-xs prose-invert max-w-none mb-3 text-xs text-zinc-400 [&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:text-zinc-400 [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-medium [&_h3]:text-zinc-300 [&_h3]:mt-2 [&_h3]:mb-0.5 [&_p]:leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ul]:space-y-0.5 [&_li]:leading-relaxed [&_strong]:text-zinc-300 [&_strong]:font-medium">
                    <ReactMarkdown>{agent.context_summary}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600 italic mb-3">
                    No briefing yet — run analysis to generate insights from your connected sources.
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {[
                    { label: 'GitHub', active: !!agent.github_repo },
                    { label: 'PostHog', active: !!phKey },
                    { label: 'Slack', active: !!agent.slack_channel_id },
                    { label: `${docs?.length ?? 0} doc${docs?.length === 1 ? '' : 's'}`, active: (docs?.length ?? 0) > 0 },
                    { label: 'Instructions', active: !!agent.system_instructions },
                  ].map(src => (
                    <span key={src.label} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      src.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-600'
                    }`}>{src.label}</span>
                  ))}
                </div>
                <AgentAnalysisLogs agentId={agent.id} hasGithubRepo={!!agent.github_repo} />
              </div>
            )}
          </div>

          {/* ── Hypothesis summary bar ──────────────────────────────────────── */}
          <button
            onClick={() => setView(v => v === 'hypotheses' ? 'none' : 'hypotheses')}
            className={`w-full flex items-center justify-between px-6 py-3 border-b border-zinc-800/60 transition-colors text-left ${
              view === 'hypotheses' ? 'bg-violet-500/5' : 'hover:bg-zinc-900/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className={`h-3.5 w-3.5 ${view === 'hypotheses' ? 'text-violet-400' : 'text-zinc-600'}`} />
              {hasHypotheses ? (
                <span className={`text-xs font-medium ${view === 'hypotheses' ? 'text-violet-300' : 'text-zinc-400'}`}>
                  {hypotheses.length} hypothesis{hypotheses.length !== 1 ? 'es' : ''}
                  <span className="text-zinc-600 font-normal ml-1.5">
                    · Generated {formatRelativeDate(hypotheses.reduce((latest, h) =>
                      h.created_at > latest ? h.created_at : latest, hypotheses[0].created_at
                    ))}
                  </span>
                </span>
              ) : (
                <span className="text-xs text-zinc-600">No hypotheses yet</span>
              )}
            </div>
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${view === 'hypotheses' ? 'rotate-90 text-violet-400' : 'text-zinc-700'}`} />
          </button>

          {/* ── Hypothesis table ─────────────────────────────────────────────── */}
          {view === 'hypotheses' && (
            <div className="border-b border-zinc-800/60">
              <div className={`flex items-center gap-3 px-5 py-2.5 border-b border-zinc-800 ${hasHypotheses ? 'sticky top-0 z-10' : ''} bg-zinc-950`}>
                <div className="w-4 shrink-0" />
                <div className="flex-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Improvement</div>
                <div className="w-28 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Source</div>
                <div className="w-16 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Impact</div>
                <div className="w-20 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Status</div>
              </div>
              {!hasHypotheses ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Sparkles className="h-6 w-6 text-zinc-700" />
                  <p className="text-sm text-zinc-500 font-medium">No hypotheses yet</p>
                  <p className="text-xs text-zinc-600 text-center max-w-xs">
                    Click <span className="text-zinc-400">Re-analyze</span> above to generate improvement hypotheses from your connected sources.
                  </p>
                  {reanalyzing && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                      Generating hypotheses — this takes about 60 seconds…
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="divide-y divide-zinc-800/50">
                    {hypotheses.map(h => (
                      <HypothesisRow
                        key={h.id}
                        hypothesis={h}
                        agentKpi={agent.main_kpi ?? ''}
                        isExpanded={expandedRowId === h.id}
                        onToggleExpand={() => setExpandedRowId(expandedRowId === h.id ? null : h.id)}
                        isAsking={askHypId === h.id}
                        chatMsgs={chatHistory[h.id] ?? []}
                        chatInputVal={chatInput[h.id] ?? ''}
                        chatIsLoading={chatLoading[h.id] ?? false}
                        copied={copied}
                        onToggleAsk={async () => {
                          const next = askHypId === h.id ? null : h.id
                          setAskHypId(next)
                          if (next && !chatHistory[next]) {
                            // Load persisted history from DB on first open
                            try {
                              const res = await fetch(`/api/agents/${agent.id}/hypotheses/${next}/chat`)
                              const data = await res.json()
                              if (data.messages?.length) {
                                setChatHistory(prev => ({ ...prev, [next]: data.messages }))
                              }
                            } catch { /* silent — just start fresh */ }
                          }
                        }}
                        onAccept={() => updateStatus(h.id, 'accepted')}
                        onReject={() => updateStatus(h.id, 'rejected')}
                        onChatInputChange={(val: string) => setChatInput(prev => ({ ...prev, [h.id]: val }))}
                        onAsk={() => handleAsk(h.id)}
                        onCopy={(text: string) => handleCopy(text, h.id)}
                        onPreview={() => handlePreview(h.id, h.title)}
                        previewLoading={previewLoading === h.id}
                      />
                    ))}
                  </div>
                  {reanalyzing && (
                    <div className="flex items-center gap-2 px-5 py-4 text-zinc-500 text-xs border-t border-zinc-800">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                      Generating fresh hypotheses…
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Analytics ────────────────────────────────────────────────────── */}
          {view === 'analytics' && phKey && (
            <AnalyticsView agentId={agent.id} kpiText={(agent.target_element as { text?: string } | null)?.text ?? agent.main_kpi ?? ''} />
          )}

        </div>
      </div>
    </div>

    {/* ── Preview modal ──────────────────────────────────────────────────── */}
    {(previewHtml !== null || previewLoading !== null || previewHypId !== null) && (
      <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-zinc-200">Preview</span>
            {previewTitle && <span className="text-xs text-zinc-500">— {previewTitle}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRegeneratePreview} disabled={previewRegenerating || previewLoading !== null}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-400 hover:border-blue-600 hover:text-blue-400 transition-colors disabled:opacity-40">
              {previewRegenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Regenerate
            </button>
            <button onClick={() => { setPreviewHtml(null); setPreviewLoading(null); setPreviewHypId(null) }}
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Split pane */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: iframe preview */}
          <div className="flex-1 overflow-hidden border-r border-zinc-800">
            {(previewLoading !== null || previewRegenerating) && previewHtml === null ? (
              <div className="flex items-center justify-center h-full gap-3 text-zinc-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-violet-400" /> Generating preview…
              </div>
            ) : (previewRegenerating && previewHtml !== null) ? (
              <div className="relative w-full h-full">
                <iframe srcDoc={previewHtml} className="w-full h-full border-0 opacity-40" sandbox="allow-scripts" title="Hypothesis UI Preview" />
                <div className="absolute inset-0 flex items-center justify-center gap-3 text-zinc-500 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-400" /> Regenerating…
                </div>
              </div>
            ) : (
              <iframe srcDoc={previewHtml ?? ''} className="w-full h-full border-0" sandbox="allow-scripts" title="Hypothesis UI Preview" />
            )}
          </div>

          {/* Right: hypothesis chat panel */}
          <div className="w-[480px] shrink-0 flex flex-col bg-zinc-950">
            <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">Refine hypothesis</p>
              <p className="text-xs text-zinc-500 mt-0.5">Updates save automatically. Preview regenerates on changes.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {(chatHistory[previewHypId ?? ''] ?? []).map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}>
                    {msg.role === 'assistant' && msg.tool_called && (
                      <div className="mb-1.5 inline-flex items-center gap-1 bg-emerald-900/50 border border-emerald-700/50 rounded px-1.5 py-0.5 text-[10px] text-emerald-400">
                        <Check className="h-2.5 w-2.5" /> Saved + preview updating
                      </div>
                    )}
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown components={{
                        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-1.5 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-1.5 space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
                        code: ({ children }) => <code className="bg-zinc-900 rounded px-1 py-0.5 font-mono text-[10px] text-violet-300">{children}</code>,
                      }}>{msg.content}</ReactMarkdown>
                    ) : msg.content}
                  </div>
                </div>
              ))}
              {previewChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-500">
                    <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> Thinking…
                  </div>
                </div>
              )}
              <div ref={previewChatEndRef} />
            </div>
            <div className="p-3 border-t border-zinc-800 shrink-0">
              <textarea
                value={previewChatInput}
                onChange={e => setPreviewChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePreviewChat() } }}
                placeholder="Debate or refine this hypothesis… (Enter to send, Shift+Enter for new line)"
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 resize-none mb-2"
              />
              <div className="flex justify-end">
                <button onClick={handlePreviewChat} disabled={!previewChatInput.trim() || previewChatLoading}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-md disabled:opacity-40 transition-colors">
                  {previewChatLoading ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr)
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function impactInfo(score: number, kpi: string): { level: string; color: string; reason: string } {
  const k = kpi || 'your KPI'
  if (score >= 5) return { level: 'Very high', color: 'text-violet-400', reason: `Expected to move ${k} significantly. High-confidence change with strong supporting evidence from research and behaviour data.` }
  if (score >= 4) return { level: 'High', color: 'text-violet-300', reason: `Strong potential to improve ${k}. Backed by proven patterns in similar products and the data from your connected sources.` }
  if (score >= 3) return { level: 'Medium', color: 'text-amber-400', reason: `Moderate, validated pattern. Likely to produce a measurable lift on ${k} — worth prioritising in the next sprint.` }
  if (score >= 2) return { level: 'Low', color: 'text-zinc-400', reason: `Incremental gain expected. May have a modest effect on ${k} — good for a quick experiment but not the highest leverage.` }
  return { level: 'Very low', color: 'text-zinc-500', reason: `Minor improvement at best. Treat as an early assumption to validate before investing further effort.` }
}

// ─── Analytics view ───────────────────────────────────────────────────────────

interface AnalyticsData {
  sessions: number
  unique_users: number
  daily_sessions: { day: string; sessions: number }[]
  top_events: { event: string; count: number; users: number }[]
  top_pages: { url: string; sessions: number }[]
  funnel: { total_sessions: number; kpi_events: number; kpi_users: number; kpi_text: string } | null
}

function AnalyticsView({ agentId }: { agentId: string; kpiText: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/agents/${agentId}/analytics`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [agentId])

  if (loading) return <div className="flex items-center justify-center h-64 gap-2 text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading PostHog data…</div>
  if (error) return <div className="flex items-center justify-center h-64 text-red-400 text-sm">{error}</div>
  if (!data) return null

  const maxSessions = Math.max(...data.daily_sessions.map(d => d.sessions), 1)
  const maxEventCount = Math.max(...data.top_events.map(e => e.count), 1)
  const convRate = data.funnel && data.funnel.total_sessions > 0
    ? ((data.funnel.kpi_events / data.funnel.total_sessions) * 100).toFixed(1) : null

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sessions (90d)', value: data.sessions.toLocaleString() },
          { label: 'Unique Users (90d)', value: data.unique_users.toLocaleString() },
          { label: 'Avg Sessions / Month', value: Math.round(data.sessions / 3).toLocaleString() },
        ].map(card => (
          <div key={card.label} className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">{card.label}</p>
            <p className="text-2xl font-bold text-zinc-100">{card.value}</p>
          </div>
        ))}
      </div>
      {data.funnel && convRate !== null && (
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">KPI Funnel — {data.funnel.kpi_text}</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 w-36 shrink-0">All sessions</span>
              <div className="flex-1 bg-zinc-800 rounded-full h-3"><div className="bg-zinc-500 h-3 rounded-full w-full" /></div>
              <span className="text-xs text-zinc-300 w-16 text-right">{data.funnel.total_sessions.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 w-36 shrink-0 truncate">&ldquo;{data.funnel.kpi_text}&rdquo; events</span>
              <div className="flex-1 bg-zinc-800 rounded-full h-3">
                <div className="bg-violet-500 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (data.funnel.kpi_events / data.funnel.total_sessions) * 100)}%` }} />
              </div>
              <span className="text-xs text-zinc-300 w-16 text-right">{data.funnel.kpi_events.toLocaleString()} <span className="text-zinc-500">({convRate}%)</span></span>
            </div>
          </div>
        </div>
      )}
      {data.daily_sessions.length > 0 && (
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Daily Sessions — Last 90 Days</p>
          <div className="flex items-end gap-0.5 h-20">
            {data.daily_sessions.map(d => (
              <div key={d.day} title={`${d.day}: ${d.sessions} sessions`}
                className="flex-1 bg-violet-500/60 hover:bg-violet-500 rounded-sm transition-colors cursor-default min-w-0"
                style={{ height: `${Math.max(2, (d.sessions / maxSessions) * 100)}%` }} />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-zinc-600">
            <span>{data.daily_sessions[0]?.day}</span>
            <span>{data.daily_sessions[data.daily_sessions.length - 1]?.day}</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Top Events (90d)</p>
          {data.top_events.length === 0 ? <p className="text-xs text-zinc-600">No custom events recorded yet.</p> : (
            <div className="space-y-2">
              {data.top_events.slice(0, 8).map(ev => (
                <div key={ev.event} className="space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-300 truncate flex-1 pr-2">{ev.event}</span>
                    <span className="text-xs text-zinc-500 shrink-0">{ev.count.toLocaleString()}</span>
                  </div>
                  <div className="bg-zinc-800 rounded-full h-1">
                    <div className="bg-violet-500/70 h-1 rounded-full" style={{ width: `${(ev.count / maxEventCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Top Pages (90d)</p>
          {data.top_pages.length === 0 ? <p className="text-xs text-zinc-600">No pageview data yet.</p> : (
            <div className="space-y-2">
              {data.top_pages.slice(0, 8).map((pg, i) => {
                const path = (() => { try { return new URL(pg.url).pathname } catch { return pg.url } })()
                return (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-400 truncate flex-1" title={pg.url}>{path || '/'}</span>
                    <span className="text-xs text-zinc-500 shrink-0">{pg.sessions.toLocaleString()} sess.</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Hypothesis row ───────────────────────────────────────────────────────────

function HypothesisRow({
  hypothesis: h, agentKpi, isExpanded, onToggleExpand,
  isAsking, chatMsgs, chatInputVal, chatIsLoading, copied,
  onToggleAsk, onAccept, onReject, onChatInputChange, onAsk, onCopy, onPreview, previewLoading,
}: {
  hypothesis: Hypothesis; agentKpi: string; isExpanded: boolean; onToggleExpand: () => void
  isAsking: boolean; chatMsgs: ChatMsg[]; chatInputVal: string; chatIsLoading: boolean; copied: string | null
  onToggleAsk: () => void; onAccept: () => void; onReject: () => void
  onChatInputChange: (v: string) => void; onAsk: () => void; onCopy: (text: string) => void
  onPreview: () => void; previewLoading: boolean
}) {
  const chatEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (isAsking) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMsgs, isAsking])

  const isRejected = h.status === 'rejected'
  const isAccepted = h.status === 'accepted' || h.status === 'shipped'
  const impact = impactInfo(h.impact_score, agentKpi)

  return (
    <div className={isRejected ? 'opacity-40' : ''}>
      <div onClick={onToggleExpand}
        className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors ${isExpanded ? 'bg-zinc-900/50' : 'hover:bg-zinc-900/30'}`}>
        <ChevronRight className={`h-3.5 w-3.5 text-zinc-600 shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`} />
        <p className={`flex-1 text-sm font-medium leading-snug ${isRejected ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>{h.title}</p>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 whitespace-nowrap w-28 text-center truncate shrink-0">{h.source}</span>
        <div className="w-16 shrink-0"><ImpactDots score={h.impact_score} /></div>
        <div className="w-20 shrink-0"><StatusBadge status={h.status} /></div>
      </div>

      {isExpanded && (
        <div className="border-t border-zinc-800/60 bg-zinc-900/20 px-9 py-5 space-y-5">
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">What we&apos;re improving</p>
            <p className="text-sm font-medium text-zinc-200">{h.title}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">Why we&apos;re proposing this</p>
            <div className="text-xs text-zinc-400 leading-relaxed [&_strong]:text-zinc-300 [&_strong]:font-medium [&_ul]:mt-1 [&_ul]:space-y-0.5 [&_li]:leading-relaxed">
              <ReactMarkdown>{h.hypothesis}</ReactMarkdown>
            </div>
          </div>
          {h.suggested_change && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Suggested change</p>
                <button onClick={() => onCopy(h.suggested_change!)}
                  className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors">
                  {copied === h.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copied === h.id ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/60 border border-zinc-800 rounded-md px-3 py-2.5">{h.suggested_change}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
              Expected impact{agentKpi ? ` on ${agentKpi}` : ''}
            </p>
            <div className="flex items-start gap-3">
              <ImpactDots score={h.impact_score} />
              <div>
                <p className={`text-xs font-semibold ${impact.color}`}>{impact.level}</p>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{impact.reason}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
            <button onClick={e => { e.stopPropagation(); onToggleAsk() }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${isAsking ? 'border-violet-600 bg-violet-500/10 text-violet-400' : 'border-zinc-700 text-zinc-400 hover:border-violet-600 hover:text-violet-400'}`}>
              <Sparkles className="h-3 w-3" /> Update hypothesis
            </button>
            <button onClick={e => { e.stopPropagation(); onPreview() }} disabled={previewLoading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-400 hover:border-blue-600 hover:text-blue-400 transition-colors disabled:opacity-40">
              {previewLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
              {previewLoading ? 'Generating…' : 'Preview'}
            </button>
            {isAccepted && (
              <button onClick={e => { e.stopPropagation(); onCopy(h.suggested_change ?? '') }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors">
                <GitBranch className="h-3 w-3" /> Create PR
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {h.status === 'proposed' && (
                <button onClick={e => { e.stopPropagation(); onAccept() }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-400 hover:border-emerald-600 hover:text-emerald-400 transition-colors">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                </button>
              )}
              {h.status !== 'rejected' && (
                <button onClick={e => { e.stopPropagation(); onReject() }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-500 hover:border-red-700 hover:text-red-400 transition-colors">
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
              )}
            </div>
          </div>
          {isAsking && (
            <div className="border border-zinc-800 rounded-lg bg-zinc-950/60 p-4">
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-3">Ask about this hypothesis</p>
              {chatMsgs.length > 0 && (
                <div className="space-y-3 mb-3 max-h-64 overflow-y-auto">
                  {chatMsgs.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}>
                        {msg.role === 'assistant' && msg.tool_called && (
                          <div className="mb-1.5 inline-flex items-center gap-1 bg-emerald-900/50 border border-emerald-700/50 rounded px-1.5 py-0.5 text-[10px] text-emerald-400">
                            <Check className="h-2.5 w-2.5" /> Saved: {msg.tool_called.replace(/_/g, ' ')}
                          </div>
                        )}
                        {msg.role === 'assistant' ? (
                          <ReactMarkdown components={{
                            p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-1.5 space-y-0.5">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-1.5 space-y-0.5">{children}</ol>,
                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            code: ({ children }) => <code className="bg-zinc-900 rounded px-1 py-0.5 font-mono text-[10px] text-violet-300">{children}</code>,
                            h1: ({ children }) => <p className="font-semibold text-zinc-100 mb-1">{children}</p>,
                            h2: ({ children }) => <p className="font-semibold text-zinc-100 mb-1">{children}</p>,
                            h3: ({ children }) => <p className="font-semibold text-zinc-200 mb-0.5">{children}</p>,
                          }}>{msg.content}</ReactMarkdown>
                        ) : msg.content}
                      </div>
                    </div>
                  ))}
                  {chatIsLoading && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-500">
                        <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> Thinking…
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={chatInputVal}
                  onChange={e => onChatInputChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onAsk()}
                  placeholder={chatMsgs.length === 0 ? 'Debate this hypothesis or ask what data supports it…' : 'Push back, refine, or ask a follow-up…'}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                />
                <button onClick={onAsk} disabled={!chatInputVal.trim() || chatIsLoading}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-md disabled:opacity-40 transition-colors">
                  Ask
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
