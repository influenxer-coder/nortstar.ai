'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, XCircle, MessageSquare, GitBranch, BarChart2,
  FileText, Upload, Trash2, Loader2, Plus, RefreshCw, ChevronRight,
  Sparkles, Copy, Check,
} from 'lucide-react'
import type { Agent, Hypothesis } from '@/lib/types'
import AgentAnalysisLogs from './AgentAnalysisLogs'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentStub { id: string; name: string; status: string | null }
interface Doc { file_name: string; created_at: string }
interface ChatMsg { role: 'user' | 'assistant'; content: string }

interface Props {
  agent: Agent
  agents: AgentStub[]
  initialHypotheses: Hypothesis[]
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function ImpactDots({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${i <= score ? 'bg-violet-500' : 'bg-zinc-700'}`}
        />
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

function SourceRow({
  icon, label, connected, href, onAction, actionLabel,
}: {
  icon: React.ReactNode
  label: string
  connected: boolean
  href?: string
  onAction?: () => void
  actionLabel?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`shrink-0 ${connected ? 'text-emerald-400' : 'text-zinc-600'}`}>{icon}</span>
        <span className={`text-xs truncate ${connected ? 'text-zinc-300' : 'text-zinc-500'}`}>{label}</span>
        {connected && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500" />}
      </div>
      {!connected && href && (
        <a href={href} className="text-[10px] text-violet-400 hover:text-violet-300 shrink-0">
          {actionLabel ?? 'Connect'}
        </a>
      )}
      {!connected && onAction && (
        <button onClick={onAction} className="text-[10px] text-violet-400 hover:text-violet-300 shrink-0">
          {actionLabel ?? 'Connect'}
        </button>
      )}
    </div>
  )
}

// ─── Main workspace ───────────────────────────────────────────────────────────

export default function AgentWorkspace({ agent, agents, initialHypotheses }: Props) {
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

  // ── Analysis state ─────────────────────────────────────────────────────────
  const [reanalyzing, setReanalyzing] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Copy state ─────────────────────────────────────────────────────────────
  const [copied, setCopied] = useState<string | null>(null)

  // ── PostHog connect state ────────────────────────────────────────────────
  const resolvedPhKey = agent.posthog_api_key ?? agent.analytics_config?.posthog?.api_key ?? null
  const resolvedPhProject = agent.posthog_project_id ?? agent.analytics_config?.posthog?.project_id ?? null
  const [phKey, setPhKey] = useState<string | null>(resolvedPhKey)
  const [phProject, setPhProject] = useState<string | null>(resolvedPhProject)
  const [phExpanded, setPhExpanded] = useState(false)
  const [phForm, setPhForm] = useState({ api_key: '', project_id: '' })
  const [phSaving, setPhSaving] = useState(false)
  const [phError, setPhError] = useState('')

  const handlePhConnect = async () => {
    if (!phForm.api_key.trim() || !phForm.project_id.trim()) {
      setPhError('Both fields are required')
      return
    }
    setPhSaving(true)
    setPhError('')
    const vRes = await fetch('/api/posthog/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posthog_api_key: phForm.api_key.trim(), posthog_project_id: phForm.project_id.trim() }),
    })
    const vData = await vRes.json()
    if (!vData.valid) {
      setPhError(vData.error ?? 'Invalid credentials')
      setPhSaving(false)
      return
    }
    await fetch(`/api/agents/${agent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posthog_api_key: phForm.api_key.trim(), posthog_project_id: phForm.project_id.trim() }),
    })
    setPhKey(phForm.api_key.trim())
    setPhProject(phForm.project_id.trim())
    setPhExpanded(false)
    setPhSaving(false)
    setPhForm({ api_key: '', project_id: '' })
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
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      })
      const data = await res.json()
      setChatHistory(prev => ({
        ...prev,
        [hid]: [...newHistory, { role: 'assistant', content: data.reply ?? 'No response' }],
      }))
    } catch {
      setChatHistory(prev => ({
        ...prev,
        [hid]: [...newHistory, { role: 'assistant', content: 'Failed to get a response. Try again.' }],
      }))
    } finally {
      setChatLoading(prev => ({ ...prev, [hid]: false }))
    }
  }

  // ── Re-analyze ─────────────────────────────────────────────────────────────
  const handleReanalyze = useCallback(async () => {
    setReanalyzing(true)
    await fetch(`/api/agents/${agent.id}/analyze`, { method: 'POST' })
    // Poll for new hypotheses
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/agents/${agent.id}/hypotheses`)
      if (res.ok) {
        const data: Hypothesis[] = await res.json()
        if (data.length > 0) {
          setHypotheses(data)
          setReanalyzing(false)
          if (pollRef.current) clearInterval(pollRef.current)
        }
      }
    }, 4000)
  }, [agent.id])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  // ── Document actions ───────────────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/agents/${agent.id}/documents`, { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) {
      setUploadError(data.error || 'Upload failed')
    } else {
      const docsRes = await fetch(`/api/agents/${agent.id}/documents`)
      const docsData = await docsRes.json()
      setDocs(Array.isArray(docsData) ? docsData : [])
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDeleteDoc = async (fileName: string) => {
    await fetch(`/api/agents/${agent.id}/documents?file_name=${encodeURIComponent(fileName)}`, { method: 'DELETE' })
    setDocs(prev => prev?.filter(d => d.file_name !== fileName) ?? [])
  }

  // ── Instructions ───────────────────────────────────────────────────────────
  const saveInstructions = async () => {
    setInstructionsSaving(true)
    await fetch(`/api/agents/${agent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system_instructions: instructions }),
    })
    setInstructionsSaving(false)
    setInstructionsSaved(true)
    setTimeout(() => setInstructionsSaved(false), 2000)
  }

  // ── Copy ───────────────────────────────────────────────────────────────────
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasHypotheses = hypotheses.length > 0
  const targetDesc = agent.target_element?.text ?? null

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090B]">

      {/* ── Left panel ──────────────────────────────────────────────────────── */}
      <div className="w-60 shrink-0 border-r border-zinc-800 flex flex-col overflow-hidden">

        {/* Agent picker */}
        <div className="border-b border-zinc-800 p-3">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2 px-1">Projects</p>
          <div className="space-y-0.5">
            {agents.map(a => (
              <Link
                key={a.id}
                href={`/dashboard/agents/${a.id}`}
                className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors group ${
                  a.id === agent.id
                    ? 'bg-violet-500/15 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
                }`}
              >
                <div className={`w-5 h-5 rounded shrink-0 flex items-center justify-center text-[10px] font-bold ${
                  a.id === agent.id ? 'bg-violet-500 text-white' : 'bg-zinc-700 text-zinc-400'
                }`}>
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs truncate font-medium">{a.name}</span>
                {a.id === agent.id && <ChevronRight className="h-3 w-3 ml-auto shrink-0 text-violet-400" />}
              </Link>
            ))}
            <Link
              href="/dashboard/agents/new"
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="text-xs">New agent</span>
            </Link>
          </div>
        </div>

        {/* Sources */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5">

          {/* Analytics */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5 px-1">Analytics</p>
            <SourceRow
              icon={<BarChart2 className="h-3.5 w-3.5" />}
              label={phKey ? `PostHog${phProject ? ` · ${phProject}` : ''}` : 'PostHog'}
              connected={!!phKey}
              onAction={!phKey ? () => setPhExpanded(v => !v) : undefined}
              actionLabel="Connect"
            />
            {phExpanded && !phKey && (
              <div className="mt-2 px-1 space-y-2">
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  Find your keys in PostHog → Settings → Project.
                </p>
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
                  <button
                    onClick={handlePhConnect}
                    disabled={phSaving}
                    className="flex-1 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-medium disabled:opacity-50 transition-colors"
                  >
                    {phSaving ? 'Connecting…' : 'Connect'}
                  </button>
                  <button
                    onClick={() => { setPhExpanded(false); setPhError(''); setPhForm({ api_key: '', project_id: '' }) }}
                    className="px-2 py-1 rounded border border-zinc-700 text-zinc-500 text-[10px] hover:text-zinc-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Codebase */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5 px-1">Codebase</p>
            <SourceRow
              icon={<GitBranch className="h-3.5 w-3.5" />}
              label={agent.github_repo ?? 'GitHub'}
              connected={!!agent.github_repo}
              href="/dashboard/agents/new"
              actionLabel="Connect"
            />
          </div>

          {/* Slack */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5 px-1">Slack</p>
            <SourceRow
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              label={agent.slack_channel_id ? 'Workspace connected' : 'Not connected'}
              connected={!!agent.slack_channel_id}
              href={`/api/auth/slack?agent_id=${agent.id}`}
              actionLabel="Connect"
            />
            {agent.slack_channel_id && (
              <a
                href={`/api/auth/slack?agent_id=${agent.id}`}
                className="text-[10px] text-zinc-600 hover:text-zinc-400 mt-1 block px-6"
              >
                Reconnect →
              </a>
            )}
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
                    <button
                      onClick={() => handleDeleteDoc(doc.file_name)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 shrink-0 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleUpload}
                  className="hidden"
                  id="ws-doc-upload"
                />
                <label
                  htmlFor="ws-doc-upload"
                  className={`flex items-center gap-1.5 text-xs px-1 py-1.5 rounded cursor-pointer transition-colors ${
                    uploading ? 'text-zinc-600' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                  }`}
                >
                  {uploading
                    ? <><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</>
                    : <><Upload className="h-3 w-3" /> Upload file</>
                  }
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
            <button
              onClick={saveInstructions}
              disabled={instructionsSaving}
              className="mt-1.5 text-[10px] text-violet-400 hover:text-violet-300 disabled:opacity-50"
            >
              {instructionsSaving ? 'Saving…' : instructionsSaved ? '✓ Saved' : 'Save instructions'}
            </button>
          </div>

        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="border-b border-zinc-800 h-14 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-zinc-100">{agent.name}</h1>
            {agent.status && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                agent.status === 'Ready' || agent.status === 'Analyzing'
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'bg-zinc-800 text-zinc-400'
              }`}>
                {agent.status}
              </span>
            )}
            {targetDesc && (
              <span className="text-xs text-zinc-500 hidden sm:block">
                → <span className="text-zinc-400">{targetDesc}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {agent.url && (
              <a
                href={agent.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-500 hover:text-zinc-300 truncate max-w-[200px]"
              >
                {agent.url}
              </a>
            )}
            <button
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-md px-3 py-1.5 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`h-3 w-3 ${reanalyzing ? 'animate-spin' : ''}`} />
              {reanalyzing ? 'Analyzing…' : 'Re-analyze'}
            </button>
          </div>
        </div>

        {/* Hypothesis table */}
        <div className="flex-1 overflow-auto">
          {!hasHypotheses ? (
            /* Empty state */
            <div className="max-w-xl mx-auto mt-16 px-6">
              <AgentAnalysisLogs agentId={agent.id} hasGithubRepo={!!agent.github_repo} />
              {!reanalyzing && (
                <p className="text-xs text-zinc-600 text-center mt-4">
                  Run analysis to generate improvement hypotheses for this agent.
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800">
                <div className="grid gap-0 px-5 py-2.5" style={{ gridTemplateColumns: '2fr 1fr 3fr 2.5fr 70px 110px 80px' }}>
                  {['Improvement', 'Source', 'Hypothesis', 'Suggested Change', 'Impact', 'Status', ''].map(col => (
                    <div key={col} className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest pr-3">
                      {col}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-zinc-800/50">
                {hypotheses.map(h => (
                  <HypothesisRow
                    key={h.id}
                    hypothesis={h}
                    agentId={agent.id}
                    isAsking={askHypId === h.id}
                    chatMsgs={chatHistory[h.id] ?? []}
                    chatInputVal={chatInput[h.id] ?? ''}
                    chatIsLoading={chatLoading[h.id] ?? false}
                    copied={copied}
                    onToggleAsk={() => setAskHypId(askHypId === h.id ? null : h.id)}
                    onAccept={() => updateStatus(h.id, 'accepted')}
                    onReject={() => updateStatus(h.id, 'rejected')}
                    onChatInputChange={val => setChatInput(prev => ({ ...prev, [h.id]: val }))}
                    onAsk={() => handleAsk(h.id)}
                    onCopy={(text) => handleCopy(text, h.id)}
                  />
                ))}
              </div>

              {reanalyzing && (
                <div className="flex items-center gap-2 px-5 py-4 text-zinc-500 text-xs border-t border-zinc-800">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                  Generating fresh hypotheses — this takes about 60 seconds…
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Hypothesis row ───────────────────────────────────────────────────────────

function HypothesisRow({
  hypothesis: h,
  agentId,
  isAsking,
  chatMsgs,
  chatInputVal,
  chatIsLoading,
  copied,
  onToggleAsk,
  onAccept,
  onReject,
  onChatInputChange,
  onAsk,
  onCopy,
}: {
  hypothesis: Hypothesis
  agentId: string
  isAsking: boolean
  chatMsgs: ChatMsg[]
  chatInputVal: string
  chatIsLoading: boolean
  copied: string | null
  onToggleAsk: () => void
  onAccept: () => void
  onReject: () => void
  onChatInputChange: (v: string) => void
  onAsk: () => void
  onCopy: (text: string) => void
}) {
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isAsking) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMsgs, isAsking])

  const isRejected = h.status === 'rejected'
  const isAccepted = h.status === 'accepted' || h.status === 'shipped'

  return (
    <div className={`transition-colors ${isRejected ? 'opacity-40' : 'hover:bg-zinc-900/30'}`}>
      {/* Main row */}
      <div
        className="group grid gap-0 px-5 py-3.5 cursor-default"
        style={{ gridTemplateColumns: '2fr 1fr 3fr 2.5fr 70px 110px 80px' }}
      >
        {/* Title */}
        <div className="pr-4 flex items-start">
          <p className={`text-sm font-medium text-zinc-100 leading-snug ${isRejected ? 'line-through' : ''}`}>
            {h.title}
          </p>
        </div>

        {/* Source */}
        <div className="pr-3 flex items-start pt-0.5">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 whitespace-nowrap">
            {h.source}
          </span>
        </div>

        {/* Hypothesis */}
        <div className="pr-4 flex items-start">
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{h.hypothesis}</p>
        </div>

        {/* Suggested change */}
        <div className="pr-4 flex items-start">
          <p className="text-xs text-zinc-500 font-mono leading-relaxed line-clamp-3">
            {h.suggested_change ?? '—'}
          </p>
        </div>

        {/* Impact */}
        <div className="flex items-start pt-1">
          <ImpactDots score={h.impact_score} />
        </div>

        {/* Status */}
        <div className="flex items-start pt-0.5">
          <StatusBadge status={h.status} />
        </div>

        {/* Actions */}
        <div className="flex items-start gap-1 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onToggleAsk}
            title="Ask questions"
            className={`w-6 h-6 rounded flex items-center justify-center text-xs transition-colors ${
              isAsking
                ? 'bg-violet-500/20 text-violet-400'
                : 'text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10'
            }`}
          >
            <Sparkles className="h-3 w-3" />
          </button>
          {h.status !== 'rejected' && (
            <button
              onClick={onReject}
              title="Reject"
              className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          )}
          {h.status === 'proposed' && (
            <button
              onClick={onAccept}
              title="Accept"
              className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Accepted: code/change panel */}
      {isAccepted && !isAsking && h.suggested_change && (
        <div className="border-t border-emerald-800/30 bg-emerald-950/10 px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Suggested change</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onCopy(h.suggested_change!)}
                className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300"
              >
                {copied === h.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copied === h.id ? 'Copied' : 'Copy'}
              </button>
              <button
                className="flex items-center gap-1 text-[10px] text-zinc-600 border border-zinc-700 rounded px-2 py-0.5 hover:border-zinc-500 hover:text-zinc-400"
                title="Coming soon"
                disabled
              >
                <GitBranch className="h-3 w-3" />
                Create PR
              </button>
            </div>
          </div>
          <pre className="text-xs text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-md p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {h.suggested_change}
          </pre>
        </div>
      )}

      {/* Ask: inline chat panel */}
      {isAsking && (
        <div className="border-t border-zinc-800 bg-zinc-900/40 px-5 py-4">
          <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-3">
            Ask about this hypothesis
          </p>

          {/* Chat history */}
          {chatMsgs.length > 0 && (
            <div className="space-y-3 mb-3 max-h-64 overflow-y-auto">
              {chatMsgs.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatIsLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-500">
                    <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                    Thinking…
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <input
              value={chatInputVal}
              onChange={e => onChatInputChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onAsk()}
              placeholder={
                chatMsgs.length === 0
                  ? 'Where did this come from? What data supports it?'
                  : 'Ask a follow-up…'
              }
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
            />
            <button
              onClick={onAsk}
              disabled={!chatInputVal.trim() || chatIsLoading}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-md disabled:opacity-40 transition-colors"
            >
              Ask
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
