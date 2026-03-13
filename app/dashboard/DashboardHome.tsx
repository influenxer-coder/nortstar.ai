'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Bot, Plus, FolderOpen, ChevronRight, ArrowRight } from 'lucide-react'

const DRAFT_KEY = 'northstar_create_product_draft'

export type ProductWithAgents = {
  id: string
  name: string
  created_at: string
  agents: { id: string; name: string; status: string | null; url: string | null }[]
}

export type UngroupedAgents = { id: string; name: string; status: string | null; url: string | null }[]

type Props = {
  products: ProductWithAgents[]
  ungroupedAgents: UngroupedAgents
  userDisplayName: string
}

function domainFromUrl(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    const host = u.hostname.replace(/^www\./, '')
    return host.split('.')[0] || 'My Product'
  } catch {
    return 'My Product'
  }
}

function loadDraft(): { productUrl: string; docUrl: string } {
  if (typeof sessionStorage === 'undefined') return { productUrl: '', docUrl: '' }
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return { productUrl: '', docUrl: '' }
    const d = JSON.parse(raw) as { productUrl?: string; docUrl?: string }
    return { productUrl: d.productUrl ?? '', docUrl: d.docUrl ?? '' }
  } catch {
    return { productUrl: '', docUrl: '' }
  }
}

function saveDraft(productUrl: string, docUrl: string) {
  if (typeof sessionStorage === 'undefined') return
  try {
    if (!productUrl.trim() && !docUrl.trim()) {
      sessionStorage.removeItem(DRAFT_KEY)
      return
    }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ productUrl, docUrl }))
  } catch { /* ignore */ }
}

