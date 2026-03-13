'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bot, Plus, FolderOpen, ChevronRight, Loader2 } from 'lucide-react'

export type ProductWithAgents = {
  id: string
  name: string
  created_at: string
  agents: { id: string; name: string; status: string | null; url: string | null }[]
}

export type UngroupedAgents = { id: string; name: string; status: string | null; url: string | null }[]

type Props = {
  products: ProductWithAgents[]
  ungroupedAgents: UngroupedAgents  // already an array type
  userDisplayName: string
}

export default function DashboardHome({ products, ungroupedAgents, userDisplayName }: Props) {
  const router = useRouter()
  const [showCreateProduct, setShowCreateProduct] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newProductName.trim()
    if (!name) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create product')
      }
      setNewProductName('')
      setShowCreateProduct(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product')
    } finally {
      setCreating(false)
    }
  }

  const hasAny = products.length > 0 || ungroupedAgents.length > 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Org level */}
      <div className="mb-8">
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
          Organization
        </p>
        <h1 className="text-2xl font-bold text-zinc-100">
          {userDisplayName}&apos;s workspace
        </h1>
      </div>

      {/* Create product */}
      <div className="mb-8">
        {!showCreateProduct ? (
          <Button
            type="button"
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100 gap-2"
            onClick={() => setShowCreateProduct(true)}
          >
            <FolderOpen className="h-4 w-4" />
            Create product
          </Button>
        ) : (
          <form onSubmit={handleCreateProduct} className="flex flex-wrap items-center gap-3">
            <Input
              type="text"
              placeholder="Product name"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              className="max-w-xs bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              autoFocus
              disabled={creating}
            />
            <Button
              type="submit"
              disabled={creating || !newProductName.trim()}
              className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-zinc-500 hover:text-zinc-300"
              onClick={() => { setShowCreateProduct(false); setError(''); setNewProductName('') }}
            >
              Cancel
            </Button>
            {error && (
              <span className="text-sm text-red-400">{error}</span>
            )}
          </form>
        )}
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
            onClick={() => setShowCreateProduct(true)}
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
