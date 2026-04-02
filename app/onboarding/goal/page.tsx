'use client'

import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Rocket, Zap, RefreshCcw, Trophy, CheckCircle2 } from 'lucide-react'

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
  [key: string]: unknown
}

type SavedData = {
  project_id?: string
  subvertical_name?: string
  vertical_name?: string
  north_star_metric?: string
  goal?: string
  selected_okrs?: CiOkr[]
  onboarding_step?: number
  analysis_result?: {
    position?: { position_summary?: string }
    competitive_intensity?: string
    ci_enriched?: boolean
    ci_okrs?: CiOkr[]
    ci_designs?: unknown[]
    [key: string]: unknown
  }
}

type GoalOption = 'increase_signups' | 'improve_activation' | 'reduce_churn' | 'beat_competitor'

const GOAL_OPTIONS: Array<{
  id: GoalOption
  title: string
  description: string
  Icon: ComponentType<{ style?: CSSProperties }>
}> = [
  { id: 'increase_signups', title: 'Increase Signups', description: 'Improve top of funnel — more trials, more leads, more people discovering you', Icon: Rocket },
  { id: 'improve_activation', title: 'Improve Activation', description: 'Get more users to their aha moment faster — reduce time to value', Icon: Zap },
  { id: 'reduce_churn', title: 'Reduce Churn', description: 'Keep users longer — improve engagement and reduce cancellations', Icon: RefreshCcw },
  { id: 'beat_competitor', title: 'Beat a Competitor', description: 'Identify a specific gap a competitor owns and take it from them', Icon: Trophy },
]

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  do_first:     { bg: '#dcfce7', color: '#166534' },
  worth_bet:    { bg: '#fef9c3', color: '#92600a' },
  quick_win:    { bg: '#e0f2fe', color: '#075985' },
  plan_sprint:  { bg: '#f3e8ff', color: '#6b21a8' },
}

function preselectGoal(data: SavedData): GoalOption {
  const summary = data.analysis_result?.position?.position_summary?.toLowerCase() ?? ''
  const intensity = (
    (data.analysis_result as Record<string, unknown> | undefined)?.competitive_intensity as string ??
    data.analysis_result?.competitive_intensity ?? ''
  ).toLowerCase()
  if (summary.includes('activation') || summary.includes('onboarding')) return 'improve_activation'
  if (intensity === 'high' || intensity === 'medium') return 'beat_competitor'
  return 'improve_activation'
}

function scoreToBadge(impact: number, feasibility: number): string {
  if (impact >= 85 && feasibility >= 80) return 'do_first'
  if (impact >= 80 && feasibility < 70) return 'worth_bet'
  if (impact < 75 && feasibility >= 85) return 'quick_win'
  return 'plan_sprint'
}

