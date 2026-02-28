'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Loader2, CheckCircle2, ExternalLink, GitBranch, MessageSquare } from 'lucide-react'

const STEPS = 5
const PURPLE = '#7C3AED'

function validateUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

// ─── Analytics tool definitions ──────────────────────────────────────────────

type AnalyticsField = { key: string; label: string; type: string; placeholder: string; helper: string }
type AnalyticsTool = {
  id: string
  name: string
  initials: string
  color: string
  recommended?: boolean
  fields: AnalyticsField[]
}

const ANALYTICS_TOOLS: AnalyticsTool[] = [
  {
    id: 'posthog', name: 'PostHog', initials: 'PH', color: '#f97316', recommended: true,
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'phx_...', helper: 'PostHog → Settings → Project → API Keys' },
      { key: 'project_id', label: 'Project ID', type: 'text', placeholder: '12345', helper: 'PostHog → Settings → Project' },
    ],
  },
  {
    id: 'mixpanel', name: 'Mixpanel', initials: 'MX', color: '#6366f1', recommended: true,
    fields: [
      { key: 'project_token', label: 'Project Token', type: 'password', placeholder: 'abc123...', helper: 'Mixpanel → Settings → Project Details' },
    ],
  },
  {
    id: 'ga4', name: 'Google Analytics 4', initials: 'GA', color: '#3b82f6',
    fields: [
      { key: 'measurement_id', label: 'Measurement ID', type: 'text', placeholder: 'G-XXXXXXXXXX', helper: 'GA4 → Admin → Data Streams → Measurement Protocol' },
    ],
  },
  {
    id: 'amplitude', name: 'Amplitude', initials: 'AM', color: '#0ea5e9',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'your-api-key', helper: 'Amplitude → Settings → Projects' },
    ],
  },
  {
    id: 'segment', name: 'Segment', initials: 'SG', color: '#22c55e',
    fields: [
      { key: 'write_key', label: 'Write Key', type: 'password', placeholder: 'your-write-key', helper: 'Segment → Sources → Your Source → API Keys' },
    ],
  },
  {
    id: 'heap', name: 'Heap', initials: 'HP', color: '#14b8a6',
    fields: [
      { key: 'app_id', label: 'App ID', type: 'text', placeholder: '1234567890', helper: 'Heap → Account → Privacy & Security' },
    ],
  },
  {
    id: 'fullstory', name: 'Fullstory', initials: 'FS', color: '#1d4ed8',
    fields: [
      { key: 'org_id', label: 'Org ID', type: 'text', placeholder: 'XXXXX', helper: 'Fullstory → Settings → General' },
    ],
  },
  {
    id: 'hotjar', name: 'Hotjar', initials: 'HJ', color: '#f43f5e',
    fields: [
      { key: 'site_id', label: 'Site ID', type: 'text', placeholder: '1234567', helper: 'Hotjar → Settings → Sites & Organizations' },
    ],
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type CrawlElement = {
  type: string
  text: string
  position: { x: number; y: number; width: number; height: number }
}

type CrawlData = {
  screenshot: string
  elements: CrawlElement[]
  analytics: { detected: Record<string, boolean>; hasAny: boolean }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CreateAgentFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const draftParam = searchParams.get('draft')
  const stepParam = searchParams.get('step')
  const initialStep = Math.min(Math.max(1, parseInt(stepParam || '1', 10) || 1), STEPS)

  // ── Navigation / draft state ──────────────────────────────────────────────
  const [step, setStep] = useState(initialStep)
  const [draftId, setDraftId] = useState<string | null>(draftParam)
  const savingRef = useRef(false)
  const draftLoadedRef = useRef(false)

  // ── Step 1 form state ────────────────────────────────────────────────────
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState('')

  // ── Step 2 — GitHub ───────────────────────────────────────────────────────
  const [githubRepo, setGithubRepo] = useState('')
  const [githubRepos, setGithubRepos] = useState<{ full_name: string; name: string; private: boolean }[]>([])
  const [githubReposLoading, setGithubReposLoading] = useState(false)
  const [githubNeedsReauth, setGithubNeedsReauth] = useState(false)
  const [githubNeedsAppPermission, setGithubNeedsAppPermission] = useState(false)
  const [githubScope, setGithubScope] = useState('')
  const [oauthCount, setOauthCount] = useState(0)

  // ── Crawl (background — feeds steps 3 and 4) ──────────────────────────────
  const [crawlData, setCrawlData] = useState<CrawlData | null>(null)
  const [crawlRunning, setCrawlRunning] = useState(false)
  const [crawlFailed, setCrawlFailed] = useState(false)
  const crawlAbortRef = useRef<AbortController | null>(null)
  const crawlStartedForUrlRef = useRef<string | null>(null)

  // ── Step 3 — Analytics connections ───────────────────────────────────────
  const [analyticsInputs, setAnalyticsInputs] = useState<Record<string, Record<string, string>>>({})
  const [analyticsConnected, setAnalyticsConnected] = useState<Record<string, boolean>>({})
  const [analyticsValidating, setAnalyticsValidating] = useState<Record<string, boolean>>({})
  const [analyticsErrors, setAnalyticsErrors] = useState<Record<string, string>>({})
  // Scenario B: install flow
  const [installLoading, setInstallLoading] = useState(false)
  const [installPrUrl, setInstallPrUrl] = useState<string | null>(null)
  const [installPolling, setInstallPolling] = useState(false)
  const [installError, setInstallError] = useState('')
  const [installAlreadyInRepo, setInstallAlreadyInRepo] = useState(false)

  // ── Step 4 — Element selection ────────────────────────────────────────────
  const [selectedElement, setSelectedElement] = useState<CrawlElement | null>(null)
  const [screenshotScale, setScreenshotScale] = useState<{ scaleX: number; scaleY: number } | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // ── Step 5 — Slack connection ─────────────────────────────────────────────
  const [slackConnected, setSlackConnected] = useState(searchParams.get('slack') === 'connected')

  // ── Draft resume ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!draftParam || draftLoadedRef.current) return
    draftLoadedRef.current = true
    fetch(`/api/agents/${draftParam}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return
        if (data.name) setName(data.name)
        if (data.url) setUrl(data.url)
        if (data.github_repo) setGithubRepo(data.github_repo)
        if (data.posthog_api_key) {
          setAnalyticsInputs((prev) => ({
            ...prev,
            posthog: { api_key: data.posthog_api_key, project_id: data.posthog_project_id || '' },
          }))
        }
        const lastStep = typeof data.step === 'number' ? data.step : 0
        const resumeStep = Math.min(lastStep + 1, STEPS)
        setStep(resumeStep)
        router.replace(`/dashboard/agents/new?draft=${draftParam}&step=${resumeStep}`, { scroll: false })
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftParam])

  // ── Sync step from URL ────────────────────────────────────────────────────
  useEffect(() => {
    const s = searchParams.get('step')
    if (s) setStep(Math.min(STEPS, Math.max(1, parseInt(s, 10) || 1)))
  }, [searchParams])

  // ── Start background crawl whenever URL is known and we've passed step 1 ─
  const startCrawl = useCallback((targetUrl: string) => {
    if (crawlStartedForUrlRef.current === targetUrl) return
    crawlStartedForUrlRef.current = targetUrl
    setCrawlData(null)
    setCrawlFailed(false)
    setCrawlRunning(true)
    crawlAbortRef.current?.abort()
    const controller = new AbortController()
    crawlAbortRef.current = controller
    fetch('/api/crawl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (controller.signal.aborted) return
        setCrawlData({
          screenshot: typeof data.screenshot === 'string' ? data.screenshot : '',
          elements: Array.isArray(data.elements) ? data.elements : [],
          analytics: data.analytics ?? { detected: {}, hasAny: false },
        })
      })
      .catch(() => {
        if (!controller.signal.aborted) setCrawlFailed(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setCrawlRunning(false)
      })
  }, [])

  // ── Auto-start crawl whenever we're past step 1 and have a valid URL ────────
  // Handles draft resume, page refresh, and direct URL navigation to step 2+.
  useEffect(() => {
    if (step < 2) return
    const trimmed = url.trim()
    if (!trimmed || !validateUrl(trimmed)) return
    startCrawl(trimmed)
  }, [url, step, startCrawl])

  // ── GitHub OAuth cleanup (Effect 1) ───────────────────────────────────────
  useEffect(() => {
    if (step === 2 && searchParams.get('github') === 'connected') {
      const base = draftId
        ? `/dashboard/agents/new?draft=${draftId}&step=2`
        : '/dashboard/agents/new?step=2'
      router.replace(base, { scroll: false })
      setOauthCount((c) => c + 1)
    }
  }, [step, searchParams, router, draftId])

  // ── Fetch GitHub repos (Effect 2) ─────────────────────────────────────────
  useEffect(() => {
    if (step !== 2) return
    let alive = true
    setGithubReposLoading(true)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12_000)
    fetch('/api/github/repos', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return
        setGithubRepos(data.repos ?? [])
        setGithubNeedsReauth(data.needsReauth ?? false)
        setGithubNeedsAppPermission(data.needsAppPermission ?? false)
        setGithubScope(data.scope ?? '')
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timeoutId); if (alive) setGithubReposLoading(false) })
    return () => { alive = false; controller.abort() }
  }, [step, oauthCount])

  // ── Poll for PostHog installation (Scenario B) ────────────────────────────
  useEffect(() => {
    if (!installPolling || !draftId) return
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/analytics/status?agent_id=${draftId}`)
        const data = await res.json()
        if (data.installed) {
          setInstallPolling(false)
          goToStep(4)
        }
      } catch { /* continue polling */ }
    }, 8_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installPolling, draftId])

  // ── Can-continue guards ───────────────────────────────────────────────────
  const canContinueStep1 = !!name.trim() && !!url.trim() && validateUrl(url)
  const canContinueStep2 = !!githubRepo
  const anyToolConnected = Object.values(analyticsConnected).some(Boolean)
  const canContinueStep3 = anyToolConnected
  const canContinueStep4 = !!selectedElement
  // Slack is optional — user can always submit from step 5
  const canContinueStep5 = true

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleValidateUrl = useCallback(() => {
    const u = url.trim()
    if (!u) { setUrlError('Enter a URL'); return }
    if (!validateUrl(u)) { setUrlError('Enter a valid URL (e.g. https://example.com)'); return }
    setUrlError('')
  }, [url])

  const handleConnectTool = async (toolId: string) => {
    setAnalyticsValidating((p) => ({ ...p, [toolId]: true }))
    setAnalyticsErrors((p) => ({ ...p, [toolId]: '' }))
    try {
      const res = await fetch('/api/analytics/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolId, credentials: analyticsInputs[toolId] ?? {} }),
      })
      const data = await res.json()
      if (data.valid) {
        setAnalyticsConnected((p) => ({ ...p, [toolId]: true }))
      } else {
        setAnalyticsErrors((p) => ({ ...p, [toolId]: data.error || 'Validation failed' }))
      }
    } catch {
      setAnalyticsErrors((p) => ({ ...p, [toolId]: 'Could not connect. Try again.' }))
    } finally {
      setAnalyticsValidating((p) => ({ ...p, [toolId]: false }))
    }
  }

  const handleInstallAnalytics = async () => {
    if (!draftId || !githubRepo) return
    setInstallLoading(true)
    setInstallError('')
    try {
      const res = await fetch('/api/analytics/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_repo: githubRepo, agent_id: draftId, url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setInstallError(data.error || 'Failed to open PR')
        return
      }
      if (data.already_installed) {
        setInstallAlreadyInRepo(true)
        setInstallPolling(true)
        return
      }
      setInstallPrUrl(data.pr_url)
      setInstallPolling(true)
    } catch {
      setInstallError('Failed to open PR. Check your GitHub connection.')
    } finally {
      setInstallLoading(false)
    }
  }

  // ── Draft save ────────────────────────────────────────────────────────────

  const saveDraft = useCallback(async (stepCompleted: number, extra: Record<string, unknown> = {}) => {
    if (savingRef.current) return null
    savingRef.current = true
    try {
      if (!draftId) {
        const res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), url: url.trim() || undefined, status: 'draft', step: stepCompleted, ...extra }),
        })
        if (!res.ok) return null
        const data = await res.json()
        setDraftId(data.id)
        return data.id as string
      } else {
        await fetch(`/api/agents/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), url: url.trim() || undefined, step: stepCompleted, ...extra }),
        })
        return draftId
      }
    } catch {
      return null
    } finally {
      savingRef.current = false
    }
  }, [draftId, name, url])

  const goToStep = useCallback(async (s: number, saveData?: Record<string, unknown>) => {
    const currentStep = step
    if (s > currentStep) {
      // Trigger crawl when advancing past step 1
      if (currentStep === 1 && url.trim() && validateUrl(url)) {
        startCrawl(url.trim())
      }
      const id = await saveDraft(currentStep, saveData)
      const idToUse = id ?? draftId
      setStep(s)
      const query = idToUse
        ? `/dashboard/agents/new?draft=${idToUse}&step=${s}`
        : `/dashboard/agents/new?step=${s}`
      router.replace(query, { scroll: false })
    } else {
      setStep(s)
      const query = draftId
        ? `/dashboard/agents/new?draft=${draftId}&step=${s}`
        : `/dashboard/agents/new?step=${s}`
      router.replace(query, { scroll: false })
    }
  }, [step, draftId, url, saveDraft, startCrawl, router])

  const handleSubmit = async () => {
    if (!selectedElement || !name.trim() || !url.trim()) return
    setSubmitLoading(true)
    setSubmitError('')

    // Build analytics_config from all connected tools
    const analytics_config: Record<string, Record<string, string>> = {}
    for (const [toolId, connected] of Object.entries(analyticsConnected)) {
      if (connected && analyticsInputs[toolId]) analytics_config[toolId] = analyticsInputs[toolId]
    }

    const payload = {
      github_repo: githubRepo || undefined,
      target_element: { type: selectedElement.type, text: selectedElement.text, position: selectedElement.position },
      analytics_config: Object.keys(analytics_config).length ? analytics_config : undefined,
      status: 'Analyzing',
      step: 4,
    }

    try {
      if (draftId) {
        const res = await fetch(`/api/agents/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to create agent')
        }
      } else {
        const res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), url: url.trim(), ...payload }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to create agent')
        }
      }
      router.push('/dashboard/agents')
      router.refresh()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to create agent')
    } finally {
      setSubmitLoading(false)
    }
  }

  // ── GitHub OAuth URL helper ───────────────────────────────────────────────
  const step2Next = draftId
    ? `/dashboard/agents/new?draft=${draftId}&step=2`
    : '/dashboard/agents/new?step=2'
  const githubOauthUrl = (next: string) => `/api/auth/github?next=${encodeURIComponent(next)}`

  // ── Derived analytics data ────────────────────────────────────────────────
  const detectedTools = crawlData
    ? ANALYTICS_TOOLS.filter((t) => crawlData.analytics.detected[t.id])
    : []
  const detectedCount = detectedTools.length
  const showRecommendationBanner = detectedCount > 2
  const recommendedTools = detectedTools.filter((t) => t.recommended)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-10">
          {Array.from({ length: STEPS }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => n < step && goToStep(n)}
              className={`h-9 w-9 rounded-full text-sm font-medium transition-colors ${
                n === step
                  ? 'bg-[#7C3AED] text-white'
                  : n < step
                    ? 'bg-zinc-700 text-zinc-200 cursor-pointer hover:bg-zinc-600'
                    : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {/* ── STEP 1: Basics ────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">Agent basics</h1>
            <div className="space-y-6 mt-8">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Agent name</label>
                <Input
                  placeholder="e.g. Homepage Optimizer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-900 border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Public URL to optimize</label>
                <Input
                  type="url"
                  placeholder="https://yoursite.com"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setUrlError('') }}
                  onBlur={handleValidateUrl}
                  className="bg-zinc-900 border-zinc-700"
                />
                {urlError && <p className="text-sm text-red-400 mt-1">{urlError}</p>}
              </div>
              <Button
                onClick={() => goToStep(2)}
                disabled={!canContinueStep1}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {/* ── STEP 2: GitHub ────────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">Connect your codebase</h1>
            <p className="text-zinc-400 text-sm mb-6">We need read/write access to ship code changes.</p>
            <div className="space-y-6">
              {githubReposLoading ? (
                <div className="flex items-center gap-2 text-zinc-400 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading repositories…
                </div>
              ) : githubRepos.length > 0 ? (
                <div className="space-y-3">
                  {githubNeedsAppPermission && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
                      <p className="font-medium mb-1">Private repositories not visible</p>
                      <p className="text-amber-500/80 text-xs leading-relaxed">
                        Your GitHub App needs the <strong className="text-amber-400">Repository contents</strong> permission.
                        Go to{' '}
                        <a href="https://github.com/settings/developers" target="_blank" rel="noreferrer" className="underline hover:text-amber-300">
                          GitHub Developer Settings → GitHub Apps
                        </a>{' '}
                        and set <strong className="text-amber-400">Contents → Read &amp; Write</strong>, then reconnect.
                      </p>
                    </div>
                  )}
                  {githubNeedsReauth && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
                      <p className="font-medium mb-1">Private repositories not visible</p>
                      <p className="text-amber-500/80 text-xs">
                        Scope: <code className="font-mono">{githubScope}</code>.{' '}
                        <a href={githubOauthUrl(step2Next)} className="underline hover:text-amber-300">Reconnect for private access →</a>
                      </p>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-zinc-300">Choose repository</label>
                      <a href={githubOauthUrl(step2Next)} className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2">
                        Reconnect GitHub
                      </a>
                    </div>
                    <select
                      value={githubRepo}
                      onChange={(e) => setGithubRepo(e.target.value)}
                      className="w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                    >
                      <option value="">Select a repository</option>
                      {githubRepos.map((r) => (
                        <option key={r.full_name} value={r.full_name}>
                          {r.full_name} {r.private ? '(private)' : ''}
                        </option>
                      ))}
                    </select>
                    {githubRepo && (
                      <div className="flex items-center gap-2 mt-2 text-emerald-400 text-sm">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span className="font-mono">{githubRepo}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <a
                  href={githubOauthUrl(step2Next)}
                  className="inline-flex items-center justify-center rounded-md bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-11 px-6 text-sm font-medium"
                >
                  Connect GitHub
                </a>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => goToStep(1)} className="border-zinc-700 text-zinc-300">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => goToStep(3, { github_repo: githubRepo })}
                  disabled={!canContinueStep2}
                  className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                >
                  Continue
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 3: Analytics ─────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">Connect behavioral signals</h1>
            <p className="text-zinc-400 text-sm mb-8">
              The agent needs to read how users interact with your page to form hypotheses.
            </p>

            {/* Loading — crawl still running */}
            {crawlRunning && (
              <div className="flex items-center gap-3 text-zinc-400 py-8 border border-zinc-800 rounded-xl px-6 bg-zinc-900/30 mb-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#7C3AED]" />
                <div>
                  <p className="text-zinc-300 font-medium">Scanning your page for analytics…</p>
                  <p className="text-zinc-500 text-xs mt-0.5">This usually takes a few seconds</p>
                </div>
              </div>
            )}

            {/* Crawl failed — fallback to manual */}
            {!crawlRunning && crawlFailed && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-5 py-4 text-sm text-zinc-400 mb-6">
                <p className="font-medium text-zinc-300 mb-1">Could not scan your page</p>
                <p className="text-xs">Connect an analytics tool below, or skip for now.</p>
              </div>
            )}

            {/* Results */}
            {!crawlRunning && crawlData && (
              <>
                {crawlData.analytics.hasAny ? (
                  /* ── Scenario A / C: analytics detected ── */
                  <div className="space-y-4">
                    <p className="text-sm text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> We found analytics on your page
                    </p>

                    {/* Scenario C: multiple tools — recommendation banner */}
                    {showRecommendationBanner && (
                      <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-sm text-violet-300">
                        <p className="font-medium mb-0.5">Recommendation</p>
                        <p className="text-xs text-violet-400 leading-relaxed">
                          Connect{' '}
                          {recommendedTools.map((t) => t.name).join(' or ')}{' '}
                          — they give the agent the richest behavioral signals including session recordings and click heatmaps.
                        </p>
                      </div>
                    )}

                    {/* Tool cards */}
                    {detectedTools.map((tool) => {
                      const connected = analyticsConnected[tool.id]
                      const validating = analyticsValidating[tool.id]
                      const err = analyticsErrors[tool.id]
                      const inputs = analyticsInputs[tool.id] ?? {}
                      const allFieldsFilled = tool.fields.every((f) => inputs[f.key]?.trim())

                      return (
                        <div
                          key={tool.id}
                          className={`rounded-xl border p-5 transition-colors ${
                            connected ? 'border-emerald-600/40 bg-emerald-950/20' : 'border-zinc-800 bg-[#111]'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <span
                              className="flex items-center justify-center h-8 w-8 rounded-lg text-xs font-bold text-white shrink-0"
                              style={{ backgroundColor: tool.color }}
                            >
                              {tool.initials}
                            </span>
                            <div className="flex items-center gap-2 flex-1">
                              <span className="font-semibold text-zinc-100">{tool.name}</span>
                              {tool.recommended && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
                                  Recommended
                                </span>
                              )}
                            </div>
                            {connected ? (
                              <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                              </span>
                            ) : (
                              <span className="text-xs text-emerald-500/60 font-medium">Detected ✓</span>
                            )}
                          </div>

                          {!connected && (
                            <div className="space-y-3">
                              {tool.fields.map((field) => (
                                <div key={field.key}>
                                  <label className="block text-xs font-medium text-zinc-400 mb-1">{field.label}</label>
                                  <Input
                                    type={field.type as 'text' | 'password'}
                                    placeholder={field.placeholder}
                                    value={inputs[field.key] ?? ''}
                                    onChange={(e) => setAnalyticsInputs((p) => ({
                                      ...p,
                                      [tool.id]: { ...p[tool.id], [field.key]: e.target.value },
                                    }))}
                                    className="bg-zinc-900 border-zinc-700 h-9 text-sm"
                                  />
                                  <p className="text-[11px] text-zinc-600 mt-1">Found in {field.helper}</p>
                                </div>
                              ))}
                              {err && <p className="text-xs text-red-400">{err}</p>}
                              <Button
                                size="sm"
                                onClick={() => handleConnectTool(tool.id)}
                                disabled={validating || !allFieldsFilled}
                                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-8 text-xs"
                              >
                                {validating && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                                Connect
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  /* ── Scenario B: no analytics detected ── */
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-400">No analytics found on your page.</p>
                    <div className="rounded-xl border border-zinc-800 bg-[#111] p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="flex items-center justify-center h-8 w-8 rounded-lg text-xs font-bold text-white bg-[#f97316]">
                          PH
                        </span>
                        <div>
                          <p className="font-semibold text-zinc-100">NorthStar will install PostHog for you</p>
                          <p className="text-xs text-zinc-500">Free and open source · No account needed</p>
                        </div>
                      </div>
                      <ul className="space-y-1.5 mb-5">
                        {['Tracks clicks, scroll depth, and sessions', 'Managed entirely by NorthStar', 'We open a PR on your GitHub repo — you review and merge'].map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-zinc-400">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>

                      {installAlreadyInRepo ? (
                        <div className="rounded-lg border border-blue-600/30 bg-blue-950/20 px-4 py-3 space-y-2">
                          <p className="text-sm text-blue-400 font-medium">PostHog already in your repo</p>
                          <div className="flex items-center gap-2 text-zinc-400 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin text-[#7C3AED]" />
                            <span>Checking if it&apos;s live on your page…</span>
                          </div>
                        </div>
                      ) : !installPrUrl ? (
                        <>
                          {installError && (
                            <p className="text-xs text-red-400 mb-3">{installError}</p>
                          )}
                          <Button
                            onClick={handleInstallAnalytics}
                            disabled={installLoading || !draftId || !githubRepo}
                            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white w-full"
                          >
                            {installLoading
                              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Opening PR on your repo…</>
                              : <><GitBranch className="h-4 w-4 mr-2" /> Install Analytics →</>
                            }
                          </Button>
                          {!githubRepo && (
                            <p className="text-xs text-zinc-600 mt-2 text-center">
                              Go back to step 2 to connect a GitHub repo first
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div className="rounded-lg border border-emerald-600/30 bg-emerald-950/20 px-4 py-3">
                            <p className="text-sm text-emerald-400 font-medium mb-1">PR opened successfully</p>
                            <a
                              href={installPrUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-emerald-500 underline hover:text-emerald-300"
                            >
                              View PR on GitHub <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <div className="flex items-center gap-2 text-zinc-400 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin text-[#7C3AED]" />
                            <span>
                              Merge the PR in GitHub — we&apos;ll detect it automatically and advance to the next step.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={() => goToStep(2)} className="border-zinc-700 text-zinc-300">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => {
                  const analytics_config: Record<string, Record<string, string>> = {}
                  for (const [id, conn] of Object.entries(analyticsConnected)) {
                    if (conn && analyticsInputs[id]) analytics_config[id] = analyticsInputs[id]
                  }
                  goToStep(4, Object.keys(analytics_config).length ? { analytics_config } : {})
                }}
                disabled={!canContinueStep3}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              >
                Continue
              </Button>
              {/* Skip link — always available while no tool is connected */}
              {!anyToolConnected && (
                <button
                  type="button"
                  onClick={() => goToStep(4)}
                  className="ml-auto text-xs text-zinc-600 hover:text-zinc-400 underline underline-offset-2"
                >
                  Skip for now
                </button>
              )}
            </div>
          </>
        )}

        {/* ── STEP 4: Element selection ─────────────────────────────────── */}
        {step === 4 && (
          <>
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">What do you want to improve?</h1>
            <p className="text-zinc-400 text-sm mb-6">Click an element on the screenshot to select it.</p>

            {crawlRunning && (
              <div className="flex items-center gap-2 text-zinc-400 py-12">
                <Loader2 className="h-5 w-5 animate-spin" /> Crawling your page…
              </div>
            )}

            {!crawlRunning && !crawlData && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-6">
                Could not crawl this page. Please go back and verify the URL is public.
              </div>
            )}

            {!crawlRunning && crawlData && !crawlData.screenshot && (
              <div className="rounded-lg border border-zinc-800 px-4 py-3 text-sm text-zinc-400 mb-6">
                No screenshot captured. You can still proceed — element selection will be skipped.
              </div>
            )}

            {!crawlRunning && crawlData?.screenshot && (
              <>
                <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 mb-6">
                  <img
                    src={`data:image/png;base64,${crawlData.screenshot}`}
                    alt="Page screenshot"
                    className="w-full h-auto block"
                    onLoad={(e) => {
                      const target = e.target as HTMLImageElement
                      if (target.naturalWidth && target.naturalHeight) {
                        const rect = target.getBoundingClientRect()
                        setScreenshotScale({
                          scaleX: rect.width / target.naturalWidth,
                          scaleY: rect.height / target.naturalHeight,
                        })
                      }
                    }}
                  />
                  {screenshotScale && crawlData.elements.map((el, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedElement(el)}
                      className="absolute border-2 transition-colors hover:opacity-90"
                      style={{
                        left: el.position.x * screenshotScale.scaleX,
                        top: el.position.y * screenshotScale.scaleY,
                        width: el.position.width * screenshotScale.scaleX,
                        height: el.position.height * screenshotScale.scaleY,
                        borderColor: selectedElement === el ? PURPLE : 'rgba(34, 197, 94, 0.6)',
                        backgroundColor: selectedElement === el ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
                      }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mb-6">
                  {crawlData.elements.map((el, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedElement(el)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        selectedElement === el
                          ? 'bg-[#7C3AED] text-white'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {el.text || `${el.type} ${i + 1}`}
                    </button>
                  ))}
                </div>
              </>
            )}

            {submitError && (
              <p className="text-sm text-red-400 mb-4">{submitError}</p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => goToStep(3)} className="border-zinc-700 text-zinc-300">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => goToStep(5)}
                disabled={!canContinueStep4}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              >
                Next →
              </Button>
            </div>
          </>
        )}

        {/* ── STEP 5: Connect Slack ──────────────────────────────────────── */}
        {step === 5 && (
          <>
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">Connect Slack</h1>
            <p className="text-zinc-400 text-sm mb-6">
              Your agent will chat with you directly in Slack — answer questions, share insights, and learn from your feedback.
            </p>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 mb-6">
              {slackConnected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-emerald-400">Slack connected</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Check your Slack DMs — your agent sent a welcome message.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <ul className="space-y-1.5 mb-4">
                    {[
                      'Bi-directional DM chat with your agent',
                      'Ask questions about your product and users',
                      'Upload docs and give feedback to train your agent',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-zinc-400">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={draftId ? `/api/auth/slack?agent_id=${draftId}` : '#'}
                    className={`flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors ${draftId ? 'bg-[#4A154B] hover:bg-[#3a0f3b]' : 'bg-zinc-700 cursor-not-allowed'}`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Connect Slack
                  </a>
                </div>
              )}
            </div>

            {submitError && <p className="text-sm text-red-400 mb-4">{submitError}</p>}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => goToStep(4)} className="border-zinc-700 text-zinc-300">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canContinueStep5 || submitLoading}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              >
                {submitLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {slackConnected ? 'Create agent' : 'Create agent'}
              </Button>
            </div>
            {!slackConnected && (
              <p className="text-xs text-zinc-600 mt-3">
                Slack is optional — you can connect it later from the agent page.
              </p>
            )}
          </>
        )}

        <div className="mt-12">
          <Link href="/dashboard/agents" className="text-sm text-zinc-500 hover:text-zinc-400">
            ← Back to agents
          </Link>
        </div>
      </div>
    </div>
  )
}
