'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RefreshCw, Loader2, ArrowLeft, Lightbulb, GitCommit, Activity, MessageSquare, Globe, TrendingUp, Megaphone, Star, FlaskConical, Zap, ChevronRight, Plus } from 'lucide-react'
import { getProductMeta, getGoalLabel } from '@/lib/product-meta'
import OpportunityCard, { type IdeaWithImpact } from '@/components/OpportunityCard'
import AddOpportunityDialog from '@/components/AddOpportunityDialog'
import { InvestigateModal } from '@/components/InvestigateModal'
import { OptimizePageFlow } from '@/components/optimize/OptimizePageFlow'


const C = {
  bg: '#f6f6f6',
  surface: '#ffffff',
  text: '#1f2328',
  muted: '#535963',
  border: '#d4d7dc',
  blue: '#367eed',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

type Idea = IdeaWithImpact

type CommitRow = { sha: string; message: string; date: string; formattedDate: string; url: string }

type Props = {
  projectId: string
  productId?: string | null
  projectName: string
  productName: string
  productUrl: string
  goal: string | null
  subverticalId: string | null
  recentCommits?: CommitRow[]
  selectedOkrs?: Array<{ objective?: string }>
}

const SIGNAL_SOURCES = [
  { icon: GitCommit,     label: 'Past experiments',          active: false },
  { icon: Activity,      label: 'Page analytics (Posthog)',  active: false },
  { icon: MessageSquare, label: 'Slack signals',             active: false },
  { icon: Globe,         label: 'Competitor intel',          active: true  },
  { icon: TrendingUp,    label: 'Market data',               active: true  },
  { icon: Megaphone,     label: 'PMM Inbounds',              active: true  },
  { icon: Star,          label: 'Leadership priority',       active: false },
  { icon: FlaskConical,  label: 'UX Research',               active: false },
  { icon: Zap,           label: 'Rage Shakes',               active: false },
]

export default function OpportunitiesFeed({ projectId, productId, projectName, productName, productUrl, goal, subverticalId, recentCommits = [], selectedOkrs = [] }: Props) {
  const okrParams = useSearchParams()
  const okrIdx = okrParams.get('okr')
  const activeOkr = okrIdx !== null && selectedOkrs[Number(okrIdx)]
    ? selectedOkrs[Number(okrIdx)]
    : null

  const productMeta = getProductMeta(productName)
  const goalMeta = getGoalLabel(goal)
  const resolved = productMeta ?? goalMeta
  const friendlyLabel = activeOkr?.objective
    ? activeOkr.objective
    : resolved?.label ?? goal ?? 'Opportunities'
  const reach = resolved?.reach ?? null
  const [rankedIdeas, setRankedIdeas] = useState<Idea[]>([])
  const [backlogIdeas, setBacklogIdeas] = useState<Idea[]>([])
  const [ciOkrContext, setCiOkrContext] = useState<Record<string, unknown> | null>(null)
  const [ciTierIdeas, setCiTierIdeas] = useState<(Idea & {
    tier?: string; tier_label?: string; risk?: string; _oppId?: string;
    gap_hypothesis?: string; screen_flow?: string[]; backend?: string; frontend?: string;
    reference?: { company?: string; what_built?: string; quantified_result?: string } | null;
  })[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [launchesOpen, setLaunchesOpen] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [investigateOpen, setInvestigateOpen] = useState<{ id: string; title: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'features' | 'pages'>('features')
  const [optimizeOpen, setOptimizeOpen] = useState(false)
  const [expandedHypothesis, setExpandedHypothesis] = useState<Record<number, boolean>>({})
  const [ciRefs, setCiRefs] = useState<Array<{ company?: string; what_built?: string; quantified_result?: string }>>([])
  const [ciUseCase, setCiUseCase] = useState<string>('')
  const [marketCards, setMarketCards] = useState<Array<{
    company: string; what_built: string; quantified_result: string;
    score: number | null; justification: string;
  }> | null>(null)
  const [marketLoading, setMarketLoading] = useState(false)
  const [pageOptimizations, setPageOptimizations] = useState<{ id: string; name: string; url: string; status: string; target_element?: { text?: string } }[]>([])
  const hasFetched = useRef(false)
  const searchParams = useSearchParams()
  const handledInvestigateParam = useRef(false)

  // Auto-reopen investigate modal after GitHub OAuth redirect (once only)
  useEffect(() => {
    if (handledInvestigateParam.current) return
    const investigateId = searchParams.get('investigate')
    if (investigateId) {
      handledInvestigateParam.current = true
      setInvestigateOpen({ id: investigateId, title: '' })
      // Clean URL immediately
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams])
  function canInvestigate(idea: Idea): boolean {
    return typeof (idea as unknown as { id?: unknown }).id === 'string'
  }

  function opportunityId(idea: Idea): string | null {
    const id = (idea as unknown as { id?: unknown }).id
    return typeof id === 'string' ? id : null
  }

  const goalKey = goal ?? 'no_goal'
  const priorityStorageKey = `northstar_opportunities_priority_v1:${projectId}:${goalKey}`

  function ideaKey(idea: Idea): string {
    return [
      idea.title,
      String(idea.goal ?? ''),
      idea.effort,
      String(idea.impact_score ?? ''),
      String(idea.expected_lift_low ?? ''),
      String(idea.expected_lift_high ?? ''),
    ].join('|')
  }

  function readPriorityState(): { rankedKeys: string[] } {
    try {
      const raw = localStorage.getItem(priorityStorageKey)
      if (!raw) return { rankedKeys: [] }
      const parsed = JSON.parse(raw) as unknown
      const rankedKeys = Array.isArray((parsed as { rankedKeys?: unknown }).rankedKeys)
        ? ((parsed as { rankedKeys: unknown[] }).rankedKeys as unknown[]).filter((k): k is string => typeof k === 'string')
        : []
      return { rankedKeys }
    } catch {
      return { rankedKeys: [] }
    }
  }

  function writePriorityState(ranked: Idea[]) {
    try {
      const rankedKeys = ranked.map(ideaKey)
      localStorage.setItem(priorityStorageKey, JSON.stringify({ rankedKeys }))
    } catch {
      // non-critical
    }
  }

  function applyStoredPriority(ideas: Idea[]): { ranked: Idea[]; backlog: Idea[] } {
    const { rankedKeys } = readPriorityState()
    if (!rankedKeys.length) return { ranked: [], backlog: ideas }

    const byKey = new Map<string, Idea>()
    for (const idea of ideas) byKey.set(ideaKey(idea), idea)

    const ranked: Idea[] = []
    const used = new Set<string>()
    for (const k of rankedKeys) {
      const found = byKey.get(k)
      if (found) {
        ranked.push(found)
        used.add(k)
      }
    }

    const backlog = ideas.filter((idea) => !used.has(ideaKey(idea)))
    return { ranked, backlog }
  }

  const moveToBacklog = (idx: number) => {
    const idea = rankedIdeas[idx]
    const nextRanked = rankedIdeas.filter((_, i) => i !== idx)
    setRankedIdeas(nextRanked)
    setBacklogIdeas(prev => [...prev, idea])
    writePriorityState(nextRanked)
  }

  const prioritize = (idx: number) => {
    const idea = backlogIdeas[idx]
    const nextBacklog = backlogIdeas.filter((_, i) => i !== idx)
    const nextRanked = [...rankedIdeas, idea].sort((a, b) => (b.impact_score ?? 0) - (a.impact_score ?? 0))
    setBacklogIdeas(nextBacklog)
    setRankedIdeas(nextRanked)
    writePriorityState(nextRanked)
  }

  // Save freshly-generated ideas to DB
  const saveIdeas = async (freshIdeas: Idea[]) => {
    if (!freshIdeas.length) return
    await fetch('/api/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, ideas: freshIdeas }),
    }).catch(() => { /* non-critical */ })
  }

  // Build 3 tier ideas from ci_data.design.easy_tier / medium_tier / full_tier
  const buildTierIdeas = (oppId: string, ciData: Record<string, unknown>) => {
    const okr = ciData.okr as Record<string, unknown> | undefined
    const design = ciData.design as Record<string, unknown> | undefined
    if (!design) return []

    const impactScore = Number(okr?.impact_score ?? 0)
    const feasScore = Number(okr?.feasibility_score ?? 0)

    const refs = Array.isArray(design.reference_implementations)
      ? design.reference_implementations as Array<{ company?: string; what_built?: string; quantified_result?: string }>
      : []

    const tiers: Array<{ tier: Record<string, unknown> | undefined; tierName: string; tierLabel: string; effort: 'low' | 'medium' | 'high'; badge: Idea['decision_badge']; refIdx: number }> = [
      { tier: design.easy_tier as Record<string, unknown> | undefined,   tierName: 'easy',   tierLabel: 'Easy — ~2 weeks',   effort: 'low',    badge: 'quick_win', refIdx: 0 },
      { tier: design.medium_tier as Record<string, unknown> | undefined, tierName: 'medium', tierLabel: 'Medium — ~6 weeks',  effort: 'medium', badge: 'worth_bet', refIdx: 1 },
      { tier: design.full_tier as Record<string, unknown> | undefined,   tierName: 'full',   tierLabel: 'Full — ~12 weeks',   effort: 'high',   badge: 'do_first',  refIdx: 2 },
    ]

    return tiers.filter(t => t.tier?.hypothesis).map(t => ({
      title: String(t.tier!.hypothesis),
      goal: goal ?? '',
      effort: t.effort,
      evidence: String(design.use_case ?? design.hypothesis ?? ''),
      winning_pattern: '',
      expected_lift_low: Math.round(impactScore * 0.6),
      expected_lift_high: impactScore,
      confidence: (feasScore >= 85 ? 'high' : feasScore >= 50 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      confidence_reason: null,
      impact_score: Math.round((impactScore * feasScore) / 100),
      decision_badge: t.badge,
      human_number: null,
      tier: t.tierName,
      tier_label: t.tierLabel,
      risk: String(t.tier!.risk ?? ''),
      _oppId: oppId,
      gap_hypothesis: String(design.hypothesis ?? ''),
      screen_flow: Array.isArray(t.tier!.screen_flow) ? (t.tier!.screen_flow as string[]) : [],
      backend: String(t.tier!.backend ?? ''),
      frontend: String(t.tier!.frontend ?? ''),
      reference: refs[t.refIdx] ?? null,
    }))
  }

  // On mount: load from DB (instant, no Claude call)
  const loadFromDB = async () => {
    setLoading(true)
    setError(null)
    try {
      const goalQuery = goal ? `&goal=${encodeURIComponent(goal)}` : ''
      const res = await fetch(`/api/opportunities?project_id=${encodeURIComponent(projectId)}${goalQuery}`)
      if (!res.ok) throw new Error('Failed to load saved opportunities')
      const data = await res.json() as { ideas?: (Idea & { id?: string; ci_data?: Record<string, unknown> })[] }
      const saved = data.ideas ?? []

      // When viewing a specific OKR, find its opportunity row
      if (okrIdx !== null && saved.length > 0) {
        // Filter to only CI opportunities (those with ci_data containing tier designs)
        const ciOpps = saved.filter(s => {
          if (!s.ci_data) return false
          const design = (s.ci_data as Record<string, unknown>).design as Record<string, unknown> | undefined
          return design?.easy_tier || design?.medium_tier || design?.full_tier
        })

        // Primary: match by ci_data.okr.objective
        const objective = activeOkr?.objective
        let matchingOpp = objective
          ? ciOpps.find(s => {
              const ciOkr = (s.ci_data as Record<string, unknown>).okr as Record<string, unknown> | undefined
              return ciOkr?.objective === objective
            })
          : undefined

        // Fallback: match by title
        if (!matchingOpp && objective) {
          matchingOpp = ciOpps.find(s => s.title === objective)
        }

        // Last resort: use index position (CI opps created in same order as selectedOkrs, sort by created_at)
        if (!matchingOpp && ciOpps.length > 0) {
          const sorted = [...ciOpps].sort((a, b) =>
            String((a as unknown as Record<string, unknown>).created_at ?? '').localeCompare(String((b as unknown as Record<string, unknown>).created_at ?? ''))
          )
          const idx = Number(okrIdx)
          if (idx >= 0 && idx < sorted.length) {
            matchingOpp = sorted[idx]
          }
        }

        if (matchingOpp?.ci_data) {
          const ciData = matchingOpp.ci_data as Record<string, unknown>
          const tiers = buildTierIdeas(matchingOpp.id ?? '', ciData)
          if (tiers.length > 0) {
            setCiTierIdeas(tiers)
            const okr = ciData.okr as Record<string, unknown> | undefined
            if (okr) setCiOkrContext(okr)
            // Store refs + use_case for market section
            const design = ciData.design as Record<string, unknown> | undefined
            const refs = Array.isArray(design?.reference_implementations)
              ? design!.reference_implementations as Array<{ company?: string; what_built?: string; quantified_result?: string }>
              : []
            setCiRefs(refs)
            setCiUseCase(String(okr?.use_case ?? ''))
          }
        }
        setLoading(false)
        return
      }

      if (saved.length > 0) {
        const { ranked, backlog } = applyStoredPriority(saved)
        setRankedIdeas(ranked)
        setBacklogIdeas(backlog)
        return
      }
      // No saved rows → generate fresh
      await generateAndSave()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Regenerate via Claude, score, and persist
  const generateAndSave = async () => {
    if (!subverticalId || !goal) return
    try {
      const res = await fetch(
        `/api/onboarding/wow-data?subvertical_id=${encodeURIComponent(subverticalId)}&goal=${encodeURIComponent(goal)}&project_id=${encodeURIComponent(projectId)}`
      )
      if (!res.ok) throw new Error('Failed to generate opportunities')
      const data = await res.json() as { ideas?: Idea[] }
      const fresh = data.ideas ?? []
      const { ranked, backlog } = applyStoredPriority(fresh)
      setRankedIdeas(ranked)
      setBacklogIdeas(backlog)
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      await saveIdeas(fresh)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // Manual refresh: regenerate + save
  const fetchIdeas = async () => {
    setRefreshing(true)
    setError(null)
    await generateAndSave()
    setRefreshing(false)
  }

  // Re-run when OKR selection changes (okrIdx from query param)
  useEffect(() => {
    // Reset state so stale tier ideas from previous OKR don't persist
    setCiTierIdeas(null)
    setCiOkrContext(null)
    setCiRefs([])
    setCiUseCase('')
    setMarketCards(null)
    setRankedIdeas([])
    setBacklogIdeas([])
    void loadFromDB()
    // Load page optimizations for this project + goal
    if (!hasFetched.current) {
      hasFetched.current = true
      fetch(`/api/agents?project_id=${encodeURIComponent(projectId)}&type=page_optimization&goal=${encodeURIComponent(goal ?? '')}`)
        .then(r => r.json())
        .then((data: { agents?: { id: string; name: string; url: string; status: string; target_element?: { text?: string } }[] }) => {
          setPageOptimizations(data.agents ?? [])
        })
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [okrIdx])

  // Fetch ci-intelligence and assemble market competitor cards when refs are available
  useEffect(() => {
    if (ciRefs.length === 0 || !ciUseCase || !projectId) return
    let cancelled = false
    setMarketLoading(true)
    fetch(`/api/products/${encodeURIComponent(projectId)}/ci-intelligence`)
      .then(r => r.json())
      .then((ciData: { ci_enriched?: boolean; use_case_rows?: Array<Record<string, unknown>> }) => {
        if (cancelled || !ciData.ci_enriched) { setMarketLoading(false); return }
        const ucRows = ciData.use_case_rows ?? []
        const target = ciUseCase.toLowerCase().trim()
        // Find the phase5 row matching this OKR's use_case
        const p5row = ucRows.find(r => String(r.use_case_name ?? '').toLowerCase().trim() === target)
        const playerScores = Array.isArray(p5row?.player_scores)
          ? p5row!.player_scores as Array<{ name?: string; score?: number; justification?: string }>
          : []
        // Build cards from reference_implementations, enriched with scores
        const cards = ciRefs
          .filter(ref => ref.company)
          .map(ref => {
            const cName = (ref.company ?? '').toLowerCase()
            const ps = playerScores.find(p => (p.name ?? '').toLowerCase().includes(cName) || cName.includes((p.name ?? '').toLowerCase()))
            return {
              company: ref.company ?? '',
              what_built: ref.what_built ?? '',
              quantified_result: ref.quantified_result ?? '',
              score: ps?.score ?? null,
              justification: ps?.justification ?? '',
            }
          })
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        setMarketCards(cards)
        setMarketLoading(false)
      })
      .catch(() => { setMarketLoading(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciRefs, ciUseCase, projectId])

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '32px' }}>
      {/* Header */}
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <Link
            href={`/products/${projectId}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted, textDecoration: 'none', marginBottom: 16 }}
          >
            <ArrowLeft style={{ width: 12, height: 12 }} />
            {projectName}
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Lightbulb style={{ width: 20, height: 20, color: '#f59e0b', flexShrink: 0 }} />
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: '-0.02em', marginBottom: 2 }}>
                  {friendlyLabel}
                </h1>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <button
                type="button"
                onClick={() => void fetchIdeas()}
                disabled={loading || refreshing}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 13, fontWeight: 500, color: C.blue,
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: '7px 14px',
                  cursor: (loading || refreshing) ? 'not-allowed' : 'pointer',
                  opacity: (loading || refreshing) ? 0.5 : 1,
                  boxShadow: C.cardShadow,
                }}
              >
                <RefreshCw style={{ width: 13, height: 13, animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                {refreshing ? 'Scoring…' : 'Refresh'}
              </button>
              {lastUpdated && (
                <span style={{ fontSize: 11, color: C.muted }}>Updated {lastUpdated}</span>
              )}
            </div>
          </div>
        </div>

        {/* Signal Sources */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: C.muted, textTransform: 'uppercase', marginRight: 4 }}>
            Signal sources
          </span>
          {SIGNAL_SOURCES.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 500,
                color:      active ? '#166534' : C.muted,
                background: active ? '#dcfce7'  : C.surface,
                border:     `1px solid ${active ? '#86efac' : C.border}`,
                borderRadius: 20, padding: '4px 10px',
              }}
            >
              <Icon style={{ width: 11, height: 11, flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>

        {/* Recent launches */}
        {recentCommits.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            {reach && (
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>
                Shipped so far: <strong style={{ color: '#2e7d32' }}>{reach} improvement</strong>
              </p>
            )}
            <button
              type="button"
              onClick={() => setLaunchesOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: launchesOpen ? 12 : 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%' }}
            >
              <GitCommit style={{ width: 14, height: 14, color: C.muted, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', color: C.muted, textTransform: 'uppercase', flex: 1, textAlign: 'left' }}>
                Recent launches
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginRight: 4 }}>{recentCommits.length}</span>
              <ChevronRight style={{ width: 12, height: 12, color: C.muted, transition: 'transform 0.15s', transform: launchesOpen ? 'rotate(90deg)' : 'none' }} />
            </button>
            {launchesOpen && <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}` }}>
              {recentCommits.map((c, i) => (
                <a
                  key={c.sha}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    background: i % 2 === 0 ? C.surface : '#fafafa',
                    textDecoration: 'none',
                    borderBottom: i < recentCommits.length - 1 ? `1px solid ${C.border}` : 'none',
                  }}
                  className="hover-row"
                >
                  <code style={{ fontSize: 11, color: C.blue, fontFamily: 'monospace', flexShrink: 0, width: 52 }}>{c.sha}</code>
                  <span style={{ fontSize: 13, color: C.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.message}
                  </span>
                  <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>
                    {c.formattedDate}
                  </span>
                </a>
              ))}
            </div>}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
          {([
            { id: 'features' as const, label: 'Feature Opportunities' },
            { id: 'pages' as const, label: 'Page Optimizations' },
          ]).map(tab => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              style={{
                fontSize: 13, fontWeight: 500, padding: '8px 16px',
                color: activeTab === tab.id ? C.text : C.muted,
                borderBottom: activeTab === tab.id ? '2px solid #1f2328' : '2px solid transparent',
                background: 'none', border: 'none', borderBottomStyle: 'solid',
                cursor: 'pointer', transition: 'color 0.15s',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Page Optimizations tab */}
        {activeTab === 'pages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button type="button" onClick={() => setOptimizeOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px',
                border: `1px dashed ${C.border}`, borderRadius: 12, background: C.surface,
                cursor: 'pointer', width: '100%', fontSize: 13, color: C.blue, fontWeight: 500,
              }}>
              <Plus style={{ width: 14, height: 14 }} />
              Optimize a page
            </button>

            {pageOptimizations.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', borderRadius: 12, border: `1px dashed ${C.border}`, background: C.surface }}>
                <p style={{ fontSize: 14, color: C.muted, marginBottom: 4 }}>No page optimizations yet</p>
                <p style={{ fontSize: 12, color: C.muted }}>Pick a page and a key action to optimize</p>
              </div>
            )}

            {pageOptimizations.map(opt => (
              <Link
                key={opt.id}
                href={`/dashboard/agents/${opt.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface,
                  textDecoration: 'none', boxShadow: C.cardShadow, transition: 'border-color 0.15s',
                }}
                className="hover-row"
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F0ECFA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Globe style={{ width: 16, height: 16, color: '#6B4FBB' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{opt.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {opt.url} {opt.target_element?.text ? `· ${opt.target_element.text}` : ''}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  ...(opt.status === 'Analyzing' ? { color: '#92600a', background: '#fef9c3' } : { color: '#166534', background: '#dcfce7' }),
                }}>
                  {opt.status}
                </span>
                <ChevronRight style={{ width: 14, height: 14, color: C.muted }} />
              </Link>
            ))}
          </div>
        )}

        {/* Feature Opportunities tab */}
        {activeTab !== 'pages' && loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: C.muted }}>
            <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14 }}>Generating opportunities…</span>
          </div>
        ) : error ? (
          <div style={{ padding: 20, borderRadius: 10, background: '#fff5f5', border: '1px solid #fed7d7', marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: '#c53030', marginBottom: 8 }}>{error}</p>
            <button type="button" onClick={() => void fetchIdeas()}
              style={{ fontSize: 13, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Try again
            </button>
          </div>
        ) : null}

        {/* CI OKR context + tier ideas */}
        {activeTab !== 'pages' && !loading && ciTierIdeas && (
          <>
            {/* OKR context card (shown when ci_data.okr is available) */}
            {ciOkrContext && (
              <div style={{ background: '#eef4ff', border: '1px solid #b8d0f7', borderRadius: 12, padding: '16px 20px', marginBottom: 20, boxShadow: C.cardShadow }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: C.blue, marginBottom: 6 }}>GOAL</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: C.text, lineHeight: 1.4, marginBottom: 12 }}>{String(ciOkrContext.objective ?? '')}</p>
                {Array.isArray(ciOkrContext.key_results) && (ciOkrContext.key_results as Array<Record<string, unknown>>).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: C.muted, marginBottom: 6 }}>KEY RESULTS</p>
                    {(ciOkrContext.key_results as Array<Record<string, unknown>>).map((kr, ki) => (
                      <div key={ki} style={{ marginBottom: 6, paddingLeft: 10, borderLeft: `2px solid ${kr.kr_type === 'leading' ? C.blue : '#059669'}` }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: C.text }}>[{String(kr.kr_type)}] {String(kr.metric_name ?? '')}</p>
                        <p style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(kr.kr_text ?? '')}</p>
                        {!!kr.logging_event && <p style={{ fontSize: 10, color: C.muted }}>Measured by: {String(kr.logging_event)}</p>}
                        {kr.kr_type === 'lagging' && !!kr.causal_chain && <p style={{ fontSize: 10, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Chain: {String(kr.causal_chain)}</p>}
                      </div>
                    ))}
                  </div>
                )}
                <p style={{ fontSize: 11, color: C.muted }}>
                  Impact: <strong>{String(ciOkrContext.impact_score ?? '—')}</strong> · Feasibility: <strong>{String(ciOkrContext.feasibility_score ?? '—')}</strong> · Quality: <strong>{String(ciOkrContext.okr_quality_score ?? '—')}</strong>/100
                </p>
              </div>
            )}

            {/* Tier ideas — enriched cards */}
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Build options — 3 tiers of implementation</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 48 }}>
              {ciTierIdeas.map((idea, idx) => {
                const tierBg = idea.tier === 'easy' ? '#dcfce7' : idea.tier === 'medium' ? '#fef9c3' : '#e0f2fe'
                const tierColor = idea.tier === 'easy' ? '#166534' : idea.tier === 'medium' ? '#92600a' : '#075985'
                const effortStyle = { low: { color: '#166534', bg: 'rgba(220,252,231,0.7)' }, medium: { color: '#92600a', bg: 'rgba(255,251,235,0.7)' }, high: { color: '#be123c', bg: 'rgba(255,241,242,0.7)' } }[idea.effort] ?? { color: '#92600a', bg: 'rgba(255,251,235,0.7)' }
                const impactPct = idea.impact_score != null ? Math.min(100, Math.round((idea.impact_score / 10) * 100)) : null
                const badgeColorMap: Record<string, string> = { do_first: '#22c55e', worth_bet: '#3b82f6', quick_win: '#f59e0b', plan_sprint: '#9ca3af' }
                const barColor = badgeColorMap[idea.decision_badge ?? ''] ?? '#9ca3af'
                const hypExpanded = expandedHypothesis[idx] ?? false

                return (
                  <div key={idx} style={{
                    background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden',
                  }}>
                    <div style={{ padding: '24px 24px 20px' }}>
                      {/* Top pills */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 30, color: effortStyle.color, background: effortStyle.bg }}>
                          {idea.effort} effort
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 30, color: tierColor, background: tierBg }}>
                          {idea.tier_label}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 style={{ fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1.3, letterSpacing: '-0.01em', marginBottom: 16 }}>
                        {idea.title}
                      </h4>

                      {/* WHY THIS EXISTS */}
                      {idea.gap_hypothesis && (
                        <div style={{ marginBottom: 16 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>WHY THIS EXISTS</p>
                          <p style={{
                            fontSize: 13, color: '#3a3a3c', lineHeight: 1.6, margin: 0,
                            ...(!hypExpanded ? { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' } : {}),
                          }}>
                            {idea.gap_hypothesis}
                          </p>
                          {idea.gap_hypothesis.length > 180 && (
                            <button type="button" onClick={() => setExpandedHypothesis(prev => ({ ...prev, [idx]: !prev[idx] }))}
                              style={{ fontSize: 11, fontWeight: 600, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 0', marginTop: 2 }}>
                              {hypExpanded ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* WHAT TO BUILD */}
                      {idea.screen_flow && idea.screen_flow.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>WHAT TO BUILD</p>
                          <ol style={{ margin: 0, paddingLeft: 20 }}>
                            {idea.screen_flow.map((step, si) => (
                              <li key={si} style={{ fontSize: 13, color: '#3a3a3c', lineHeight: 1.6, marginBottom: 4 }}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* PROVEN BY */}
                      {idea.reference && idea.reference.company && (
                        <div style={{ marginBottom: 16 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>PROVEN BY</p>
                          <p style={{ fontSize: 13, color: '#3a3a3c', lineHeight: 1.6, margin: 0 }}>
                            <strong>{idea.reference.company}</strong>: {idea.reference.what_built ?? ''}
                          </p>
                          {idea.reference.quantified_result && (
                            <p style={{ fontSize: 13, color: '#166534', fontWeight: 600, margin: '2px 0 0' }}>
                              → {idea.reference.quantified_result}
                            </p>
                          )}
                        </div>
                      )}


                      {/* RISK */}
                      {idea.risk && (
                        <div style={{
                          display: 'flex', alignItems: 'flex-start', gap: 6, padding: '10px 14px',
                          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, marginBottom: 16,
                        }}>
                          <span style={{ fontSize: 13, flexShrink: 0 }}>⚠</span>
                          <div>
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#92600a', textTransform: 'uppercase' }}>RISK</span>
                            <p style={{ fontSize: 12, color: '#92600a', lineHeight: 1.5, margin: '2px 0 0' }}>{idea.risk}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom bar: lift + impact */}
                    <div style={{ padding: '14px 24px 18px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        {idea.expected_lift_low != null && idea.expected_lift_high != null && (
                          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                            Expected lift: <strong style={{ color: '#166534' }}>+{idea.expected_lift_low}–{idea.expected_lift_high}%</strong>
                          </p>
                        )}
                      </div>
                      {impactPct != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Impact</span>
                          <div style={{ flex: 1, height: 4, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${impactPct}%`, borderRadius: 99, background: barColor }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{Number(idea.impact_score).toFixed(0)}</span>
                        </div>
                      )}
                    </div>

                    {/* Investigate button */}
                    {idea._oppId && (
                      <div style={{ padding: '0 24px 18px' }}>
                        <button type="button"
                          onClick={() => setInvestigateOpen({ id: idea._oppId!, title: idea.title })}
                          style={{
                            width: '100%', borderRadius: 10, border: `1px solid #86efac`,
                            background: '#dcfce7', color: '#166534',
                            padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          }}>
                          Investigate →
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* WHAT'S WORKING IN THE MARKET */}
            {marketLoading && (
              <div style={{ marginBottom: 48 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: C.muted, textTransform: 'uppercase', marginBottom: 8 }}>
                  WHAT&apos;S WORKING IN THE MARKET
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ height: 80, borderRadius: 12, background: '#f0f0f0', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  ))}
                </div>
              </div>
            )}
            {!marketLoading && marketCards && marketCards.length > 0 && (
              <div style={{ marginBottom: 48 }}>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>
                    WHAT&apos;S WORKING IN THE MARKET
                  </p>
                  <p style={{ fontSize: 12, color: C.muted }}>
                    Competitors who have shipped solutions for this gap — ranked by how well they execute it
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {marketCards.map((card, ci) => {
                    const scoreBadge = card.score != null
                      ? card.score >= 4.0
                        ? { color: '#166534', bg: '#dcfce7', border: '#86efac', icon: '✓' }
                        : card.score >= 3.0
                          ? { color: '#92600a', bg: '#fffbeb', border: '#fde68a', icon: '⚠' }
                          : { color: '#be123c', bg: '#fff1f2', border: '#fda4af', icon: '✗' }
                      : null
                    return (
                      <div key={ci}>
                        {/* Rank label */}
                        <div style={{ marginBottom: 6 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                            color: ci === 0 ? '#166534' : C.muted,
                            background: ci === 0 ? '#dcfce7' : 'transparent',
                            border: ci === 0 ? '1px solid #86efac' : 'none',
                            borderRadius: 20, padding: ci === 0 ? '2px 10px' : '0',
                          }}>
                            #{ci + 1}{ci === 0 ? ' MOST PROVEN' : ''}
                          </span>
                        </div>
                        {/* Card */}
                        <div style={{
                          background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden',
                        }}>
                          <div style={{ padding: '18px 20px' }}>
                            {/* Header: company + score */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>{card.company}</p>
                              {scoreBadge && card.score != null && (
                                <span style={{
                                  fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                                  color: scoreBadge.color, background: scoreBadge.bg, border: `1px solid ${scoreBadge.border}`,
                                }}>
                                  {card.score.toFixed(1)}/5 {scoreBadge.icon}
                                </span>
                              )}
                            </div>
                            {/* Justification */}
                            {card.justification && (
                              <p style={{ fontSize: 12, color: C.muted, margin: '0 0 14px', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {card.justification}
                              </p>
                            )}
                            {/* What they built */}
                            {card.what_built && (
                              <div style={{ marginBottom: card.quantified_result ? 4 : 14 }}>
                                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>WHAT THEY BUILT</p>
                                <p style={{ fontSize: 13, color: '#3a3a3c', lineHeight: 1.5, margin: 0 }}>{card.what_built}</p>
                              </div>
                            )}
                            {card.quantified_result && (
                              <p style={{ fontSize: 13, color: '#166534', fontWeight: 600, margin: '0 0 14px' }}>
                                → {card.quantified_result}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Ranked section (standard, non-CI path) */}
        {activeTab !== 'pages' && !loading && !ciTierIdeas && (
          <>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Ideas ranked by impact and effort</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 48 }}>
              {rankedIdeas.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', borderRadius: 20, border: `1px dashed ${C.border}`, background: C.surface }}>
                  <p style={{ fontSize: 14, color: C.muted }}>No prioritized ideas yet — promote from the backlog below</p>
                </div>
              ) : (
                rankedIdeas.map((idea, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <OpportunityCard
                      idea={idea}
                      featured={idx === 0}
                      onInvestigate={() => {
                        const id = opportunityId(idea)
                        if (!id) return
                        setInvestigateOpen({ id, title: idea.title })
                      }}
                      investigateDisabled={!canInvestigate(idea)}
                      investigateLabel="Investigate"
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => moveToBacklog(idx)}
                        style={{ fontSize: 12, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                        Move to backlog →
                      </button>
                    </div>
                  </div>
                ))
              )}
              <button
                type="button" onClick={() => setAddOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '14px', borderRadius: 20,
                  border: `1px dashed ${C.border}`, background: 'transparent',
                  fontSize: 14, fontWeight: 600, color: C.muted, cursor: 'pointer',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.surface; (e.currentTarget as HTMLButtonElement).style.color = C.text }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = C.muted }}
              >
                + Add new idea
              </button>
            </div>

            {/* Backlog section */}
            {backlogIdeas.length > 0 && (
              <div style={{ marginBottom: 48 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', color: C.muted, textTransform: 'uppercase' }}>Backlog</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: C.muted,
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 30, padding: '1px 8px',
                  }}>{backlogIdeas.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {backlogIdeas.map((idea, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <OpportunityCard
                        idea={idea}
                        featured={false}
                        onInvestigate={() => {
                          const id = opportunityId(idea)
                          if (!id) return
                          setInvestigateOpen({ id, title: idea.title })
                        }}
                        investigateDisabled={!canInvestigate(idea)}
                        investigateLabel="Investigate"
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => prioritize(idx)}
                          style={{
                            fontSize: 12, fontWeight: 600, color: '#1d1d1f',
                            background: C.surface, border: `1px solid ${C.border}`,
                            borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
                          }}>
                          ↑ Prioritize
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {addOpen && (
          <AddOpportunityDialog
            projectId={projectId}
            goal={goal}
            onClose={() => setAddOpen(false)}
            onSaved={(idea) => setBacklogIdeas(prev => [...prev, idea])}
          />
        )}
      </div>

      {investigateOpen && (
        <InvestigateModal
          title={investigateOpen.title}
          opportunityId={investigateOpen.id}
          projectId={projectId}
          productUrl={productUrl}
          goal={goal}
          onClose={() => setInvestigateOpen(null)}
        />
      )}

      {optimizeOpen && (
        <OptimizePageFlow
          projectId={projectId}
          productId={productId ?? undefined}
          productUrl={productUrl}
          goal={goal ?? ''}
          onClose={() => setOptimizeOpen(false)}
          onComplete={(agentId) => {
            setOptimizeOpen(false)
            // Add to list and navigate
            setPageOptimizations(prev => [...prev, {
              id: agentId,
              name: 'Analyzing...',
              url: '',
              status: 'Analyzing',
            }])
            setActiveTab('pages')
          }}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .hover-row:hover { background: #f0f4ff !important; }
      `}</style>
    </div>
  )
}
