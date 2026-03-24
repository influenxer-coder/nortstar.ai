'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Bot, Plus, FolderOpen, ChevronRight, ArrowRight, Trash2 } from 'lucide-react'

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

  useEffect(() => {
    if (dbInProgressProjects.length > 0) {
      setInProgressProjects(dbInProgressProjects)
      return
    }
    const id = typeof localStorage !== 'undefined' ? localStorage.getItem('northstar_current_project_id') : null
    if (!id) { setInProgressProjects([]); return }
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
          return
        }
        setInProgressProjects([{ id: data.id, name: data.name, onboarding_step: data.onboarding_step }])
      })
  }, [dbInProgressProjects])

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
              href={`/onboarding/product?projectId=${project.id}&step=${project.onboarding_step ?? 1}`}
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
        <Link href="/onboarding/product" style={{ textDecoration: 'none' }}>
          <button
            type="button"
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
        </Link>
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
          <Link href="/onboarding/product" style={{ textDecoration: 'none' }}>
            <button
              type="button"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '11px 24px', borderRadius: 30,
                background: C.blue, color: '#fff',
                fontSize: 14, fontWeight: 600,
                border: 'none', cursor: 'pointer',
              }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              Create your first product
            </button>
          </Link>
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
  )
}
