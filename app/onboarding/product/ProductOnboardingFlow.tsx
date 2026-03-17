'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, ChevronRight, Plus, Trash2, ArrowLeft } from 'lucide-react'
import { buildReportMarkdown, type StrategyResultData } from './strategyReportBuilder'

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6

const STEP_LABELS = ['Product', 'NorthStar', 'ICP', 'Growth Levers', 'Data Sources', 'Review']

const METRIC_SUGGESTIONS = [
  'ARR', 'MRR', 'MAU', 'WAU', 'DAU',
  'Activation Rate', 'Trial-to-Paid %', 'D30 Retention', 'NPS Score',
  'Paywall Conversion', 'Feature Adoption Rate',
]

const ROLE_SUGGESTIONS = [
  'Founder / CEO', 'VP of Product', 'Product Manager', 'Head of Growth',
  'VP Engineering', 'CTO', 'Marketing Lead', 'Sales Lead',
]

const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–1000', '1000+']

const INDUSTRIES = [
  'B2B SaaS', 'PLG SaaS', 'Marketplace', 'Fintech', 'HR Tech',
  'Dev Tools', 'E-commerce', 'Consumer', 'Enterprise Software', 'Other',
]

const SUB_METRIC_PRESETS: Record<string, string[]> = {
  ARR: ['Activation Rate', 'Trial-to-Paid %', 'Expansion MRR', 'Churn Rate'],
  MRR: ['Activation Rate', 'Trial-to-Paid %', 'Expansion MRR', 'Churn Rate'],
  MAU: ['D7 Retention', 'D30 Retention', 'Feature Adoption', 'Session Frequency'],
  WAU: ['D7 Retention', 'D30 Retention', 'Feature Adoption', 'Session Frequency'],
  DAU: ['D7 Retention', 'D30 Retention', 'Feature Adoption', 'Session Depth'],
  'Activation Rate': ['Session-1 Completion', 'Time-to-Value (hrs)', 'Week-1 Retention', 'Feature Depth'],
  'Trial-to-Paid %': ['Trial Activation Rate', 'Paywall Hit Rate', 'Checkout CVR', 'Trial Length'],
  'D30 Retention': ['D7 Retention', 'Session Frequency', 'Feature Breadth', 'Support Ticket Volume'],
  'NPS Score': ['Detractor Rate', 'Feature Satisfaction', 'Support CSAT', 'Response Rate'],
}

const ANALYTICS_TOOLS = [
  { id: 'posthog', name: 'PostHog', initials: 'PH', color: '#f97316', recommended: true,
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'phx_...' },
      { key: 'project_id', label: 'Project ID', type: 'text', placeholder: '12345' },
    ],
  },
  { id: 'amplitude', name: 'Amplitude', initials: 'AM', color: '#0ea5e9',
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'your-api-key' }],
  },
  { id: 'mixpanel', name: 'Mixpanel', initials: 'MX', color: '#6366f1',
    fields: [{ key: 'project_token', label: 'Project Token', type: 'password', placeholder: 'abc123...' }],
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type SubMetric = { name: string; current: string; target: string }

type DriveFile = {
  id: string
  name: string
  mimeType: string
  webViewLink: string
  modifiedTime: string
  iconLink?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function domainFromUrl(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    const host = u.hostname.replace(/^www\./, '')
    return host.split('.')[0] || 'My Product'
  } catch {
    return 'My Product'
  }
}

function validateUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch { return false }
}

async function extractStrategyDocText(file: File): Promise<string> {
  const name = (file.name || '').toLowerCase()
  if (name.endsWith('.txt') || name.endsWith('.md')) {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve((r.result as string) ?? '')
      r.onerror = () => reject(new Error('Failed to read file'))
      r.readAsText(file, 'utf-8')
    })
  }
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/extract-doc-text', { method: 'POST', body: form })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error ?? 'Failed to extract text')
  }
  const j = await res.json()
  return j.text ?? ''
}

// ─── Agent stream (NDJSON) ────────────────────────────────────────────────────
type AgentEvent =
  | { type: 'log'; message?: string; content?: string }
  | { type: 'result'; data: unknown }
  | { type: 'error'; message?: string }

