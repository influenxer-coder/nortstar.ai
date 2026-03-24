'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink, ChevronDown, ChevronUp, TrendingUp, Minus, TrendingDown, ArrowRight } from 'lucide-react'

// ─── Design tokens (matches DashboardHome) ────────────────────────────────────
const C = {
  bg: '#f6f6f6',
  surface: '#ffffff',
  text: '#1f2328',
  muted: '#535963',
  border: '#d4d7dc',
  blue: '#367eed',
  shadow: '0 0 0 1px #d4d7dc',
  cardShadow: '0 1px 4px rgba(27,37,40,0.06)',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductInfo = {
  product_name?: string
  one_liner?: string
  target_customer?: string
  key_features?: string[]
  pricing_signal?: string
}

type MatchInfo = {
  subvertical_id?: string
  subvertical_name?: string
  vertical_name?: string
  confidence?: number
}

type IcpEntry = { role?: string; company_stage?: string; why_they_lose?: string; why_they_win?: string } | string | null | undefined

type Competitor = {
  id?: string
  name?: string
  one_liner?: string
  funding_stage?: string
  icp_signals?: {
    who_they_win_with?: IcpEntry
    who_they_lose_with?: IcpEntry
    underserved_icp?: { who?: string; pain?: string; workaround?: string } | string
  }
  changelog_signals?: {
    features_90d?: string[]
  }
  fitness?: string
}

type PositionInfo = {
  position_summary?: string
  closest_competitor?: string
  key_differentiator?: string
}

type StrategyJson = {
  product?: ProductInfo
  match?: MatchInfo
  competitors?: Competitor[]
  position?: PositionInfo
  onboarding_context?: {
    goal?: string
    north_star_metric?: string
    icps?: string[]
    created_product_id?: string
    selected_idea?: { title?: string }
  }
}

type Niche = {
  niche?: string
  why_viable?: string
  example_wedge?: string
  underserved_icp?: { role?: string; stage?: string }
}

type FitnessEntry = {
  name?: string
  fitness?: string
}

type SubverticalData = {
  evolutionary_niches?: Niche[]
  whitespace?: {
    gap?: string
    target_icp?: string
    evidence?: string[] | string
    estimated_urgency?: string
  }
  fitness_map?: FitnessEntry[]
  competitive_intensity?: string
  trending_features?: string[]
} | null

type Agent = { id: string; name: string; status: string | null }

type Project = {
  id: string
  name: string | null
  url: string | null
  description: string | null
  icp: string | null
  north_star_metric: string | null
  north_star_current: string | null
  north_star_target: string | null
  onboarding_step: number | null
  onboarding_completed: boolean | null
  strategy_json: unknown
  created_at: string
}

type Props = {
  project: Project
  subvertical: SubverticalData
  agents: Agent[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function icpText(entry: IcpEntry): string {
  if (!entry) return ''
  if (typeof entry === 'string') return entry
  return [entry.role, entry.company_stage, entry.why_they_lose ?? entry.why_they_win].filter(Boolean).join(' · ')
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 12 }}>
      {children}
    </p>
  )
}

function Chip({ children, color = C.muted, bg = C.bg, border = C.border }: {
  children: React.ReactNode
  color?: string
  bg?: string
  border?: string
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 11, fontWeight: 600, color,
      background: bg, border: `1px solid ${border}`,
      borderRadius: 30, padding: '3px 10px',
    }}>
      {children}
    </span>
  )
}

function ConfidenceBadge({ confidence }: { confidence?: number }) {
  if (confidence == null) return null
  if (confidence > 0.85) return <Chip color="#2e7d32" bg="#e8f5e9" border="#a5d6a7">Strong match</Chip>
  if (confidence >= 0.7) return <Chip color={C.blue} bg="#eef4ff" border="#b8d0f7">Good match</Chip>
  return <Chip color="#92600a" bg="#fffbeb" border="#f0b429">Possible match</Chip>
}

