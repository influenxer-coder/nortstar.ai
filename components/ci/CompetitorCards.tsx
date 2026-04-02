'use client'
import { C, type CompetitorDirect, type UseCaseRow } from './types'

export function CompetitorCards({ competitors, rows, productName }: { competitors: CompetitorDirect[]; rows: UseCaseRow[]; productName: string }) {
  if (!competitors.length) return null

  const pName = productName.toLowerCase()
  const platformAvg = rows.length > 0 ? rows.reduce((s, r) => s + (r.platform_score ?? 0), 0) / rows.length : 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
      {competitors.slice(0, 3).map((comp, i) => {
        const cName = (comp.name ?? '').toLowerCase()
        const scores = rows.flatMap(r => (r.player_scores ?? []).filter(p => p.name?.toLowerCase().includes(cName)).map(p => p.score ?? 0))
        const compAvg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
        const leads = platformAvg >= compAvg

        // Where competitor beats product
        const compWins = rows.filter(r => {
          const compScore = r.player_scores?.find(p => p.name?.toLowerCase().includes(cName))?.score ?? 0
          return compScore > (r.platform_score ?? 0)
        }).slice(0, 3)

        // Where product beats competitor
        const prodWins = rows.filter(r => {
          const compScore = r.player_scores?.find(p => p.name?.toLowerCase().includes(cName))?.score ?? 0
          return (r.platform_score ?? 0) > compScore && compScore > 0
        }).slice(0, 3)

        return (
          <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px', background: C.surface }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{comp.name}</p>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 12 }}>{comp.one_line}</p>

            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: C.muted, marginBottom: 4 }}>AVG SCORE</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: leads ? C.green : C.amber }}>
                {compAvg.toFixed(1)}/5 vs {productName} {platformAvg.toFixed(1)}/5
              </p>
            </div>

            {compWins.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: C.muted, marginBottom: 4 }}>WHERE {(comp.name ?? '').toUpperCase()} BEATS {productName.toUpperCase()}</p>
                {compWins.map((r, ri) => {
                  const cs = r.player_scores?.find(p => p.name?.toLowerCase().includes(cName))
                  return (
                    <div key={ri} style={{ fontSize: 11, color: C.muted, marginBottom: 4, paddingLeft: 8, borderLeft: `2px solid ${C.amber}` }}>
                      <p>• {r.use_case_name}: <strong style={{ color: C.amber }}>{cs?.score?.toFixed(1)}</strong> vs <strong>{r.platform_score?.toFixed(1)}</strong></p>
                      {cs?.justification && <p style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{cs.justification}</p>}
                    </div>
                  )
                })}
              </div>
            )}

            {prodWins.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: C.muted, marginBottom: 4 }}>WHERE {productName.toUpperCase()} BEATS {(comp.name ?? '').toUpperCase()}</p>
                {prodWins.map((r, ri) => {
                  const prodJust = r.player_scores?.find(p => p.name?.toLowerCase().includes(pName))?.justification
                  const cs = r.player_scores?.find(p => p.name?.toLowerCase().includes(cName))
                  return (
                    <div key={ri} style={{ fontSize: 11, color: C.muted, marginBottom: 4, paddingLeft: 8, borderLeft: `2px solid ${C.green}` }}>
                      <p>• {r.use_case_name}: <strong style={{ color: C.green }}>{r.platform_score?.toFixed(1)}</strong> vs <strong>{cs?.score?.toFixed(1)}</strong></p>
                      {prodJust && <p style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{prodJust}</p>}
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
