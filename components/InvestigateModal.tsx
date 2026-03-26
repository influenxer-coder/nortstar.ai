'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, ArrowRight } from 'lucide-react'
import { FlowDiagram, type FlowObject } from '@/components/investigate/FlowDiagram'

type Variation = {
  name: string
  pattern: string
  validated_by: string[]
  what_they_did: string
  what_this_means: string
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

const STEPS = ['Approach', 'Activate', 'Plan', 'Preview', 'Ship']

type Props = {
  title: string
  opportunityId: string
  onClose: () => void
}

export function InvestigateModal({ title, opportunityId, onClose }: Props) {
  const [variations, setVariations] = useState<Variation[]>([])
  const [variationsLoading, setVariationsLoading] = useState(true)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [flows, setFlows] = useState<FlowObject[]>([])
  const [flowsLoading, setFlowsLoading] = useState(false)
  const [savedIdxLoaded, setSavedIdxLoaded] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Fetch variations + saved explore state in parallel, then fetch flows
  useEffect(() => {
    setVariationsLoading(true)

    Promise.all([
      fetch(`/api/opportunities/${opportunityId}/variations`, { method: 'POST' })
        .then(r => r.json()) as Promise<{ variations?: Variation[] }>,
      fetch(`/api/opportunities/${opportunityId}/explore-state`)
        .then(r => r.json()) as Promise<{ selected_variation_index: number | null }>,
    ])
      .then(([varData, stateData]) => {
        const vars = varData.variations ?? []
        setVariations(vars)

        // Restore saved index, fall back to recommended, then first
        const savedIdx = stateData.selected_variation_index
        if (savedIdx !== null && savedIdx !== undefined && savedIdx < vars.length) {
          setSelectedIdx(savedIdx)
        } else {
          const recIdx = vars.findIndex(v => v.is_recommended)
          setSelectedIdx(recIdx >= 0 ? recIdx : vars.length > 0 ? 0 : null)
        }
        setSavedIdxLoaded(true)

        // Fetch flows after variations load
        if (vars.length > 0) {
          setFlowsLoading(true)
          fetch(`/api/opportunities/${opportunityId}/flows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variations: vars }),
          })
            .then(r => r.json())
            .then((fd: { flows?: FlowObject[] }) => setFlows(fd.flows ?? []))
            .catch(() => {})
            .finally(() => setFlowsLoading(false))
        }
      })
      .catch(() => {})
      .finally(() => setVariationsLoading(false))
  }, [opportunityId])

  // Save selected variation index to DB whenever it changes (after initial load)
  useEffect(() => {
    if (!savedIdxLoaded || selectedIdx === null) return
    fetch(`/api/opportunities/${opportunityId}/explore-state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_variation_index: selectedIdx }),
    }).catch(() => {})
  }, [opportunityId, selectedIdx, savedIdxLoaded])

  // Active index: hovered takes priority over selected
  const activeIdx = hoveredIdx ?? selectedIdx ?? 0
  const activeFlow = flows[activeIdx] ?? null
  const activeVariation = variations[activeIdx] ?? null

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.35)' }}
        onClick={onClose}
      />

      {/* Modal container */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        overflow: 'hidden',
      }}>
        {/* ── TOP BAR ── */}
        <div style={{
          height: 48,
          flexShrink: 0,
          background: '#ffffff',
          borderBottom: '1px solid #E5E3DD',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 16,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              fontSize: 13, fontWeight: 500, color: '#1A1A1A',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              display: 'block', maxWidth: 400,
            }}>
              {title}
            </span>
          </div>

          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {STEPS.map((label, i) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: i === 0 ? '#1A1A1A' : 'transparent',
                    border: i === 0 ? 'none' : '1.5px solid #D4D4D4',
                  }} />
                  {i === 0 && (
                    <span style={{ fontSize: 10, color: '#9B9A97', whiteSpace: 'nowrap' }}>{label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'none', border: 'none',
                borderRadius: 6, cursor: 'pointer', color: '#9B9A97', padding: 0,
              }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#F7F7F5'; b.style.color = '#1A1A1A' }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'none'; b.style.color = '#9B9A97' }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{ display: 'flex', flexDirection: 'row', height: 'calc(100vh - 48px - 56px)', overflow: 'hidden' }}>

          {/* Left panel — flow diagram (60%) */}
          <div style={{
            width: '60%', height: '100%',
            background: '#F7F7F5', borderRight: '1px solid #E5E3DD', overflow: 'hidden',
          }}>
            {variationsLoading ? (
              <FlowDiagram
                currentFlow={[]} proposedFlow={[]}
                summary={{ removed_count: 0, added_count: 0, changed_count: 0, key_change: '' }}
                variationName="" validatedBy={[]} isLoading
              />
            ) : activeFlow ? (
              <FlowDiagram
                currentFlow={activeFlow.current_flow}
                proposedFlow={activeFlow.proposed_flow}
                summary={activeFlow.summary}
                variationName={activeVariation?.name ?? ''}
                validatedBy={activeVariation?.validated_by ?? []}
                isLoading={flowsLoading}
              />
            ) : flowsLoading ? (
              <FlowDiagram
                currentFlow={[]} proposedFlow={[]}
                summary={{ removed_count: 0, added_count: 0, changed_count: 0, key_change: '' }}
                variationName="" validatedBy={[]} isLoading
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <span style={{ fontSize: 13, color: '#C9C8C5' }}>No flow data available</span>
              </div>
            )}
          </div>

          {/* Right panel — variations (40%) */}
          <div style={{
            width: '40%', height: '100%', overflowY: 'auto',
            padding: '24px 20px', background: '#ffffff',
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>
              How do you want to approach this?
            </h3>
            <p style={{ fontSize: 13, color: '#9B9A97', marginBottom: 20 }}>
              Based on what&apos;s working in your market
            </p>

            {variationsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9B9A97', fontSize: 13 }}>
                <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                Finding popular patterns…
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

            {/* Sticky plan button */}
            <div style={{
              position: 'sticky', bottom: 0, background: '#ffffff',
              paddingTop: 12, marginTop: 16, borderTop: '1px solid #E5E3DD',
            }}>
              <button
                type="button"
                disabled={selectedIdx === null}
                style={{
                  width: '100%', height: 36, borderRadius: 6, border: 'none',
                  background: '#1A1A1A', color: '#ffffff', fontSize: 13, fontWeight: 500,
                  cursor: selectedIdx !== null ? 'pointer' : 'not-allowed',
                  opacity: selectedIdx === null ? 0.4 : 1,
                  transition: 'background 0.15s, opacity 0.15s',
                }}
                onMouseEnter={e => { if (selectedIdx !== null) (e.currentTarget as HTMLButtonElement).style.background = '#333333' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1A1A1A' }}
              >
                Plan this approach →
              </button>
            </div>
          </div>
        </div>

        {/* ── BOTTOM BAR ── */}
        <div style={{
          height: 56, flexShrink: 0, background: '#ffffff', borderTop: '1px solid #E5E3DD',
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10,
        }}>
          <input
            type="text"
            placeholder="Ask anything about this step..."
            style={{
              flex: 1, height: 36, background: '#F7F7F5', border: '1px solid #E5E3DD',
              borderRadius: 6, fontSize: 13, color: '#1A1A1A', padding: '0 12px', outline: 'none',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#6B4FBB'; e.currentTarget.style.boxShadow = '0 0 0 2px #6B4FBB20' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E5E3DD'; e.currentTarget.style.boxShadow = 'none' }}
          />
          <button
            type="button"
            onClick={() => console.log('send')}
            style={{
              width: 36, height: 36, flexShrink: 0, background: '#1A1A1A', color: '#ffffff',
              border: 'none', borderRadius: 6, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#333333' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1A1A1A' }}
          >
            <ArrowRight style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #C9C8C5; }
      `}</style>
    </>
  )
}