function IntensityBadge({ intensity }: { intensity?: string }) {
  const v = (intensity ?? '').toLowerCase()
  if (v === 'high') return <Chip color="#be123c" bg="#fff1f2" border="#fda4af">Highly competitive</Chip>
  if (v === 'medium') return <Chip color="#92600a" bg="#fffbeb" border="#f0b429">Moderately competitive</Chip>
  return <Chip color="#2e7d32" bg="#e8f5e9" border="#a5d6a7">Low competition</Chip>
}

function GoalChip({ goal }: { goal?: string }) {
  if (!goal) return null
  const g = goal.toLowerCase()
  const style =
    g.includes('activation') ? { color: C.blue, bg: '#eef4ff', border: '#b8d0f7' } :
    g.includes('signup') ? { color: '#2e7d32', bg: '#e8f5e9', border: '#a5d6a7' } :
    g.includes('retention') ? { color: '#6d28d9', bg: '#f5f3ff', border: '#c4b5fd' } :
    g.includes('competi') ? { color: '#c2410c', bg: '#fff7ed', border: '#fdba74' } :
    { color: C.muted, bg: C.bg, border: C.border }
  return <Chip {...style}>{goal}</Chip>
}

function Section({ label, defaultOpen = true, children }: {
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 24 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', background: 'none', border: 'none',
          padding: '0 0 12px', cursor: 'pointer',
          borderBottom: `1px solid ${C.border}`, marginBottom: 16,
        }}
      >
        <SectionLabel>{label}</SectionLabel>
        {open
          ? <ChevronUp style={{ width: 14, height: 14, color: C.muted }} />
          : <ChevronDown style={{ width: 14, height: 14, color: C.muted }} />
        }
      </button>
      {open && children}
    </div>
  )
}

