'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Bot, Plus, FolderOpen, ChevronRight } from 'lucide-react'

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

export default function DashboardHome({ products, ungroupedAgents, userDisplayName }: Props) {
  const router = useRouter()
  const [showCreateProductModal, setShowCreateProductModal] = useState(false)
  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [northStarMetric, setNorthStarMetric] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = productName.trim()
    const description = productDescription.trim()
    const metric = northStarMetric.trim()
    if (!name || !description || !metric) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const { data, error } = await supabase
        .from('projects')
        .insert({ name, description, north_star_metric: metric, user_id: user.id })
        .select('id')
        .single()
      if (error) throw error
      if (data?.id) {
        if (typeof localStorage !== 'undefined') localStorage.setItem('northstar_current_project_id', data.id)
        console.log('Project id:', data.id)
      }
      setShowCreateProductModal(false)
      setProductName('')
      setProductDescription('')
      setNorthStarMetric('')
      setToast('Product created. Step 2 coming next.')
      router.refresh()
    } catch (err) {
      console.error(err)
      setToast('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const canContinue = productName.trim() !== '' && productDescription.trim() !== '' && northStarMetric.trim() !== ''

  const hasAny = products.length > 0 || ungroupedAgents.length > 0

  const inputClass =
    'w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-[14px] py-3 text-[14px] text-[#f0f0f0] placeholder:text-zinc-500 transition-[border-color] duration-150 focus:outline-none focus:border-[#4f8ef7]'
  const labelClass = 'block text-[12px] text-[#888] uppercase tracking-[0.08em] mb-1.5'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm shadow-lg transition-opacity duration-150"
          role="status"
        >
          {toast}
        </div>
      )}

      {/* Create product modal */}
      {showCreateProductModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-product-heading"
        >
          <div
            className="relative w-full max-w-[560px] rounded-xl p-10 transition-opacity duration-150"
            style={{ background: '#141414', border: '1px solid #2a2a2a' }}
          >
            <div className="flex justify-end items-center gap-2 mb-6">
              <span className="text-[12px] text-[#555]">Step 1 of 6</span>
              <button
                type="button"
                onClick={() => setShowCreateProductModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors duration-150"
                aria-label="Close"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>

            <h2 id="create-product-heading" className="text-2xl font-medium text-[#f0f0f0] mb-2">
              What are you building?
            </h2>
            <p className="text-sm text-[#666] mb-8">
              NorthStar will read everything you share and build your intelligence layer automatically.
            </p>

            <form onSubmit={handleCreateProjectSubmit}>
              <div className="mb-6">
                <label htmlFor="product-name" className={labelClass}>
                  Product name
                </label>
                <input
                  id="product-name"
                  type="text"
                  placeholder="e.g. NorthStar AI"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className={inputClass}
                  disabled={saving}
                  autoFocus
                />
              </div>
              <div className="mb-6">
                <label htmlFor="product-description" className={labelClass}>
                  What does it do and who does it serve?
                </label>
                <textarea
                  id="product-description"
                  rows={3}
                  placeholder="e.g. We help PLG SaaS PMs discover what to build next using behavioral data and AI agents"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  className={inputClass}
                  disabled={saving}
                  style={{ resize: 'vertical', minHeight: '72px' }}
                />
              </div>
              <div className="mb-6">
                <label htmlFor="north-star-metric" className={labelClass}>
                  What is the single metric that proves it&apos;s working?
                </label>
                <input
                  id="north-star-metric"
                  type="text"
                  placeholder="e.g. Weekly active PMs who ship a hypothesis-driven feature"
                  value={northStarMetric}
                  onChange={(e) => setNorthStarMetric(e.target.value)}
                  className={inputClass}
                  disabled={saving}
                />
                <p className="mt-1.5 text-[12px] text-[#555]">
                  Every agent and hypothesis will be ranked against this metric.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving || !canContinue}
                className="w-full h-11 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: canContinue && !saving ? '#4f8ef7' : '#1a1a1a',
                  color: canContinue && !saving ? '#fff' : '#888',
                }}
                onMouseEnter={(e) => {
                  if (canContinue && !saving) e.currentTarget.style.background = '#3d7de8'
                }}
                onMouseLeave={(e) => {
                  if (canContinue && !saving) e.currentTarget.style.background = '#4f8ef7'
                }}
              >
                {saving ? 'Saving...' : 'Continue →'}
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
