'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { RefreshCw, Loader2, ArrowLeft, GitCommit, Activity, MessageSquare, Globe, TrendingUp, Megaphone, Star, FlaskConical, Zap, ChevronRight } from 'lucide-react'
import { getProductMeta, getGoalLabel } from '@/lib/product-meta'
import OpportunityCard, { type IdeaWithImpact } from '@/components/OpportunityCard'
import AddOpportunityDialog from '@/components/AddOpportunityDialog'

const InvestigatePanel = dynamic(
  () => import('@/components/InvestigatePanel').then(m => m.InvestigatePanel),
  { ssr: false },
)

const C = {
  bg:       '#F7F7F5',
  surface:  '#FFFFFF',
  text:     '#1A1A1A',
  muted:    '#9B9A97',
  tertiary: '#C9C8C5',
  border:   '#E5E3DD',
  hover:    '#ECEAE4',
  purple:   '#6B4FBB',
  purpleBg: '#F0ECFA',
  green:    '#4D9B6F',
  greenBg:  '#EEF6F1',
}

type Idea = IdeaWithImpact

type CommitRow = { sha: string; message: string; date: string; formattedDate: string; url: string }

type Props = {
  projectId: string
  projectName: string
  productName: string
  goal: string | null
  subverticalId: string | null
  recentCommits?: CommitRow[]
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

export default function OpportunitiesFeed({ projectId, projectName, productName, goal, subverticalId, recentCommits = [] }: Props) {
  const productMeta = getProductMeta(productName)
  const goalMeta = getGoalLabel(goal)
  const resolved = productMeta ?? goalMeta
  const friendlyLabel = resolved?.label ?? goal ?? 'Opportunities'
  const reach = resolved?.reach ?? null
  const [rankedIdeas, setRankedIdeas] = useState<Idea[]>([])
  const [backlogIdeas, setBacklogIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [launchesOpen, setLaunchesOpen] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [investigateOpenKey, setInvestigateOpenKey] = useState<string | null>(null)
  const hasFetched = useRef(false)
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

  // On mount: load from DB (instant, no Claude call)
  const loadFromDB = async () => {
    setLoading(true)
    setError(null)
    try {
      const goalQuery = goal ? `&goal=${encodeURIComponent(goal)}` : ''
      const res = await fetch(`/api/opportunities?project_id=${encodeURIComponent(projectId)}${goalQuery}`)
      if (!res.ok) throw new Error('Failed to load saved opportunities')
      const data = await res.json() as { ideas?: Idea[] }
      const saved = data.ideas ?? []
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
        `/api/onboarding/wow-data?subvertical_id=${encodeURIComponent(subverticalId)}&goal=${encodeURIComponent(goal)}`
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

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    void loadFromDB()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalIdeas = rankedIdeas.length + backlogIdeas.length

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '32px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <Link
            href={`/products/${projectId}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.muted, textDecoration: 'none', marginBottom: 12 }}
          >
            <ArrowLeft style={{ width: 11, height: 11 }} />
            <span style={{ color: C.muted }}>/{' '}</span>
            {projectName}
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 6 }}>
            <h1 style={{ fontSize: 15, fontWeight: 500, color: C.text }}>
              {friendlyLabel}
            </h1>
            <button
              type="button"
              onClick={() => void fetchIdeas()}
              disabled={loading || refreshing}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 500, color: C.text,
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '4px 10px',
                cursor: (loading || refreshing) ? 'not-allowed' : 'pointer',
                opacity: (loading || refreshing) ? 0.5 : 1,
              }}
            >
              <RefreshCw style={{ width: 12, height: 12, animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              {refreshing ? 'Scoring…' : 'Refresh'}
            </button>
          </div>

          {/* Compact stat row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, fontSize: 12, color: C.muted, flexWrap: 'wrap' }}>
            <span>{totalIdeas} ideas</span>
            {reach && (
              <>
                <span style={{ margin: '0 6px', color: C.tertiary }}>·</span>
                <span>Shipped so far: <strong style={{ color: C.green, fontFamily: '"JetBrains Mono","Fira Code",monospace', fontWeight: 500 }}>+{reach}</strong></span>
              </>
            )}
            {lastUpdated && (
              <>
                <span style={{ margin: '0 6px', color: C.tertiary }}>·</span>
                <span>Updated {lastUpdated}</span>
              </>
            )}
          </div>
        </div>

        {/* Signal sources — compact inline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16, fontSize: 12, color: C.muted }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.tertiary, marginRight: 2 }}>
            Signals
          </span>
          {SIGNAL_SOURCES.map(({ label, active }) => (
            <span
              key={label}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, color: active ? C.text : C.muted,
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: active ? C.green : C.tertiary,
                flexShrink: 0, display: 'inline-block',
              }} />
              {label}
            </span>
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
                  <code style={{ fontSize: 11, color: C.purple, fontFamily: 'monospace', flexShrink: 0, width: 52 }}>{c.sha}</code>
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

        {/* Loading / error */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '48px 0', color: C.muted }}>
            <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13 }}>Generating opportunities…</span>
          </div>
        ) : error ? (
          <div style={{ padding: '12px 16px', borderRadius: 6, background: '#FAEAEA', border: '1px solid #F0C6C6', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#9B3030', marginBottom: 6 }}>{error}</p>
            <button type="button" onClick={() => void fetchIdeas()}
              style={{ fontSize: 12, color: C.purple, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Try again
            </button>
          </div>
        ) : null}

        {/* Section label */}
        {!loading && (
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.tertiary, marginBottom: 8 }}>
            Opportunities
          </p>
        )}

        {/* Ranked row list */}
        {!loading && (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface, marginBottom: 24, overflow: 'hidden' }}>
            {rankedIdeas.length === 0 ? (
              <div style={{ padding: '16px 12px', fontSize: 13, color: C.muted }}>
                No prioritized ideas yet — promote from the backlog below
              </div>
            ) : (
              rankedIdeas.map((idea, idx) => {
                const id = opportunityId(idea)
                const panelOpen = !!id && investigateOpenKey === id
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <OpportunityCard
                          idea={idea}
                          onInvestigate={id ? () => setInvestigateOpenKey((prev) => (prev === id ? null : id)) : undefined}
                          investigateDisabled={!canInvestigate(idea)}
                          investigateLabel="Investigate →"
                          noBorderBottom={panelOpen}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => moveToBacklog(idx)}
                        style={{
                          fontSize: 11, color: C.muted, background: 'none', border: 'none',
                          cursor: 'pointer', padding: '0 10px', height: 36, flexShrink: 0,
                          borderBottom: panelOpen ? 'none' : `1px solid ${C.border}`,
                          borderLeft: `1px solid ${C.border}`,
                        }}
                      >
                        ↓
                      </button>
                    </div>
                    {panelOpen && (
                      <div style={{ borderTop: `1px solid ${C.border}` }}>
                        <InvestigatePanel
                          opportunityId={id}
                          onClose={() => setInvestigateOpenKey(null)}
                        />
                      </div>
                    )}
                  </div>
                )
              })
            )}
            {/* Add row */}
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', height: 34,
                padding: '0 12px',
                background: 'none', border: 'none', borderTop: rankedIdeas.length > 0 ? `1px solid ${C.border}` : 'none',
                fontSize: 12, color: C.muted, cursor: 'pointer',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.hover }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              + Add idea
            </button>
          </div>
        )}

        {/* Backlog section */}
        {!loading && backlogIdeas.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.05em', color: C.tertiary, textTransform: 'uppercase' }}>Backlog</span>
              <span style={{ fontSize: 11, color: C.tertiary }}>{backlogIdeas.length}</span>
            </div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface, overflow: 'hidden' }}>
              {backlogIdeas.map((idea, idx) => {
                const id = opportunityId(idea)
                const panelOpen = !!id && investigateOpenKey === id
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <OpportunityCard
                          idea={idea}
                          onInvestigate={id ? () => setInvestigateOpenKey((prev) => (prev === id ? null : id)) : undefined}
                          investigateDisabled={!canInvestigate(idea)}
                          investigateLabel="Investigate →"
                          noBorderBottom={panelOpen}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => prioritize(idx)}
                        style={{
                          fontSize: 11, color: C.muted, background: 'none', border: 'none',
                          cursor: 'pointer', padding: '0 10px', height: 36, flexShrink: 0,
                          borderBottom: panelOpen ? 'none' : `1px solid ${C.border}`,
                          borderLeft: `1px solid ${C.border}`,
                        }}
                      >
                        ↑
                      </button>
                    </div>
                    {panelOpen && (
                      <div style={{ borderTop: `1px solid ${C.border}` }}>
                        <InvestigatePanel
                          opportunityId={id}
                          onClose={() => setInvestigateOpenKey(null)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .hover-row:hover { background: #ECEAE4 !important; }
      `}</style>
    </div>
  )
}
