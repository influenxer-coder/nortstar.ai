'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { RefreshCw, Loader2, ArrowLeft, Lightbulb, GitCommit, Activity, MessageSquare, Globe, TrendingUp, Megaphone, Star, FlaskConical, Zap, ChevronRight } from 'lucide-react'
import { getProductMeta, getGoalLabel } from '@/lib/product-meta'
import OpportunityCard, { type IdeaWithImpact } from '@/components/OpportunityCard'

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

type CommitRow = { sha: string; message: string; date: string; url: string }

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
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [launchesOpen, setLaunchesOpen] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const hasFetched = useRef(false)

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
      const res = await fetch(`/api/opportunities?project_id=${encodeURIComponent(projectId)}`)
      if (!res.ok) throw new Error('Failed to load saved opportunities')
      const data = await res.json() as { ideas?: Idea[] }
      const saved = data.ideas ?? []
      if (saved.length > 0) {
        setIdeas(saved)
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
      setIdeas(fresh)
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
                {reach && (
                  <p style={{ fontSize: 13, color: C.muted }}>
                    Shipped so far: <strong style={{ color: '#2e7d32' }}>{reach} improvement</strong>
                  </p>
                )}
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
            <button
              type="button"
              onClick={() => setLaunchesOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: launchesOpen ? 12 : 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%' }}
            >
              <GitCommit style={{ width: 14, height: 14, color: C.muted, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', color: C.muted, textTransform: 'uppercase', flex: 1, textAlign: 'left' }}>
                Recent launches
              </span>
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
                    {new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </a>
              ))}
            </div>}
          </div>
        )}

        {/* Feed label */}
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Ideas ranked by impact and effort</p>

        {/* Feed */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: C.muted }}>
            <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14 }}>Generating opportunities…</span>
          </div>
        ) : error ? (
          <div style={{ padding: 20, borderRadius: 10, background: '#fff5f5', border: '1px solid #fed7d7' }}>
            <p style={{ fontSize: 13, color: '#c53030', marginBottom: 8 }}>{error}</p>
            <button
              type="button"
              onClick={() => void fetchIdeas()}
              style={{ fontSize: 13, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Try again
            </button>
          </div>
        ) : ideas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', borderRadius: 12, border: `1px dashed ${C.border}`, background: C.surface }}>
            <p style={{ fontSize: 14, color: C.muted }}>No opportunities yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ideas.map((idea, idx) => (
              <div key={idx}>
                <OpportunityCard idea={idea} />
                {/* Sourced from row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: C.muted, textTransform: 'uppercase', marginRight: 2 }}>Sourced from</span>
                  {[
                    { icon: Globe,     label: 'Competitor intel' },
                    { icon: Megaphone, label: 'PMM Inbounds' },
                  ].map(({ icon: Icon, label }) => (
                    <span key={label} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 500, color: '#166534',
                      background: '#dcfce7', border: '1px solid #86efac',
                      borderRadius: 20, padding: '2px 8px',
                    }}>
                      <Icon style={{ width: 10, height: 10, flexShrink: 0 }} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .hover-row:hover { background: #f0f4ff !important; }
      `}</style>
    </div>
  )
}
