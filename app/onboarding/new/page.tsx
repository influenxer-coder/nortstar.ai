'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'

const C = {
  bg: '#f6f6f6',
  surface: '#ffffff',
  text: '#1f2328',
  muted: '#535963',
  border: '#d4d7dc',
  blue: '#367eed',
  cardShadow: '0 1px 4px rgba(27,37,40,0.06)',
}

type OnboardingData = {
  url: string
  analysis_result: Record<string, unknown> | null
  timestamp: number
}

type Screen = 'url_input' | 'analyzing' | 'results'

function NewOnboardingFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromDashboard = searchParams.get('from') === 'dashboard'

  const [screen, setScreen] = useState<Screen>('url_input')
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // If coming from dashboard modal, read localStorage
  useEffect(() => {
    if (!fromDashboard) return
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('northstar_onboarding') : null
    if (!raw) { setScreen('url_input'); return }
    try {
      const parsed = JSON.parse(raw) as OnboardingData
      const ageMs = Date.now() - (parsed.timestamp ?? 0)
      const tenMin = 10 * 60 * 1000
      if (ageMs < tenMin && parsed.analysis_result) {
        setOnboardingData(parsed)
        setUrlInput(parsed.url ?? '')
        setScreen('results')
      } else {
        setScreen('url_input')
      }
    } catch {
      setScreen('url_input')
    }
  }, [fromDashboard])

  // Scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const analyzeUrl = useCallback(async (targetUrl?: string) => {
    const trimmed = (targetUrl ?? urlInput).trim()
    if (!trimmed) { setUrlError('Please enter a URL'); return }
    let url: URL
    try {
      url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    } catch {
      setUrlError('Please enter a valid URL')
      return
    }

    setUrlError('')
    setAnalyzing(true)
    setScreen('analyzing')
    setLogs([])

    const endpoint = process.env.NEXT_PUBLIC_ANALYZE_URL_ENDPOINT
    if (!endpoint) {
      setLogs(['Error: NEXT_PUBLIC_ANALYZE_URL_ENDPOINT is not configured.'])
      setAnalyzing(false)
      return
    }

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.toString() }),
        signal: abort.signal,
      })

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => `HTTP ${res.status}`)
        setLogs([`Error: ${text}`])
        setAnalyzing(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let analysisResult: Record<string, unknown> | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue
          try {
            const parsed = JSON.parse(trimmedLine) as Record<string, unknown>
            if (parsed.log && typeof parsed.log === 'string') {
              setLogs((prev) => [...prev, parsed.log as string])
            } else if (parsed.result) {
              analysisResult = parsed.result as Record<string, unknown>
            } else if (parsed.error && typeof parsed.error === 'string') {
              setLogs((prev) => [...prev, `Error: ${parsed.error}`])
            }
          } catch {
            setLogs((prev) => [...prev, trimmedLine])
          }
        }
      }

      const data: OnboardingData = {
        url: url.toString(),
        analysis_result: analysisResult,
        timestamp: Date.now(),
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('northstar_onboarding', JSON.stringify(data))
      }
      setOnboardingData(data)
      setAnalyzing(false)
      setScreen('results')
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return
      setLogs((prev) => [...prev, `Error: ${(err as Error)?.message ?? 'Unknown error'}`])
      setAnalyzing(false)
    }
  }, [urlInput])

  function handleContinueToProduct() {
    // TODO: navigate to rebuilt product onboarding UI
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Top nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
      }}>
        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Logo size={24} color="purple" />
          <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>NorthStar</span>
        </Link>
        <Link
          href="/dashboard"
          style={{ fontSize: 13, color: C.muted, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <ArrowLeft style={{ width: 13, height: 13 }} />
          Back to dashboard
        </Link>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 520 }}>

          {/* url_input screen */}
          {screen === 'url_input' && (
            <div style={{
              background: C.surface,
              borderRadius: 16,
              padding: '40px 36px',
              boxShadow: '0 2px 16px rgba(27,37,40,0.08)',
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <Logo size={32} color="purple" />
                <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 16, marginBottom: 8, letterSpacing: '-0.02em' }}>
                  Create a product
                </h1>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
                  Enter your product URL. NorthStar will analyze it to understand your product and identify growth opportunities.
                </p>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                  Product URL
                </label>
                <input
                  type="url"
                  placeholder="https://yourproduct.com"
                  value={urlInput}
                  onChange={(e) => { setUrlInput(e.target.value); setUrlError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') void analyzeUrl() }}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `1px solid ${urlError ? '#e53e3e' : C.border}`,
                    fontSize: 14,
                    color: C.text,
                    background: C.surface,
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
                {urlError && (
                  <p style={{ fontSize: 12, color: '#e53e3e', marginTop: 6 }}>{urlError}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void analyzeUrl()}
                style={{
                  width: '100%',
                  padding: '11px 20px', borderRadius: 30,
                  border: 'none', background: C.blue, color: '#fff',
                  fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                Analyze product
                <ArrowRight style={{ width: 15, height: 15 }} />
              </button>
            </div>
          )}

          {/* analyzing screen */}
          {screen === 'analyzing' && (
            <div style={{
              background: C.surface,
              borderRadius: 16,
              padding: '36px',
              boxShadow: '0 2px 16px rgba(27,37,40,0.08)',
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Loader2 style={{ width: 16, height: 16, color: C.blue, animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                  {analyzing ? 'Analyzing your product…' : 'Analysis complete'}
                </p>
              </div>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                {analyzing ? 'This takes about 30 seconds. We\'re crawling your site and running an AI analysis.' : 'Redirecting to results…'}
              </p>
              <div style={{
                background: '#0d1117',
                borderRadius: 8,
                padding: '14px 16px',
                minHeight: 220,
                maxHeight: 300,
                overflowY: 'auto',
                fontFamily: 'ui-monospace, monospace',
                fontSize: 12,
                lineHeight: 1.7,
                color: '#7ee787',
                border: '1px solid #30363d',
              }}>
                {logs.length === 0 ? (
                  <span style={{ color: '#8b949e' }}>Starting analysis…</span>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} style={{ color: log.startsWith('Error:') ? '#f85149' : '#7ee787' }}>
                      <span style={{ color: '#8b949e', marginRight: 8 }}>{'>'}</span>
                      {log}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}

          {/* results screen */}
          {screen === 'results' && onboardingData && (
            <div style={{
              background: C.surface,
              borderRadius: 16,
              padding: '40px 36px',
              boxShadow: '0 2px 16px rgba(27,37,40,0.08)',
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: '#e8f5e9', border: '1px solid #a5d6a7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <CheckCircle2 style={{ width: 24, height: 24, color: '#2e7d32' }} />
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8, letterSpacing: '-0.02em' }}>
                  Analysis complete
                </h1>
                <p style={{ fontSize: 14, color: C.muted }}>
                  We&apos;ve analyzed <strong>{onboardingData.url}</strong>. Ready to set up your product.
                </p>
              </div>

              {onboardingData.analysis_result && (
                <div style={{
                  background: C.bg,
                  borderRadius: 10,
                  padding: '16px 20px',
                  marginBottom: 24,
                  border: `1px solid ${C.border}`,
                }}>
                  {Object.entries(onboardingData.analysis_result).slice(0, 5).map(([key, value]) => (
                    typeof value === 'string' && value.trim() ? (
                      <div key={key} style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 2 }}>
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{value}</p>
                      </div>
                    ) : null
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setScreen('url_input')}
                  style={{
                    flex: 1,
                    padding: '10px 16px', borderRadius: 30,
                    border: `1px solid ${C.border}`, background: C.surface,
                    fontSize: 13, fontWeight: 600, color: C.muted,
                    cursor: 'pointer',
                  }}
                >
                  Start over
                </button>
                <button
                  type="button"
                  onClick={handleContinueToProduct}
                  style={{
                    flex: 2,
                    padding: '10px 20px', borderRadius: 30,
                    border: 'none', background: C.blue, color: '#fff',
                    fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  Continue setup
                  <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

export default function NewOnboardingPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#f6f6f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 24, height: 24, color: '#535963', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <NewOnboardingFlow />
    </Suspense>
  )
}
