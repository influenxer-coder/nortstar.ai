'use client'
import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { C, type Gap, type Okr, type Design } from './types'

function TierCard({ label, tier }: { label: string; tier?: { hypothesis?: string; screen_flow?: string[]; backend?: string; risk?: string } }) {
  if (!tier) return <div style={{ flex: 1, minWidth: 160, padding: 12, background: '#f9f9f9', borderRadius: 8, border: `1px solid ${C.border}` }}><p style={{ fontSize: 11, color: C.muted }}>Not available</p></div>
  return (
    <div style={{ flex: 1, minWidth: 160, padding: 12, background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: C.muted, marginBottom: 6 }}>{label}</p>
      {tier.hypothesis && <p style={{ fontSize: 12, color: C.text, lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{tier.hypothesis}</p>}
      {tier.screen_flow?.[0] && <p style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Screen: {tier.screen_flow[0]}</p>}
      {tier.backend && <p style={{ fontSize: 11, color: C.muted, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Backend: {tier.backend}</p>}
      {tier.risk && <p style={{ fontSize: 11, color: C.amber }}>Risk: {tier.risk}</p>}
    </div>
  )
}

export function GapsList({ gaps, okrs, designs, productName }: { gaps: Gap[]; okrs: Okr[]; designs: Design[]; productName: string }) {
  const sorted = [...gaps].sort((a, b) => (b.score_gap ?? 0) - (a.score_gap ?? 0))

  if (!sorted.length) return <p style={{ fontSize: 13, color: C.muted }}>No competitive gaps identified.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sorted.map((gap, i) => (
        <GapRow key={i} gap={gap} okrs={okrs} designs={designs} productName={productName} defaultOpen={i === 0} />
      ))}
    </div>
  )
}

function GapRow({ gap, okrs, designs, productName, defaultOpen }: { gap: Gap; okrs: Okr[]; designs: Design[]; productName: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const okr = okrs.find(o => o.use_case?.toLowerCase() === gap.use_case?.toLowerCase())
  const design = designs.find(d => d.gap_rank === gap.gap_rank)

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <AlertTriangle style={{ width: 16, height: 16, color: C.amber, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.amber }}>{gap.use_case}</p>
          <p style={{ fontSize: 12, color: C.muted }}>
            {productName} {gap.platform_score?.toFixed(1)}/5 · {gap.leader_name} {gap.leader_score?.toFixed(1)}/5 · Gap: <strong style={{ color: C.red }}>{gap.score_gap?.toFixed(1)}</strong>
          </p>
        </div>
        {open ? <ChevronUp style={{ width: 14, height: 14, color: C.muted }} /> : <ChevronDown style={{ width: 14, height: 14, color: C.muted }} />}
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Hypothesis */}
          {gap.hypothesis && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', marginBottom: 4 }}>WHY THIS GAP EXISTS</p>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{gap.hypothesis}</p>
            </div>
          )}

          {/* Root causes */}
          {gap.root_causes && gap.root_causes.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', marginBottom: 4 }}>ROOT CAUSES</p>
              {gap.root_causes.map((rc, ri) => (
                <p key={ri} style={{ fontSize: 12, color: C.text, lineHeight: 1.5, paddingLeft: 10, marginBottom: 3 }}>• {rc}</p>
              ))}
            </div>
          )}

          {/* Ways to close */}
          {gap.ways_to_close && gap.ways_to_close.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', marginBottom: 6 }}>HOW TO CLOSE IT</p>
              {gap.ways_to_close.map((fix, fi) => (
                <div key={fi} style={{ padding: '8px 10px', background: C.bg, borderRadius: 6, border: `1px solid ${C.border}`, marginBottom: 6 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>{fix.title}</p>
                  {fix.description && <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.5, marginBottom: 4 }}>{fix.description}</p>}
                  <p style={{ fontSize: 11, color: C.muted }}>Moves: {fix.kpi_it_moves} · <strong>{fix.impact_level}</strong> impact</p>
                </div>
              ))}
            </div>
          )}

          {/* Linked OKR */}
          {okr && (
            <div style={{ marginBottom: 14, padding: '12px 14px', background: '#eef4ff', borderRadius: 8, border: '1px solid #b8d0f7' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.blue, letterSpacing: '0.06em', marginBottom: 6 }}>LINKED OKR</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>{okr.objective}</p>
              {okr.key_results && okr.key_results.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {okr.key_results.map((kr, ki) => (
                    <div key={ki} style={{ marginBottom: 6, paddingLeft: 10, borderLeft: `2px solid ${kr.kr_type === 'leading' ? C.blue : C.green}` }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: C.text }}>[{kr.kr_type}] {kr.metric_name}</p>
                      <p style={{ fontSize: 11, color: C.muted }}>{kr.kr_text}</p>
                      {kr.logging_event && <p style={{ fontSize: 10, color: C.muted }}>Event: {kr.logging_event}</p>}
                      {kr.logging_event_trigger && <p style={{ fontSize: 10, color: C.muted }}>Trigger: {kr.logging_event_trigger}</p>}
                      {kr.kr_type === 'lagging' && kr.causal_chain && <p style={{ fontSize: 10, color: C.muted }}>Chain: {kr.causal_chain}</p>}
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 11, color: C.muted }}>
                Impact: {okr.impact_score} · Feasibility: {okr.feasibility_score} · Quality: {okr.okr_quality_score}/100
              </p>
              {okr.key_risk && <p style={{ fontSize: 11, color: C.amber }}>Risk: {okr.key_risk}</p>}
            </div>
          )}

          {/* Design tiers */}
          {design && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', marginBottom: 8 }}>WHAT TO BUILD</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <TierCard label="EASY (2 weeks)" tier={design.easy_tier} />
                <TierCard label="MEDIUM (6 weeks)" tier={design.medium_tier} />
                <TierCard label="FULL (12 weeks)" tier={design.full_tier} />
              </div>
              {design.reference_implementations && design.reference_implementations.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', marginBottom: 4 }}>REFERENCE IMPLEMENTATIONS</p>
                  {design.reference_implementations.map((ref, ri) => (
                    <p key={ri} style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                      <strong style={{ color: C.text }}>{ref.company}</strong>: {ref.what_built} → <strong>{ref.quantified_result}</strong>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
