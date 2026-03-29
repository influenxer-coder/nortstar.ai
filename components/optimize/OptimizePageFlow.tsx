'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, ArrowRight, Globe, Github, BarChart3, Target, CheckCircle2 } from 'lucide-react'

type DetectedTool = { name: string; key: string; detected: boolean; snippet?: string }

type Props = {
  projectId: string
  productUrl: string
  goal: string
  onClose: () => void
  onComplete: (agentId: string) => void
}

type StepId = 'url' | 'github' | 'analytics' | 'cta'

export function OptimizePageFlow({ projectId, productUrl, goal, onClose, onComplete }: Props) {
  const [step, setStep] = useState<StepId>('url')
  const [pageUrl, setPageUrl] = useState('')
  const [pageName, setPageName] = useState('')

  // GitHub
  const [githubConnected, setGithubConnected] = useState(false)
  const [githubRepos, setGithubRepos] = useState<{ full_name: string; name: string }[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [repoSearch, setRepoSearch] = useState('')
  const [githubLoading, setGithubLoading] = useState(true)

  // Analytics
  const [analyticsDetecting, setAnalyticsDetecting] = useState(false)
  const [detectedTools, setDetectedTools] = useState<DetectedTool[]>([])
  const [analyticsChecked, setAnalyticsChecked] = useState(false)

  // CTA / target action
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [screenshotLoading, setScreenshotLoading] = useState(false)
  const [targetCta, setTargetCta] = useState('')

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const STEPS: { id: StepId; label: string; icon: typeof Globe }[] = [
    { id: 'url', label: 'Page', icon: Globe },
    { id: 'github', label: 'Code', icon: Github },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'cta', label: 'Action', icon: Target },
  ]

  const stepIdx = STEPS.findIndex(s => s.id === step)

  // Check GitHub on mount
  useEffect(() => {
    setGithubLoading(true)
    fetch('/api/github/repos')
      .then(r => r.json())
      .then((data: { connected?: boolean; repos?: { full_name: string; name: string }[] }) => {
        if (data.connected && data.repos && data.repos.length > 0) {
          setGithubConnected(true)
          setGithubRepos(data.repos)
          // Auto-select first repo
          setSelectedRepo(data.repos[0].full_name)
        }
      })
      .catch(() => {})
      .finally(() => setGithubLoading(false))
  }, [])

  // Detect analytics when entering that step
  useEffect(() => {
    if (step !== 'analytics' || analyticsChecked || !pageUrl) return
    setAnalyticsDetecting(true)
    fetch('/api/detect-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: pageUrl }),
    })
      .then(r => r.json())
      .then((data: { tools?: DetectedTool[] }) => {
        setDetectedTools(data.tools ?? [])
        setAnalyticsChecked(true)
      })
      .catch(() => setAnalyticsChecked(true))
      .finally(() => setAnalyticsDetecting(false))
  }, [step, analyticsChecked, pageUrl])

  const nextStep = () => {
    const idx = stepIdx
    if (idx < STEPS.length - 1) {
      // Skip GitHub if already connected
      if (STEPS[idx + 1].id === 'github' && githubConnected && selectedRepo) {
        setStep(STEPS[idx + 2]?.id ?? 'cta')
      } else {
        setStep(STEPS[idx + 1].id)
      }
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      // Create page optimization agent
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pageName || new URL(pageUrl).pathname || 'Page Optimization',
          url: pageUrl,
          github_repo: selectedRepo ?? '',
          main_kpi: targetCta || goal,
          target_element: { type: 'cta', text: targetCta },
          type: 'page_optimization',
          goal,
          project_id: projectId,
          analytics_config: {
            detected_tools: detectedTools.filter(t => t.detected),
          },
        }),
      })

      if (!res.ok) throw new Error('Failed to create optimization')
      const data = await res.json() as { id?: string }
      if (!data.id) throw new Error('No agent ID returned')

      // Trigger analysis
      await fetch(`/api/agents/${data.id}/analyze`, { method: 'POST' }).catch(() => {})

      onComplete(data.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  const isUrlValid = (() => {
    try {
      const u = new URL(pageUrl)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch { return false }
  })()

  const filteredRepos = githubRepos.filter(r =>
    !repoSearch || r.full_name.toLowerCase().includes(repoSearch.toLowerCase())
  )

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.35)' }} onClick={onClose} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
        {/* Header */}
        <div style={{ height: 48, flexShrink: 0, borderBottom: '1px solid #E5E3DD', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', flex: 1 }}>Optimize a page</span>
          {/* Step dots */}
          <div style={{ display: 'flex', gap: 6 }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: i <= stepIdx ? '#1A1A1A' : 'transparent',
                  border: i <= stepIdx ? 'none' : '1.5px solid #D4D4D4',
                }} />
                {i === stepIdx && <span style={{ fontSize: 9, color: '#9B9A97' }}>{s.label}</span>}
              </div>
            ))}
          </div>
          <button type="button" onClick={onClose} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#9B9A97' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 480, width: '100%' }}>

            {/* Step: URL */}
            {step === 'url' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Globe style={{ width: 24, height: 24, color: '#1A1A1A' }} />
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>Which page do you want to optimize?</h2>
                  <p style={{ fontSize: 13, color: '#9B9A97' }}>Paste the full URL of the page</p>
                </div>
                <input
                  type="url" value={pageUrl} onChange={e => setPageUrl(e.target.value)}
                  placeholder="https://yourapp.com/pricing"
                  autoFocus
                  style={{ width: '100%', height: 44, border: '1px solid #E5E3DD', borderRadius: 8, fontSize: 14, padding: '0 14px', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#6B4FBB' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E5E3DD' }}
                />
                <input
                  type="text" value={pageName} onChange={e => setPageName(e.target.value)}
                  placeholder="Page name (optional) — e.g. Pricing Page"
                  style={{ width: '100%', height: 44, border: '1px solid #E5E3DD', borderRadius: 8, fontSize: 14, padding: '0 14px', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#6B4FBB' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E5E3DD' }}
                />
                <button type="button" disabled={!isUrlValid} onClick={nextStep}
                  style={{
                    width: '100%', height: 44, borderRadius: 8, border: 'none',
                    background: isUrlValid ? '#1A1A1A' : '#E5E3DD', color: '#fff',
                    fontSize: 14, fontWeight: 500, cursor: isUrlValid ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  Continue <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            )}

            {/* Step: GitHub */}
            {step === 'github' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Github style={{ width: 24, height: 24, color: '#1A1A1A' }} />
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>Connect your repository</h2>
                  <p style={{ fontSize: 13, color: '#9B9A97' }}>Select the repo that powers this page</p>
                </div>

                {githubLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 }}>
                    <Loader2 style={{ width: 16, height: 16, color: '#9B9A97', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 13, color: '#9B9A97' }}>Loading repos...</span>
                  </div>
                ) : !githubConnected ? (
                  <div style={{ textAlign: 'center' }}>
                    <a href={`/api/auth/github?next=${encodeURIComponent(window.location.pathname + '?optimize=resume')}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px',
                        background: '#1A1A1A', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 500,
                        textDecoration: 'none',
                      }}>
                      <Github style={{ width: 16, height: 16 }} /> Connect GitHub
                    </a>
                  </div>
                ) : (
                  <>
                    <input
                      type="text" value={repoSearch} onChange={e => setRepoSearch(e.target.value)}
                      placeholder="Search repositories..."
                      style={{ width: '100%', height: 40, border: '1px solid #E5E3DD', borderRadius: 8, fontSize: 13, padding: '0 12px', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #E5E3DD', borderRadius: 8 }}>
                      {filteredRepos.slice(0, 20).map(r => (
                        <div key={r.full_name} onClick={() => setSelectedRepo(r.full_name)}
                          style={{
                            padding: '10px 12px', cursor: 'pointer', fontSize: 13,
                            background: selectedRepo === r.full_name ? '#F0ECFA' : 'transparent',
                            borderBottom: '1px solid #F7F7F5',
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}>
                          {selectedRepo === r.full_name && <CheckCircle2 style={{ width: 14, height: 14, color: '#6B4FBB' }} />}
                          <span style={{ color: '#1A1A1A' }}>{r.full_name}</span>
                        </div>
                      ))}
                    </div>
                    <button type="button" disabled={!selectedRepo} onClick={nextStep}
                      style={{
                        width: '100%', height: 44, borderRadius: 8, border: 'none',
                        background: selectedRepo ? '#1A1A1A' : '#E5E3DD', color: '#fff',
                        fontSize: 14, fontWeight: 500, cursor: selectedRepo ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                      Continue <ArrowRight style={{ width: 14, height: 14 }} />
                    </button>
                    <button type="button" onClick={nextStep}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#9B9A97', fontSize: 13, cursor: 'pointer', padding: '6px 0' }}>
                      Skip for now
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Step: Analytics */}
            {step === 'analytics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <BarChart3 style={{ width: 24, height: 24, color: '#1A1A1A' }} />
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>Analytics detected</h2>
                  <p style={{ fontSize: 13, color: '#9B9A97' }}>We scanned your page for analytics tools</p>
                </div>

                {analyticsDetecting ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 }}>
                    <Loader2 style={{ width: 16, height: 16, color: '#9B9A97', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 13, color: '#9B9A97' }}>Scanning {pageUrl}...</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {detectedTools.filter(t => t.detected).map(t => (
                        <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#EEF6F1', borderRadius: 8, border: '1px solid #d1e7dd' }}>
                          <CheckCircle2 style={{ width: 16, height: 16, color: '#4D9B6F' }} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{t.name}</span>
                          {t.snippet && <span style={{ fontSize: 11, color: '#9B9A97', marginLeft: 'auto', fontFamily: 'monospace' }}>{t.snippet}</span>}
                        </div>
                      ))}
                      {detectedTools.filter(t => !t.detected).length > 0 && detectedTools.filter(t => t.detected).length > 0 && (
                        <div style={{ fontSize: 11, color: '#9B9A97', marginTop: 4 }}>
                          Not detected: {detectedTools.filter(t => !t.detected).map(t => t.name).join(', ')}
                        </div>
                      )}
                      {detectedTools.filter(t => t.detected).length === 0 && (
                        <div style={{ padding: '16px 12px', background: '#FBF4E6', borderRadius: 8, border: '1px solid #f0e0b8', fontSize: 13, color: '#92600a', textAlign: 'center' }}>
                          No analytics tools detected on this page. You can still optimize — we&apos;ll use competitive data instead.
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={nextStep}
                      style={{
                        width: '100%', height: 44, borderRadius: 8, border: 'none',
                        background: '#1A1A1A', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                      Continue <ArrowRight style={{ width: 14, height: 14 }} />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Step: CTA / Target action */}
            {step === 'cta' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Target style={{ width: 24, height: 24, color: '#1A1A1A' }} />
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>What action matters most?</h2>
                  <p style={{ fontSize: 13, color: '#9B9A97' }}>The key CTA or conversion action on this page</p>
                </div>
                <input
                  type="text" value={targetCta} onChange={e => setTargetCta(e.target.value)}
                  placeholder="e.g. Sign up, Start free trial, Book a demo"
                  autoFocus
                  style={{ width: '100%', height: 44, border: '1px solid #E5E3DD', borderRadius: 8, fontSize: 14, padding: '0 14px', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#6B4FBB' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E5E3DD' }}
                />

                {error && (
                  <p style={{ fontSize: 12, color: '#9B3030', margin: 0 }}>{error}</p>
                )}

                <button type="button" disabled={!targetCta.trim() || submitting} onClick={handleSubmit}
                  style={{
                    width: '100%', height: 44, borderRadius: 8, border: 'none',
                    background: targetCta.trim() && !submitting ? '#1A1A1A' : '#E5E3DD', color: '#fff',
                    fontSize: 14, fontWeight: 500,
                    cursor: targetCta.trim() && !submitting ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  {submitting ? (
                    <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Finding opportunities...</>
                  ) : (
                    <>Find opportunities <ArrowRight style={{ width: 14, height: 14 }} /></>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #C9C8C5; }
      `}</style>
    </>
  )
}
