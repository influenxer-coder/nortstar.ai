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

const T = {
  bg:       '#FFFFFF',
  bgHover:  '#ECEAE4',
  border:   '#E5E3DD',
  text:     '#1A1A1A',
  muted:    '#9B9A97',
  green:    '#4D9B6F',
  greenBg:  '#EEF6F1',
  amber:    '#9B6D1A',
  amberBg:  '#FBF4E6',
  red:      '#9B3030',
  redBg:    '#FAEAEA',
  purple:   '#6B4FBB',
  purpleBg: '#F0ECFA',
}

function priorityColor(score: number | null | undefined): string {
  if (score == null) return '#D4D4D4'
  if (score >= 9.0)  return '#E5484D'
  if (score >= 7.0)  return '#E2A336'
  if (score >= 5.0)  return '#5E6AD2'
  if (score >= 3.0)  return '#6E6E6E'
  return '#D4D4D4'
}

const EFFORT_STYLE: Record<string, { color: string; bg: string }> = {
  low:    { color: T.green,  bg: T.greenBg },
  medium: { color: T.amber,  bg: T.amberBg },
  high:   { color: T.red,    bg: T.redBg },
}

type Props = {
  idea:                IdeaWithImpact
  featured?:           boolean
  onAction?:           () => void
  actionLabel?:        string
  actionLoading?:      boolean
  onInvestigate?:      () => void
  investigateLabel?:   string
  investigateDisabled?: boolean
  noBorderBottom?:     boolean
}

export default function OpportunityCard({
  idea,
  onAction,
  actionLabel,
  actionLoading,
  onInvestigate,
  investigateLabel,
  investigateDisabled,
  noBorderBottom = false,
}: Props) {
  const [hovered, setHovered] = useState(false)

  const dotColor  = priorityColor(idea.impact_score)
  const effort    = EFFORT_STYLE[idea.effort] ?? EFFORT_STYLE.medium

  return (
    <div
      className="opp-row"
      style={{
        display:      'flex',
        alignItems:   'center',
        height:       36,
        padding:      '0 12px',
        borderBottom: noBorderBottom ? 'none' : `1px solid ${T.border}`,
        cursor:       'pointer',
        background:   hovered ? T.bgHover : T.bg,
        transition:   'background 120ms ease',
        gap:          0,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !onAction && onInvestigate?.()}
    >
      {/* Priority dot */}
      <div style={{
        width: 8, height: 8,
        borderRadius: '50%',
        background: dotColor,
        flexShrink: 0,
        marginRight: 10,
      }} />

      {/* Title */}
      <span style={{
        fontSize: 13,
        color: T.text,
        flex: 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        marginRight: 8,
      }}>
        {idea.title}
      </span>

      {/* Competitor intel tag */}
      <span style={{
        fontSize: 11, fontWeight: 500,
        padding: '2px 6px', borderRadius: 4,
        background: T.purpleBg, color: T.purple,
        marginLeft: 6, flexShrink: 0, whiteSpace: 'nowrap',
      }}>
        Competitor intel
      </span>

      {/* Effort tag */}
      <span style={{
        fontSize: 11, fontWeight: 500,
        padding: '2px 6px', borderRadius: 4,
        background: effort.bg, color: effort.color,
        marginLeft: 6, flexShrink: 0, whiteSpace: 'nowrap',
      }}>
        {idea.effort}
      </span>

      {/* Impact score */}
      <span style={{
        fontSize: 12,
        color: T.muted,
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        marginLeft: 12,
        width: 36,
        textAlign: 'right',
        flexShrink: 0,
      }}>
        {idea.impact_score != null ? Number(idea.impact_score).toFixed(1) : '—'}
      </span>

      {/* Primary action (always visible — used in onboarding wow) */}
      {onAction && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onAction() }}
          disabled={actionLoading}
          style={{
            fontSize: 12, fontWeight: 500,
            color: T.purple, background: T.purpleBg,
            border: 'none', borderRadius: 4,
            padding: '3px 8px',
            cursor: actionLoading ? 'not-allowed' : 'pointer',
            opacity: actionLoading ? 0.6 : 1,
            marginLeft: 12, flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          {actionLabel ?? 'Select →'}
        </button>
      )}

      {/* Investigate — hover-only */}
      {onInvestigate && (
        <button
          type="button"
          className="opp-investigate"
          onClick={e => { e.stopPropagation(); onInvestigate() }}
          disabled={investigateDisabled}
          style={{
            fontSize: 12, fontWeight: 500,
            color: T.purple, background: 'none',
            border: 'none', borderRadius: 4,
            padding: '3px 8px',
            cursor: investigateDisabled ? 'not-allowed' : 'pointer',
            opacity: 0,
            marginLeft: 8, flexShrink: 0, whiteSpace: 'nowrap',
            transition: 'opacity 120ms ease',
            pointerEvents: 'none',
          }}
        >
          {investigateLabel ?? 'Investigate →'}
        </button>
      )}
    </div>
  )
}