export default function DashboardHome({ products, ungroupedAgents, userDisplayName }: Props) {
  const router = useRouter()
  const [showCreateProductModal, setShowCreateProductModal] = useState(false)
  const [productUrl, setProductUrl] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docUrl, setDocUrl] = useState('')
  const [starting, setStarting] = useState(false)
  const [currentProject, setCurrentProject] = useState<{ id: string; name: string | null } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Restore draft when opening modal
  useEffect(() => {
    if (showCreateProductModal) {
      const draft = loadDraft()
      if (draft.productUrl || draft.docUrl) {
        setProductUrl(draft.productUrl)
        setDocUrl(draft.docUrl)
      }
    }
  }, [showCreateProductModal])

  // Persist draft when URL fields change (debounced)
  useEffect(() => {
    if (!showCreateProductModal) return
    const t = setTimeout(() => saveDraft(productUrl, docUrl), 500)
    return () => clearTimeout(t)
  }, [showCreateProductModal, productUrl, docUrl])

  // Load current project from localStorage so "back" still shows progress
  useEffect(() => {
    const id = typeof localStorage !== 'undefined' ? localStorage.getItem('northstar_current_project_id') : null
    if (!id) {
      setCurrentProject(null)
      return
    }
    const supabase = createClient()
    void supabase
      .from('projects')
      .select('id, name')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setCurrentProject(null)
          return
        }
        setCurrentProject({ id: data.id, name: data.name })
      })
  }, [])

  const canContinue =
    productUrl.trim() !== '' || docFile !== null || docUrl.trim() !== ''

  const handleContinue = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canContinue || starting) return
    setStarting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const name = productUrl.trim() ? domainFromUrl(productUrl.trim()) : 'My Product'
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name,
          url: productUrl.trim() || null,
          doc_url: docUrl.trim() || null,
          has_doc: !!docFile,
          enrichment_status: 'running',
          user_id: user.id,
        })
        .select('id')
        .single()
      if (error) throw error
      const projectId = data?.id
      if (!projectId) throw new Error('No project id')
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('northstar_current_project_id', projectId)
      }
      fetch('/api/enrich-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          url: productUrl.trim() || undefined,
          docUrl: docUrl.trim() || undefined,
        }),
      }).catch(() => {})
      setShowCreateProductModal(false)
      setProductUrl('')
      setDocFile(null)
      setDocUrl('')
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(DRAFT_KEY)
      router.push(`/onboarding/documents?projectId=${projectId}`)
    } catch (err) {
      console.error(err)
      setStarting(false)
    } finally {
      setStarting(false)
    }
  }, [canContinue, starting, productUrl, docUrl, docFile, router])

  const hasAny = products.length > 0 || ungroupedAgents.length > 0

  const inputClass =
    'w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-[14px] py-3 text-[14px] text-[#f0f0f0] placeholder:text-zinc-500 transition-[border-color] duration-150 focus:outline-none focus:border-[#4f8ef7]'
  const labelClass = 'block text-[11px] text-[#888] uppercase tracking-[0.08em] mb-1.5'

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && /\.(pdf|pptx?|docx?)$/i.test(f.name)) setDocFile(f)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), [])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Current project in progress — show when user comes back from onboarding */}
      {currentProject && (
        <div
          className="mb-6 rounded-xl border border-[#2a2a2a] p-4 flex items-center justify-between gap-4"
          style={{ background: '#141414' }}
        >
          <div>
            <p className="text-xs text-[#555] uppercase tracking-wider mb-0.5">Current setup</p>
            <p className="text-[#f0f0f0] font-medium">
              {currentProject.name || 'New project'}
            </p>
          </div>
          <Link
            href={`/onboarding/documents?projectId=${currentProject.id}`}
            className="shrink-0 inline-flex items-center gap-2 text-sm font-medium text-[#4f8ef7] hover:text-[#3d7de8] transition-colors"
          >
            Continue setup
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Create product modal — Screen 1 */}
      {showCreateProductModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-product-heading"
        >
          <div
            className="relative w-full max-w-[580px] rounded-xl transition-opacity duration-150"
            style={{
              background: '#141414',
              border: '1px solid #2a2a2a',
              padding: '40px 44px',
            }}
          >
            <div className="flex justify-end items-center gap-2 mb-6">
              <span className="text-xs text-[#555]">Step 1 of 6</span>
              <button
                type="button"
                onClick={() => {
                  saveDraft(productUrl, docUrl)
                  setShowCreateProductModal(false)
                }}
                className="w-8 h-8 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors duration-150"
                aria-label="Close"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>

            <h2 id="create-product-heading" className="text-[22px] font-medium text-[#f0f0f0] mb-2">
              Tell NorthStar about your product
            </h2>
            <p className="text-sm text-[#666] mb-8">
              Share your product URL and strategy doc. NorthStar will start learning about your company immediately.
            </p>

            <form onSubmit={handleContinue}>
              <div className="mb-4">
                <label htmlFor="product-website" className={labelClass}>
                  PRODUCT WEBSITE
                </label>
                <input
                  id="product-website"
                  type="url"
                  placeholder="https://yourproduct.com"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  className={inputClass}
                  disabled={starting}
                  autoFocus
                />
              </div>

              <div className="my-4 flex items-center gap-4">
                <div className="flex-1 h-px bg-[#1f1f1f]" />
                <span className="text-xs text-[#444]">and / or</span>
                <div className="flex-1 h-px bg-[#1f1f1f]" />
              </div>

              <div className="mb-4">
                <label className={labelClass}>PRODUCT STRATEGY DOC</label>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => !docFile && fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && !docFile && fileInputRef.current?.click()}
                  className="rounded-lg border border-dashed border-[#2a2a2a] p-7 flex flex-col items-center justify-center gap-2 mb-3 cursor-pointer"
                  style={{ background: '#0d0d0d' }}
                >
                  {docFile ? (
                    <div className="flex items-center justify-between w-full gap-2 text-sm text-[#f0f0f0]">
                      <span className="truncate">{docFile.name}</span>
                      <span className="text-[#555] shrink-0">
                        ({(docFile.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={() => setDocFile(null)}
                        className="shrink-0 text-[#666] hover:text-[#f0f0f0] px-1"
                        aria-label="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-[#444]"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <p className="text-sm text-[#666]">Drop a PDF, PPTX, or DOCX here</p>
                      <p className="text-xs text-[#444]">or paste a Notion or Google Doc URL below</p>
                    </>
                  )}
                </div>
                <input
                  type="url"
                  placeholder="https://notion.so/your-strategy-doc"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  className={inputClass}
                  disabled={starting}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.pptx,.ppt,.docx,.doc"
                  className="hidden"
                  aria-hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setDocFile(f)
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={!canContinue}
                className={`w-full h-11 rounded-lg text-sm font-medium mt-8 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${starting ? 'animate-pulse' : ''}`}
                style={{
                  background: canContinue && !starting ? '#4f8ef7' : '#1a1a2a',
                  color: canContinue && !starting ? '#fff' : '#888',
                }}
                onMouseEnter={(e) => {
                  if (canContinue && !starting) e.currentTarget.style.background = '#3d7de8'
                }}
                onMouseLeave={(e) => {
                  if (canContinue && !starting) e.currentTarget.style.background = '#4f8ef7'
                }}
              >
                {starting ? 'Starting your agent...' : 'Continue →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Org level */}
      <div className="mb-8">
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
          Organization
        </p>
        <h1 className="text-2xl font-bold text-zinc-100">
          {userDisplayName}&apos;s workspace
        </h1>
      </div>

      {/* Create product button */}
      <div className="mb-8">
        <Button
          type="button"
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100 gap-2"
          onClick={() => setShowCreateProductModal(true)}
        >
          <FolderOpen className="h-4 w-4" />
          Create product
        </Button>
      </div>

      {/* Hierarchy: Products and their agents */}
      {!hasAny ? (
        <div className="border border-zinc-800 rounded-xl p-12 text-center bg-zinc-900/30">
          <FolderOpen className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">No products yet</h2>
          <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
            Create a product to group your feature agents. Each product can have multiple agents working on different parts of the experience.
          </p>
          <Button
            type="button"
            className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
            onClick={() => setShowCreateProductModal(true)}
          >
            <Plus className="h-4 w-4" />
            Create your first product
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {products.map((product) => (
            <section
              key={product.id}
              className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-violet-400 shrink-0" />
                  <h2 className="font-semibold text-zinc-100">{product.name}</h2>
                </div>
                <Link
                  href={`/dashboard/agents/new?product_id=${encodeURIComponent(product.id)}`}
                >
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add agent
                  </Button>
                </Link>
              </div>
              <ul className="divide-y divide-zinc-800">
                {product.agents.length === 0 ? (
                  <li className="px-5 py-6 text-center text-sm text-zinc-500">
                    No agents yet. Add an agent to get started.
                  </li>
                ) : (
                  product.agents.map((agent) => (
                    <li key={agent.id}>
                      <Link
                        href={`/dashboard/agents/${agent.id}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-zinc-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-zinc-100 truncate">{agent.name}</p>
                          {agent.url && (
                            <p className="text-xs text-zinc-500 truncate">{agent.url}</p>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500 shrink-0">
                          {agent.status || '—'}
                        </span>
                        <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ))}

          {/* Ungrouped agents (no product) */}
          {ungroupedAgents.length > 0 && (
            <section className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30 border-dashed">
              <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-zinc-500 shrink-0" />
                  <h2 className="font-semibold text-zinc-400">Ungrouped agents</h2>
                </div>
              </div>
              <ul className="divide-y divide-zinc-800">
                {ungroupedAgents.map((agent) => (
                  <li key={agent.id}>
                    <Link
                      href={`/dashboard/agents/${agent.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-zinc-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-zinc-100 truncate">{agent.name}</p>
                        {agent.url && (
                          <p className="text-xs text-zinc-500 truncate">{agent.url}</p>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500 shrink-0">
                        {agent.status || '—'}
                      </span>
                      <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
