'use client'
import { C, scoreColor, type Segment, type UseCaseRow } from './types'

export function SegmentCards({ segments, rows, productName }: { segments: Segment[]; rows: UseCaseRow[]; productName: string }) {
  if (!segments.length) return null

  const sorted = [...segments].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)).slice(0, 4)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
      {sorted.map((seg, i) => {
        const segRows = rows.filter(r => r.segment_name === seg.segment_name)
        return (
          <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px', background: C.surface }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>{seg.segment_name}</p>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Primary KPI: <strong style={{ color: C.text }}>{seg.primary_kpi ?? '—'}</strong></p>
            {seg.primary_competitor && <p style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Competes with: <strong style={{ color: C.text }}>{seg.primary_competitor}</strong></p>}
            {seg.activation_journey_summary && <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>{seg.activation_journey_summary}</p>}
            {segRows.length > 0 && (
              <div style={{ marginTop: 8, borderTop: `1px solid #f0f0f0`, paddingTop: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: C.muted, marginBottom: 6 }}>USE CASES</p>
                {segRows.map((r, ri) => {
                  const sc = scoreColor(r.platform_score ?? 0)
                  const leads = r.leader_name?.toLowerCase().includes(productName.toLowerCase())
                  return (
                    <div key={ri} style={{ fontSize: 12, marginBottom: 6, paddingLeft: 8, borderLeft: `2px solid ${sc.color}` }}>
                      <p style={{ fontWeight: 500, color: C.text }}>{r.use_case_name}</p>
                      <p style={{ color: C.muted }}>
                        {productName} <strong style={{ color: sc.color }}>{r.platform_score?.toFixed(1)}</strong>/5
                        {' '}{leads ? <span style={{ color: C.green }}>✓ leads</span> : <span style={{ color: C.amber }}>⚠ lags</span>}
                        {' '}vs {r.leader_name} {r.leader_score?.toFixed(1)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
