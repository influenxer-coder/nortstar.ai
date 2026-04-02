'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Target } from 'lucide-react'
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

type CiOkr = {
  objective?: string
  impact_score?: number
  feasibility_score?: number
  gap_description?: string
  differentiation_mechanism?: string
  key_risk?: string
  key_results?: Array<{ kr_text?: string; kr_type?: string }>
  [key: string]: unknown
}

type CiDesign = {
  gap_rank?: number
  easy_tier?: { hypothesis?: string; [key: string]: unknown }
  medium_tier?: { hypothesis?: string; [key: string]: unknown }
  full_tier?: { hypothesis?: string; [key: string]: unknown }
  [key: string]: unknown
}

type AnalysisResult = {
  position?: { position_summary?: string; closest_competitor?: string }
  match?: { subvertical_name?: string }
  ci_enriched?: boolean
  ci_okrs?: CiOkr[]
  ci_designs?: CiDesign[]
  [key: string]: unknown
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
  selected_okrs?: CiOkr[]
  created_product_id?: string
}

type WowIdea = IdeaWithImpact

type WowResponse = {
  evolutionary_niches?: Array<{ niche?: string; why_viable?: string; example_wedge?: string; underserved_icp?: { role?: string; stage?: string } }>
  whitespace?: Record<string, unknown>
  fitness_map?: unknown[]
  competitive_intensity?: string
  trending_features?: string[]
  ideas?: WowIdea[]
}

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  do_first:    { bg: '#dcfce7', color: '#166534' },
  worth_bet:   { bg: '#fef9c3', color: '#92600a' },
  quick_win:   { bg: '#e0f2fe', color: '#075985' },
  plan_sprint: { bg: '#f3e8ff', color: '#6b21a8' },
}

function scoreToBadge(impact: number, feasibility: number): string {
  if (impact >= 85 && feasibility >= 80) return 'do_first'
  if (impact >= 80 && feasibility < 70) return 'worth_bet'
  if (impact < 75 && feasibility >= 85) return 'quick_win'
  return 'plan_sprint'
}

