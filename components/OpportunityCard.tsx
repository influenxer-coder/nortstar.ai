'use client'

import { useState } from 'react'

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

const BADGE_BAR: Record<string, string> = {
  do_first:    '#22c55e',
  worth_bet:   '#3b82f6',
  quick_win:   '#f59e0b',
  plan_sprint: '#9ca3af',
}

const EFFORT_LABEL: Record<string, { color: string; bg: string }> = {
  low:    { color: '#166534', bg: 'rgba(220,252,231,0.7)' },
  medium: { color: '#92600a', bg: 'rgba(255,251,235,0.7)' },
  high:   { color: '#be123c', bg: 'rgba(255,241,242,0.7)' },
}

type Props = {
  idea:           IdeaWithImpact
  featured?:      boolean
  onAction?:      () => void
  actionLabel?:   string
  actionLoading?: boolean
}

export default function OpportunityCard({ idea, featured = false, onAction, actionLabel, actionLoading }: Props) {
  const [expanded, setExpanded] = useState(false)

  const barColor   = BADGE_BAR[idea.decision_badge ?? ''] ?? '#9ca3af'
  const effort     = EFFORT_LABEL[idea.effort] ?? EFFORT_LABEL.medium
  const impactPct  = idea.impact_score != null
    ? Math.min(100, Math.round((idea.impact_score / 10) * 100))
    : null

  const bg          = featured ? '#1d1d1f' : '#ffffff'
  const titleColor  = featured ? '#f5f5f7' : '#1d1d1f'
  const mutedColor  = featured ? 'rgba(245,245,247,0.6)' : '#6e6e73'
  const liftColor   = featured ? '#34d399' : '#166534'
  const borderColor = featured ? 'rgba(255,255,255,0.08)' : '#e5e5ea'
  const barTrack    = featured ? 'rgba(255,255,255,0.12)' : '#e5e7eb'
  const tagBg       = featured ? 'rgba(255,255,255,0.1)' : '#f5f5f7'
  const tagColor    = featured ? 'rgba(245,245,247,0.8)' : '#6e6e73'

  return (
    <div style={{
      background:   bg,
      borderRadius: 20,
      boxShadow:    featured
        ? '0 8px 32px rgba(0,0,0,0.22)'
        : '0 2px 12px rgba(0,0,0,0.06)',
      overflow:     'hidden',
      border:       featured ? 'none' : '1px solid #e5e5ea',
      height:       '100%',
      display:      'flex',
      flexDirection:'column',
    }}>
      {/* Always-visible summary */}
      <div
        onClick={() => setExpanded(o => !o)}
        style={{ padding: '28px 28px 24px', cursor: 'pointer', flex: 1 }}
      >
        {/* Top label row */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
            padding: '3px 10px', borderRadius: 30,
            color: featured ? tagColor : effort.color,
            background: featured ? tagBg : effort.bg,
          }}>
            {idea.effort} effort
          </span>
        </div>

        {/* Title */}
        <h4 style={{
          fontSize: featured ? 26 : 22,
          fontWeight: 700,
          color: titleColor,
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
          marginBottom: 10,
        }}>
          {idea.title}
        </h4>

        {/* Tagline — human number */}
        {idea.human_number && (
          <p style={{
            fontSize: 15,
            fontWeight: 600,
            color: featured ? 'rgba(245,245,247,0.85)' : '#1d1d1f',
            lineHeight: 1.4,
            marginBottom: 6,
          }}>
            {idea.human_number}
          </p>
        )}

        {/* Lift range */}
        {idea.expected_lift_low != null && idea.expected_lift_high != null && (
          <p style={{ fontSize: 14, color: mutedColor, marginBottom: 0 }}>
            Expected lift: <strong style={{ color: liftColor }}>+{idea.expected_lift_low}–{idea.expected_lift_high}%</strong>
          </p>
        )}
      </div>

      {/* Impact bar */}
      {impactPct != null && (
        <div style={{ padding: '0 28px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: mutedColor, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Impact</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: titleColor }}>{Number(idea.impact_score).toFixed(1)}/10</span>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: barTrack, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${impactPct}%`, borderRadius: 99, background: barColor }} />
          </div>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: '20px 28px 24px',
          borderTop: `1px solid ${borderColor}`,
        }}>
          <p style={{ fontSize: 13, color: mutedColor, lineHeight: 1.7, marginBottom: 12 }}>
            {idea.evidence}
          </p>
          <p style={{
            fontSize: 13, color: featured ? 'rgba(245,245,247,0.75)' : '#3a3a3c',
            lineHeight: 1.65,
            paddingTop: 12, borderTop: `1px solid ${borderColor}`,
          }}>
            {idea.winning_pattern}
          </p>

          {onAction && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAction() }}
              disabled={actionLoading}
              style={{
                marginTop: 16,
                borderRadius: 30,
                border: `1px solid ${borderColor}`,
                background: featured ? 'rgba(255,255,255,0.1)' : '#f5f5f7',
                color: titleColor,
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLabel ?? 'Select →'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
