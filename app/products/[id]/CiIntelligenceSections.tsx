'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react'

const C = {
  bg: '#f6f6f6', surface: '#ffffff', text: '#1f2328', muted: '#535963',
  border: '#d4d7dc', blue: '#367eed', cardShadow: '0 1px 4px rgba(27,37,40,0.06)',
}

type Segment = { segment_name?: string; primary_kpi?: string; primary_competitor?: string; confidence?: number }
type UseCaseRow = {
  use_case_name?: string; segment_name?: string; platform_score?: number
  leader_name?: string; leader_score?: number; second_best_name?: string; second_best_score?: number
  player_scores?: Array<{ name?: string; score?: number }>
}
type Gap = {
  use_case?: string; platform_score?: number; leader_name?: string; leader_score?: number; score_gap?: number
  hypothesis?: string; ways_to_close?: Array<{ title?: string; kpi_it_moves?: string; impact_level?: string }>
}
type Goal = { goal_text?: string; evidence_source?: string; inferred?: boolean }
type CompetitorDetail = { name?: string; one_line?: string; feature_platform_lacks?: string }

type CiData = {
  ci_enriched: boolean
  segments: Segment[]
  use_case_rows: UseCaseRow[]
  gaps: Gap[]
  goals: Goal[]
  competitors_detail: CompetitorDetail[]
}

function Section({ title, subtitle, children, defaultOpen = true }: { title: string; subtitle: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 20 }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 0', textAlign: 'left' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 2 }}>{title}</p>
          <p style={{ fontSize: 12, color: C.muted }}>{subtitle}</p>
        </div>
        {open ? <ChevronUp style={{ width: 16, height: 16, color: C.muted }} /> : <ChevronDown style={{ width: 16, height: 16, color: C.muted }} />}
      </button>
      {open && <div style={{ paddingTop: 4 }}>{children}</div>}
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 60, borderRadius: 8, background: '#f0f0f0', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )
}

