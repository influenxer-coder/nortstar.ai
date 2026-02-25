'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'

const STEPS = 4
const PURPLE = '#7C3AED'

function validateUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

type CrawlElement = {
  type: string
  text: string
  position: { x: number; y: number; width: number; height: number }
}

export default function CreateAgentFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stepParam = searchParams.get('step')
  const initialStep = Math.min(Math.max(1, parseInt(stepParam || '1', 10) || 1), STEPS)
  const [step, setStep] = useState(initialStep)

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState('')
  const [githubRepo, setGithubRepo] = useState('')
  const [posthogApiKey, setPosthogApiKey] = useState('')
  const [posthogProjectId, setPosthogProjectId] = useState('')
  const [posthogValid, setPosthogValid] = useState(false)
  const [posthogValidating, setPosthogValidating] = useState(false)
  const [posthogError, setPosthogError] = useState('')
  const [crawlLoading, setCrawlLoading] = useState(false)
  const [crawlError, setCrawlError] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [elements, setElements] = useState<CrawlElement[]>([])
  const [selectedElement, setSelectedElement] = useState<CrawlElement | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [screenshotScale, setScreenshotScale] = useState<{ scaleX: number; scaleY: number } | null>(null)
  const [githubRepos, setGithubRepos] = useState<{ full_name: string; name: string; private: boolean }[]>([])
  const [githubReposLoading, setGithubReposLoading] = useState(false)
  const [githubConnected, setGithubConnected] = useState(false)

  // Sync step from URL only (form state is preserved when navigating back)
  useEffect(() => {
    const s = searchParams.get('step')
    if (s) setStep(Math.min(STEPS, Math.max(1, parseInt(s, 10) || 1)))
  }, [searchParams])

  // Fetch GitHub repos when on step 2: after OAuth (github=connected) or when list empty (e.g. refresh)
  useEffect(() => {
    if (step !== 2) return
    const fromOAuth = searchParams.get('github') === 'connected'
    if (!fromOAuth && githubRepos.length > 0) return
    let cancelled = false
    setGithubReposLoading(true)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12_000)
    fetch('/api/github/repos', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setGithubRepos(data.repos ?? [])
        setGithubConnected(data.connected ?? false)
        if (fromOAuth) router.replace('/dashboard/agents/new?step=2', { scroll: false })
      })
      .catch(() => { /* timeout or network error — loading will stop in finally */ })
      .finally(() => {
        clearTimeout(timeoutId)
        if (!cancelled) setGithubReposLoading(false)
      })
    return () => { cancelled = true; controller.abort() }
  }, [step, searchParams.get('github'), router, githubRepos.length])

  const canContinueStep1 = name.trim() && url.trim() && validateUrl(url)
  const canContinueStep2 = !!githubRepo
  const canContinueStep3 = posthogValid
  const canContinueStep4 = !!selectedElement

  const handleValidateUrl = useCallback(() => {
    const u = url.trim()
    if (!u) {
      setUrlError('Enter a URL')
      return
    }
    if (!validateUrl(u)) {
      setUrlError('Enter a valid public URL (e.g. https://example.com)')
      return
    }
    setUrlError('')
  }, [url])

  const handlePosthogValidate = async () => {
    setPosthogValidating(true)
    setPosthogError('')
    try {
      const res = await fetch('/api/posthog/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posthog_api_key: posthogApiKey.trim(),
          posthog_project_id: posthogProjectId.trim(),
        }),
      })
      const data = await res.json()
      if (data.valid) {
        setPosthogValid(true)
        setPosthogError('')
      } else {
        setPosthogValid(false)
        setPosthogError(data.error || 'Validation failed')
      }
    } catch {
      setPosthogValid(false)
      setPosthogError('Could not validate connection')
    } finally {
      setPosthogValidating(false)
    }
  }

  const crawlPage = useCallback(async () => {
    if (!url.trim() || !validateUrl(url)) return
    setCrawlLoading(true)
    setCrawlError('')
    setScreenshot(null)
    setElements([])
    setSelectedElement(null)
    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCrawlError(data.error || "We couldn't crawl this page. Please check the URL is public and try again.")
        return
      }
      setScreenshot(data.screenshot || null)
      setElements(Array.isArray(data.elements) ? data.elements : [])
    } catch {
      setCrawlError("We couldn't crawl this page. Please check the URL is public and try again.")
    } finally {
      setCrawlLoading(false)
    }
  }, [url])

  useEffect(() => {
    if (step === 4 && url.trim() && validateUrl(url) && !screenshot && !crawlLoading) {
      crawlPage()
    }
  }, [step, url, crawlPage, screenshot, crawlLoading])

  const handleSubmit = async () => {
    if (!selectedElement || !name.trim() || !url.trim()) return
    setSubmitLoading(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          github_repo: githubRepo || undefined,
          posthog_api_key: posthogApiKey.trim() || undefined,
          posthog_project_id: posthogProjectId.trim() || undefined,
          target_element: {
            type: selectedElement.type,
            text: selectedElement.text,
            position: selectedElement.position,
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create agent')
      }
      router.push('/dashboard/agents')
      router.refresh()
    } catch (e) {
      setCrawlError(e instanceof Error ? e.message : 'Failed to create agent')
    } finally {
      setSubmitLoading(false)
    }
  }

  const goToStep = (s: number) => {
    setStep(s)
    router.replace(`/dashboard/agents/new?step=${s}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 py-10">
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

        {step === 1 && (
          <>
            <h1 className="text-2xl font-sans font-bold text-zinc-100 mb-2">Agent basics</h1>
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
                  onChange={(e) => { setUrl(e.target.value); setUrlError(''); }}
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

        {step === 2 && (
          <>
            <h1 className="text-2xl font-sans font-bold text-zinc-100 mb-2">Connect your codebase</h1>
            <p className="text-zinc-400 text-sm mb-6">We need read/write access to ship code changes.</p>
            <div className="space-y-6">
              {githubReposLoading ? (
                <div className="flex items-center gap-2 text-zinc-400 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading repositories…
                </div>
              ) : githubRepos.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-zinc-300">Choose repository</label>
                    <a
                      href={`/api/auth/github?next=${encodeURIComponent('/dashboard/agents/new?step=2')}`}
                      className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
                    >
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
              ) : (
                <a
                  href={`/api/auth/github?next=${encodeURIComponent('/dashboard/agents/new?step=2')}`}
                  className="inline-flex items-center justify-center rounded-md bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-11 px-6 text-sm font-medium"
                >
                  Connect GitHub
                </a>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => goToStep(1)}
                  className="border-zinc-700 text-zinc-300"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => goToStep(3)}
                  disabled={!canContinueStep2}
                  className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                >
                  Continue
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-2xl font-sans font-bold text-zinc-100 mb-2">Connect your analytics</h1>
            <p className="text-zinc-400 text-sm mb-6">We read user behavior signals to form hypotheses.</p>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">PostHog API key</label>
                <Input
                  type="password"
                  placeholder="phx_..."
                  value={posthogApiKey}
                  onChange={(e) => { setPosthogApiKey(e.target.value); setPosthogValid(false); }}
                  className="bg-zinc-900 border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">PostHog project ID</label>
                <Input
                  placeholder="Project ID"
                  value={posthogProjectId}
                  onChange={(e) => { setPosthogProjectId(e.target.value); setPosthogValid(false); }}
                  className="bg-zinc-900 border-zinc-700"
                />
              </div>
              <Button
                variant="outline"
                onClick={handlePosthogValidate}
                disabled={posthogValidating || !posthogApiKey.trim() || !posthogProjectId.trim()}
                className="border-zinc-700 text-zinc-300"
              >
                {posthogValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Validate connection
              </Button>
              {posthogValid && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle2 className="h-4 w-4" /> Connection valid
                </div>
              )}
              {posthogError && <p className="text-sm text-red-400">{posthogError}</p>}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => goToStep(2)} className="border-zinc-700 text-zinc-300">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => goToStep(4)}
                  disabled={!canContinueStep3}
                  className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                >
                  Continue
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="text-2xl font-sans font-bold text-zinc-100 mb-2">What do you want to improve?</h1>
            <p className="text-zinc-400 text-sm mb-6">We&apos;ll crawl your page and show you what we found.</p>

            {crawlLoading && (
              <div className="flex items-center gap-2 text-zinc-400 py-12">
                <Loader2 className="h-5 w-5 animate-spin" /> Crawling your page...
              </div>
            )}

            {crawlError && !crawlLoading && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-6">
                {crawlError}
              </div>
            )}

            {!crawlLoading && screenshot && (
              <>
                <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 mb-6">
                  <img
                    src={`data:image/png;base64,${screenshot}`}
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
                  {screenshotScale && elements.map((el, i) => (
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
                  {elements.map((el, i) => (
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

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => goToStep(3)} className="border-zinc-700 text-zinc-300">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canContinueStep4 || submitLoading}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              >
                {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create agent
              </Button>
            </div>
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
