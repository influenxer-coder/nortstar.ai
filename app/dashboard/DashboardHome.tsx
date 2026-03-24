'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/logo'
import { Bot, Plus, FolderOpen, ChevronRight, ArrowRight, Trash2, X, Loader2 } from 'lucide-react'

export type ProductWithAgents = {
  id: string
  name: string
  created_at: string
  agents: { id: string; name: string; status: string | null; url: string | null }[]
}

export type UngroupedAgents = { id: string; name: string; status: string | null; url: string | null }[]

type InProgressProject = { id: string; name: string | null; onboarding_step: number | null }

type Props = {
  products: ProductWithAgents[]
  ungroupedAgents: UngroupedAgents
  userDisplayName: string
  dbInProgressProjects?: InProgressProject[]
}

const C = {
  bg: '#f6f6f6',
  surface: '#ffffff',
  text: '#1f2328',
  muted: '#535963',
  border: '#d4d7dc',
  blue: '#367eed',
  shadow: '0 0 0 1px #d4d7dc',
  cardShadow: '0 1px 4px rgba(27,37,40,0.06)',
}

export default function DashboardHome({ products, ungroupedAgents, userDisplayName, dbInProgressProjects = [] }: Props) {
  const router = useRouter()
  const [inProgressProjects, setInProgressProjects] = useState<InProgressProject[]>(dbInProgressProjects)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [inProgressChecked, setInProgressChecked] = useState(dbInProgressProjects.length > 0 || products.length > 0)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalState, setModalState] = useState<'url_input' | 'analyzing'>('url_input')
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (dbInProgressProjects.length > 0) {
      setInProgressProjects(dbInProgressProjects)
      setInProgressChecked(true)
      return
    }
    const id = typeof localStorage !== 'undefined' ? localStorage.getItem('northstar_current_project_id') : null
    if (!id) { setInProgressProjects([]); setInProgressChecked(true); return }
    const supabase = createClient()
    void supabase
      .from('projects')
      .select('id, name, onboarding_step, onboarding_completed')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data || data.onboarding_completed) {
          if (typeof localStorage !== 'undefined') localStorage.removeItem('northstar_current_project_id')
          setInProgressProjects([])
        } else {
          setInProgressProjects([{ id: data.id, name: data.name, onboarding_step: data.onboarding_step }])
        }
        setInProgressChecked(true)
      })
  }, [dbInProgressProjects])

  // Auto-open modal when user has no products and no in-progress setup
  useEffect(() => {
    if (!inProgressChecked) return
    if (products.length === 0 && ungroupedAgents.length === 0 && inProgressProjects.length === 0) {
      openModal()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inProgressChecked])

  // Scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // ESC to close modal
  const closeModal = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setModalOpen(false)
    setModalState('url_input')
    setUrlInput('')
    setUrlError('')
    setLogs([])
    setAnalyzing(false)
  }, [])

  useEffect(() => {
    if (!modalOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [modalOpen, closeModal])

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = modalOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [modalOpen])

  function openModal() {
    setModalState('url_input')
    setUrlInput('')
    setUrlError('')
    setLogs([])
    setAnalyzing(false)
    setModalOpen(true)
  }

  async function analyzeUrl() {
    const trimmed = urlInput.trim()
    if (!trimmed) { setUrlError('Please enter a URL'); return }
    let url: URL
    try {
      url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    } catch {
      setUrlError('Please enter a valid URL')
      return
    }

    setUrlError('')
    setAnalyzing(true)
    setModalState('analyzing')
    setLogs([])

    const endpoint = process.env.NEXT_PUBLIC_ANALYZE_URL_ENDPOINT
    if (!endpoint) {
      setLogs(['Error: NEXT_PUBLIC_ANALYZE_URL_ENDPOINT is not configured.'])
      setAnalyzing(false)
      return
    }

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.toString() }),
        signal: abort.signal,
      })

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => `HTTP ${res.status}`)
        setLogs([`Error: ${text}`])
        setAnalyzing(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let analysisResult: Record<string, unknown> | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue
          try {
            const parsed = JSON.parse(trimmedLine) as Record<string, unknown>
            if (parsed.log && typeof parsed.log === 'string') {
              setLogs((prev) => [...prev, parsed.log as string])
            } else if (parsed.result) {
              analysisResult = parsed.result as Record<string, unknown>
            } else if (parsed.error && typeof parsed.error === 'string') {
              setLogs((prev) => [...prev, `Error: ${parsed.error}`])
            }
          } catch {
            // Non-JSON line, treat as log
            setLogs((prev) => [...prev, trimmedLine])
          }
        }
      }

      // Store result in localStorage and navigate
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('northstar_onboarding', JSON.stringify({
          url: url.toString(),
          analysis_result: analysisResult,
          timestamp: Date.now(),
        }))
      }

      setAnalyzing(false)
      router.push('/onboarding/new?from=dashboard')
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return
      setLogs((prev) => [...prev, `Error: ${(err as Error)?.message ?? 'Unknown error'}`])
      setAnalyzing(false)
    }
  }

  async function deleteProject(id: string) {
    if (!window.confirm('Delete this product and all its data? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    } catch {
      alert('Failed to delete — please try again.')
      setDeletingId(null)
      return
    }
    if (typeof localStorage !== 'undefined') localStorage.removeItem('northstar_current_project_id')
    setInProgressProjects((prev) => prev.filter((p) => p.id !== id))
    setDeletingId(null)
    router.refresh()
  }

  const hasAny = products.length > 0 || ungroupedAgents.length > 0

  return (
    <>
      <div style={{ padding: '40px 32px', maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>
            Workspace
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>
            {userDisplayName}&apos;s workspace
          </h1>
        </div>

        {/* In-progress banners */}
        {inProgressProjects.map((project) => (
          <div
            key={project.id}
            style={{
              marginBottom: 16,
              borderRadius: 10,
              border: `1px solid #f0b429`,
              background: '#fffbeb',
              padding: '16px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#92600a', marginBottom: 2 }}>
                  Product setup in progress
                </p>
                <p style={{ fontSize: 15, fontWeight: 500, color: C.text }}>{project.name || 'New product'}</p>
                {project.onboarding_step && (
                  <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Step {project.onboarding_step} of 5 complete</p>
                )}
              </div>
              <Link
                href={`/onboarding/new?projectId=${project.id}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 13, fontWeight: 600, color: C.blue,
                  textDecoration: 'none', flexShrink: 0,
                }}
              >
                Continue setup
                <ArrowRight style={{ width: 14, height: 14 }} />
              </Link>
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #fde68a' }}>
              <button
                type="button"
                disabled={deletingId === project.id}
                onClick={() => deleteProject(project.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, color: C.muted, background: 'none', border: 'none',
                  cursor: 'pointer', padding: 0, opacity: deletingId === project.id ? 0.4 : 1,
                }}
              >
                <Trash2 style={{ width: 12, height: 12 }} />
                {deletingId === project.id ? 'Deleting…' : 'Delete product'}
              </button>
            </div>
          </div>
        ))}

        {/* Create product button */}
        <div style={{ marginBottom: 32 }}>
          <button
            type="button"
            onClick={openModal}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 30,
              background: C.text, color: '#fff',
              fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer',
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Create product
          </button>
        </div>

        {/* Empty state */}
        {!hasAny ? (
          <div style={{
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: '64px 32px',
            textAlign: 'center',
            background: C.surface,
            boxShadow: C.cardShadow,
          }}>
            <FolderOpen style={{ width: 40, height: 40, color: C.border, margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 8 }}>No products yet</h2>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
              Create a product to group your feature agents. Each product can have multiple agents working on different parts of the experience.
            </p>
            <button
              type="button"
              onClick={openModal}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '11px 24px', borderRadius: 30,
                background: C.text, color: '#fff',
                fontSize: 14, fontWeight: 600,
                border: 'none', cursor: 'pointer',
              }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              Create your first product
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {products.map((product) => (
              <section
                key={product.id}
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: C.surface,
                  boxShadow: C.cardShadow,
                }}
              >
                {/* Product header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderBottom: `1px solid ${C.border}`,
                  background: C.bg,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FolderOpen style={{ width: 15, height: 15, color: C.blue, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{product.name}</span>
                  </div>
                  <Link href={`/dashboard/agents/new?product_id=${encodeURIComponent(product.id)}`} style={{ textDecoration: 'none' }}>
                    <button
                      type="button"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', borderRadius: 30,
                        background: C.blue, color: '#fff',
                        fontSize: 12, fontWeight: 600,
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      <Plus style={{ width: 12, height: 12 }} />
                      Add agent
                    </button>
                  </Link>
                </div>

                {/* Agent list */}
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {product.agents.length === 0 ? (
                    <li style={{ padding: '20px 24px', textAlign: 'center', fontSize: 13, color: C.muted }}>
                      No agents yet. Add an agent to get started.
                    </li>
                  ) : (
                    product.agents.map((agent, i) => (
                      <li key={agent.id} style={{ borderTop: i > 0 ? `1px solid ${C.border}` : undefined }}>
                        <Link
                          href={`/dashboard/agents/${agent.id}`}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', textDecoration: 'none' }}
                          className="agent-row"
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: C.bg, border: `1px solid ${C.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Bot style={{ width: 15, height: 15, color: C.muted }} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: 14, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</p>
                            {agent.url && <p style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.url}</p>}
                          </div>
                          {agent.status && (
                            <span style={{
                              fontSize: 11, fontWeight: 500, color: C.muted,
                              background: C.bg, border: `1px solid ${C.border}`,
                              borderRadius: 30, padding: '2px 10px', flexShrink: 0,
                            }}>
                              {agent.status}
                            </span>
                          )}
                          <ChevronRight style={{ width: 15, height: 15, color: C.border, flexShrink: 0 }} />
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            ))}

            {/* Ungrouped agents */}
            {ungroupedAgents.length > 0 && (
              <section style={{
                border: `1px dashed ${C.border}`,
                borderRadius: 10,
                overflow: 'hidden',
                background: C.surface,
                boxShadow: C.cardShadow,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '14px 20px',
                  borderBottom: `1px solid ${C.border}`,
                  background: C.bg,
                }}>
                  <Bot style={{ width: 15, height: 15, color: C.muted, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>Ungrouped agents</span>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {ungroupedAgents.map((agent, i) => (
                    <li key={agent.id} style={{ borderTop: i > 0 ? `1px solid ${C.border}` : undefined }}>
                      <Link
                        href={`/dashboard/agents/${agent.id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', textDecoration: 'none' }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: C.bg, border: `1px solid ${C.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Bot style={{ width: 15, height: 15, color: C.muted }} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</p>
                          {agent.url && <p style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.url}</p>}
                        </div>
                        {agent.status && (
                          <span style={{
                            fontSize: 11, fontWeight: 500, color: C.muted,
                            background: C.bg, border: `1px solid ${C.border}`,
                            borderRadius: 30, padding: '2px 10px', flexShrink: 0,
                          }}>
                            {agent.status}
                          </span>
                        )}
                        <ChevronRight style={{ width: 15, height: 15, color: C.border, flexShrink: 0 }} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Full-screen modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(31,35,40,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div
            style={{
              background: C.surface,
              borderRadius: 16,
              width: '100%',
              maxWidth: 540,
              boxShadow: '0 8px 40px rgba(27,37,40,0.18)',
              overflow: 'hidden',
              animation: 'slideUp 0.18s ease',
            }}
          >
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: `1px solid ${C.border}`,
              background: C.bg,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Logo size={24} color="purple" />
                <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
                  {modalState === 'url_input' ? 'Create a product' : 'Analyzing your product…'}
                </span>
              </div>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 6,
                  border: `1px solid ${C.border}`, background: C.surface,
                  cursor: 'pointer', color: C.muted,
                }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '28px 24px' }}>
              {modalState === 'url_input' ? (
                <>
                  <p style={{ fontSize: 14, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>
                    Enter your product&apos;s URL. NorthStar will analyze it to understand your product, identify growth opportunities, and set up your first agent.
                  </p>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                      Product URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://yourproduct.com"
                      value={urlInput}
                      onChange={(e) => { setUrlInput(e.target.value); setUrlError('') }}
                      onKeyDown={(e) => { if (e.key === 'Enter') void analyzeUrl() }}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: `1px solid ${urlError ? '#e53e3e' : C.border}`,
                        fontSize: 14,
                        color: C.text,
                        background: C.surface,
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                      }}
                    />
                    {urlError && (
                      <p style={{ fontSize: 12, color: '#e53e3e', marginTop: 6 }}>{urlError}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={closeModal}
                      style={{
                        padding: '9px 18px', borderRadius: 30,
                        border: `1px solid ${C.border}`, background: C.surface,
                        fontSize: 13, fontWeight: 600, color: C.muted,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void analyzeUrl()}
                      style={{
                        padding: '9px 20px', borderRadius: 30,
                        border: 'none', background: C.blue, color: '#fff',
                        fontSize: 13, fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      Analyze product
                      <ArrowRight style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
                  }}>
                    <Loader2 style={{ width: 16, height: 16, color: C.blue, animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontSize: 14, color: C.muted }}>
                      {analyzing ? 'Running analysis — this takes about 30 seconds…' : 'Analysis complete. Redirecting…'}
                    </p>
                  </div>
                  <div style={{
                    background: '#0d1117',
                    borderRadius: 8,
                    padding: '14px 16px',
                    minHeight: 200,
                    maxHeight: 280,
                    overflowY: 'auto',
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: 12,
                    lineHeight: 1.7,
                    color: '#7ee787',
                    border: `1px solid #30363d`,
                  }}>
                    {logs.length === 0 ? (
                      <span style={{ color: '#8b949e' }}>Starting analysis…</span>
                    ) : (
                      logs.map((log, i) => (
                        <div key={i} style={{
                          color: log.startsWith('Error:') ? '#f85149' : '#7ee787',
                        }}>
                          <span style={{ color: '#8b949e', marginRight: 8 }}>{'>'}</span>
                          {log}
                        </div>
                      ))
                    )}
                    <div ref={logsEndRef} />
                  </div>
                  {!analyzing && (
                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => router.push('/onboarding/new?from=dashboard')}
                        style={{
                          padding: '9px 20px', borderRadius: 30,
                          border: 'none', background: C.blue, color: '#fff',
                          fontSize: 13, fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        Continue setup
                        <ArrowRight style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
}
