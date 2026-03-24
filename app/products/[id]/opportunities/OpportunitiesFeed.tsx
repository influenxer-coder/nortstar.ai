'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { RefreshCw, Loader2, ArrowLeft, Lightbulb } from 'lucide-react'

const C = {
  bg: '#f6f6f6',
  surface: '#ffffff',
  text: '#1f2328',
  muted: '#535963',
  border: '#d4d7dc',
  blue: '#367eed',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

type Idea = {
  title: string
  goal: string
  effort: 'low' | 'medium' | 'high'
  evidence: string
  winning_pattern: string
}

type Props = {
  projectId: string
  projectName: string
  goal: string | null
  subverticalId: string | null
}

export default function OpportunitiesFeed({ projectId, projectName, goal, subverticalId }: Props) {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasFetched = useRef(false)

  const fetchIdeas = async () => {
    if (!subverticalId || !goal) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/onboarding/wow-data?subvertical_id=${encodeURIComponent(subverticalId)}&goal=${encodeURIComponent(goal)}`
      )
      if (!res.ok) throw new Error('Failed to load opportunities')
      const data = await res.json() as { ideas?: Idea[] }
      setIdeas(data.ideas ?? [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch once on mount
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    void fetchIdeas()
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
                  {goal ?? 'Opportunities'}
                </h1>
                <p style={{ fontSize: 13, color: C.muted }}>Ideas ranked by impact and effort</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void fetchIdeas()}
              disabled={loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 500, color: C.blue,
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '7px 14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                boxShadow: C.cardShadow,
              }}
            >
              <RefreshCw style={{ width: 13, height: 13 }} />
              Refresh
            </button>
          </div>
        </div>

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
            {ideas.map((idea, idx) => {
              const effort = idea.effort.toLowerCase()
              const effortStyle =
                effort === 'low'  ? { color: '#2e7d32', bg: '#e8f5e9', border: '#a5d6a7' } :
                effort === 'high' ? { color: '#be123c', bg: '#fff1f2', border: '#fda4af' } :
                                    { color: '#92600a', bg: '#fffbeb', border: '#f0b429' }
              return (
                <div key={idx} style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: '20px', boxShadow: C.cardShadow,
                }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 10 }}>{idea.title}</h3>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
                      padding: '3px 8px', borderRadius: 20,
                      color: effortStyle.color, background: effortStyle.bg, border: `1px solid ${effortStyle.border}`,
                    }}>
                      {effort.toUpperCase()} EFFORT
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, marginBottom: 10 }}>{idea.evidence}</p>
                  <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 10 }}>
                    {idea.winning_pattern}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
