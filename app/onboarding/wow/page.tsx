'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import OpportunityCard, { type IdeaWithImpact } from '@/components/OpportunityCard'

const C = {
  bg: '#f6f6f6',
  surface: '#ffffff',
  text: '#1f2328',
  muted: '#535963',
  border: '#d4d7dc',
  blue: '#367eed',
  cardShadow: '0 1px 4px rgba(27,37,40,0.06)',
}

type AnalysisResult = {
  position?: {
    position_summary?: string
    closest_competitor?: string
  }
  match?: {
    subvertical_name?: string
  }
}

type SavedData = {
  project_id?: string
  goal?: string
  subvertical_id?: string
  subvertical_name?: string
  url?: string
  selected_competitors?: string[]
  analysis_result?: AnalysisResult
  selected_idea?: unknown
  created_product_id?: string
}

type WowIdea = IdeaWithImpact

type WowResponse = {
  evolutionary_niches?: Array<{
    niche?: string
    why_viable?: string
    example_wedge?: string
    underserved_icp?: { role?: string; stage?: string }
  }>
  whitespace?: Record<string, unknown>
  fitness_map?: unknown[]
  competitive_intensity?: string
  trending_features?: string[]
  ideas?: WowIdea[]
}


export default function WowPage() {
  const router = useRouter()
  const [saved, setSaved] = useState<SavedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wow, setWow] = useState<WowResponse | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('northstar_onboarding')
    if (!raw) {
      router.push('/dashboard')
      return
    }
    let parsed: SavedData
    try {
      parsed = JSON.parse(raw) as SavedData
    } catch {
      router.push('/dashboard')
      return
    }
    if (!parsed.project_id || !parsed.subvertical_id || !parsed.goal) {
      router.push('/dashboard')
      return
    }
    setSaved(parsed)
    void fetch(`/api/projects/${parsed.project_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        onboarding_step: 4,
        strategy_json: {
          ...(parsed.analysis_result ?? {}),
          onboarding_context: {
            ...(parsed as Record<string, unknown>),
            onboarding_step: 4,
          },
        },
      }),
    }).catch(() => {
      // Keep flow usable even if this non-critical heartbeat update fails.
    })

    fetch(`/api/onboarding/wow-data?subvertical_id=${encodeURIComponent(parsed.subvertical_id)}&goal=${encodeURIComponent(parsed.goal)}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j.error ?? 'Failed to load opportunity data')
        }
        return r.json() as Promise<WowResponse>
      })
      .then((d) => {
        setWow(d)
        // Persist ideas to opportunities table (fire-and-forget)
        if (parsed.project_id && Array.isArray(d.ideas) && d.ideas.length > 0) {
          fetch('/api/opportunities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // This is goal-specific; never wipe other goals' saved ideas.
            body: JSON.stringify({ project_id: parsed.project_id, ideas: d.ideas }),
          }).catch(() => { /* non-critical */ })
        }
      })
      .catch((e) => setError((e as Error).message || 'Could not load wow data'))
      .finally(() => setLoading(false))
  }, [router])

  const intensity = (wow?.competitive_intensity || '').toLowerCase()
  const completedStep = Math.max(1, (saved?.selected_idea ? 5 : 4))
  const intensityBadge = useMemo(() => {
    if (intensity === 'high') return { text: 'Highly competitive', bg: '#fff1f2', color: '#be123c', border: '#fda4af' }
    if (intensity === 'medium') return { text: 'Moderately competitive', bg: '#fffbeb', color: '#92600a', border: '#f0b429' }
    return { text: 'Low competition', bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' }
  }, [intensity])

  async function ensureDashboardProduct(nextContext: Record<string, unknown>) {
    if (!saved?.project_id) throw new Error('Missing project id')

    const existingProductId = typeof saved.created_product_id === 'string' ? saved.created_product_id : ''
    if (existingProductId) return existingProductId

    const productName =
      ((saved.analysis_result as unknown as { product?: { product_name?: string } })?.product?.product_name || '').trim()
      || (saved.subvertical_name ? `${saved.subvertical_name} Product` : '')
      || 'NorthStar Product'

    const createRes = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: productName }),
    })
    if (!createRes.ok) {
      const body = await createRes.json().catch(() => ({}))
      throw new Error(body.error ?? 'Failed to create dashboard product')
    }
    const created = await createRes.json() as { id: string }

    const projectPatchRes = await fetch(`/api/projects/${saved.project_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategy_json: {
          ...(saved.analysis_result ?? {}),
          onboarding_context: {
            ...nextContext,
            created_product_id: created.id,
          },
        },
      }),
    })
    if (!projectPatchRes.ok) {
      const body = await projectPatchRes.json().catch(() => ({}))
      throw new Error(body.error ?? 'Failed to link dashboard product to project')
    }

    localStorage.setItem('northstar_onboarding', JSON.stringify({
      ...saved,
      created_product_id: created.id,
    }))

    return created.id
  }

  async function saveIdeaAndGo(idea: WowIdea) {
    if (!saved?.project_id) return
    setActionLoading(true)
    setError(null)
    const next = { ...saved, selected_idea: idea }
    localStorage.setItem('northstar_onboarding', JSON.stringify(next))
    try {
      const nextContext = {
        ...(saved as Record<string, unknown>),
        selected_idea: idea,
        onboarding_step: 5,
      }
      const dashboardProductId = await ensureDashboardProduct(nextContext)

      const res = await fetch(`/api/projects/${saved.project_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy_json: {
            ...(saved.analysis_result ?? {}),
            onboarding_context: {
              ...nextContext,
              created_product_id: dashboardProductId,
            },
          },
          onboarding_step: 5,
          onboarding_completed: true,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to save selected idea')
      }
      localStorage.removeItem('northstar_onboarding')
      router.push('/dashboard')
    } catch (e) {
      setError((e as Error).message || 'Could not persist your selected idea. Please try again.')
      setActionLoading(false)
    }
  }

  async function completeAndGoDashboard() {
    if (!saved?.project_id) return
    setActionLoading(true)
    setError(null)
    try {
      const nextContext = {
        ...(saved as Record<string, unknown>),
        onboarding_step: 5,
      }
      const dashboardProductId = await ensureDashboardProduct(nextContext)

      const res = await fetch(`/api/projects/${saved.project_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy_json: {
            ...(saved.analysis_result ?? {}),
            onboarding_context: {
              ...nextContext,
              created_product_id: dashboardProductId,
            },
          },
          onboarding_completed: true,
          onboarding_step: 5,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to complete onboarding')
      }
      localStorage.removeItem('northstar_onboarding')
      router.push('/dashboard')
    } catch (e) {
      setError((e as Error).message || 'Could not persist onboarding completion. Please try again.')
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
        Loading opportunities…
      </div>
    )
  }

  if (!saved || error) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c' }}>
        {error || 'Something went wrong'}
      </div>
    )
  }

  const topNiche = wow?.evolutionary_niches?.[0]
  const ideas = wow?.ideas ?? []

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '32px 24px 120px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
          {[
            { label: 'Product', route: '/onboarding/product', step: 1 },
            { label: 'Goal', route: '/onboarding/goal', step: 2 },
            { label: 'Ideas', route: '/onboarding/wow', step: 3 },
          ].map((item, i) => {
            const isCurrent = item.step === 3
            const isEnabled = item.step <= completedStep
            return (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  disabled={!isEnabled || actionLoading}
                  onClick={() => {
                    if (!isEnabled) return
                    router.push(item.route)
                  }}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isCurrent ? C.blue : C.muted,
                    padding: '3px 10px',
                    borderRadius: 24,
                    border: `1px solid ${isCurrent ? '#b8d0f7' : C.border}`,
                    background: isCurrent ? '#eef4ff' : C.surface,
                    cursor: !isEnabled || actionLoading ? 'not-allowed' : 'pointer',
                    opacity: isEnabled ? 1 : 0.5,
                  }}
                >
                  {item.label}
                </button>
                {i < 2 && <span style={{ color: C.border }}>→</span>}
              </div>
            )
          })}
        </div>

        {/* SECTION 1 — YOUR POSITION */}
        <section style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 30, color: C.text, letterSpacing: '-0.02em', marginBottom: 12 }}>Here&apos;s where you stand</h1>
          <div className="position-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.cardShadow, padding: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', marginBottom: 8 }}>YOUR POSITION</p>
              <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>
                {saved.analysis_result?.position?.position_summary || 'Position data unavailable'}
              </p>
              <span style={{ fontSize: 12, color: C.muted }}>
                Closest to: <strong style={{ color: C.text }}>{saved.analysis_result?.position?.closest_competitor || 'Unknown'}</strong>
              </span>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.cardShadow, padding: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', marginBottom: 8 }}>YOUR MARKET</p>
              <p style={{ fontSize: 15, color: C.text, marginBottom: 12 }}>
                {saved.subvertical_name || saved.analysis_result?.match?.subvertical_name || 'Unknown market'}
              </p>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 30,
                background: intensityBadge.bg,
                color: intensityBadge.color,
                border: `1px solid ${intensityBadge.border}`,
              }}>
                {intensityBadge.text}
              </span>
            </div>
          </div>
        </section>

        {/* SECTION 2 — THE OPPORTUNITY */}
        <section style={{ marginBottom: 22 }}>
          <div style={{
            background: '#eef4ff',
            border: '1px solid #b8d0f7',
            borderRadius: 12,
            padding: 20,
            boxShadow: C.cardShadow,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: '0.08em', marginBottom: 8 }}>UNOCCUPIED NICHE</p>
            <h2 style={{ fontSize: 28, lineHeight: 1.15, letterSpacing: '-0.02em', color: C.text, marginBottom: 8 }}>
              {topNiche?.niche || 'No clear niche found yet'}
            </h2>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>
              {topNiche?.why_viable || 'We are still synthesizing why this niche is viable.'}
            </p>
            <div style={{ background: '#ffffff', border: '1px solid #b8d0f7', borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Lead with:</p>
              <p style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{topNiche?.example_wedge || 'No wedge yet'}</p>
            </div>
            <p style={{ fontSize: 13, color: C.text }}>
              Target buyer: <strong>{topNiche?.underserved_icp?.role || 'Unknown role'}</strong> at{' '}
              <strong>{topNiche?.underserved_icp?.stage || 'Unknown stage'}</strong>
            </p>
          </div>
        </section>

        {/* SECTION 3 — TOP IDEAS */}
        <section style={{ marginBottom: 26 }}>
          <h3 style={{ fontSize: 24, color: C.text, letterSpacing: '-0.02em', marginBottom: 4 }}>What to build first</h3>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>
            Based on what&apos;s winning in your market right now
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            {ideas.slice(0, 3).map((idea, idx) => (
              <OpportunityCard
                key={`${idea.title}-${idx}`}
                idea={idea}
                onAction={() => void saveIdeaAndGo(idea)}
                actionLabel="Generate Spec →"
                actionLoading={actionLoading}
              />
            ))}
          </div>
        </section>
      </div>

      {error && (
        <div style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 76,
          background: '#fff1f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: '10px 12px',
          color: '#b91c1c',
          fontSize: 13,
          maxWidth: 900,
          width: 'calc(100% - 36px)',
        }}>
          {error}
        </div>
      )}

      {/* Sticky bottom bar */}
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        borderTop: `1px solid ${C.border}`,
        background: C.surface,
        padding: '12px 18px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            style={{ border: 'none', background: 'none', color: C.muted, fontSize: 13, cursor: 'pointer' }}
          >
            See all ideas later
          </button>
          <button
            type="button"
            onClick={() => void completeAndGoDashboard()}
            disabled={actionLoading}
            style={{
              borderRadius: 30,
              border: 'none',
              background: C.text,
              color: '#fff',
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              opacity: actionLoading ? 0.7 : 1,
            }}
          >
            Go to my dashboard
            <ArrowRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .position-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