export function CiIntelligenceSections({ projectId, productName }: { projectId: string; productName: string }) {
  const [data, setData] = useState<CiData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/products/${projectId}/ci-intelligence`)
      .then(r => r.json())
      .then(d => setData(d as CiData))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) {
    return (
      <div style={{ padding: '20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Loader2 style={{ width: 14, height: 14, color: C.muted, animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 12, color: C.muted }}>Loading competitive intelligence...</span>
        </div>
        <Skeleton />
      </div>
    )
  }

  if (!data?.ci_enriched) return null

  const { segments, use_case_rows, gaps, goals, competitors_detail } = data

  // Computed: where they lead
  const pName = productName.toLowerCase()
  const leadsRows = use_case_rows
    .filter(r => (r.platform_score ?? 0) >= 4.0 && r.leader_name?.toLowerCase().includes(pName))
    .sort((a, b) => (b.platform_score ?? 0) - (a.platform_score ?? 0))
    .slice(0, 4)

  // Computed: competitor avg scores
  const platformAvg = use_case_rows.length > 0
    ? use_case_rows.reduce((s, r) => s + (r.platform_score ?? 0), 0) / use_case_rows.length
    : 0

  const competitorAvgs = competitors_detail.slice(0, 3).map(comp => {
    const scores = use_case_rows.flatMap(r =>
      (r.player_scores ?? []).filter(p => p.name?.toLowerCase().includes((comp.name ?? '').toLowerCase())).map(p => p.score ?? 0)
    )
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    return { ...comp, avg }
  })

  // Computed: real goals
  const realGoals = goals.filter(g => !g.inferred).slice(0, 4)

  return (
    <>
      {/* SECTION 1: WHO BUYS THIS */}
      {segments.length > 0 && (
        <Section title="Who buys this" subtitle="Segments identified from market research and competitive analysis">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {segments.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)).slice(0, 4).map((seg, i) => (
              <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', background: C.surface }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>{seg.segment_name}</p>
                <p style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Primary KPI:</p>
                <p style={{ fontSize: 12, color: C.text, marginBottom: 8 }}>{seg.primary_kpi ?? '—'}</p>
                {seg.primary_competitor && (
                  <p style={{ fontSize: 11, color: C.muted }}>Competes with: <strong style={{ color: C.text }}>{seg.primary_competitor}</strong></p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* SECTION 2: WHERE THEY LEAD */}
      <Section title="Where they lead" subtitle="Use cases where this product scores highest in the market">
        {leadsRows.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {leadsRows.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: i < leadsRows.length - 1 ? `1px solid #f0f0f0` : 'none' }}>
                <CheckCircle2 style={{ width: 16, height: 16, color: '#2e7d32', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.use_case_name}</p>
                  <p style={{ fontSize: 12, color: C.muted }}>
                    {r.segment_name} · <strong>{r.platform_score?.toFixed(1)}</strong>/5
                    {r.second_best_name && ` · Leads ${r.leader_score?.toFixed(1)} vs ${r.second_best_name} ${r.second_best_score?.toFixed(1)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>No clear market leadership identified yet</p>
        )}
      </Section>

      {/* SECTION 3: WHERE THEY LAG */}
      {gaps.length > 0 && (
        <Section title="Where they lag" subtitle="Competitive gaps identified from feature and scoring analysis">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {gaps.sort((a, b) => (b.score_gap ?? 0) - (a.score_gap ?? 0)).slice(0, 4).map((gap, i) => (
              <GapRow key={i} gap={gap} productName={productName} />
            ))}
          </div>
        </Section>
      )}

      {/* SECTION 4: COMPETITOR SNAPSHOT */}
      {competitorAvgs.length > 0 && (
        <Section title="Competitor snapshot" subtitle="Direct competitors and how they compare across use cases">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {competitorAvgs.map((comp, i) => {
              const leads = comp.avg > platformAvg
              return (
                <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', background: C.surface }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{comp.name}</p>
                  <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>{comp.one_line}</p>
                  {comp.feature_platform_lacks && (
                    <div style={{ marginBottom: 10 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: C.muted, textTransform: 'uppercase', marginBottom: 3 }}>Wins on</p>
                      <p style={{ fontSize: 12, color: C.text }}>{comp.feature_platform_lacks}</p>
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: C.muted, textTransform: 'uppercase', marginBottom: 3 }}>Avg score</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: leads ? '#92600a' : '#2e7d32' }}>
                      {comp.avg.toFixed(1)} avg vs {platformAvg.toFixed(1)} yours
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* SECTION 5: WHERE THEY'RE HEADED */}
      {realGoals.length > 0 && (
        <Section title="Where they're headed" subtitle="Strategic goals backed by public evidence">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {realGoals.map((g, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0' }}>
                <ArrowRight style={{ width: 14, height: 14, color: C.blue, flexShrink: 0, marginTop: 3 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{g.goal_text}</p>
                  {g.evidence_source && <p style={{ fontSize: 11, color: C.muted, fontStyle: 'italic' }}>{g.evidence_source}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

// ── Expandable gap row ──────────────────────────────────────────────────
function GapRow({ gap, productName }: { gap: Gap; productName: string }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', background: C.surface }}>
      <button type="button" onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <AlertTriangle style={{ width: 15, height: 15, color: '#d97706', flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{gap.use_case}</p>
          <p style={{ fontSize: 12, color: C.muted }}>
            {productName} {gap.platform_score?.toFixed(1)} · {gap.leader_name} {gap.leader_score?.toFixed(1)} · Gap: {gap.score_gap?.toFixed(1)}
          </p>
          {gap.hypothesis && !expanded && (
            <p style={{ fontSize: 12, color: C.muted, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>
              {gap.hypothesis}
            </p>
          )}
        </div>
        {expanded ? <ChevronUp style={{ width: 14, height: 14, color: C.muted, flexShrink: 0 }} /> : <ChevronDown style={{ width: 14, height: 14, color: C.muted, flexShrink: 0 }} />}
      </button>
      {expanded && (
        <div style={{ padding: '0 14px 14px 39px' }}>
          {gap.hypothesis && <p style={{ fontSize: 12, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>{gap.hypothesis}</p>}
          {gap.ways_to_close && gap.ways_to_close.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {gap.ways_to_close.map((fix, fi) => (
                <div key={fi} style={{ padding: '8px 10px', background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>{fix.title}</p>
                  <p style={{ fontSize: 11, color: C.muted }}>{fix.kpi_it_moves} · <strong>{fix.impact_level}</strong> impact</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