async function runAgentStream({
  url,
  description = '',
  strategy_doc = '',
  onLog,
  onResult,
  onError,
  signal,
}: {
  url: string
  description?: string
  strategy_doc?: string
  onLog: (msg: string) => void
  onResult: (data: unknown) => void
  onError: (msg: string) => void
  signal?: AbortSignal
}): Promise<void> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  if (!agentUrl) throw new Error('Agent URL not configured (NEXT_PUBLIC_AGENT_URL).')

  const res = await fetch(agentUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ url, description, strategy_doc: strategy_doc || undefined }),
  })

  if (!res.ok || !res.body) throw new Error(res.status === 0 ? 'Connection lost' : `Request failed (${res.status})`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      let event: AgentEvent | null = null
      try {
        event = JSON.parse(line) as AgentEvent
      } catch {
        continue
      }
      if (event.type === 'log') {
        const msg = event.message ?? event.content ?? ''
        if (msg) onLog(msg)
      }
      if (event.type === 'result') onResult(event.data)
      if (event.type === 'error') onError(event.message ?? 'Unknown error')
    }
  }
  if (buffer.trim()) {
    try {
      const event = JSON.parse(buffer.trim()) as AgentEvent
      if (event.type === 'log') {
        const msg = event.message ?? event.content ?? ''
        if (msg) onLog(msg)
      }
      if (event.type === 'result') onResult(event.data)
      if (event.type === 'error') onError(event.message ?? 'Unknown error')
    } catch {
      // ignore incomplete final line
    }
  }
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-start gap-0 select-none">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  done
                    ? 'bg-[#22c55e] text-white'
                    : active
                    ? 'bg-[#4f8ef7] text-white'
                    : 'bg-[#1f1f1f] text-[#444] border border-[#2a2a2a]'
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap hidden sm:block ${
                  active ? 'text-[#4f8ef7]' : done ? 'text-[#22c55e]' : 'text-[#444]'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`h-px w-8 sm:w-12 mx-1 mt-3.5 transition-colors ${
                  done ? 'bg-[#22c55e]' : 'bg-[#2a2a2a]'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Input primitives ─────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-[14px] py-3 text-[14px] text-[#f0f0f0] placeholder:text-zinc-500 focus:outline-none focus:border-[#4f8ef7] transition-[border-color] duration-150 disabled:opacity-50'
const labelCls = 'block text-[11px] text-[#888] uppercase tracking-[0.08em] mb-1.5'

function ContinueBtn({ label = 'Continue →', disabled, loading }: { label?: string; disabled?: boolean; loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={`w-full h-11 rounded-lg text-sm font-medium transition-colors duration-150 mt-8 disabled:opacity-40 disabled:cursor-not-allowed ${loading ? 'animate-pulse' : ''}`}
      style={{
        background: !disabled && !loading ? '#4f8ef7' : '#1a1a2a',
        color: !disabled && !loading ? '#fff' : '#888',
      }}
    >
      {loading ? 'Saving...' : label}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProductOnboardingFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectIdParam = searchParams.get('projectId')
  const stepParam = searchParams.get('step')

  const [step, setStep] = useState(Math.min(TOTAL_STEPS, Math.max(1, parseInt(stepParam || '1', 10) || 1)))
  const [projectId, setProjectId] = useState<string | null>(projectIdParam)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const resumedRef = useRef(false)

  // ── Step 1 ─────────────────────────────────────────────────────────────────
  const [productUrl, setProductUrl] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Step 1 sub-states: form → streaming → report (no navigation)
  type Step1Screen = 'form' | 'streaming' | 'report'
  const [step1Screen, setStep1Screen] = useState<Step1Screen>('form')
  const [step1CurrentStatus, setStep1CurrentStatus] = useState('')
  const [step1Logs, setStep1Logs] = useState<string[]>([])
  const [step1Running, setStep1Running] = useState(false)
  const [step1Elapsed, setStep1Elapsed] = useState(0)
  const [step1Result, setStep1Result] = useState<StrategyResultData | null>(null)
  const [step1Error, setStep1Error] = useState('')
  const [step1ReportMd, setStep1ReportMd] = useState('')
  const [strategyReportResult, setStrategyReportResult] = useState<StrategyResultData | null>(null)
  const [step1DetailsOpen, setStep1DetailsOpen] = useState(false)
  const step1AbortRef = useRef<AbortController | null>(null)
  const step1ElapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // doc source tab: 'upload' | 'url' | 'drive'
  const [docTab, setDocTab] = useState<'upload' | 'url' | 'drive'>('upload')
  // Google Drive
  const [driveConnected, setDriveConnected] = useState(false)
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [driveLoading, setDriveLoading] = useState(false)
  const [driveSearch, setDriveSearch] = useState('')
  const [selectedDriveFile, setSelectedDriveFile] = useState<DriveFile | null>(null)

  // ── Step 2 ─────────────────────────────────────────────────────────────────
  const [nsMetric, setNsMetric] = useState('')
  const [nsCurrent, setNsCurrent] = useState('')
  const [nsTarget, setNsTarget] = useState('')

  // ── Step 3 ─────────────────────────────────────────────────────────────────
  const [icpRole, setIcpRole] = useState('')
  const [icpSizes, setIcpSizes] = useState<string[]>([])
  const [icpIndustry, setIcpIndustry] = useState('')
  const [icpPain, setIcpPain] = useState(['', '', ''])

  // ── Step 4 ─────────────────────────────────────────────────────────────────
  const [subMetrics, setSubMetrics] = useState<SubMetric[]>([])

  // ── Step 5 ─────────────────────────────────────────────────────────────────
  const [analyticsInputs, setAnalyticsInputs] = useState<Record<string, Record<string, string>>>({})
  const [analyticsConnected, setAnalyticsConnected] = useState<Record<string, boolean>>({})
  const [analyticsValidating, setAnalyticsValidating] = useState<Record<string, boolean>>({})
  const [analyticsErrors, setAnalyticsErrors] = useState<Record<string, string>>({})
  const [selectedTool, setSelectedTool] = useState<string | null>('posthog')

  // ── Google Drive: handle OAuth return ─────────────────────────────────────
  useEffect(() => {
    const gd = searchParams.get('google_drive')
    const gdError = searchParams.get('error')
    if (gd === 'connected') {
      setDriveConnected(true)
      setDocTab('drive')
      // Strip the query param from URL
      const pid = searchParams.get('projectId')
      const s = searchParams.get('step') ?? '1'
      const clean = pid
        ? `/onboarding/product?projectId=${pid}&step=${s}`
        : `/onboarding/product?step=${s}`
      router.replace(clean, { scroll: false })
    } else if (gdError && searchParams.get('source') === 'drive') {
      setError('Could not connect Google Drive. Try again.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Google Drive: check existing connection on mount ───────────────────────
  useEffect(() => {
    fetch('/api/drive/files')
      .then((r) => r.json())
      .then((d: { connected: boolean; files: DriveFile[] }) => {
        if (d.connected) {
          setDriveConnected(true)
          setDriveFiles(d.files ?? [])
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Google Drive: fetch files (called on tab open + search) ───────────────
  const fetchDriveFiles = useCallback((q: string) => {
    setDriveLoading(true)
    fetch(`/api/drive/files?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d: { connected: boolean; files: DriveFile[] }) => {
        setDriveFiles(d.files ?? [])
      })
      .catch(() => {})
      .finally(() => setDriveLoading(false))
  }, [])

  // ── Resume from DB ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectIdParam || resumedRef.current) return
    resumedRef.current = true
    fetch(`/api/projects/${projectIdParam}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return
        if (d.url) setProductUrl(d.url)
        if (d.doc_url) setDocUrl(d.doc_url)
        if (d.north_star_metric) setNsMetric(d.north_star_metric)
        if (d.north_star_current) setNsCurrent(d.north_star_current)
        if (d.north_star_target) setNsTarget(d.north_star_target)
        if (d.icp?.role) setIcpRole(d.icp.role)
        if (d.icp?.sizes) setIcpSizes(d.icp.sizes)
        if (d.icp?.industry) setIcpIndustry(d.icp.industry)
        if (d.icp?.pain_points) setIcpPain(d.icp.pain_points)
        if (Array.isArray(d.sub_metrics) && d.sub_metrics.length > 0) setSubMetrics(d.sub_metrics)
        const resumeStep = Math.min(TOTAL_STEPS, Math.max(1, (d.onboarding_step ?? 1)))
        setStep(resumeStep)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectIdParam])

  // ── Auto-populate sub-metrics when northstar changes ──────────────────────
  useEffect(() => {
    if (!nsMetric || subMetrics.length > 0) return
    const key = Object.keys(SUB_METRIC_PRESETS).find((k) =>
      nsMetric.toLowerCase().includes(k.toLowerCase())
    )
    if (key) {
      setSubMetrics(SUB_METRIC_PRESETS[key].map((name) => ({ name, current: '', target: '' })))
    } else {
      setSubMetrics([
        { name: 'Activation Rate', current: '', target: '' },
        { name: 'D30 Retention', current: '', target: '' },
        { name: 'Conversion Rate', current: '', target: '' },
      ])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nsMetric])

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const goToStep = useCallback((n: number, pid?: string) => {
    setStep(n)
    const id = pid ?? projectId
    const base = id
      ? `/onboarding/product?projectId=${id}&step=${n}`
      : `/onboarding/product?step=${n}`
    router.replace(base, { scroll: false })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [projectId, router])

  const patch = useCallback(async (fields: Record<string, unknown>) => {
    if (!projectId) return
    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
  }, [projectId])

  // ── Step 1: submit → stream logs → report ───────────────────────────────────
  const runStep1Stream = useCallback(async () => {
    const url = productUrl.trim()
    if (!url) return
    setError('')
    setStep1Error('')
    setStep1Screen('streaming')
    setStep1CurrentStatus('Connecting…')
    setStep1Logs([])
    setStep1Running(true)
    setStep1Elapsed(0)
    setStep1Result(null)
    setStep1ReportMd('')

    let strategyDocText = ''
    if (docFile) {
      try {
        strategyDocText = await extractStrategyDocText(docFile)
      } catch (err) {
        setStep1Error(err instanceof Error ? err.message : 'Failed to extract document text')
        setStep1Screen('form')
        setStep1Running(false)
        return
      }
    }

    const controller = new AbortController()
    step1AbortRef.current = controller
    const start = Date.now()
    step1ElapsedIntervalRef.current = setInterval(() => {
      setStep1Elapsed((t) => Math.floor((Date.now() - start) / 1000))
    }, 1000)

    const stopRunning = () => {
      setStep1Running(false)
      clearInterval(step1ElapsedIntervalRef.current ?? undefined)
      step1ElapsedIntervalRef.current = null
      step1AbortRef.current = null
    }

    try {
      await runAgentStream({
        url,
        description: productDescription.trim(),
        strategy_doc: strategyDocText,
        signal: controller.signal,
        onLog: (msg) => {
          setStep1CurrentStatus(msg)
          setStep1Logs((prev) => [...prev, msg])
        },
        onResult: (data) => {
          stopRunning()
          const d = data as StrategyResultData
          setStep1Result(d)
          setStep1ReportMd(buildReportMarkdown(d))
          setStep1Screen('report')
        },
        onError: (msg) => {
          if (msg.includes('Could not parse model output as JSON') && msg.includes('Raw output')) {
            const jsonMatch = msg.match(/```\s*\n?([\s\S]*?)\n?```/)
            if (jsonMatch) {
              try {
                const data = JSON.parse(jsonMatch[1].trim()) as StrategyResultData
                if (data && (data.input_product != null || data.ranked_opportunities != null)) {
                  stopRunning()
                  setStep1Result(data)
                  setStep1ReportMd(buildReportMarkdown(data))
                  setStep1Screen('report')
                  return
                }
              } catch {
                /* fall through */
              }
            }
          }
          stopRunning()
          setStep1Error(msg)
          setStep1Screen('form')
        },
      })
    } catch (err) {
      stopRunning()
      if ((err as Error).name === 'AbortError') {
        setStep1Screen('form')
      } else {
        setStep1Error(err instanceof Error ? err.message : 'Connection lost — try again')
        setStep1Screen('form')
      }
    }
  }, [productUrl, productDescription, docFile])

  const cancelStep1Stream = useCallback(() => {
    step1AbortRef.current?.abort()
    setStep1Running(false)
    setStep1Screen('form')
  }, [])

  const handleStep1ContinueToOnboarding = useCallback(async () => {
    if (!step1Result) return
    setStrategyReportResult(step1Result)
    setSaving(true)
    setError('')
    try {
      const name = step1Result.input_product?.name || domainFromUrl(productUrl.trim()) || 'My Product'
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          url: productUrl.trim() || null,
          has_doc: !!docFile,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create project')
      const pid = data.id as string
      setProjectId(pid)
      if (typeof localStorage !== 'undefined') localStorage.setItem('northstar_current_project_id', pid)
      goToStep(2, pid)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }, [step1Result, productUrl, docFile, goToStep])

  // Keep legacy handleStep1 for any non-stream path (e.g. if agent URL missing we already handle in runStep1Stream)
  const handleStep1 = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!productUrl.trim()) return
      runStep1Stream()
    },
    [productUrl, runStep1Stream]
  )

  // ── Step 2: submit ─────────────────────────────────────────────────────────
  const handleStep2 = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nsMetric.trim()) return
    setSaving(true)
    try {
      await patch({ north_star_metric: nsMetric.trim(), north_star_current: nsCurrent.trim(), north_star_target: nsTarget.trim(), onboarding_step: 2 })
      goToStep(3)
    } catch { setError('Failed to save') }
    finally { setSaving(false) }
  }, [nsMetric, nsCurrent, nsTarget, patch, goToStep])

  // ── Step 3: submit ─────────────────────────────────────────────────────────
  const handleStep3 = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!icpRole.trim()) return
    setSaving(true)
    try {
      await patch({
        icp: { role: icpRole.trim(), sizes: icpSizes, industry: icpIndustry, pain_points: icpPain.filter(Boolean) },
        onboarding_step: 3,
      })
      goToStep(4)
    } catch { setError('Failed to save') }
    finally { setSaving(false) }
  }, [icpRole, icpSizes, icpIndustry, icpPain, patch, goToStep])

  // ── Step 4: submit ─────────────────────────────────────────────────────────
  const handleStep4 = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await patch({ sub_metrics: subMetrics.filter((m) => m.name.trim()), onboarding_step: 4 })
      goToStep(5)
    } catch { setError('Failed to save') }
    finally { setSaving(false) }
  }, [subMetrics, patch, goToStep])

  // ── Step 5: connect analytics ──────────────────────────────────────────────
  const handleValidateAnalytics = useCallback(async (toolId: string) => {
    const creds = analyticsInputs[toolId]
    if (!creds) return
    setAnalyticsValidating((v) => ({ ...v, [toolId]: true }))
    setAnalyticsErrors((e) => ({ ...e, [toolId]: '' }))
    try {
      const res = await fetch('/api/analytics/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolId, credentials: creds }),
      })
      const d = await res.json()
      if (d.valid) {
        setAnalyticsConnected((c) => ({ ...c, [toolId]: true }))
      } else {
        setAnalyticsErrors((e) => ({ ...e, [toolId]: d.error ?? 'Invalid credentials' }))
      }
    } catch {
      setAnalyticsErrors((e) => ({ ...e, [toolId]: 'Connection failed' }))
    } finally {
      setAnalyticsValidating((v) => ({ ...v, [toolId]: false }))
    }
  }, [analyticsInputs])

  const handleStep5 = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await patch({ analytics_config: analyticsInputs, onboarding_step: 5 })
      goToStep(6)
    } catch { setError('Failed to save') }
    finally { setSaving(false) }
  }, [analyticsInputs, patch, goToStep])

  // ── Step 6: launch ─────────────────────────────────────────────────────────
  const handleLaunch = useCallback(async () => {
    setSaving(true)
    try {
      await patch({ onboarding_completed: true, onboarding_step: 6 })
      if (typeof localStorage !== 'undefined') localStorage.removeItem('northstar_current_project_id')
      router.push('/dashboard')
    } catch { setError('Failed to launch') }
    finally { setSaving(false) }
  }, [patch, router])

  // ── Drag & drop for step 1 strategy doc ────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && /\.(pdf|txt|md|docx)$/i.test(f.name)) setDocFile(f)
  }, [])
  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), [])

  // ── Step 1 log panel: auto-scroll to bottom unless user scrolled up ─────────
  useEffect(() => {
    if (step1Screen !== 'streaming' || step1UserScrolledRef.current || !step1LogPanelRef.current) return
    step1LogPanelRef.current.scrollTop = step1LogPanelRef.current.scrollHeight
  }, [step1Screen, step1Logs])

  // ── Can-continue guards ────────────────────────────────────────────────────
  const can1 = productUrl.trim() !== ''
  const can2 = !!nsMetric.trim()
  const can3 = !!icpRole.trim()
  // steps 4, 5 are always continuable (sub-metrics and analytics are optional)

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0f0f0]">
      <div className="max-w-[600px] mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-[#555] hover:text-[#888] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to dashboard
          </Link>
          <StepBar current={step} />
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ── Step 1: Your Product (form → streaming → report) ───────────────── */}
        {step === 1 && step1Screen === 'form' && (
          <form onSubmit={handleStep1}>
            <p className="text-xs text-[#4f8ef7] uppercase tracking-widest font-medium mb-2">Step 1 of 6</p>
            <h1 className="text-2xl font-semibold text-[#f0f0f0] mb-1">Tell NorthStar about your product</h1>
            <p className="text-sm text-[#666] mb-8">
              Share your product URL and optional strategy doc. NorthStar will analyze and produce a strategy report.
            </p>

            {step1Error && (
              <div className="mb-5 rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-400 flex flex-wrap items-center justify-between gap-2">
                <span>{step1Error}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep1Error('')} className="text-red-300 hover:text-white underline text-xs">Dismiss</button>
                  <button type="button" onClick={() => { setStep1Error(''); runStep1Stream() }} className="text-xs font-medium text-red-300 hover:text-white underline">Try again</button>
                </div>
              </div>
            )}

            <div className="mb-5">
              <label htmlFor="product-url" className={labelCls}>Product URL</label>
              <input
                id="product-url"
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://yourproduct.com"
                className={inputCls}
                autoFocus
                required
              />
            </div>

            <div className="mb-5">
              <label htmlFor="product-description" className={labelCls}>Product description <span className="text-[#444] normal-case">(optional)</span></label>
              <textarea
                id="product-description"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Describe your product, who it's for, and what problem it solves. Include anything not obvious from the URL."
                rows={4}
                className={inputCls + ' resize-y min-h-[100px]'}
              />
            </div>

            <div className="mb-6">
              <label className={labelCls}>Upload strategy doc (optional)</label>
              <p className="text-[11px] text-[#555] mb-2">PRD, positioning doc, ICP notes — the agent will use this as additional context</p>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => !docFile && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && !docFile && fileInputRef.current?.click()}
                className="rounded-lg border border-dashed border-[#2a2a2a] p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#3a3a3a] transition-colors"
                style={{ background: '#0d0d0d' }}
              >
                {docFile ? (
                  <div className="flex items-center justify-between w-full gap-2 text-sm text-[#f0f0f0]">
                    <span className="truncate">{docFile.name}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setDocFile(null) }} className="shrink-0 text-[#666] hover:text-[#f0f0f0] px-1.5 py-0.5 rounded border border-[#2a2a2a]">× Remove</button>
                  </div>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#444]">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p className="text-sm text-[#666]">Drop .pdf, .txt, .md, or .docx</p>
                    <p className="text-xs text-[#444]">or click to browse</p>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.docx" className="hidden" aria-hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setDocFile(f) }} />
            </div>

            <button
              type="submit"
              disabled={!can1}
              className="w-full h-11 rounded-lg text-sm font-medium transition-colors duration-150 mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: can1 ? '#4f8ef7' : '#1a1a2a', color: can1 ? '#fff' : '#888' }}
            >
              Analyze my product →
            </button>
          </form>
        )}

        {step === 1 && step1Screen === 'streaming' && (
          <div className="py-8">
            <p className="text-xs text-[#4f8ef7] uppercase tracking-widest font-medium mb-6">Step 1 of 6</p>

            {/* Top row: pulsing dot + one-line current status */}
            <div className="flex items-center gap-3 mb-2">
              {step1Running ? (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-[#4f8ef7] animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#4f8ef7] animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#4f8ef7] animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-[#22c55e] shrink-0" />
              )}
              <p className="text-sm text-[#a0a0a0] min-h-[1.25rem] truncate flex-1">
                {step1CurrentStatus || 'Researching your product…'}
              </p>
            </div>
            <p className="text-xs text-[#555] mb-4">{step1Elapsed}s</p>

            {/* Collapsible Details: full log history */}
            {step1Logs.length > 0 && (
              <div className="mb-4 rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setStep1DetailsOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs text-[#666] hover:text-[#a0a0a0] hover:bg-[#1a1a1a] transition-colors"
                >
                  <span>Details</span>
                  <span className="text-[#444]">{step1DetailsOpen ? '▼' : '▶'}</span>
                </button>
                {step1DetailsOpen && (
                  <div className="max-h-48 overflow-y-auto border-t border-[#2a2a2a] p-3 font-mono text-[12px] text-[#666] leading-relaxed space-y-0.5">
                    {step1Logs.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={cancelStep1Stream}
              className="py-2.5 px-5 text-sm text-[#666] hover:text-[#f0f0f0] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {step === 1 && step1Screen === 'report' && (
          <div>
            <p className="text-xs text-[#4f8ef7] uppercase tracking-widest font-medium mb-2">Step 1 of 6</p>
            <h2 className="text-xl font-semibold text-[#f0f0f0] mb-6">Strategy report</h2>

            <div className="rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] p-6 mb-6 prose prose-invert prose-sm max-w-none prose-p:text-[#e0e0e0] prose-headings:text-[#f0f0f0] prose-strong:text-[#f0f0f0] prose-li:text-[#e0e0e0]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{step1ReportMd}</ReactMarkdown>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  const name = (step1Result?.input_product?.name ?? 'product').replace(/[^a-z0-9-_]/gi, '-').toLowerCase()
                  const date = new Date().toISOString().slice(0, 10)
                  const filename = `northstar-strategy-${name}-${date}.md`
                  const blob = new Blob([step1ReportMd], { type: 'text/markdown' })
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download = filename
                  a.click()
                  URL.revokeObjectURL(a.href)
                }}
                className="flex-1 py-3 px-4 rounded-lg text-sm font-medium border border-[#2a2a2a] text-[#f0f0f0] hover:border-[#3a3a3a] hover:bg-[#1a1a1a] transition-colors"
              >
                Download report
              </button>
              <button
                type="button"
                onClick={handleStep1ContinueToOnboarding}
                className="flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: '#4f8ef7', color: '#fff' }}
              >
                Continue to onboarding →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: NorthStar Metric ─────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleStep2}>
            <p className="text-xs text-[#4f8ef7] uppercase tracking-widest font-medium mb-2">Step 2 of 6</p>
            <h1 className="text-2xl font-semibold text-[#f0f0f0] mb-1">What&apos;s your NorthStar metric?</h1>
            <p className="text-sm text-[#666] mb-8">
              The one number your entire team is building toward. NorthStar will score every hypothesis against this.
            </p>

            <div className="mb-5">
              <label className={labelCls}>Metric name</label>
              <input
                type="text"
                value={nsMetric}
                onChange={(e) => setNsMetric(e.target.value)}
                placeholder="e.g. ARR, Activation Rate, D30 Retention"
                className={inputCls}
                autoFocus
                disabled={saving}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {METRIC_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNsMetric(s)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      nsMetric === s
                        ? 'border-[#4f8ef7] bg-[#4f8ef7]/10 text-[#4f8ef7]'
                        : 'border-[#2a2a2a] text-[#555] hover:text-[#888] hover:border-[#3a3a3a]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className={labelCls}>Current value</label>
                <input type="text" value={nsCurrent} onChange={(e) => setNsCurrent(e.target.value)}
                  placeholder='e.g. "$450K" or "23%"' className={inputCls} disabled={saving} />
              </div>
              <div>
                <label className={labelCls}>90-day target</label>
                <input type="text" value={nsTarget} onChange={(e) => setNsTarget(e.target.value)}
                  placeholder='e.g. "$700K" or "35%"' className={inputCls} disabled={saving} />
              </div>
            </div>

            <ContinueBtn disabled={!can2} loading={saving} />
            <BackBtn onClick={() => goToStep(1)} />
          </form>
        )}

        {/* ── Step 3: ICP ───────────────────────────────────────────────────── */}
        {step === 3 && (
          <form onSubmit={handleStep3}>
            <p className="text-xs text-[#4f8ef7] uppercase tracking-widest font-medium mb-2">Step 3 of 6</p>
            <h1 className="text-2xl font-semibold text-[#f0f0f0] mb-1">Who are you building for?</h1>
            <p className="text-sm text-[#666] mb-8">
              Your ICP shapes how NorthStar interprets behavioral signals and scores hypotheses.
            </p>

            <div className="mb-5">
              <label className={labelCls}>Primary buyer role</label>
              <input type="text" value={icpRole} onChange={(e) => setIcpRole(e.target.value)}
                placeholder="e.g. VP of Product, Founder, PM" className={inputCls} autoFocus disabled={saving} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ROLE_SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => setIcpRole(s)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      icpRole === s ? 'border-[#4f8ef7] bg-[#4f8ef7]/10 text-[#4f8ef7]' : 'border-[#2a2a2a] text-[#555] hover:text-[#888] hover:border-[#3a3a3a]'
                    }`}>{s}</button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className={labelCls}>Company size</label>
              <div className="flex flex-wrap gap-2">
                {COMPANY_SIZES.map((s) => (
                  <button key={s} type="button"
                    onClick={() => setIcpSizes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      icpSizes.includes(s) ? 'border-[#4f8ef7] bg-[#4f8ef7]/10 text-[#4f8ef7]' : 'border-[#2a2a2a] text-[#555] hover:text-[#888]'
                    }`}
                  >{s} employees</button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label htmlFor="icp-industry" className={labelCls}>Industry</label>
              <select id="icp-industry" value={icpIndustry} onChange={(e) => setIcpIndustry(e.target.value)}
                className={inputCls + ' appearance-none'} disabled={saving}>
                <option value="">Select industry...</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div className="mb-5">
              <label className={labelCls}>Top pain points <span className="text-[#444] normal-case">(optional)</span></label>
              {icpPain.map((p, i) => (
                <input key={i} type="text" value={p} onChange={(e) => setIcpPain((prev) => prev.map((x, j) => j === i ? e.target.value : x))}
                  placeholder={`Pain point ${i + 1}`} className={inputCls + ' mb-2'} disabled={saving} />
              ))}
            </div>

            <ContinueBtn disabled={!can3} loading={saving} />
            <BackBtn onClick={() => goToStep(2)} />
          </form>
        )}

        {/* ── Step 4: Growth Levers ─────────────────────────────────────────── */}
        {step === 4 && (
          <form onSubmit={handleStep4}>
            <p className="text-xs text-[#4f8ef7] uppercase tracking-widest font-medium mb-2">Step 4 of 6</p>
            <h1 className="text-2xl font-semibold text-[#f0f0f0] mb-1">What moves your NorthStar?</h1>
            <p className="text-sm text-[#666] mb-2">
              Sub-metrics that ladder up to <span className="text-[#f0f0f0] font-medium">{nsMetric || 'your NorthStar'}</span>.
              NorthStar uses these to rank hypotheses by predicted impact.
            </p>
            <p className="text-xs text-[#444] mb-8">Pre-populated based on your metric — edit freely.</p>

            <div className="space-y-3 mb-5">
              {subMetrics.map((m, i) => (
                <div key={i} className="rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <input type="text" value={m.name} onChange={(e) => setSubMetrics((prev) => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      placeholder="Metric name" className="flex-1 bg-transparent border-b border-[#2a2a2a] pb-1 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#4f8ef7]" />
                    <button type="button" onClick={() => setSubMetrics((prev) => prev.filter((_, j) => j !== i))}
                      className="text-[#444] hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">Current</label>
                      <input type="text" value={m.current} onChange={(e) => setSubMetrics((prev) => prev.map((x, j) => j === i ? { ...x, current: e.target.value } : x))}
                        placeholder="e.g. 24%" className="w-full bg-transparent border-b border-[#2a2a2a] pb-1 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#4f8ef7]" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">Target</label>
                      <input type="text" value={m.target} onChange={(e) => setSubMetrics((prev) => prev.map((x, j) => j === i ? { ...x, target: e.target.value } : x))}
                        placeholder="e.g. 35%" className="w-full bg-transparent border-b border-[#2a2a2a] pb-1 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#4f8ef7]" />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setSubMetrics((prev) => [...prev, { name: '', current: '', target: '' }])}
                className="w-full rounded-lg border border-dashed border-[#2a2a2a] py-3 text-xs text-[#555] hover:text-[#888] hover:border-[#3a3a3a] flex items-center justify-center gap-2 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add sub-metric
              </button>
            </div>

            <ContinueBtn loading={saving} />
            <BackBtn onClick={() => goToStep(3)} />
          </form>
        )}

        {/* ── Step 5: Data Sources ──────────────────────────────────────────── */}
        {step === 5 && (
          <form onSubmit={handleStep5}>
            <p className="text-xs text-[#4f8ef7] uppercase tracking-widest font-medium mb-2">Step 5 of 6</p>
            <h1 className="text-2xl font-semibold text-[#f0f0f0] mb-1">Connect your behavioral data</h1>
            <p className="text-sm text-[#666] mb-8">
              NorthStar reads your analytics to surface activation patterns, drop-off points, and retention signals.
              You can skip this and connect later.
            </p>

            {/* Tool selector */}
            <div className="flex gap-2 mb-5">
              {ANALYTICS_TOOLS.map((tool) => (
                <button key={tool.id} type="button"
                  onClick={() => setSelectedTool(selectedTool === tool.id ? null : tool.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
                    analyticsConnected[tool.id]
                      ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]'
                      : selectedTool === tool.id
                      ? 'border-[#4f8ef7] bg-[#4f8ef7]/10 text-[#4f8ef7]'
                      : 'border-[#2a2a2a] text-[#555] hover:text-[#888]'
                  }`}
                >
                  <div className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center" style={{ background: tool.color, color: '#fff' }}>{tool.initials}</div>
                  {tool.name}
                  {tool.recommended && !analyticsConnected[tool.id] && <span className="text-[9px] text-[#f97316] uppercase tracking-wide">rec</span>}
                  {analyticsConnected[tool.id] && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>

            {/* Credential fields for selected tool */}
            {selectedTool && !analyticsConnected[selectedTool] && (() => {
              const tool = ANALYTICS_TOOLS.find((t) => t.id === selectedTool)
              if (!tool) return null
              return (
                <div className="rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] p-4 mb-4">
                  {tool.fields.map((f) => (
                    <div key={f.key} className="mb-3">
                      <label className={labelCls}>{f.label}</label>
                      <input
                        type={f.type}
                        value={analyticsInputs[tool.id]?.[f.key] ?? ''}
                        onChange={(e) => setAnalyticsInputs((prev) => ({ ...prev, [tool.id]: { ...(prev[tool.id] ?? {}), [f.key]: e.target.value } }))}
                        placeholder={f.placeholder}
                        className={inputCls}
                      />
                    </div>
                  ))}
                  {analyticsErrors[tool.id] && (
                    <p className="text-xs text-red-400 mb-3">{analyticsErrors[tool.id]}</p>
                  )}
                  <button type="button" onClick={() => handleValidateAnalytics(tool.id)}
                    disabled={analyticsValidating[tool.id]}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#4f8ef7]/10 border border-[#4f8ef7]/40 text-[#4f8ef7] hover:bg-[#4f8ef7]/20 transition-colors disabled:opacity-50">
                    {analyticsValidating[tool.id] ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              )
            })()}

            <div className="mt-2">
              <ContinueBtn label="Continue →" loading={saving} />
            </div>

            <button type="button" onClick={() => goToStep(6)}
              className="w-full mt-2 py-2.5 text-sm text-[#444] hover:text-[#666] transition-colors">
              Skip for now
            </button>
            <BackBtn onClick={() => goToStep(4)} />
          </form>
        )}

        {/* ── Step 6: Review & Launch ───────────────────────────────────────── */}
        {step === 6 && (
          <div>
            <p className="text-xs text-[#4f8ef7] uppercase tracking-widest font-medium mb-2">Step 6 of 6</p>
            <h1 className="text-2xl font-semibold text-[#f0f0f0] mb-1">You&apos;re ready to launch</h1>
            <p className="text-sm text-[#666] mb-8">
              Here&apos;s what NorthStar knows about your product. Your intelligence layer is now active.
            </p>

            <div className="space-y-3 mb-8">
              <ReviewRow label="Product URL" value={productUrl || '—'} onEdit={() => goToStep(1)} />
              <ReviewRow label="NorthStar Metric" value={nsMetric || '—'} onEdit={() => goToStep(2)}>
                {nsCurrent && nsTarget && (
                  <p className="text-xs text-[#555] mt-0.5">{nsCurrent} → {nsTarget}</p>
                )}
              </ReviewRow>
              <ReviewRow label="ICP" value={icpRole || '—'} onEdit={() => goToStep(3)}>
                {(icpSizes.length > 0 || icpIndustry) && (
                  <p className="text-xs text-[#555] mt-0.5">
                    {[icpIndustry, icpSizes.join(', ')].filter(Boolean).join(' · ')}
                  </p>
                )}
              </ReviewRow>
              <ReviewRow label="Growth levers" value={subMetrics.filter((m) => m.name).length > 0 ? `${subMetrics.filter((m) => m.name).length} metrics defined` : '—'} onEdit={() => goToStep(4)}>
                {subMetrics.filter((m) => m.name).slice(0, 3).map((m) => (
                  <span key={m.name} className="inline-block text-xs bg-[#1f1f1f] rounded px-1.5 py-0.5 text-[#666] mr-1 mt-1">{m.name}</span>
                ))}
              </ReviewRow>
              <ReviewRow label="Analytics" value={Object.keys(analyticsConnected).filter((k) => analyticsConnected[k]).map((k) => k.charAt(0).toUpperCase() + k.slice(1)).join(', ') || 'Not connected'} onEdit={() => goToStep(5)} />
            </div>

            <div className="rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/5 p-5 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="text-sm font-medium text-[#22c55e]">Intelligence layer active</span>
              </div>
              <p className="text-xs text-[#555] leading-relaxed">
                NorthStar is analyzing your product data and building your initial Feature Hit List.
                Your first ranked hypotheses will appear within minutes.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLaunch}
              disabled={saving}
              className="w-full h-12 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              style={{ background: '#4f8ef7', color: '#fff' }}
            >
              {saving ? 'Launching...' : 'Enter my product dashboard'}
              {!saving && <ChevronRight className="w-4 h-4" />}
            </button>
            <BackBtn onClick={() => goToStep(5)} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Small shared sub-components ─────────────────────────────────────────────

function DriveFileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === 'application/vnd.google-apps.document') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
        <rect width="24" height="24" rx="3" fill="#4285F4"/>
        <path d="M7 8h10M7 12h10M7 16h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )
  }
  if (mimeType === 'application/vnd.google-apps.presentation') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
        <rect width="24" height="24" rx="3" fill="#FBBC04"/>
        <rect x="5" y="6" width="14" height="12" rx="1" stroke="white" strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="2" fill="white"/>
      </svg>
    )
  }
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
        <rect width="24" height="24" rx="3" fill="#34A853"/>
        <path d="M7 8h10M7 12h10M7 16h10M12 8v8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )
  }
  // PDF or other
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <rect width="24" height="24" rx="3" fill="#EA4335"/>
      <path d="M8 6h5l3 3v9H8V6z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M13 6v3h3" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full mt-3 py-2.5 text-sm text-[#444] hover:text-[#666] transition-colors flex items-center justify-center gap-1">
      <ArrowLeft className="w-3.5 h-3.5" /> Back
    </button>
  )
}

function ReviewRow({ label, value, onEdit, children }: { label: string; value: string; onEdit: () => void; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] px-4 py-3 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm text-[#f0f0f0] font-medium">{value}</p>
        {children}
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 text-xs text-[#444] hover:text-[#4f8ef7] transition-colors mt-1">Edit</button>
    </div>
  )
}