function CompetitorCard({ competitor }: { competitor: Competitor }) {
  const [expanded, setExpanded] = useState(false)
  const fitness = (competitor.fitness ?? '').toLowerCase()
  const fitnessStyle =
    fitness === 'rising' ? { color: '#2e7d32', bg: '#e8f5e9', border: '#a5d6a7' } :
    fitness === 'declining' ? { color: '#be123c', bg: '#fff1f2', border: '#fda4af' } :
    { color: C.muted, bg: C.bg, border: C.border }

  return (
    <div style={{
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      background: C.surface,
      boxShadow: C.cardShadow,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{competitor.name ?? 'Unknown'}</span>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {competitor.funding_stage && (
              <Chip>{competitor.funding_stage}</Chip>
            )}
            {fitness && <Chip {...fitnessStyle}>{fitness}</Chip>}
          </div>
        </div>
        {competitor.one_liner && (
          <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 8 }}>
            {competitor.one_liner}
          </p>
        )}
        {competitor.icp_signals?.who_they_lose_with && (
          <p style={{ fontSize: 12, color: C.text }}>
            <span style={{ color: C.muted }}>Loses with: </span>
            {icpText(competitor.icp_signals.who_they_lose_with)}
          </p>
        )}
      </div>

      {(competitor.icp_signals?.who_they_win_with || (competitor.changelog_signals?.features_90d ?? []).length > 0) && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            padding: '8px', borderTop: `1px solid ${C.border}`,
            background: C.bg, border: 'none', cursor: 'pointer',
            fontSize: 11, color: C.muted, fontWeight: 500,
          }}
        >
          {expanded ? 'Less' : 'More details'}
          {expanded
            ? <ChevronUp style={{ width: 12, height: 12 }} />
            : <ChevronDown style={{ width: 12, height: 12 }} />
          }
        </button>
      )}

      {expanded && (
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.bg }}>
          {competitor.icp_signals?.who_they_win_with && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 3 }}>WINS WITH</p>
              <p style={{ fontSize: 12, color: C.text }}>{icpText(competitor.icp_signals.who_they_win_with)}</p>
            </div>
          )}
          {(competitor.changelog_signals?.features_90d ?? []).length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 3 }}>RECENT FEATURES</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {(competitor.changelog_signals?.features_90d ?? []).slice(0, 4).map((f, i) => (
                  <li key={i} style={{ fontSize: 12, color: C.text, paddingLeft: 10, position: 'relative', marginBottom: 2 }}>
                    <span style={{ position: 'absolute', left: 0 }}>·</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProductIntelligence({ project, subvertical, agents }: Props) {
  const strategy = (project.strategy_json ?? {}) as StrategyJson
  const product = strategy.product ?? {}
  const match = strategy.match ?? {}
  const competitors = strategy.competitors ?? []
  const position = strategy.position ?? {}
  const ctx = strategy.onboarding_context ?? {}
  const goal = ctx.goal

  const northStar = project.north_star_metric ?? ctx.north_star_metric
  const currentVal = project.north_star_current
  const targetVal = project.north_star_target

  // Subvertical data
  const niches = (subvertical?.evolutionary_niches ?? []) as Niche[]
  const whitespace = subvertical?.whitespace
  const fitnessMap = (subvertical?.fitness_map ?? []) as FitnessEntry[]
  const intensity = subvertical?.competitive_intensity

  const confidencePct = match.confidence != null ? Math.round((match.confidence as number) * 100) : null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>

      {/* ── LEFT COLUMN ──────────────────────────────────────────────────── */}
      <div style={{ flex: '1 1 0', minWidth: 0, padding: '32px 32px 80px', maxWidth: 720 }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: 20 }}>
          <Link href="/dashboard" style={{ fontSize: 12, color: C.muted, textDecoration: 'none' }}>
            Dashboard
          </Link>
          <span style={{ fontSize: 12, color: C.border, margin: '0 6px' }}>/</span>
          <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{project.name ?? 'Product'}</span>
        </div>

        {/* ── SECTION 1 — PRODUCT HEADER ──────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: '-0.02em', marginBottom: 6 }}>
            {project.name ?? product.product_name ?? 'Product'}
          </h1>

          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.muted, textDecoration: 'none', marginBottom: 14 }}
            >
              {project.url}
              <ExternalLink style={{ width: 11, height: 11 }} />
            </a>
          )}

          {/* Tags row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {match.vertical_name && <Chip>{match.vertical_name}</Chip>}
            {match.subvertical_name && <Chip color={C.blue} bg="#eef4ff" border="#b8d0f7">{match.subvertical_name}</Chip>}
            {confidencePct != null && (
              <ConfidenceBadge confidence={match.confidence as number} />
            )}
            {goal && <GoalChip goal={goal} />}
          </div>

          {/* One liner */}
          {(project.description ?? product.one_liner) && (
            <p style={{ fontSize: 14, color: C.muted, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 16 }}>
              {project.description ?? product.one_liner}
            </p>
          )}

          {/* North Star */}
          {northStar && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', borderRadius: 10,
              background: C.surface, border: `1px solid ${C.border}`,
              boxShadow: C.cardShadow,
            }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: C.muted, marginBottom: 2 }}>NORTH STAR</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{northStar}</p>
              </div>
              {currentVal && targetVal && (
                <>
                  <div style={{ width: 1, height: 28, background: C.border }} />
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: C.muted, marginBottom: 4 }}>PROGRESS</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: C.muted }}>{currentVal}</span>
                      <ArrowRight style={{ width: 12, height: 12, color: C.border }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#2e7d32' }}>{targetVal}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 2 — MARKET POSITION ─────────────────────────────── */}
        <Section label="Market Position">
          <div style={{
            background: '#eef4ff',
            border: '1px solid #b8d0f7',
            borderRadius: 12,
            padding: 20,
            boxShadow: C.cardShadow,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20 }}>
              <div>
                {position.position_summary ? (
                  <>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.blue, marginBottom: 8 }}>YOUR POSITION</p>
                    <p style={{ fontSize: 16, color: C.text, lineHeight: 1.55, marginBottom: 16, fontWeight: 500 }}>
                      {position.position_summary}
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>Position analysis not available</p>
                )}

                {position.closest_competitor && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.muted, marginBottom: 4 }}>CLOSEST COMPETITOR</p>
                    <Chip color={C.text} bg={C.surface} border={C.border}>{position.closest_competitor}</Chip>
                  </div>
                )}

                {position.key_differentiator && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.muted, marginBottom: 4 }}>YOUR EDGE</p>
                    <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic', lineHeight: 1.5 }}>
                      {position.key_differentiator}
                    </p>
                  </div>
                )}
              </div>

              <div style={{ minWidth: 140, textAlign: 'right' }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.muted, marginBottom: 6 }}>YOUR MARKET</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{match.subvertical_name ?? '—'}</p>
                <p style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>{match.vertical_name ?? ''}</p>
                <IntensityBadge intensity={intensity} />
              </div>
            </div>
          </div>
        </Section>

        {/* ── SECTION 3 — COMPETITORS ──────────────────────────────────── */}
        <Section label={`Competitors · ${competitors.length} in your space`}>
          {competitors.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', borderRadius: 10, border: `1px dashed ${C.border}`, background: C.surface }}>
              <p style={{ fontSize: 13, color: C.muted }}>No competitor data available</p>
            </div>
          ) : (
            <>
              {/* Convergent signal card */}
              {match.subvertical_name && (
                <div style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: '14px 16px',
                  marginBottom: 16,
                  boxShadow: C.cardShadow,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.muted, marginBottom: 6 }}>CONVERGENT SIGNAL</p>
                  <p style={{ fontSize: 14, color: C.text, fontWeight: 500, lineHeight: 1.5 }}>
                    Every competitor in <strong>{match.subvertical_name}</strong> loses with the same buyer.
                  </p>
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {competitors.filter(c => c.icp_signals?.who_they_lose_with).slice(0, 4).map((c, i) => (
                      <p key={i} style={{ fontSize: 12, color: C.muted }}>
                        <strong style={{ color: C.text }}>{c.name}</strong> → {icpText(c.icp_signals?.who_they_lose_with)}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Competitor grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {competitors.map((c, i) => (
                  <CompetitorCard key={c.id ?? i} competitor={c} />
                ))}
              </div>
            </>
          )}
        </Section>

        {/* ── SECTION 4 — EVOLUTIONARY NICHES ─────────────────────────── */}
        <Section label="Market Opportunities">
          {!subvertical ? (
            <div style={{ padding: 24, textAlign: 'center', borderRadius: 10, border: `1px dashed ${C.border}`, background: C.surface }}>
              <p style={{ fontSize: 13, color: C.muted }}>Market analysis data not available</p>
            </div>
          ) : (
            <>
              {/* Whitespace card */}
              {whitespace?.gap && (
                <div style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 16,
                  boxShadow: C.cardShadow,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.blue, marginBottom: 8 }}>UNOCCUPIED NICHE</p>
                  <p style={{ fontSize: 18, fontWeight: 600, color: C.text, lineHeight: 1.4, marginBottom: 10 }}>{whitespace.gap}</p>
                  {whitespace.target_icp && (
                    <p style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>
                      Target buyer: <strong style={{ color: C.text }}>{whitespace.target_icp}</strong>
                    </p>
                  )}
                  {whitespace.evidence && (
                    <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
                      {(Array.isArray(whitespace.evidence) ? whitespace.evidence : [whitespace.evidence]).map((e, i) => (
                        <li key={i} style={{ fontSize: 12, color: C.muted, paddingLeft: 12, position: 'relative', marginBottom: 3 }}>
                          <span style={{ position: 'absolute', left: 0 }}>·</span>
                          {e}
                        </li>
                      ))}
                    </ul>
                  )}
                  {whitespace.estimated_urgency && (
                    <div style={{ marginTop: 12 }}>
                      <Chip
                        color={whitespace.estimated_urgency === 'high' ? '#be123c' : '#92600a'}
                        bg={whitespace.estimated_urgency === 'high' ? '#fff1f2' : '#fffbeb'}
                        border={whitespace.estimated_urgency === 'high' ? '#fda4af' : '#f0b429'}
                      >
                        {whitespace.estimated_urgency} urgency
                      </Chip>
                    </div>
                  )}
                </div>
              )}

              {/* Evolutionary niches */}
              {niches.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {niches.map((niche, i) => (
                    <div key={i} style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: '14px 16px',
                      boxShadow: C.cardShadow,
                    }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>{niche.niche}</p>
                      {niche.why_viable && (
                        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, marginBottom: 8 }}>{niche.why_viable}</p>
                      )}
                      {niche.example_wedge && (
                        <div style={{
                          background: '#eef4ff', border: '1px solid #b8d0f7',
                          borderRadius: 6, padding: '6px 10px', marginBottom: 8,
                        }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: C.blue }}>Lead with: {niche.example_wedge}</p>
                        </div>
                      )}
                      {niche.underserved_icp && (
                        <p style={{ fontSize: 11, color: C.muted }}>
                          Target: <strong style={{ color: C.text }}>{niche.underserved_icp.role}</strong>
                          {niche.underserved_icp.stage && ` · ${niche.underserved_icp.stage}`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Fitness map */}
              {fitnessMap.length > 0 && (
                <div style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: '14px 16px',
                  boxShadow: C.cardShadow,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.muted, marginBottom: 10 }}>MARKET MOMENTUM</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {fitnessMap.map((entry, i) => {
                      const f = (entry.fitness ?? '').toLowerCase()
                      const Icon = f === 'rising' ? TrendingUp : f === 'declining' ? TrendingDown : Minus
                      const color = f === 'rising' ? '#2e7d32' : f === 'declining' ? '#be123c' : C.muted
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Icon style={{ width: 13, height: 13, color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: C.text }}>{entry.name}</span>
                          <Chip color={color} bg={C.bg} border={C.border}>{f || 'stable'}</Chip>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </Section>
      </div>

      {/* ── RIGHT COLUMN (sticky) ─────────────────────────────────────── */}
      <div style={{
        width: 280,
        flexShrink: 0,
        padding: '32px 20px 32px 0',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}>

        {/* AT A GLANCE */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: '14px 16px',
          boxShadow: C.cardShadow,
          marginBottom: 12,
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.muted, marginBottom: 12 }}>AT A GLANCE</p>
          {[
            { label: 'Competitors tracked', value: competitors.length || '—' },
            { label: 'Market', value: match.subvertical_name ?? '—' },
            { label: 'Goal', value: goal ?? '—' },
            { label: 'North Star', value: northStar ?? '—' },
            { label: 'Active agents', value: agents.length || '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.text, textAlign: 'right', maxWidth: 120 }}>{String(value)}</span>
            </div>
          ))}
        </div>

        {/* SIGNAL SOURCES */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: '14px 16px',
          boxShadow: C.cardShadow,
          marginBottom: 12,
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.muted, marginBottom: 12 }}>SIGNAL SOURCES</p>
          {[
            { name: 'PostHog', status: 'not_connected' },
            { name: 'GitHub', status: 'not_connected' },
            { name: 'Slack', status: 'not_connected' },
            { name: 'Gong', status: 'coming_soon' },
            { name: 'Intercom', status: 'coming_soon' },
          ].map(({ name, status }) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: status === 'connected' ? '#2e7d32' : '#d4d7dc',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 12, color: C.text }}>{name}</span>
              </div>
              {status === 'coming_soon' ? (
                <span style={{ fontSize: 10, color: C.muted }}>Soon</span>
              ) : status === 'not_connected' ? (
                <Link href="/dashboard" style={{ fontSize: 11, color: C.blue, textDecoration: 'none', fontWeight: 500 }}>
                  Connect
                </Link>
              ) : (
                <span style={{ fontSize: 10, color: '#2e7d32', fontWeight: 600 }}>Connected</span>
              )}
            </div>
          ))}
        </div>

        {/* ICP */}
        {(project.icp || product.target_customer) && (
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: '14px 16px',
            boxShadow: C.cardShadow,
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.muted, marginBottom: 8 }}>YOUR ICP</p>
            <p style={{ fontSize: 12, color: C.text, lineHeight: 1.55 }}>{project.icp}</p>
            {product.target_customer && project.icp !== product.target_customer && (
              <p style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: 'italic' }}>
                NorthStar inferred: {product.target_customer}
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