export default function WowPage() {
  const router = useRouter()
  const [saved, setSaved] = useState<SavedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wow, setWow] = useState<WowResponse | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const selectedOkrs = saved?.selected_okrs ?? []
  const hasCiOkrs = selectedOkrs.length > 0
  const ciDesigns = (saved?.analysis_result?.ci_designs ?? []) as CiDesign[]

  useEffect(() => {
    const raw = localStorage.getItem('northstar_onboarding')
    if (!raw) { router.push('/dashboard'); return }
    let parsed: SavedData
    try { parsed = JSON.parse(raw) as SavedData } catch { router.push('/dashboard'); return }
    if (!parsed.project_id || !parsed.goal) { router.push('/dashboard'); return }
    setSaved(parsed)

    // Heartbeat
    void fetch(`/api/projects/${parsed.project_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        onboarding_step: 4,
        strategy_json: { ...(parsed.analysis_result ?? {}), onboarding_context: { ...(parsed as Record<string, unknown>), onboarding_step: 4 } },
      }),
    }).catch(() => {})

    // If CI OKRs selected, build ideas directly — no need for wow-data API
    if (parsed.selected_okrs?.length) {
      setLoading(false)
      // Persist OKR-derived ideas to opportunities table
      const ciIdeas = buildCiOpportunities(parsed.selected_okrs, (parsed.analysis_result?.ci_designs ?? []) as CiDesign[], parsed.goal ?? '', parsed.analysis_result?.ci_analysis_id as string ?? '')
      if (parsed.project_id && ciIdeas.length > 0) {
        fetch('/api/opportunities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: parsed.project_id, ideas: ciIdeas }),
        }).catch(() => {})
      }
      return
    }

    // Standard VI DB path — fetch from wow-data
    if (!parsed.subvertical_id) { setLoading(false); return }
    fetch(`/api/onboarding/wow-data?subvertical_id=${encodeURIComponent(parsed.subvertical_id)}&goal=${encodeURIComponent(parsed.goal)}${parsed.project_id ? `&project_id=${encodeURIComponent(parsed.project_id)}` : ''}`)
      .then(async (r) => {
        if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error ?? 'Failed to load opportunity data') }
        return r.json() as Promise<WowResponse>
      })
      .then((d) => {
        setWow(d)
        if (parsed.project_id && Array.isArray(d.ideas) && d.ideas.length > 0) {
          fetch('/api/opportunities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: parsed.project_id, ideas: d.ideas }) }).catch(() => {})
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

    const createRes = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: productName }) })
    if (!createRes.ok) throw new Error('Failed to create dashboard product')
    const created = await createRes.json() as { id: string }

    await fetch(`/api/projects/${saved.project_id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy_json: { ...(saved.analysis_result ?? {}), onboarding_context: { ...nextContext, created_product_id: created.id } } }),
    })

    localStorage.setItem('northstar_onboarding', JSON.stringify({ ...saved, created_product_id: created.id }))
    return created.id
  }

  async function completeAndGoDashboard() {
    if (!saved?.project_id) return
    setActionLoading(true); setError(null)
    try {
      const nextContext = { ...(saved as Record<string, unknown>), onboarding_step: 5 }
      const dashboardProductId = await ensureDashboardProduct(nextContext)
      const res = await fetch(`/api/projects/${saved.project_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy_json: { ...(saved.analysis_result ?? {}), onboarding_context: { ...nextContext, created_product_id: dashboardProductId } }, onboarding_completed: true, onboarding_step: 5 }),
      })
      if (!res.ok) throw new Error('Failed to complete onboarding')
      localStorage.removeItem('northstar_onboarding')
      router.push('/dashboard')
    } catch (e) {
      setError((e as Error).message); setActionLoading(false)
    }
  }

  async function saveIdeaAndGo(idea: WowIdea) {
    if (!saved?.project_id) return
    setActionLoading(true); setError(null)
    const next = { ...saved, selected_idea: idea }
    localStorage.setItem('northstar_onboarding', JSON.stringify(next))
    try {
      const nextContext = { ...(saved as Record<string, unknown>), selected_idea: idea, onboarding_step: 5 }
      const dashboardProductId = await ensureDashboardProduct(nextContext)
      const res = await fetch(`/api/projects/${saved.project_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy_json: { ...(saved.analysis_result ?? {}), onboarding_context: { ...nextContext, created_product_id: dashboardProductId } }, onboarding_step: 5, onboarding_completed: true }),
      })
      if (!res.ok) throw new Error('Failed to save')
      localStorage.removeItem('northstar_onboarding')
      router.push('/dashboard')
    } catch (e) {
      setError((e as Error).message); setActionLoading(false)
    }
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>Loading opportunities…</div>
  }
  if (!saved || error) {
    return <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c' }}>{error || 'Something went wrong'}</div>
  }

  const topNiche = wow?.evolutionary_niches?.[0]
  const ideas = wow?.ideas ?? []

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '32px 24px 120px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Progress */}
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
                <button type="button" disabled={!isEnabled || actionLoading}
                  onClick={() => { if (isEnabled) router.push(item.route) }}
                  style={{ fontSize: 12, fontWeight: 600, color: isCurrent ? C.blue : C.muted, padding: '3px 10px', borderRadius: 24, border: `1px solid ${isCurrent ? '#b8d0f7' : C.border}`, background: isCurrent ? '#eef4ff' : C.surface, cursor: !isEnabled || actionLoading ? 'not-allowed' : 'pointer', opacity: isEnabled ? 1 : 0.5 }}>
                  {item.label}
                </button>
                {i < 2 && <span style={{ color: C.border }}>→</span>}
              </div>
            )
          })}
        </div>

        {/* ── CI OKR PATH ──────────────────────────────────────────── */}
        {hasCiOkrs ? (
          <>
            {/* YOUR GOALS */}
            <section style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 28, color: C.text, letterSpacing: '-0.02em', marginBottom: 4 }}>Your goals</h1>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>Based on competitive intelligence analysis</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selectedOkrs.map((okr, idx) => {
                  const badge = scoreToBadge(okr.impact_score ?? 0, okr.feasibility_score ?? 0)
                  const badgeColor = BADGE_COLORS[badge] ?? BADGE_COLORS.plan_sprint
                  const krs = Array.isArray(okr.key_results) ? okr.key_results : []
                  return (
                    <div key={idx} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, boxShadow: C.cardShadow }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                        <Target style={{ width: 18, height: 18, color: C.blue, flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: 15, fontWeight: 600, color: C.text, lineHeight: 1.4, flex: 1 }}>{okr.objective}</p>
                      </div>
                      {krs.length > 0 && (
                        <div style={{ marginLeft: 28, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {krs.slice(0, 3).map((kr, ki) => (
                            <div key={ki} style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                              <span style={{ color: kr.kr_type === 'leading' ? '#2563eb' : '#059669', fontWeight: 600, flexShrink: 0 }}>
                                {kr.kr_type === 'leading' ? '↗' : '↘'}
                              </span>
                              {kr.kr_text}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 28 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 30, background: badgeColor.bg, color: badgeColor.color }}>
                          {badge.replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.blue }}>Impact: {okr.impact_score ?? '—'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* WHAT TO BUILD FIRST */}
            <section style={{ marginBottom: 26 }}>
              <h3 style={{ fontSize: 24, color: C.text, letterSpacing: '-0.02em', marginBottom: 4 }}>What to build first</h3>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>Easy-win changes scoped to each goal</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                {selectedOkrs.map((okr, idx) => {
                  const design = ciDesigns.find(d => d.gap_rank === idx + 1) ?? ciDesigns[idx]
                  const hypothesis = design?.easy_tier?.hypothesis ?? okr.gap_description ?? okr.objective ?? ''
                  const badge = scoreToBadge(okr.impact_score ?? 0, okr.feasibility_score ?? 0)
                  const idea: WowIdea = {
                    title: String(hypothesis).slice(0, 120),
                    goal: saved.goal ?? '',
                    effort: 'low' as const,
                    evidence: String(okr.gap_description ?? ''),
                    winning_pattern: String(okr.differentiation_mechanism ?? ''),
                    expected_lift_low: Math.round(((okr.impact_score ?? 0) * 0.6)),
                    expected_lift_high: okr.impact_score ?? null,
                    confidence: (okr.feasibility_score ?? 0) >= 85 ? 'high' as const : (okr.feasibility_score ?? 0) >= 75 ? 'medium' as const : 'low' as const,
                    confidence_reason: String(okr.key_risk ?? '') || null,
                    impact_score: Math.round((((okr.impact_score ?? 0) * ((okr.feasibility_score ?? 0))) / 100)),
                    decision_badge: badge as WowIdea['decision_badge'],
                    human_number: null,
                  }
                  return (
                    <OpportunityCard
                      key={idx}
                      idea={idea}
                      onAction={() => void saveIdeaAndGo(idea)}
                      actionLabel="Let's go →"
                      actionLoading={actionLoading}
                    />
                  )
                })}
              </div>
            </section>
          </>
        ) : (
          /* ── STANDARD VI DB PATH ──────────────────────────────── */
          <>
            <section style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: 30, color: C.text, letterSpacing: '-0.02em', marginBottom: 12 }}>Here&apos;s where you stand</h1>
              <div className="position-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.cardShadow, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', marginBottom: 8 }}>YOUR POSITION</p>
                  <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>{saved.analysis_result?.position?.position_summary || 'Position data unavailable'}</p>
                  <span style={{ fontSize: 12, color: C.muted }}>Closest to: <strong style={{ color: C.text }}>{saved.analysis_result?.position?.closest_competitor || 'Unknown'}</strong></span>
                </div>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.cardShadow, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', marginBottom: 8 }}>YOUR MARKET</p>
                  <p style={{ fontSize: 15, color: C.text, marginBottom: 12 }}>{saved.subvertical_name || saved.analysis_result?.match?.subvertical_name || 'Unknown market'}</p>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 30, background: intensityBadge.bg, color: intensityBadge.color, border: `1px solid ${intensityBadge.border}` }}>{intensityBadge.text}</span>
                </div>
              </div>
            </section>
            <section style={{ marginBottom: 22 }}>
              <div style={{ background: '#eef4ff', border: '1px solid #b8d0f7', borderRadius: 12, padding: 20, boxShadow: C.cardShadow }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: '0.08em', marginBottom: 8 }}>UNOCCUPIED NICHE</p>
                <h2 style={{ fontSize: 28, lineHeight: 1.15, letterSpacing: '-0.02em', color: C.text, marginBottom: 8 }}>{topNiche?.niche || 'No clear niche found yet'}</h2>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>{topNiche?.why_viable || 'We are still synthesizing why this niche is viable.'}</p>
                <div style={{ background: '#ffffff', border: '1px solid #b8d0f7', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <p style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Lead with:</p>
                  <p style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{topNiche?.example_wedge || 'No wedge yet'}</p>
                </div>
                <p style={{ fontSize: 13, color: C.text }}>Target buyer: <strong>{topNiche?.underserved_icp?.role || 'Unknown role'}</strong> at <strong>{topNiche?.underserved_icp?.stage || 'Unknown stage'}</strong></p>
              </div>
            </section>
            <section style={{ marginBottom: 26 }}>
              <h3 style={{ fontSize: 24, color: C.text, letterSpacing: '-0.02em', marginBottom: 4 }}>What to build first</h3>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>Based on what&apos;s winning in your market right now</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                {ideas.slice(0, 3).map((idea, idx) => (
                  <OpportunityCard key={`${idea.title}-${idx}`} idea={idea} onAction={() => void saveIdeaAndGo(idea)} actionLabel="Generate Spec →" actionLoading={actionLoading} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {error && (
        <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 76, background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', color: '#b91c1c', fontSize: 13, maxWidth: 900, width: 'calc(100% - 36px)' }}>
          {error}
        </div>
      )}

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, borderTop: `1px solid ${C.border}`, background: C.surface, padding: '12px 18px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <button type="button" onClick={() => router.push('/dashboard')} style={{ border: 'none', background: 'none', color: C.muted, fontSize: 13, cursor: 'pointer' }}>See all ideas later</button>
          <button type="button" onClick={() => void completeAndGoDashboard()} disabled={actionLoading}
            style={{ borderRadius: 30, border: 'none', background: C.text, color: '#fff', padding: '10px 18px', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.7 : 1 }}>
            {hasCiOkrs ? "Let's go →" : 'Go to my dashboard'}
            {!hasCiOkrs && <ArrowRight style={{ width: 14, height: 14 }} />}
          </button>
        </div>
      </div>

      <style>{`@media (max-width: 820px) { .position-grid { grid-template-columns: 1fr; } }`}</style>
    </div>
  )
}

// ── Build opportunity ideas from CI OKRs for persistence ────────────────
function buildCiOpportunities(
  okrs: CiOkr[],
  designs: CiDesign[],
  goal: string,
  ciAnalysisId: string
): Array<IdeaWithImpact & { _ci_data?: unknown }> {
  return okrs.map((okr, idx) => {
    const design = designs.find(d => d.gap_rank === idx + 1) ?? designs[idx]
    const badge = scoreToBadge(okr.impact_score ?? 0, okr.feasibility_score ?? 0)
    return {
      title: String(okr.objective ?? `Goal ${idx + 1}`),
      goal,
      effort: 'low' as const,
      evidence: String(okr.gap_description ?? ''),
      winning_pattern: String(okr.differentiation_mechanism ?? ''),
      expected_lift_low: Math.round(((okr.impact_score ?? 0) * 0.6)),
      expected_lift_high: okr.impact_score ?? null,
      confidence: ((okr.feasibility_score ?? 0) >= 85 ? 'high' : (okr.feasibility_score ?? 0) >= 75 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      confidence_reason: String(okr.key_risk ?? '') || null,
      impact_score: Math.round((((okr.impact_score ?? 0) * ((okr.feasibility_score ?? 0))) / 100)),
      decision_badge: badge as IdeaWithImpact['decision_badge'],
      human_number: null,
      _ci_data: { okr, design: design ?? null, analysis_id: ciAnalysisId },
    }
  })
}
