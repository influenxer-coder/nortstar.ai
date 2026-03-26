'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'

type Competitor = {
  name: string
  one_liner: string | null
  funding_stage: string | null
  icp_signals: unknown
  known_winning_features: unknown
}

type Variation = {
  name: string
  pattern: string
  validated_by: string[]
  expected_lift_low: number
  expected_lift_high: number
  risk: 'low' | 'medium' | 'high'
  is_recommended: boolean
}

const RISK_COLORS: Record<string, { color: string; bg: string }> = {
  low:    { color: '#166534', bg: '#dcfce7' },
  medium: { color: '#92600a', bg: '#fef9c3' },
  high:   { color: '#be123c', bg: '#ffe4e6' },
}

function firstSignal(icp: unknown): string | null {
  if (!icp) return null
  if (typeof icp === 'string') {
    const trimmed = icp.trim()
    if (!trimmed) return null
    // take first comma/semicolon separated segment
    return trimmed.split(/[,;]/)[0].trim().slice(0, 32) || null
  }
  if (Array.isArray(icp) && icp.length > 0) {
    return String(icp[0]).slice(0, 32)
  }
  return null
}

type Props = {
  title: string
  opportunityId: string
  onClose: () => void
}

export function InvestigateModal({ title, opportunityId, onClose }: Props) {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [variations, setVariations] = useState<Variation[]>([])
  const [variationsLoading, setVariationsLoading] = useState(true)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Fetch competitors
  useEffect(() => {
    fetch(`/api/opportunities/${opportunityId}/competitors`)
      .then(r => r.json())
      .then((d: { competitors?: Competitor[] }) => setCompetitors(d.competitors ?? []))
      .catch(() => {})
  }, [opportunityId])

  // Fetch variations
  useEffect(() => {
    setVariationsLoading(true)
    fetch(`/api/opportunities/${opportunityId}/variations`, { method: 'POST' })
      .then(r => r.json())
      .then((d: { variations?: Variation[] }) => {
        const vars = d.variations ?? []
        setVariations(vars)
        const recIdx = vars.findIndex(v => v.is_recommended)
        setSelectedIdx(recIdx >= 0 ? recIdx : vars.length > 0 ? 0 : null)
      })
      .catch(() => {})
      .finally(() => setVariationsLoading(false))
  }, [opportunityId])

  // Determine which competitor names are validated by active variation
  const activeVariation = hoveredIdx !== null
    ? variations[hoveredIdx]
    : selectedIdx !== null
      ? variations[selectedIdx]
      : null
  const validatedNames = new Set(
    (activeVariation?.validated_by ?? []).map(n => n.toLowerCase())
  )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0,0,0,0.4)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 51,
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          height: 48,
          background: '#ffffff',
          borderBottom: '1px solid #E5E3DD',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#4A4A4A',
              padding: 0,
              borderRadius: 4,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#1A1A1A' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#4A4A4A' }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#ffffff' }}>

          {/* Left panel — competitors (60%) */}
          <div style={{
            width: '60%',
            borderRight: '1px solid #E5E3DD',
            overflow: 'auto',
            padding: 24,
          }}>
            {competitors.length === 0 ? (
              <div style={{ color: '#9B9A97', fontSize: 13, paddingTop: 8 }}>Loading competitors…</div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 12,
              }}>
                {competitors.map((c, i) => {
                  const isValidated = validatedNames.size > 0 && validatedNames.has(c.name.toLowerCase())
                  const dimmed = validatedNames.size > 0 && !isValidated
                  const signal = firstSignal(c.icp_signals)
                  return (
                    <div
                      key={i}
                      style={{
                        border: isValidated ? '1.5px solid #6B4FBB' : '1px solid #E5E3DD',
                        borderRadius: 10,
                        padding: '12px 14px',
                        background: isValidated ? '#F0ECFA' : '#ffffff',
                        opacity: dimmed ? 0.3 : 1,
                        transition: 'opacity 0.15s, border-color 0.15s, background 0.15s',
                        position: 'relative',
                      }}
                    >
                      {isValidated && hoveredIdx === null && selectedIdx !== null && (
                        <span style={{
                          position: 'absolute', top: 8, right: 10,
                          fontSize: 11, color: '#6B4FBB', fontWeight: 700,
                        }}>✓</span>
                      )}
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1A1A1A', marginBottom: 4, paddingRight: isValidated ? 16 : 0 }}>
                        {c.name}
                      </div>
                      <div style={{
                        fontSize: 12,
                        color: '#6B6A67',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        marginBottom: signal ? 8 : 0,
                      }}>
                        {c.one_liner ?? String(c.known_winning_features ?? '').split(/[,;]/)[0]?.trim() ?? ''}
                      </div>
                      {signal && (
                        <span style={{
                          display: 'inline-block',
                          fontSize: 11,
                          fontWeight: 500,
                          color: '#6B4FBB',
                          background: '#F0ECFA',
                          borderRadius: 20,
                          padding: '2px 8px',
                        }}>
                          {signal}
                        </span>
                      )}
                      {c.funding_stage && (
                        <span style={{
                          display: 'inline-block',
                          fontSize: 11,
                          color: '#9B9A97',
                          marginLeft: signal ? 4 : 0,
                        }}>
                          {c.funding_stage}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right panel — variations (40%) */}
          <div style={{ width: '40%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>
                How do you want to approach this?
              </h3>
              <p style={{ fontSize: 13, color: '#9B9A97', marginBottom: 20 }}>
                Based on what&apos;s working in your market
              </p>

              {variationsLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9B9A97', fontSize: 13 }}>
                  <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                  Finding competitor patterns…
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {variations.map((v, idx) => {
                    const isSelected = selectedIdx === idx
                    const risk = RISK_COLORS[v.risk] ?? RISK_COLORS.medium
                    return (
                      <div key={idx}>
                        {v.is_recommended && (
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B4FBB', marginBottom: 4, letterSpacing: '0.03em' }}>
                            Recommended
                          </div>
                        )}
                        <div
                          onClick={() => setSelectedIdx(idx)}
                          onMouseEnter={() => setHoveredIdx(idx)}
                          onMouseLeave={() => setHoveredIdx(null)}
                          style={{
                            border: isSelected ? '2px solid #6B4FBB' : '1px solid #E5E3DD',
                            borderRadius: 10,
                            padding: isSelected ? '13px 15px' : '14px 16px',
                            background: isSelected ? '#F0ECFA' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'border-color 0.15s, background 0.15s',
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A1A', marginBottom: 4 }}>
                            {v.name}
                          </div>
                          <div style={{ fontSize: 13, color: '#6B6A67', marginBottom: 8, lineHeight: 1.4 }}>
                            {v.pattern}
                          </div>
                          {v.validated_by.length > 0 && (
                            <div style={{ fontSize: 12, color: '#9B9A97', marginBottom: 8 }}>
                              Validated by: {v.validated_by.slice(0, 3).join(', ')}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>
                              +{v.expected_lift_low}–{v.expected_lift_high}%
                            </span>
                            <span style={{
                              fontSize: 11, fontWeight: 600,
                              color: risk.color, background: risk.bg,
                              borderRadius: 20, padding: '2px 8px',
                            }}>
                              {v.risk} risk
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Sticky bottom button */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #E5E3DD',
              background: '#ffffff',
              flexShrink: 0,
            }}>
              <button
                type="button"
                disabled={selectedIdx === null}
                style={{
                  width: '100%',
                  padding: '11px 0',
                  borderRadius: 8,
                  border: 'none',
                  background: selectedIdx !== null ? '#6B4FBB' : '#E5E3DD',
                  color: selectedIdx !== null ? '#ffffff' : '#9B9A97',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: selectedIdx !== null ? 'pointer' : 'not-allowed',
                  transition: 'background 0.15s',
                }}
              >
                Plan this approach →
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
