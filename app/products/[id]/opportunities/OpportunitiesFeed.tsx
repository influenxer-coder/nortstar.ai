'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { RefreshCw, Loader2, ArrowLeft, Lightbulb, GitCommit, Activity, MessageSquare, Globe, TrendingUp, Megaphone, Star, FlaskConical, Zap, ChevronRight } from 'lucide-react'
import { getProductMeta, getGoalLabel } from '@/lib/product-meta'
import OpportunityCard, { type IdeaWithImpact } from '@/components/OpportunityCard'
import AddOpportunityDialog from '@/components/AddOpportunityDialog'
import { InvestigateModal } from '@/components/InvestigateModal'


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
  const [investigateOpen, setInvestigateOpen] = useState<{ id: string; title: string } | null>(null)
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

        {/* Loading / error */}
        {loading ? (
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

        {/* Ranked section */}
        {!loading && (
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
          onClose={() => setInvestigateOpen(null)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .hover-row:hover { background: #f0f4ff !important; }
      `}</style>
    </div>
  )
}
