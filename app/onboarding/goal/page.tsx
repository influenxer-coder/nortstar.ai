'use client'

import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Rocket, Zap, RefreshCcw, Trophy } from 'lucide-react'

const C = {
  bg: '#f6f6f6',
  surface: '#ffffff',
  text: '#1f2328',
  muted: '#535963',
  border: '#d4d7dc',
  blue: '#367eed',
  cardShadow: '0 1px 4px rgba(27,37,40,0.06)',
}

type SavedData = {
  project_id?: string
  subvertical_name?: string
  vertical_name?: string
  north_star_metric?: string
  goal?: string
  onboarding_step?: number
  analysis_result?: {
    position?: {
      position_summary?: string
    }
    competitive_intensity?: string
  }
}

type GoalOption = 'increase_signups' | 'improve_activation' | 'reduce_churn' | 'beat_competitor'

const GOAL_OPTIONS: Array<{
  id: GoalOption
  title: string
  description: string
  Icon: ComponentType<{ style?: CSSProperties }>
}> = [
  {
    id: 'increase_signups',
    title: 'Increase Signups',
    description: 'Improve top of funnel — more trials, more leads, more people discovering you',
    Icon: Rocket,
  },
  {
    id: 'improve_activation',
    title: 'Improve Activation',
    description: 'Get more users to their aha moment faster — reduce time to value',
    Icon: Zap,
  },
  {
    id: 'reduce_churn',
    title: 'Reduce Churn',
    description: 'Keep users longer — improve engagement and reduce cancellations',
    Icon: RefreshCcw,
  },
  {
    id: 'beat_competitor',
    title: 'Beat a Competitor',
    description: 'Identify a specific gap a competitor owns and take it from them',
    Icon: Trophy,
  },
]

function preselectGoal(data: SavedData): GoalOption {
  const summary = data.analysis_result?.position?.position_summary?.toLowerCase() ?? ''
  const intensity = (
    (data.analysis_result as Record<string, unknown> | undefined)?.competitive_intensity as string ??
    data.analysis_result?.competitive_intensity ??
    ''
  ).toLowerCase()
  if (summary.includes('activation') || summary.includes('onboarding')) return 'improve_activation'
  if (intensity === 'high' || intensity === 'medium') return 'beat_competitor'
  return 'improve_activation'
}

export default function GoalPage() {
  const router = useRouter()
  const [saved, setSaved] = useState<SavedData | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<GoalOption | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    if (!parsed.project_id) {
      router.push('/dashboard')
      return
    }
    setSaved(parsed)
    setSelectedGoal((parsed.goal as GoalOption | undefined) ?? preselectGoal(parsed))
  }, [router])

  const completedStep = Math.max(1, saved?.onboarding_step ?? 2)

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
          <button
            type="button"
            disabled={!isEnabled || submitting}
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
            cursor: !isEnabled || submitting ? 'not-allowed' : 'pointer',
            opacity: isEnabled ? 1 : 0.5,
          }}>
            {item.label}
          </button>
          {i < 2 && <span style={{ color: C.border }}>→</span>}
        </div>
      )})}
    </div>
  ), [completedStep, router, submitting])

  async function onContinue() {
    if (!saved?.project_id || !selectedGoal) return
    if (saved.goal && selectedGoal === saved.goal) return
    setSubmitting(true)
    setError(null)
    try {
      const next = { ...saved, goal: selectedGoal, onboarding_step: 3, timestamp: Date.now() }
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
    return (
      <div style={{ minHeight: '100vh', background: C.bg }} />
    )
  }

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

        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 20,
          boxShadow: C.cardShadow,
        }}>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Your market: <span style={{ color: C.text, fontWeight: 600 }}>{saved.subvertical_name || 'Unknown'}</span></p>
          <p style={{ fontSize: 12, color: C.muted }}>Your metric: <span style={{ color: C.text, fontWeight: 600 }}>{saved.north_star_metric || 'Not set'}</span></p>
        </div>

        <div className="goal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          {GOAL_OPTIONS.map(({ id, title, description, Icon }) => {
            const selected = selectedGoal === id
            const isCurrentGoal = !!saved.goal && saved.goal === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => { if (!isCurrentGoal) setSelectedGoal(id) }}
                disabled={isCurrentGoal}
                style={{
                  textAlign: 'left',
                  border: `1px solid ${selected ? C.blue : C.border}`,
                  background: selected ? '#eef4ff' : C.surface,
                  borderRadius: 12,
                  padding: 14,
                  cursor: isCurrentGoal ? 'not-allowed' : 'pointer',
                  opacity: isCurrentGoal ? 0.55 : 1,
                  boxShadow: C.cardShadow,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <Icon style={{ width: 18, height: 18, color: selected ? C.blue : C.muted, marginBottom: 0 }} />
                  {isCurrentGoal && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: C.muted,
                      border: `1px solid ${C.border}`,
                      background: C.bg,
                      borderRadius: 30,
                      padding: '2px 8px',
                      flexShrink: 0,
                    }}>
                      Current
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>{title}</p>
                <p style={{ fontSize: 12, lineHeight: 1.5, color: C.muted }}>{description}</p>
              </button>
            )
          })}
        </div>

        {error && (
          <div style={{ marginTop: 16, border: '1px solid #fecaca', background: '#fff1f2', borderRadius: 8, padding: '10px 12px', color: '#b91c1c', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={!selectedGoal || submitting || (!!saved.goal && selectedGoal === saved.goal)}
          onClick={() => void onContinue()}
          style={{
            width: '100%',
            marginTop: 20,
            padding: '12px 18px',
            borderRadius: 30,
            border: 'none',
            background: !selectedGoal || submitting ? C.muted : C.text,
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: !selectedGoal || submitting ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: !selectedGoal || submitting ? 0.7 : 1,
          }}
        >
          Show me the opportunities
          <ArrowRight style={{ width: 15, height: 15 }} />
        </button>
      </div>
      <style>{`
        @media (max-width: 720px) {
          .goal-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

