'use client'

import { useMemo } from 'react'

type Variation = {
  name: string
  pattern: string
  validated_by: string[]
  expected_lift_low: number
  expected_lift_high: number
  risk: 'low' | 'medium' | 'high'
  risk_reason: string
  is_recommended: boolean
}

const C = {
  surface: '#ffffff',
  text: '#1f2328',
  muted: '#535963',
  border: '#d4d7dc',
  blue: '#367eed',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

function riskColor(risk: string) {
  if (risk === 'low') return { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' }
  if (risk === 'high') return { bg: '#fff1f2', color: '#be123c', border: '#fda4af' }
  return { bg: '#fffbeb', color: '#92600a', border: '#f0b429' }
}

export function VariationPicker({
  variations,
  selectedIndex,
  onSelect,
}: {
  variations: Variation[]
  selectedIndex: number | null
  onSelect: (idx: number) => void
}) {
  const recommendedIndex = useMemo(() => variations.findIndex((v) => v.is_recommended), [variations])

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>
          How do you want to approach this?
        </h3>
        <p style={{ fontSize: 12, color: C.muted }}>Based on what&apos;s working in your market</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
        {variations.map((v, idx) => {
          const selected = selectedIndex === idx
          const risk = riskColor(v.risk)
          return (
            <button
              key={`${v.name}-${idx}`}
              type="button"
              onClick={() => onSelect(idx)}
              style={{
                textAlign: 'left',
                border: `1px solid ${selected ? '#b8d0f7' : C.border}`,
                background: selected ? '#eef4ff' : C.surface,
                borderRadius: 12,
                padding: 14,
                cursor: 'pointer',
                boxShadow: C.cardShadow,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{v.name}</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  border: `1px solid ${risk.border}`,
                  borderRadius: 30,
                  padding: '3px 10px',
                  background: risk.bg,
                  color: risk.color,
                  flexShrink: 0,
                }}>
                  {v.risk.toUpperCase()} risk
                </span>
              </div>

              <p style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{v.pattern}</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: C.muted }}>
                  Validated by: <strong style={{ color: C.text }}>{(v.validated_by ?? []).slice(0, 4).join(', ') || '—'}</strong>
                </span>
                <span style={{ fontSize: 11, color: C.muted }}>
                  Expected lift: <strong style={{ color: C.text }}>+{v.expected_lift_low}–{v.expected_lift_high}%</strong>
                </span>
              </div>

              {v.risk_reason && (
                <p style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
                  Risk: {v.risk_reason}
                </p>
              )}
            </button>
          )
        })}
      </div>

      {recommendedIndex >= 0 && (
        <p style={{ marginTop: 12, fontSize: 12, color: C.muted }}>
          NorthStar recommends: <strong style={{ color: C.text }}>{variations[recommendedIndex]?.name}</strong>
        </p>
      )}
    </div>
  )
}

