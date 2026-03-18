'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Bot, Plus, FolderOpen, ChevronRight, ArrowRight } from 'lucide-react'

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
  dbInProgressProject?: { id: string; name: string | null; onboarding_step: number | null } | null
}

export default function DashboardHome({ products, ungroupedAgents, userDisplayName, dbInProgressProject = null }: Props) {
  const [currentProject, setCurrentProject] = useState<{ id: string; name: string | null; onboarding_step: number | null } | null>(dbInProgressProject)

  // Use DB project as source of truth; fall back to localStorage only if DB returned nothing
  useEffect(() => {
    if (dbInProgressProject) {
      setCurrentProject(dbInProgressProject)
      return
    }
    const id = typeof localStorage !== 'undefined' ? localStorage.getItem('northstar_current_project_id') : null
    if (!id) { setCurrentProject(null); return }
    const supabase = createClient()
    void supabase
      .from('projects')
      .select('id, name, onboarding_step, onboarding_completed')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data || data.onboarding_completed) {
          if (!error && data?.onboarding_completed) {
            if (typeof localStorage !== 'undefined') localStorage.removeItem('northstar_current_project_id')
          }
          setCurrentProject(null)
          return
        }
        setCurrentProject({ id: data.id, name: data.name, onboarding_step: data.onboarding_step })
      })
  }, [dbInProgressProject])

  const hasAny = products.length > 0 || ungroupedAgents.length > 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Org level */}
      <div className="mb-8">
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Organization</p>
        <h1 className="text-2xl font-bold text-zinc-100">{userDisplayName}&apos;s workspace</h1>
      </div>

      {/* In-progress product setup banner */}
      {currentProject && (
        <div
          className="mb-6 rounded-xl border border-[#2a2a2a] p-4 flex items-center justify-between gap-4"
          style={{ background: '#141414' }}
        >
          <div>
            <p className="text-xs text-[#555] uppercase tracking-wider mb-0.5">Product setup in progress</p>
            <p className="text-[#f0f0f0] font-medium">{currentProject.name || 'New product'}</p>
            {currentProject.onboarding_step && (
              <p className="text-xs text-[#444] mt-0.5">Step {currentProject.onboarding_step} of 5 complete</p>
            )}
          </div>
          <Link
            href={`/onboarding/product?projectId=${currentProject.id}&step=${currentProject.onboarding_step ?? 1}`}
            className="shrink-0 inline-flex items-center gap-2 text-sm font-medium text-[#4f8ef7] hover:text-[#3d7de8] transition-colors"
          >
            Continue setup
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Create product CTA */}
      <div className="mb-8">
        <Link href="/onboarding/product">
          <Button
            type="button"
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100 gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            Create product
          </Button>
        </Link>
      </div>

      {/* Hierarchy: Products and their agents */}
      {!hasAny ? (
        <div className="border border-zinc-800 rounded-xl p-12 text-center bg-zinc-900/30">
          <FolderOpen className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">No products yet</h2>
          <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
            Create a product to group your feature agents. Each product can have multiple agents working on different parts of the experience.
          </p>
          <Link href="/onboarding/product">
            <Button type="button" className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
              <Plus className="h-4 w-4" />
              Create your first product
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {products.map((product) => (
            <section key={product.id} className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-violet-400 shrink-0" />
                  <h2 className="font-semibold text-zinc-100">{product.name}</h2>
                </div>
                <Link href={`/dashboard/agents/new?product_id=${encodeURIComponent(product.id)}`}>
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add agent
                  </Button>
                </Link>
              </div>
              <ul className="divide-y divide-zinc-800">
                {product.agents.length === 0 ? (
                  <li className="px-5 py-6 text-center text-sm text-zinc-500">No agents yet. Add an agent to get started.</li>
                ) : (
                  product.agents.map((agent) => (
                    <li key={agent.id}>
                      <Link href={`/dashboard/agents/${agent.id}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/50 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-zinc-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-zinc-100 truncate">{agent.name}</p>
                          {agent.url && <p className="text-xs text-zinc-500 truncate">{agent.url}</p>}
                        </div>
                        <span className="text-xs text-zinc-500 shrink-0">{agent.status || '—'}</span>
                        <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ))}

          {/* Ungrouped agents */}
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
                    <Link href={`/dashboard/agents/${agent.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-zinc-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-zinc-100 truncate">{agent.name}</p>
                        {agent.url && <p className="text-xs text-zinc-500 truncate">{agent.url}</p>}
                      </div>
                      <span className="text-xs text-zinc-500 shrink-0">{agent.status || '—'}</span>
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
