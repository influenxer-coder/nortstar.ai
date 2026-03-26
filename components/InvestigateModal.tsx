'use client'

import { useEffect, useRef, useState } from 'react'
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

type CrawlScreen = {
  id: string
  url?: string
  screenshot?: string
  title?: string
  cta?: string
}

type CrawlResult = {
  screens?: CrawlScreen[]
}

const RISK_COLORS: Record<string, { color: string; bg: string }> = {
  low:    { color: '#166534', bg: '#dcfce7' },
  medium: { color: '#92600a', bg: '#fef9c3' },
  high:   { color: '#be123c', bg: '#ffe4e6' },
}

const STEPS = ['Approach', 'Map', 'Plan', 'Preview']

const FALLBACK_MESSAGES = [
  'Logging in to your app...',
  'Following your signup flow...',
  'Capturing each screen...',
  'Mapping CTAs and buttons...',
  'Almost done...',
]

type Props = {
  title: string
  opportunityId: string
  projectId: string
  productUrl: string
  goal: string | null
  onClose: () => void
}

export function InvestigateModal({ title, opportunityId, projectId, productUrl, goal, onClose }: Props) {
  // Step 1 state
  const [currentStep, setCurrentStep] = useState(1)
  const [variations, setVariations] = useState<Variation[]>([])
  const [variationsLoading, setVariationsLoading] = useState(true)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [flows, setFlows] = useState<FlowObject[]>([])
  const [flowsLoading, setFlowsLoading] = useState(false)
  const [savedIdxLoaded, setSavedIdxLoaded] = useState(false)

  // Step 2 state
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [isCrawling, setIsCrawling] = useState(false)
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null)
  const [selectedScreens, setSelectedScreens] = useState<string[]>([])
  const [crawlError, setCrawlError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState(FALLBACK_MESSAGES[0])
  const [discoveredPages, setDiscoveredPages] = useState<{ url: string; title?: string }[]>([])
  const [crawlLogs, setCrawlLogs] = useState<string[]>([])
  const fallbackIdxRef = useRef(0)
  const hasRealLogs = useRef(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

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
        const savedIdx = stateData.selected_variation_index
        if (savedIdx !== null && savedIdx !== undefined && savedIdx < vars.length) {
          setSelectedIdx(savedIdx)
        } else {
          const recIdx = vars.findIndex(v => v.is_recommended)
          setSelectedIdx(recIdx >= 0 ? recIdx : vars.length > 0 ? 0 : null)
        }
        setSavedIdxLoaded(true)
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

  // Save selected variation index after initial load
  useEffect(() => {
    if (!savedIdxLoaded || selectedIdx === null) return
    fetch(`/api/opportunities/${opportunityId}/explore-state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_variation_index: selectedIdx }),
    }).catch(() => {})
  }, [opportunityId, selectedIdx, savedIdxLoaded])

  // Fallback message rotation while crawling (stops once real logs arrive)
  useEffect(() => {
    if (!isCrawling) {
      hasRealLogs.current = false
      return
    }
    const interval = setInterval(() => {
      if (hasRealLogs.current) return
      fallbackIdxRef.current = (fallbackIdxRef.current + 1) % FALLBACK_MESSAGES.length
      setStatusMessage(FALLBACK_MESSAGES[fallbackIdxRef.current])
    }, 3000)
    return () => clearInterval(interval)
  }, [isCrawling])

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [crawlLogs])

  const activeIdx = hoveredIdx ?? selectedIdx ?? 0
  const activeFlow = flows[activeIdx] ?? null
  const activeVariation = variations[activeIdx] ?? null

  // ── CRAWL ──────────────────────────────────────────────────────────────────
  const startCrawl = async () => {
    setIsCrawling(true)
    setCrawlError(null)
    setCrawlResult(null)
    setDiscoveredPages([])
    setCrawlLogs([])
    fallbackIdxRef.current = 0
    hasRealLogs.current = false
    setStatusMessage(FALLBACK_MESSAGES[0])

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120_000) // 2 min timeout

      const res = await fetch(`/api/opportunities/${opportunityId}/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          product_url: productUrl,
          email: emailInput,
          password: passwordInput,
          project_id: projectId,
          goal: goal ?? '',
        }),
      })

      clearTimeout(timeout)

      if (!res.ok || !res.body) throw new Error('Could not reach browser agent')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          const normalized = trimmed.startsWith('data:')
            ? trimmed.slice(5).trim()
            : trimmed
          let event: Record<string, unknown>
          try {
            event = JSON.parse(normalized) as Record<string, unknown>
          } catch {
            continue
          }

          if (event.type === 'log') {
            const msg = typeof event.message === 'string'
              ? event.message
              : typeof event.content === 'string'
                ? event.content
                : ''
            if (msg) {
              hasRealLogs.current = true
              setStatusMessage(msg)
              setCrawlLogs(prev => [...prev, msg])
            }
            // Accumulate discovered pages from log events
            // Prefer structured url field; fall back to parsing URLs from message text
            let pageUrl = typeof event.url === 'string' ? event.url : null
            const pageTitle = typeof event.title === 'string' ? event.title : undefined
            if (!pageUrl && msg) {
              const urlMatch = msg.match(/https?:\/\/[^\s"',)}\]]+/)
              if (urlMatch) pageUrl = urlMatch[0]
            }
            // Filter out storage/screenshot URLs and non-page URLs
            if (pageUrl && !pageUrl.includes('/storage/') && !pageUrl.includes('supabase.co')) {
              try {
                const pathname = new URL(pageUrl).pathname
                setDiscoveredPages(prev =>
                  prev.some(p => { try { return new URL(p.url).pathname === pathname } catch { return p.url === pageUrl } })
                    ? prev
                    : [...prev, { url: pageUrl!, title: pageTitle }]
                )
              } catch {
                // invalid URL, skip
              }
            }
          } else if (event.type === 'result') {
            console.log('[crawl] result event:', JSON.stringify(event).slice(0, 500))
            const data = (event.data ?? event) as CrawlResult
            const screens = data.screens ?? []
            console.log('[crawl] parsed screens:', screens.length, screens.map(s => ({ id: s.id, url: s.url, hasScreenshot: !!s.screenshot })))
            setCrawlResult({ screens })
            setSelectedScreens(screens.map(s => s.id))
            setIsCrawling(false)
          } else if (event.type === 'error') {
            throw new Error(typeof event.message === 'string' ? event.message : 'Crawl failed')
          }
        }
      }
    } catch (err: unknown) {
      let msg: string
      if (err instanceof DOMException && err.name === 'AbortError') {
        msg = 'Mapping timed out — the page may be too complex or slow to load. Try again or skip this step.'
      } else if (err instanceof TypeError && /failed to fetch|network/i.test(err.message)) {
        msg = 'Connection lost to mapping service. Please try again.'
      } else {
        msg = err instanceof Error ? err.message : 'Could not access your app. Check credentials and try again.'
      }
      setCrawlError(msg)
      setIsCrawling(false)
    }
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  const screens = crawlResult?.screens ?? []
  const checkedCount = selectedScreens.length

  const toggleScreen = (id: string) => {
    setSelectedScreens(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  // Left panel content
  const renderLeftPanel = () => {
    if (currentStep === 2 && isCrawling) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px 12px' }}>
            <Loader2 style={{ width: 16, height: 16, color: '#6B4FBB', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: '#6B4FBB' }}>Mapping your flow...</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
            <div style={{
              background: '#1A1A1A', borderRadius: 8, padding: '14px 16px',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
              fontSize: 12, lineHeight: 1.7, color: '#A3A3A3', minHeight: 200,
            }}>
              {crawlLogs.length === 0 && (
                <div style={{ color: '#525252' }}>{statusMessage}</div>
              )}
              {crawlLogs.map((log, i) => {
                const isUrl = /https?:\/\//.test(log)
                const isArrow = log.trim().startsWith('\u2192')
                const isHeader = log.startsWith('[')
                return (
                  <div key={i} style={{
                    color: isHeader ? '#E5E5E5' : isUrl ? '#93C5FD' : isArrow ? '#9B9A97' : '#A3A3A3',
                    fontWeight: isHeader ? 500 : 400,
                  }}>
                    {log}
                  </div>
                )
              })}
              <div ref={logsEndRef} />
            </div>
          </div>
          {discoveredPages.length > 0 && (
            <div style={{ padding: '0 20px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9B9A97', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Pages found ({discoveredPages.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {discoveredPages.map((page, i) => (
                  <span key={i} style={{
                    fontSize: 11, color: '#6B4FBB', background: '#F3F0FF', padding: '2px 8px',
                    borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220,
                  }}>
                    {page.title || new URL(page.url).pathname}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    if (currentStep === 2 && crawlResult && screens.length > 0) {
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px 24px 0', overflowX: 'auto', display: 'flex', gap: 0, alignItems: 'flex-start' }}>
            {screens.map((screen, i) => (
              <div key={screen.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ width: 160, flexShrink: 0 }}>
                  {/* Thumbnail */}
                  <div style={{ height: 100, background: '#F7F7F5', border: '1px solid #E5E3DD', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                    {screen.screenshot ? (
                      <img src={screen.screenshot} alt={screen.title ?? `Screen ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <span style={{ fontSize: 20, color: '#C9C8C5' }}>{i + 1}</span>
                      </div>
                    )}
                    <input
                      type="checkbox"
                      checked={selectedScreens.includes(screen.id)}
                      onChange={() => toggleScreen(screen.id)}
                      style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, accentColor: '#6B4FBB', cursor: 'pointer' }}
                    />
                  </div>
                  {/* Label */}
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1A1A', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {screen.title ?? `Screen ${i + 1}`}
                  </div>
                  {screen.cta && (
                    <div style={{ fontSize: 11, color: '#9B9A97', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {screen.cta}
                    </div>
                  )}
                </div>
                {i < screens.length - 1 && (
                  <span style={{ color: '#C9C8C5', fontSize: 14, margin: '0 6px', alignSelf: 'flex-start', marginTop: 43 }}>→</span>
                )}
              </div>
            ))}
          </div>
          <div style={{ padding: '16px 24px 0', fontSize: 12, color: '#9B9A97' }}>
            {screens.length} screens mapped · {checkedCount} selected
          </div>
        </div>
      )
    }

    // Default: flow diagram (step 1, or step 2 before crawl / on error)
    if (variationsLoading || (flowsLoading && !activeFlow)) {
      return <FlowDiagram currentFlow={[]} proposedFlow={[]}
        summary={{ removed_count: 0, added_count: 0, changed_count: 0, key_change: '' }}
        variationName="" validatedBy={[]} isLoading />
    }
    if (activeFlow) {
      return <FlowDiagram
        currentFlow={activeFlow.current_flow}
        proposedFlow={activeFlow.proposed_flow}
        summary={activeFlow.summary}
        variationName={activeVariation?.name ?? ''}
        validatedBy={activeVariation?.validated_by ?? []}
        isLoading={flowsLoading} />
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ fontSize: 13, color: '#C9C8C5' }}>No flow data available</span>
      </div>
    )
  }

  // Right panel content
  const renderRightPanel = () => {
    if (currentStep === 1) {
      return (
        <>
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
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A1A', marginBottom: 4 }}>{v.name}</div>
                      <div style={{ fontSize: 13, color: '#6B6A67', marginBottom: 8, lineHeight: 1.4 }}>{v.pattern}</div>
                      {v.validated_by.length > 0 && (
                        <div style={{ fontSize: 12, color: '#9B9A97', marginBottom: 8 }}>
                          Validated by: {v.validated_by.slice(0, 3).join(', ')}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>
                          +{v.expected_lift_low}–{v.expected_lift_high}%
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: risk.color, background: risk.bg, borderRadius: 20, padding: '2px 8px' }}>
                          {v.risk} risk
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ position: 'sticky', bottom: 0, background: '#ffffff', paddingTop: 12, marginTop: 16, borderTop: '1px solid #E5E3DD' }}>
            <button
              type="button"
              disabled={selectedIdx === null}
              onClick={() => setCurrentStep(2)}
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
        </>
      )
    }

    // Step 2
    const canMap = emailInput.trim() !== '' && passwordInput.trim() !== '' && !isCrawling
    return (
      <>
        <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1A1A1A', marginBottom: 4 }}>
          Map your activation flow
        </h3>
        <p style={{ fontSize: 13, color: '#9B9A97', marginBottom: 24 }}>
          We&apos;ll follow the exact path a new user takes in your app
        </p>

        {/* Credential inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#1A1A1A', marginBottom: 4 }}>
              Test account email
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="test@yourapp.com"
              style={{ width: '100%', height: 36, border: '1px solid #E5E3DD', borderRadius: 6, fontSize: 13, color: '#1A1A1A', padding: '0 12px', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#6B4FBB'; e.currentTarget.style.boxShadow = '0 0 0 2px #6B4FBB20' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E5E3DD'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#1A1A1A', marginBottom: 4 }}>
              Test account password
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', height: 36, border: '1px solid #E5E3DD', borderRadius: 6, fontSize: 13, color: '#1A1A1A', padding: '0 12px', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#6B4FBB'; e.currentTarget.style.boxShadow = '0 0 0 2px #6B4FBB20' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E5E3DD'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
        </div>

        <p style={{ fontSize: 11, color: '#C9C8C5', marginTop: 8 }}>
          Used only for this crawl. Never stored.
        </p>

        {crawlError && (
          <p style={{ fontSize: 12, color: '#9B3030', marginTop: 8 }}>{crawlError}</p>
        )}

        <div style={{ position: 'sticky', bottom: 0, background: '#ffffff', paddingTop: 12, marginTop: 16, borderTop: '1px solid #E5E3DD' }}>
          {crawlResult ? (
            <button
              type="button"
              onClick={() => console.log({ selectedScreens, crawlResult, selectedVariation: variations[selectedIdx ?? 0] })}
              style={{ width: '100%', height: 36, borderRadius: 6, border: 'none', background: '#1A1A1A', color: '#ffffff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#333333' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1A1A1A' }}
            >
              Generate plan →
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={!canMap}
                onClick={() => void startCrawl()}
                style={{
                  width: '100%', height: 36, borderRadius: 6, border: 'none',
                  background: '#1A1A1A', color: '#ffffff', fontSize: 13, fontWeight: 500,
                  cursor: canMap ? 'pointer' : 'not-allowed',
                  opacity: canMap ? 1 : 0.4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
                onMouseEnter={e => { if (canMap) (e.currentTarget as HTMLButtonElement).style.background = '#333333' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1A1A1A' }}
              >
                {isCrawling
                  ? <><Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} />Mapping your flow...</>
                  : 'Map my flow →'
                }
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                style={{ width: '100%', background: 'transparent', border: 'none', color: '#9B9A97', fontSize: 13, cursor: 'pointer', marginTop: 8, padding: '6px 0' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#1A1A1A' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9B9A97' }}
              >
                Skip — use inferred flow
              </button>
            </>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.35)' }} onClick={onClose} />

      {/* Modal */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: '#ffffff', overflow: 'hidden' }}>

        {/* ── TOP BAR ── */}
        <div style={{ height: 48, flexShrink: 0, background: '#ffffff', borderBottom: '1px solid #E5E3DD', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: 400 }}>
              {title}
            </span>
          </div>

          {/* 4-step indicator */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {STEPS.map((label, i) => {
                const filled = i + 1 <= currentStep
                const isCurrent = i + 1 === currentStep
                return (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: filled ? '#1A1A1A' : 'transparent',
                      border: filled ? 'none' : '1.5px solid #D4D4D4',
                    }} />
                    {isCurrent && (
                      <span style={{ fontSize: 10, color: '#9B9A97', whiteSpace: 'nowrap' }}>{label}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#9B9A97', padding: 0 }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#F7F7F5'; b.style.color = '#1A1A1A' }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'none'; b.style.color = '#9B9A97' }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{ display: 'flex', flexDirection: 'row', height: 'calc(100vh - 48px - 56px)', overflow: 'hidden' }}>

          {/* Left panel (60%) */}
          <div style={{ width: '60%', height: '100%', background: '#F7F7F5', borderRight: '1px solid #E5E3DD', overflow: 'hidden' }}>
            {renderLeftPanel()}
          </div>

          {/* Right panel (40%) */}
          <div style={{ width: '40%', height: '100%', overflowY: 'auto', padding: '24px 20px', background: '#ffffff' }}>
            {renderRightPanel()}
          </div>
        </div>

        {/* ── BOTTOM BAR ── */}
        <div style={{ height: 56, flexShrink: 0, background: '#ffffff', borderTop: '1px solid #E5E3DD', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10 }}>
          <input
            type="text"
            placeholder="Ask anything about this step..."
            style={{ flex: 1, height: 36, background: '#F7F7F5', border: '1px solid #E5E3DD', borderRadius: 6, fontSize: 13, color: '#1A1A1A', padding: '0 12px', outline: 'none' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#6B4FBB'; e.currentTarget.style.boxShadow = '0 0 0 2px #6B4FBB20' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E5E3DD'; e.currentTarget.style.boxShadow = 'none' }}
          />
          <button
            type="button"
            onClick={() => console.log('send')}
            style={{ width: 36, height: 36, flexShrink: 0, background: '#1A1A1A', color: '#ffffff', border: 'none', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
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