export default function GoalPage() {
  const router = useRouter()
  const [saved, setSaved] = useState<SavedData | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<GoalOption | null>(null)
  const [selectedOkrIdxs, setSelectedOkrIdxs] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ciOkrs = saved?.analysis_result?.ci_okrs ?? []
  const hasCi = saved?.analysis_result?.ci_enriched === true && ciOkrs.length > 0

  // Sort OKRs by impact × feasibility descending
  const sortedOkrs = useMemo(() =>
    [...ciOkrs].sort((a, b) =>
      ((b.impact_score ?? 0) * (b.feasibility_score ?? 0)) -
      ((a.impact_score ?? 0) * (a.feasibility_score ?? 0))
    ).slice(0, 6)
  , [ciOkrs])

  useEffect(() => {
    const raw = localStorage.getItem('northstar_onboarding')
    if (!raw) { router.push('/dashboard'); return }
    let parsed: SavedData
    try { parsed = JSON.parse(raw) as SavedData } catch { router.push('/dashboard'); return }
    if (!parsed.project_id) { router.push('/dashboard'); return }
    setSaved(parsed)
    setSelectedGoal((parsed.goal as GoalOption | undefined) ?? preselectGoal(parsed))
    // Pre-select previously selected OKRs or default to top 1
    if (parsed.selected_okrs?.length) {
      const okrs = parsed.analysis_result?.ci_okrs ?? []
      const idxs = parsed.selected_okrs
        .map(so => okrs.findIndex(o => o.objective === so.objective))
        .filter(i => i >= 0)
      setSelectedOkrIdxs(idxs.length > 0 ? idxs : [0])
    } else if (parsed.analysis_result?.ci_enriched && parsed.analysis_result?.ci_okrs?.length) {
      setSelectedOkrIdxs([0]) // Pre-select top OKR
    }
  }, [router])

  const completedStep = Math.max(1, saved?.onboarding_step ?? 2)

  const toggleOkr = (idx: number) => {
    setSelectedOkrIdxs(prev => {
      if (prev.includes(idx)) {
        return prev.length > 1 ? prev.filter(i => i !== idx) : prev // Keep at least 1
      }
      if (prev.length >= 3) return prev // Max 3
      return [...prev, idx]
    })
  }

  const progress = useMemo(() => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
      {[
        { label: 'Product', route: '/onboarding/product', step: 1 },
        { label: 'Goal', route: '/onboarding/goal', step: 2 },
        { label: 'Ideas', route: '/onboarding/wow', step: 3 },
      ].map((item, i) => {
        const isCurrent = item.step === 2
        const isEnabled = item.step <= completedStep
        return (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" disabled={!isEnabled || submitting}
              onClick={() => { if (isEnabled) router.push(item.route) }}
              style={{
                fontSize: 12, fontWeight: 600, color: isCurrent ? C.blue : C.muted,
                padding: '3px 10px', borderRadius: 24,
                border: `1px solid ${isCurrent ? '#b8d0f7' : C.border}`,
                background: isCurrent ? '#eef4ff' : C.surface,
                cursor: !isEnabled || submitting ? 'not-allowed' : 'pointer',
                opacity: isEnabled ? 1 : 0.5,
              }}>
              {item.label}
            </button>
            {i < 2 && <span style={{ color: C.border }}>→</span>}
          </div>
        )
      })}
    </div>
  ), [completedStep, router, submitting])

  async function onContinue() {
    if (!saved?.project_id || !selectedGoal) return
    setSubmitting(true)
    setError(null)
    try {
      const selectedOkrs = hasCi
        ? selectedOkrIdxs.map(i => sortedOkrs[i]).filter(Boolean)
        : []

      const next = {
        ...saved,
        goal: selectedGoal,
        selected_okrs: selectedOkrs,
        onboarding_step: 3,
        timestamp: Date.now(),
      }
      localStorage.setItem('northstar_onboarding', JSON.stringify(next))

      const patchRes = await fetch(`/api/projects/${saved.project_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy_json: {
            ...(saved.analysis_result ?? {}),
            onboarding_context: {
              ...(saved as Record<string, unknown>),
              goal: selectedGoal,
              selected_okrs: selectedOkrs,
              onboarding_step: 3,
            },
          },
          onboarding_step: 3,
        }),
      })
      if (!patchRes.ok) throw new Error('Failed to save goal')
      router.push('/onboarding/wow')
    } catch (e) {
      setError((e as Error).message || 'Could not save your goal. Please try again.')
      setSubmitting(false)
    }
  }

  if (!saved) {
    return <div style={{ minHeight: '100vh', background: C.bg }} />
  }

  const canSubmit = selectedGoal && (hasCi ? selectedOkrIdxs.length > 0 : true)
  const ctaText = hasCi
    ? selectedOkrIdxs.length === 1 ? 'Track this goal →' : `Track these ${selectedOkrIdxs.length} goals →`
    : 'Show me the opportunities'

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '40px 24px 80px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {progress}

        <h1 style={{ textAlign: 'center', fontSize: 30, lineHeight: 1.2, letterSpacing: '-0.02em', color: C.text, marginBottom: 10 }}>
          What do you want to improve?
        </h1>
        <p style={{ textAlign: 'center', fontSize: 14, color: C.muted, marginBottom: 24 }}>
          We&apos;ll find the best opportunities based on what&apos;s working in your market.
        </p>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 20, boxShadow: C.cardShadow }}>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Your market: <span style={{ color: C.text, fontWeight: 600 }}>{saved.subvertical_name || 'Unknown'}</span></p>
          <p style={{ fontSize: 12, color: C.muted }}>Your metric: <span style={{ color: C.text, fontWeight: 600 }}>{saved.north_star_metric || 'Not set'}</span></p>
        </div>

        {/* 4 generic goal cards */}
        <div className="goal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          {GOAL_OPTIONS.map(({ id, title, description, Icon }) => {
            const selected = selectedGoal === id
            const isCurrentGoal = !!saved.goal && saved.goal === id
            return (
              <button key={id} type="button"
                onClick={() => { if (!isCurrentGoal) setSelectedGoal(id) }}
                disabled={isCurrentGoal}
                style={{
                  textAlign: 'left',
                  border: `1px solid ${selected ? C.blue : C.border}`,
                  background: selected ? '#eef4ff' : C.surface,
                  borderRadius: 12, padding: 14,
                  cursor: isCurrentGoal ? 'not-allowed' : 'pointer',
                  opacity: isCurrentGoal ? 0.55 : 1, boxShadow: C.cardShadow,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <Icon style={{ width: 18, height: 18, color: selected ? C.blue : C.muted }} />
                  {isCurrentGoal && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, border: `1px solid ${C.border}`, background: C.bg, borderRadius: 30, padding: '2px 8px', flexShrink: 0 }}>Current</span>
                  )}
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>{title}</p>
                <p style={{ fontSize: 12, lineHeight: 1.5, color: C.muted }}>{description}</p>
              </button>
            )
          })}
        </div>

        {/* CI OKR selection — only shown when CI data exists */}
        {hasCi && sortedOkrs.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>
                Specific opportunities we found
              </p>
              <p style={{ fontSize: 13, color: C.muted }}>
                Based on competitive analysis of your market. Select 1–3 to track.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sortedOkrs.map((okr, idx) => {
                const isSelected = selectedOkrIdxs.includes(idx)
                const badge = scoreToBadge(okr.impact_score ?? 0, okr.feasibility_score ?? 0)
                const badgeColor = BADGE_COLORS[badge] ?? BADGE_COLORS.plan_sprint
                const effort = (okr.feasibility_score ?? 0) >= 85 ? 'Low' : (okr.feasibility_score ?? 0) >= 75 ? 'Medium' : 'High'

                return (
                  <button key={idx} type="button" onClick={() => toggleOkr(idx)}
                    style={{
                      textAlign: 'left', width: '100%',
                      border: `1.5px solid ${isSelected ? C.blue : C.border}`,
                      background: isSelected ? '#eef4ff' : C.surface,
                      borderRadius: 12, padding: '14px 16px',
                      cursor: 'pointer', boxShadow: C.cardShadow,
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      transition: 'border-color 0.15s, background 0.15s',
                    }}>
                    {/* Checkbox */}
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
                      border: isSelected ? 'none' : `1.5px solid ${C.border}`,
                      background: isSelected ? C.blue : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSelected && <CheckCircle2 style={{ width: 14, height: 14, color: '#fff' }} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.4, marginBottom: 8,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {okr.objective ?? `Opportunity ${idx + 1}`}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 30,
                          background: badgeColor.bg, color: badgeColor.color,
                        }}>
                          {badge.replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.blue }}>
                          Impact: {okr.impact_score ?? '—'}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 30,
                          background: '#f3f4f6', color: C.muted,
                        }}>
                          {effort} effort
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 16, border: '1px solid #fecaca', background: '#fff1f2', borderRadius: 8, padding: '10px 12px', color: '#b91c1c', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button type="button"
          disabled={!canSubmit || submitting}
          onClick={() => void onContinue()}
          style={{
            width: '100%', marginTop: 20, padding: '12px 18px', borderRadius: 30, border: 'none',
            background: !canSubmit || submitting ? C.muted : C.text, color: '#fff',
            fontSize: 14, fontWeight: 700,
            cursor: !canSubmit || submitting ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: !canSubmit || submitting ? 0.7 : 1,
          }}>
          {ctaText}
          <ArrowRight style={{ width: 15, height: 15 }} />
        </button>
      </div>
      <style>{`
        @media (max-width: 720px) {
          .goal-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
