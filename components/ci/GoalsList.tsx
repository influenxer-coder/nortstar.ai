'use client'
import { ArrowRight } from 'lucide-react'
import { C, type Goal } from './types'

export function GoalsList({ goals, productName }: { goals: Goal[]; productName: string }) {
  const real = goals.filter(g => !g.inferred)
  if (!real.length) return <p style={{ fontSize: 13, color: C.muted }}>No strategic goals with public evidence identified for {productName}.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {real.map((g, i) => {
        const flywheel = g.flywheel_effect?.split('→').map(s => s.trim()).filter(Boolean) ?? []
        return (
          <div key={i} style={{ padding: '14px 0', borderBottom: i < real.length - 1 ? `1px solid #f0f0f0` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
              <ArrowRight style={{ width: 14, height: 14, color: C.blue, flexShrink: 0, marginTop: 3 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: C.text, lineHeight: 1.4 }}>{g.goal_text}</p>
                {g.evidence_source && <p style={{ fontSize: 12, color: C.muted, fontStyle: 'italic', marginTop: 3 }}>{g.evidence_source}</p>}
              </div>
            </div>
            {flywheel.length >= 2 && (
              <div style={{ marginLeft: 24, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {flywheel.map((step, si) => (
                  <span key={si} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: C.text, background: '#eef4ff', border: '1px solid #b8d0f7', borderRadius: 4, padding: '2px 8px' }}>{step}</span>
                    {si < flywheel.length - 1 && <span style={{ fontSize: 12, color: C.border }}>→</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
