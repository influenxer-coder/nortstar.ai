'use client'

const C = {
  text:       '#1f2328',
  muted:      '#535963',
  border:     '#d4d7dc',
  surface:    '#ffffff',
  cardShadow: '0 1px 4px rgba(27,37,40,0.06)',
}

export type IdeaWithImpact = {
  title:              string
  goal:               string
  effort:             'low' | 'medium' | 'high'
  evidence:           string
  winning_pattern:    string
  expected_lift_low:  number | null | undefined
  expected_lift_high: number | null | undefined
  confidence:         'high' | 'medium' | 'low' | null | undefined
  confidence_reason:  string | null | undefined
  impact_score:       number | null | undefined
  decision_badge:     'do_first' | 'worth_bet' | 'quick_win' | 'plan_sprint' | null | undefined
  human_number:       string | null | undefined
}

const BADGE: Record<string, { label: string; color: string; bg: string; border: string; bar: string; left: string }> = {
  do_first:    { label: 'DO THIS FIRST',   color: '#166534', bg: '#dcfce7', border: '#86efac', bar: '#22c55e', left: '#22c55e' },
  worth_bet:   { label: 'WORTH THE BET',   color: '#1e40af', bg: '#dbeafe', border: '#93c5fd', bar: '#3b82f6', left: '#3b82f6' },
  quick_win:   { label: 'QUICK WIN',       color: '#92600a', bg: '#fffbeb', border: '#f0b429', bar: '#f59e0b', left: '#f59e0b' },
  plan_sprint: { label: 'PLAN FOR SPRINT', color: '#374151', bg: '#f3f4f6', border: '#d1d5db', bar: '#9ca3af', left: '#9ca3af' },
}

const EFFORT: Record<string, { color: string; bg: string; border: string }> = {
  low:    { color: '#2e7d32', bg: '#e8f5e9', border: '#a5d6a7' },
  medium: { color: '#92600a', bg: '#fffbeb', border: '#f0b429' },
  high:   { color: '#be123c', bg: '#fff1f2', border: '#fda4af' },
}

const CONF_DOT: Record<string, { filled: boolean[]; color: string }> = {
  high:   { filled: [true, true, true],   color: '#22c55e' },
  medium: { filled: [true, true, false],  color: '#f59e0b' },
  low:    { filled: [true, false, false], color: '#9ca3af' },
}

function ConfidenceDots({ level }: { level: 'high' | 'medium' | 'low' }) {
  const cfg = CONF_DOT[level] ?? CONF_DOT.medium
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {cfg.filled.map((f, i) => (
        <span
          key={i}
          style={{ width: 7, height: 7, borderRadius: '50%', display: 'inline-block', background: f ? cfg.color : '#e5e7eb' }}
        />
      ))}
    </span>
  )
}

type Props = {
  idea:          IdeaWithImpact
  onAction?:     () => void
  actionLabel?:  string
  actionLoading?: boolean
}

export default function OpportunityCard({ idea, onAction, actionLabel, actionLoading }: Props) {
  const badge   = idea.decision_badge ? BADGE[idea.decision_badge] : null
  const effort  = EFFORT[idea.effort] ?? EFFORT.medium
  const impactPct = idea.impact_score != null
    ? Math.min(100, Math.round((idea.impact_score / 10) * 100))
    : null

  return (
    <div style={{
      background:   C.surface,
      border:       `1px solid ${C.border}`,
      borderLeft:   `4px solid ${badge?.left ?? C.border}`,
      borderRadius: 12,
      boxShadow:    C.cardShadow,
      overflow:     'hidden',
    }}>
      <div style={{ padding: '16px' }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 10 }}>{idea.title}</h4>

        {/* Metrics row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          {idea.expected_lift_low != null && idea.expected_lift_high != null && (
            <span style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>
              +{idea.expected_lift_low}–{idea.expected_lift_high}%
            </span>
          )}
          {idea.confidence && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.muted }}>
              <ConfidenceDots level={idea.confidence} />
              {idea.confidence}
            </span>
          )}
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
            padding: '2px 8px', borderRadius: 20,
            color: effort.color, background: effort.bg, border: `1px solid ${effort.border}`,
          }}>
            {idea.effort.toUpperCase()} EFFORT
          </span>
        </div>

        {/* Impact bar */}
        {impactPct != null && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Impact</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{Number(idea.impact_score).toFixed(1)}/10</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${impactPct}%`, borderRadius: 99,
                background: badge?.bar ?? '#9ca3af',
              }} />
            </div>
          </div>
        )}

        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, marginBottom: 8 }}>{idea.evidence}</p>
        <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
          {idea.winning_pattern}
        </p>

        {/* Human number */}
        {idea.human_number && (
          <p style={{ fontSize: 12, color: C.muted, fontStyle: 'italic', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
            {idea.human_number}
          </p>
        )}

        {onAction && (
          <button
            type="button"
            onClick={onAction}
            disabled={actionLoading}
            style={{
              marginTop: 12,
              borderRadius: 30,
              border: `1px solid ${C.border}`,
              background: C.surface,
              color: C.text,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              opacity: actionLoading ? 0.65 : 1,
            }}
          >
            {actionLabel ?? 'Select →'}
          </button>
        )}
      </div>
    </div>
  )
}
