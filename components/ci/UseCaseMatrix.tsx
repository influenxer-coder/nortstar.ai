'use client'
import { C, scoreColor, type UseCaseRow } from './types'

export function UseCaseMatrix({ rows, productName }: { rows: UseCaseRow[]; productName: string }) {
  if (!rows.length) return null

  const segments = Array.from(new Set(rows.map(r => r.segment_name ?? '').filter(Boolean)))
  const useCases = Array.from(new Set(rows.map(r => r.use_case_name ?? '').filter(Boolean)))

  const scoreMap = new Map<string, number>()
  for (const r of rows) {
    const key = `${r.use_case_name}|${r.segment_name}`
    scoreMap.set(key, r.platform_score ?? 0)
  }

  const truncate = (s: string, words: number) => {
    const parts = s.split(' ')
    return parts.length > words ? parts.slice(0, words).join(' ') + '…' : s
  }

  return (
    <div style={{ overflowX: 'auto', marginBottom: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase', position: 'sticky', left: 0, background: C.surface, zIndex: 1, minWidth: 140 }}>
              Use Case
            </th>
            {segments.map(seg => (
              <th key={seg} style={{ textAlign: 'center', padding: '8px 6px', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: 80 }}>
                {truncate(seg, 2)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {useCases.map(uc => (
            <tr key={uc}>
              <td style={{ padding: '8px 10px', borderBottom: `1px solid #f0f0f0`, fontWeight: 500, color: C.text, position: 'sticky', left: 0, background: C.surface, zIndex: 1 }}>
                {truncate(uc, 4)}
              </td>
              {segments.map(seg => {
                const score = scoreMap.get(`${uc}|${seg}`)
                if (score == null) {
                  return <td key={seg} style={{ textAlign: 'center', padding: '6px', borderBottom: `1px solid #f0f0f0`, color: '#ccc' }}>—</td>
                }
                const sc = scoreColor(score)
                return (
                  <td key={seg} style={{ textAlign: 'center', padding: '6px', borderBottom: `1px solid #f0f0f0`, background: sc.bg, fontWeight: 600, color: sc.color }}>
                    {sc.icon} {score.toFixed(1)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 10, color: C.muted, marginTop: 6, textAlign: 'right' }}>
        {productName} scores across {useCases.length} use cases × {segments.length} segments
      </p>
    </div>
  )
}
