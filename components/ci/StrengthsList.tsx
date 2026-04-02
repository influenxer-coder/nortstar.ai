'use client'
import { CheckCircle2 } from 'lucide-react'
import { C, type UseCaseRow } from './types'

export function StrengthsList({ rows, productName }: { rows: UseCaseRow[]; productName: string }) {
  const pName = productName.toLowerCase()
  const strengths = rows
    .filter(r => (r.platform_score ?? 0) >= 4.0 && r.leader_name?.toLowerCase().includes(pName))
    .sort((a, b) => (b.platform_score ?? 0) - (a.platform_score ?? 0))
    .slice(0, 6)

  if (!strengths.length) {
    return <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>{productName} has no clear market leadership identified yet across analyzed use cases.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {strengths.map((r, i) => {
        const platformJustification = r.player_scores?.find(p => p.name?.toLowerCase().includes(pName))?.justification
        const otherPlayers = r.player_scores?.filter(p => !p.name?.toLowerCase().includes(pName)) ?? []
        return (
          <div key={i} style={{ padding: '14px 0', borderBottom: i < strengths.length - 1 ? `1px solid #f0f0f0` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
              <CheckCircle2 style={{ width: 16, height: 16, color: C.green, flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.green, marginBottom: 4 }}>{r.use_case_name}</p>
                <p style={{ fontSize: 12, color: C.muted }}>Segments: {r.segment_name} · {productName} score: <strong style={{ color: C.green }}>{r.platform_score?.toFixed(1)}</strong>/5</p>
              </div>
            </div>
            {platformJustification && (
              <p style={{ fontSize: 12, color: C.text, fontStyle: 'italic', lineHeight: 1.5, marginLeft: 26, marginBottom: 8 }}>
                &ldquo;{platformJustification}&rdquo; — from competitive scoring analysis
              </p>
            )}
            {otherPlayers.length > 0 && (
              <div style={{ marginLeft: 26, marginBottom: 6 }}>
                <p style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Beats:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {otherPlayers.slice(0, 4).map((p, pi) => (
                    <span key={pi} style={{ fontSize: 11, color: C.muted }}>{p.name}: <strong>{p.score?.toFixed(1)}</strong></span>
                  ))}
                </div>
              </div>
            )}
            {r.primary_kpi && <p style={{ fontSize: 11, color: C.muted, marginLeft: 26 }}>KPI: {r.primary_kpi}</p>}
            {r.test_methodology && <p style={{ fontSize: 11, color: C.muted, marginLeft: 26, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>Test: {r.test_methodology}</p>}
          </div>
        )
      })}
    </div>
  )
}
