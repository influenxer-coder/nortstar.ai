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

// ─── Metrics agent result types ───────────────────────────────────────────────

interface MetricsGoal {
  objective?: string
  objective_reasoning?: string
  timeframe?: string
  connection_to_strategy?: string
}

interface MetricsNorthStar {
  metric?: string
  current_value?: string
  target_value?: string
  why_this_metric?: string
  measurement_method?: string
  similar_company_example?: string
}

interface MetricsKRFull {
  kr?: string
  metric_type?: string
  current_baseline?: string
  target?: string
  why_this_kr?: string
  measurement_method?: string
  industry_benchmark?: string
  leading_or_lagging?: string
}

interface MetricsHealthMetric {
  metric?: string
  threshold?: string
  why_it_matters?: string
}

interface MetricsInputMetric {
  metric?: string
  drives?: string
  why_high_correlation?: string
}

interface MetricsNotToMeasure {
  metric?: string
  why_not?: string
}

interface MetricsStressTest {
  overall_quality?: string
  issues_found?: { issue?: string; affected_kr?: string; fix?: string }[]
  refined_key_results?: string[]
  confidence_score?: number
  confidence_reasoning?: string
}

interface MetricsResultData {
  framework_applied?: string
  framework_reasoning?: string
  goal?: MetricsGoal
  north_star_metric?: MetricsNorthStar
  key_results?: string[]
  key_results_full?: MetricsKRFull[]
  health_metrics?: MetricsHealthMetric[]
  input_metrics?: MetricsInputMetric[]
  what_not_to_measure?: MetricsNotToMeasure[]
  stress_test?: MetricsStressTest
}

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
        const raw = line.startsWith('data: ') ? line.slice(6) : line
        event = JSON.parse(raw) as AgentEvent
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

function StepBar({ current, onGoBack }: { current: number; onGoBack?: (n: number) => void }) {
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
                onClick={() => done && onGoBack?.(n)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  done
                    ? 'bg-[#22c55e] text-white cursor-pointer hover:opacity-80'
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

  // Initialize to SSR-safe defaults; actual values set from URL in mount effect
  const [step, setStep] = useState(1)
  const [projectId, setProjectId] = useState<string | null>(null)
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
  // Step 1 chat (strategy report right panel)
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)
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
  type Step2Screen = 'form' | 'streaming' | 'report'
  const [step2Screen, setStep2Screen] = useState<Step2Screen>('form')
  const [step2CurrentStatus, setStep2CurrentStatus] = useState('')
  const [step2Logs, setStep2Logs] = useState<string[]>([])
  const [step2Running, setStep2Running] = useState(false)
  const [step2Elapsed, setStep2Elapsed] = useState(0)
  const [step2Result, setStep2Result] = useState<MetricsResultData | null>(null)
  const [step2Error, setStep2Error] = useState('')
  const [step2DetailsOpen, setStep2DetailsOpen] = useState(false)
  const step2AbortRef = useRef<AbortController | null>(null)
  const step2ElapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [step2ChatMessages, setStep2ChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [step2ChatInput, setStep2ChatInput] = useState('')
  const [step2ChatLoading, setStep2ChatLoading] = useState(false)
  const step2ChatBottomRef = useRef<HTMLDivElement>(null)
  const [step2KrExpanded, setStep2KrExpanded] = useState<Record<number, boolean>>({})

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

  // ── Initialize step + projectId from URL params (client-only, avoids SSR mismatch) ──
  useEffect(() => {
    if (projectIdParam) setProjectId(projectIdParam)
    const n = parseInt(stepParam || '1', 10) || 1
    setStep(Math.min(TOTAL_STEPS, Math.max(1, n)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally only on mount

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
        if (typeof d.description === 'string') setProductDescription(d.description)
        if (d.doc_url) setDocUrl(d.doc_url)
        if (d.north_star_metric) setNsMetric(d.north_star_metric)
        if (d.north_star_current) setNsCurrent(d.north_star_current)
        if (d.north_star_target) setNsTarget(d.north_star_target)
        if (d.icp?.role) setIcpRole(d.icp.role)
        if (d.icp?.sizes) setIcpSizes(d.icp.sizes)
        if (d.icp?.industry) setIcpIndustry(d.icp.industry)
        if (d.icp?.pain_points) setIcpPain(d.icp.pain_points)
        if (Array.isArray(d.sub_metrics) && d.sub_metrics.length > 0) setSubMetrics(d.sub_metrics)
        if (d.strategy_json) {
          setStep1Result(d.strategy_json as StrategyResultData)
          setStep1Screen('report')
        }
        if (typeof d.strategy_markdown === 'string' && d.strategy_markdown.trim()) {
          setStep1ReportMd(d.strategy_markdown)
        }
        if (d.metrics_json) {
          setStep2Result(d.metrics_json as MetricsResultData)
          setStep2Screen('report')
        }
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

  // ── Auto-restore step 1 report when navigating back ───────────────────────
  useEffect(() => {
    if (step === 1 && step1Result && step1Screen === 'form') {
      setStep1Screen('report')
    }
  }, [step, step1Result, step1Screen])

  // ── Auto-restore step 2 report when navigating back ───────────────────────
  useEffect(() => {
    if (step === 2 && step2Result && step2Screen === 'form') {
      setStep2Screen('report')
    }
  }, [step, step2Result, step2Screen])

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

    // Synthetic progress: rotate status messages when Modal sends no log events
    const PROGRESS_STEPS = [
      'Connecting to NorthStar agent…',
      'Reading your product URL…',
      'Researching the competitive landscape…',
      'Identifying market trends…',
      'Analyzing unmet customer needs…',
      'Scoring growth opportunities…',
      'Synthesizing your strategy report…',
    ]
    let progressIdx = 0
    const progressInterval = setInterval(() => {
      progressIdx = Math.min(progressIdx + 1, PROGRESS_STEPS.length - 1)
      setStep1CurrentStatus((cur) => {
        // Only update if no real log event has overwritten the synthetic message
        if (PROGRESS_STEPS.includes(cur) || cur === 'Connecting…') {
          return PROGRESS_STEPS[progressIdx]
        }
        return cur
      })
    }, 4000)
    const stopProgress = () => clearInterval(progressInterval)

    const stopRunning = () => {
      setStep1Running(false)
      clearInterval(step1ElapsedIntervalRef.current ?? undefined)
      step1ElapsedIntervalRef.current = null
      step1AbortRef.current = null
      stopProgress()
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
          // If a project already exists, persist strategy JSON/markdown for future context.
          if (projectId) {
            fetch(`/api/projects/${projectId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ strategy_json: d, strategy_markdown: buildReportMarkdown(d) }),
            }).catch(() => {})
          }
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

  // ── Step 2: stream metrics agent ───────────────────────────────────────────
  const runStep2Stream = useCallback(async () => {
    const strategyMd = step1ReportMd || buildReportMarkdown(step1Result ?? {})
    setStep2Error('')
    setStep2Screen('streaming')
    setStep2CurrentStatus('Connecting…')
    setStep2Logs([])
    setStep2Running(true)
    setStep2Elapsed(0)
    setStep2Result(null)

    const controller = new AbortController()
    step2AbortRef.current = controller
    const start = Date.now()
    step2ElapsedIntervalRef.current = setInterval(() => {
      setStep2Elapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)

    const PROGRESS_STEPS = [
      'Connecting to NorthStar metrics agent…',
      'Selecting metrics framework…',
      'Researching industry benchmarks…',
      'Generating goal and key results…',
      'Stress testing key results…',
      'Finalizing metrics report…',
    ]
    let progressIdx = 0
    const progressInterval = setInterval(() => {
      progressIdx = Math.min(progressIdx + 1, PROGRESS_STEPS.length - 1)
      setStep2CurrentStatus((cur) => {
        if (PROGRESS_STEPS.includes(cur) || cur === 'Connecting…') return PROGRESS_STEPS[progressIdx]
        return cur
      })
    }, 4000)

    const stopRunning = () => {
      setStep2Running(false)
      clearInterval(step2ElapsedIntervalRef.current ?? undefined)
      step2ElapsedIntervalRef.current = null
      step2AbortRef.current = null
      clearInterval(progressInterval)
    }

    const metricsUrl = process.env.NEXT_PUBLIC_METRICS_AGENT_URL
    if (!metricsUrl) {
      stopRunning()
      setStep2Error('Metrics agent URL not configured (NEXT_PUBLIC_METRICS_AGENT_URL).')
      setStep2Screen('form')
      return
    }

    try {
      const northStarInput: Record<string, string> = {}
      if (nsMetric.trim()) northStarInput.metric = nsMetric.trim()
      if (nsCurrent.trim()) northStarInput.current_value = nsCurrent.trim()
      if (nsTarget.trim()) northStarInput.target_value = nsTarget.trim()

      const res = await fetch(metricsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ strategy_markdown: strategyMd, north_star_input: northStarInput }),
      })
      if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`)

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
            const raw = line.startsWith('data: ') ? line.slice(6) : line
            event = JSON.parse(raw) as AgentEvent
          } catch { continue }
          if (event.type === 'log') {
            const msg = event.message ?? event.content ?? ''
            if (msg) { setStep2CurrentStatus(msg); setStep2Logs((prev) => [...prev, msg]) }
          }
          if (event.type === 'result') {
            stopRunning()
            const d = event.data as MetricsResultData
            setStep2Result(d)
            if (projectId) {
              fetch(`/api/projects/${projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ metrics_json: d }),
              }).catch(() => {})
            }
            setStep2Screen('report')
          }
          if (event.type === 'error') {
            stopRunning()
            setStep2Error(event.message ?? 'Unknown error')
            setStep2Screen('form')
          }
        }
      }
      // flush remaining buffer
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer.trim()) as AgentEvent
          if (event.type === 'result') {
            stopRunning()
            const d = event.data as MetricsResultData
            setStep2Result(d)
            if (projectId) {
              fetch(`/api/projects/${projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ metrics_json: d }),
              }).catch(() => {})
            }
            setStep2Screen('report')
          }
          if (event.type === 'error') { stopRunning(); setStep2Error(event.message ?? 'Unknown error'); setStep2Screen('form') }
        } catch { /* ignore */ }
      }
    } catch (err) {
      stopRunning()
      if ((err as Error).name === 'AbortError') {
        setStep2Screen('form')
      } else {
        setStep2Error(err instanceof Error ? err.message : 'Connection lost — try again')
        setStep2Screen('form')
      }
    }
  }, [step1ReportMd, step1Result, nsMetric, nsCurrent, nsTarget, projectId])

  const cancelStep2Stream = useCallback(() => {
    step2AbortRef.current?.abort()
    setStep2Running(false)
    setStep2Screen('form')
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
          description: productDescription.trim() || null,
          strategy_doc: undefined, // optional: could persist extracted text later
          strategy_json: step1Result,
          strategy_markdown: step1ReportMd,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create project')
      const pid = data.id as string
      setProjectId(pid)
      resumedRef.current = true // prevent resume effect from overriding step after navigation
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
    await runStep2Stream()
  }, [runStep2Stream])

  const handleStep2Confirm = useCallback(async () => {
    setSaving(true)
    try {
      await patch({
        north_star_metric: step2Result?.north_star_metric?.metric ?? nsMetric.trim(),
        north_star_current: step2Result?.north_star_metric?.current_value ?? nsCurrent.trim(),
        north_star_target: step2Result?.north_star_metric?.target_value ?? nsTarget.trim(),
        metrics_json: step2Result,
        onboarding_step: 2,
      })
      goToStep(3)
    } catch { setError('Failed to save') }
    finally { setSaving(false) }
  }, [step2Result, nsMetric, nsCurrent, nsTarget, patch, goToStep])

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

  // ── Step 1 chat ─────────────────────────────────────────────────────────────
  const handleChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading || !step1Result) return
    const message = chatInput.trim()
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', content: message }])
    setChatLoading(true)
    try {
      const res = await fetch('/api/onboarding/strategy-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, strategy_json: step1Result }),
      })
      const d = await res.json()
      setChatMessages((prev) => [...prev, { role: 'assistant', content: d.reply ?? 'No response.' }])
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, chatLoading, step1Result])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // ── Step 2 chat ──────────────────────────────────────────────────────────────
  const handleStep2Chat = useCallback(async () => {
    if (!step2ChatInput.trim() || step2ChatLoading || !step2Result) return
    const message = step2ChatInput.trim()
    setStep2ChatInput('')
    setStep2ChatMessages((prev) => [...prev, { role: 'user', content: message }])
    setStep2ChatLoading(true)
    try {
      const res = await fetch('/api/onboarding/metrics-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, metrics_json: step2Result }),
      })
      const d = await res.json()
      setStep2ChatMessages((prev) => [...prev, { role: 'assistant', content: d.reply ?? 'No response.' }])
    } catch {
      setStep2ChatMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    } finally {
      setStep2ChatLoading(false)
    }
  }, [step2ChatInput, step2ChatLoading, step2Result])

  useEffect(() => {
    step2ChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [step2ChatMessages])

  // ── Can-continue guards ────────────────────────────────────────────────────
  const can1 = productUrl.trim() !== ''
  const can2 = true
  const can3 = !!icpRole.trim()
  // steps 4, 5 are always continuable (sub-metrics and analytics are optional)

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0f0f0]">
      <div className={(step === 1 && step1Screen === 'report') || (step === 2 && step2Screen === 'report') ? 'max-w-[1200px] mx-auto px-6 py-10' : 'max-w-[600px] mx-auto px-6 py-10'}>

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-[#555] hover:text-[#888] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to dashboard
          </Link>
          <StepBar current={step} onGoBack={(n) => goToStep(n)} />
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
              Start analysis →
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

        {step === 1 && step1Screen === 'report' && step1Result && (
          <div>
            {/* Header row */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-[#4f8ef7] uppercase tracking-widest font-medium mb-1">Step 1 of 6</p>
                <h2 className="text-xl font-semibold text-[#f0f0f0]">Strategy Report</h2>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (!projectId) {
                      // No project saved yet — just reset to blank form
                      setStep1Result(null)
                      setStep1ReportMd('')
                      setStep1Screen('form')
                      setProductUrl('')
                      setProductDescription('')
                      setDocFile(null)
                      return
                    }
                    if (!window.confirm('Delete this product and all its data? This cannot be undone.')) return
                    try {
                      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
                    } catch { /* best effort */ }
                    if (typeof localStorage !== 'undefined') localStorage.removeItem('northstar_current_project_id')
                    setProjectId(null)
                    setStep1Result(null)
                    setStep1ReportMd('')
                    setStep1Screen('form')
                    setProductUrl('')
                    setProductDescription('')
                    setDocFile(null)
                    router.replace('/onboarding/product', { scroll: false })
                  }}
                  className="py-2 px-4 rounded-lg text-sm border border-red-900/50 text-red-500 hover:border-red-700 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const name = (step1Result.input_product?.name ?? 'product').replace(/[^a-z0-9-_]/gi, '-').toLowerCase()
                    const date = new Date().toISOString().slice(0, 10)
                    const blob = new Blob([step1ReportMd], { type: 'text/markdown' })
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = `northstar-strategy-${name}-${date}.md`
                    a.click()
                    URL.revokeObjectURL(a.href)
                  }}
                  className="py-2 px-4 rounded-lg text-sm border border-[#2a2a2a] text-[#a0a0a0] hover:text-[#f0f0f0] hover:border-[#3a3a3a] transition-colors"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={handleStep1ContinueToOnboarding}
                  className="py-2 px-5 rounded-lg text-sm font-semibold"
                  style={{ background: '#4f8ef7', color: '#fff' }}
                >
                  Continue to onboarding →
                </button>
              </div>
            </div>

            {/* Two-column: cards left, chat right */}
            <div className="flex gap-6" style={{ height: 'calc(100vh - 180px)' }}>
              {/* Left: strategy cards — one per element */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">

                {/* 1. Product */}
                <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-5">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium">Product</p>
                    {step1Result.stage && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#2a2a2a] text-[#666] capitalize">{step1Result.stage}</span>
                    )}
                  </div>
                  <p className="text-base font-semibold text-[#f0f0f0] mb-0.5">{step1Result.input_product?.name}</p>
                  {step1Result.input_product?.category && <p className="text-xs text-[#555] mb-3">{step1Result.input_product.category}</p>}
                  {step1Result.input_product?.core_value_prop && (
                    <p className="text-sm text-[#a0a0a0] mb-3">{step1Result.input_product.core_value_prop}</p>
                  )}
                  {(step1Result.input_product?.key_differentiators?.length ?? 0) > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] text-[#444] uppercase tracking-widest mb-1.5">Key differentiators</p>
                      <ul className="space-y-0.5">
                        {step1Result.input_product!.key_differentiators!.map((d, i) => (
                          <li key={i} className="text-xs text-[#666] flex gap-2"><span className="text-[#4f8ef7]/40 shrink-0">·</span>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {step1Result.input_product?.job_it_replaces && (
                    <div className="pt-3 border-t border-[#1a1a1a]">
                      <p className="text-[10px] text-[#444] uppercase tracking-widest mb-1">Job it replaces</p>
                      <p className="text-xs text-[#666]">{step1Result.input_product.job_it_replaces}</p>
                    </div>
                  )}
                  {step1Result.framework_applied && (
                    <div className="mt-2 pt-3 border-t border-[#1a1a1a]">
                      <p className="text-[10px] text-[#444] uppercase tracking-widest mb-1">Framework</p>
                      <p className="text-xs text-[#666]">{step1Result.framework_applied}</p>
                      {step1Result.framework_selection_reasoning && (
                        <p className="text-xs text-[#444] mt-1 italic">{step1Result.framework_selection_reasoning}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. ICP */}
                {(step1Result.input_product?.target_customer || step1Result.icp_inference_reasoning) && (
                  <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-5">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium mb-3">Ideal Customer Profile</p>
                    {step1Result.input_product?.target_customer && (
                      <p className="text-sm text-[#e0e0e0] mb-2">{step1Result.input_product.target_customer}</p>
                    )}
                    {step1Result.icp_inference_reasoning && (
                      <p className="text-xs text-[#555] italic">{step1Result.icp_inference_reasoning}</p>
                    )}
                  </div>
                )}

                {/* 3. Market Space */}
                {(() => {
                  const sq = step1Result.competitive_map?.status_quo ?? step1Result.status_quo
                  return (sq?.description || step1Result.recommended_wedge) ? (
                    <div className="rounded-xl border border-[#4f8ef7]/30 bg-[#4f8ef7]/5 p-5">
                      <p className="text-[10px] text-[#4f8ef7] uppercase tracking-widest font-medium mb-3">Market Space</p>
                      {sq?.description && <p className="text-sm text-[#e0e0e0] mb-3">{sq.description}</p>}
                      {(sq?.frustrations?.length ?? 0) > 0 && (
                        <div className="mb-3">
                          <p className="text-[10px] text-[#4f8ef7]/60 uppercase tracking-widest mb-1.5">Current frustrations</p>
                          <ul className="space-y-1">
                            {sq!.frustrations!.map((f, i) => (
                              <li key={i} className="text-xs text-[#a0a0a0] flex gap-2"><span className="text-[#4f8ef7]/40 shrink-0">—</span>{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {step1Result.recommended_wedge && (
                        <div className="pt-3 border-t border-[#4f8ef7]/10">
                          <p className="text-[10px] text-[#4f8ef7]/60 uppercase tracking-widest mb-1.5">Recommended wedge</p>
                          <p className="text-xs text-[#a0a0a0]">{step1Result.recommended_wedge}</p>
                        </div>
                      )}
                    </div>
                  ) : null
                })()}

                {/* 4. Market Sizing */}
                {step1Result.market_sizing && (
                  <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-5">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium mb-3">Market Sizing</p>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {step1Result.market_sizing.tam_estimate && (
                        <div className="bg-[#111] rounded-lg p-3">
                          <p className="text-[10px] text-[#444] mb-1">TAM</p>
                          <p className="text-sm font-semibold text-[#f0f0f0]">{step1Result.market_sizing.tam_estimate}</p>
                          {step1Result.market_sizing.tam && <p className="text-[10px] text-[#444] mt-0.5">{step1Result.market_sizing.tam}</p>}
                        </div>
                      )}
                      {step1Result.market_sizing.sam_estimate && (
                        <div className="bg-[#111] rounded-lg p-3">
                          <p className="text-[10px] text-[#444] mb-1">SAM</p>
                          <p className="text-sm font-semibold text-[#f0f0f0]">{step1Result.market_sizing.sam_estimate}</p>
                          {step1Result.market_sizing.sam && <p className="text-[10px] text-[#444] mt-0.5">{step1Result.market_sizing.sam}</p>}
                        </div>
                      )}
                      {step1Result.market_sizing.som_estimate && (
                        <div className="bg-[#111] rounded-lg p-3">
                          <p className="text-[10px] text-[#444] mb-1">SOM</p>
                          <p className="text-sm font-semibold text-[#4f8ef7]">{step1Result.market_sizing.som_estimate}</p>
                          {step1Result.market_sizing.som && <p className="text-[10px] text-[#444] mt-0.5">{step1Result.market_sizing.som}</p>}
                        </div>
                      )}
                    </div>
                    {step1Result.market_sizing.sizing_reasoning && (
                      <p className="text-xs text-[#555] italic">{step1Result.market_sizing.sizing_reasoning}</p>
                    )}
                    {step1Result.market_sizing.sizing_confidence && (
                      <p className="text-[10px] text-[#444] mt-1">Confidence: {step1Result.market_sizing.sizing_confidence}</p>
                    )}
                  </div>
                )}

                {/* 5. GTM Motion */}
                {step1Result.gtm_motion && (
                  <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-5">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium mb-3">GTM Motion</p>
                    {step1Result.gtm_motion.recommended_motion && (
                      <p className="text-sm font-semibold text-[#f0f0f0] mb-2">{step1Result.gtm_motion.recommended_motion}</p>
                    )}
                    {step1Result.gtm_motion.reasoning && (
                      <p className="text-xs text-[#666] mb-3">{step1Result.gtm_motion.reasoning}</p>
                    )}
                    <div className="space-y-2">
                      {step1Result.gtm_motion.first_channel && (
                        <div className="flex gap-2">
                          <p className="text-[10px] text-[#444] uppercase tracking-widest shrink-0 w-24 mt-0.5">First channel</p>
                          <p className="text-xs text-[#a0a0a0]">{step1Result.gtm_motion.first_channel}</p>
                        </div>
                      )}
                      {step1Result.gtm_motion.beachhead_customer && (
                        <div className="flex gap-2">
                          <p className="text-[10px] text-[#444] uppercase tracking-widest shrink-0 w-24 mt-0.5">Beachhead</p>
                          <p className="text-xs text-[#a0a0a0]">{step1Result.gtm_motion.beachhead_customer}</p>
                        </div>
                      )}
                    </div>
                    {step1Result.gtm_motion.gtm_evidence && (
                      <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
                        <p className="text-[10px] text-[#444] uppercase tracking-widest mb-1.5">Evidence</p>
                        <p className="text-xs text-[#555]">{step1Result.gtm_motion.gtm_evidence}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Pricing Model */}
                {step1Result.pricing_model && (
                  <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-5">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium mb-3">Pricing Model</p>
                    {step1Result.pricing_model.recommended_model && (
                      <p className="text-sm font-semibold text-[#f0f0f0] mb-2">{step1Result.pricing_model.recommended_model}</p>
                    )}
                    {step1Result.pricing_model.reasoning && (
                      <p className="text-xs text-[#666] mb-3">{step1Result.pricing_model.reasoning}</p>
                    )}
                    <div className="space-y-2">
                      {step1Result.pricing_model.entry_price_signal && (
                        <div className="flex gap-2">
                          <p className="text-[10px] text-[#444] uppercase tracking-widest shrink-0 w-24 mt-0.5">Entry price</p>
                          <p className="text-xs text-[#a0a0a0]">{step1Result.pricing_model.entry_price_signal}</p>
                        </div>
                      )}
                      {step1Result.pricing_model.expansion_mechanic && (
                        <div className="flex gap-2">
                          <p className="text-[10px] text-[#444] uppercase tracking-widest shrink-0 w-24 mt-0.5">Expansion</p>
                          <p className="text-xs text-[#a0a0a0]">{step1Result.pricing_model.expansion_mechanic}</p>
                        </div>
                      )}
                      {step1Result.pricing_model.competitors_pricing && (
                        <div className="flex gap-2">
                          <p className="text-[10px] text-[#444] uppercase tracking-widest shrink-0 w-24 mt-0.5">vs. competitors</p>
                          <p className="text-xs text-[#a0a0a0]">{step1Result.pricing_model.competitors_pricing}</p>
                        </div>
                      )}
                    </div>
                    {step1Result.input_product?.pricing_signal && (
                      <p className="text-xs text-[#444] mt-3 pt-3 border-t border-[#1a1a1a] italic">{step1Result.input_product.pricing_signal}</p>
                    )}
                  </div>
                )}

                {/* 7. Direct Competitors */}
                {(() => {
                  const direct = step1Result.competitive_map?.direct ?? step1Result.direct_competitors ?? []
                  return direct.length > 0 ? (
                    <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-5">
                      <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium mb-3">Direct Competitors</p>
                      <div className="space-y-4">
                        {direct.map((c, i) => (
                          <div key={i} className="pb-4 border-b border-[#1a1a1a] last:pb-0 last:border-0">
                            <p className="text-sm font-medium text-[#f0f0f0] mb-1">{c.name}</p>
                            {c.what_they_do && <p className="text-xs text-[#666] mb-2">{c.what_they_do}</p>}
                            {(c.complaints?.length ?? 0) > 0 && (
                              <div>
                                <p className="text-[10px] text-[#444] uppercase tracking-widest mb-1">Top complaints</p>
                                <ul className="space-y-0.5">
                                  {c.complaints!.slice(0, 3).map((q, j) => (
                                    <li key={j} className="text-xs text-[#555] flex gap-2"><span className="shrink-0 text-red-500/40">✗</span>{q}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}

                {/* 8. Indirect Alternatives */}
                {(() => {
                  const indirect = step1Result.competitive_map?.indirect ?? step1Result.indirect_competitors ?? []
                  return indirect.length > 0 ? (
                    <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-5">
                      <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium mb-3">Indirect Alternatives</p>
                      <div className="space-y-4">
                        {indirect.map((c, i) => (
                          <div key={i} className="pb-4 border-b border-[#1a1a1a] last:pb-0 last:border-0">
                            <p className="text-sm font-medium text-[#f0f0f0] mb-1">{c.name}</p>
                            {c.what_they_do && <p className="text-xs text-[#666] mb-2">{c.what_they_do}</p>}
                            {(c.complaints?.length ?? 0) > 0 && (
                              <ul className="space-y-0.5">
                                {c.complaints!.slice(0, 2).map((q, j) => (
                                  <li key={j} className="text-xs text-[#555] flex gap-2"><span className="shrink-0 text-[#444]">—</span>{q}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}

                {/* 9. PLG Research */}
                {step1Result.plg_research && (
                  <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-5">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium mb-3">PLG Research</p>
                    {step1Result.plg_research.recommended_plg_motion && (
                      <div className="mb-3 p-3 rounded-lg bg-[#111] border border-[#1a1a1a]">
                        <p className="text-[10px] text-[#4f8ef7] uppercase tracking-widest mb-1">Recommended motion</p>
                        <p className="text-sm text-[#e0e0e0]">{step1Result.plg_research.recommended_plg_motion}</p>
                      </div>
                    )}
                    {(step1Result.plg_research.plg_motions_that_work?.length ?? 0) > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] text-[#444] uppercase tracking-widest mb-2">Motions that work</p>
                        <div className="space-y-2">
                          {step1Result.plg_research.plg_motions_that_work!.map((m, i) => (
                            <div key={i} className="rounded-lg bg-[#111] border border-[#1a1a1a] p-3">
                              {m.motion && <p className="text-xs font-medium text-[#c0c0c0] mb-1">{m.motion}</p>}
                              {m.example_company && <p className="text-[10px] text-[#4f8ef7] mb-0.5">Example: {m.example_company}</p>}
                              {m.how_they_did_it && <p className="text-[10px] text-[#555] mb-0.5">{m.how_they_did_it}</p>}
                              {m.applicability_to_input_product && <p className="text-[10px] text-[#666] italic">{m.applicability_to_input_product}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(step1Result.plg_research.activation_moment_patterns?.length ?? 0) > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] text-[#444] uppercase tracking-widest mb-1.5">Activation patterns</p>
                        <div className="space-y-1.5">
                          {step1Result.plg_research.activation_moment_patterns!.map((m, i) => (
                            <div key={i} className="flex gap-2">
                              <span className="text-[#22c55e]/40 shrink-0 mt-0.5">·</span>
                              <div>
                                {m.pattern && <p className="text-xs text-[#666]">{m.pattern}</p>}
                                {m.example && <p className="text-[10px] text-[#444] italic">e.g. {m.example}</p>}
                                {m.relevant_because && <p className="text-[10px] text-[#3a3a3a]">{m.relevant_because}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(step1Result.plg_research.viral_mechanic_patterns?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[10px] text-[#444] uppercase tracking-widest mb-1.5">Viral mechanics</p>
                        <div className="space-y-1.5">
                          {step1Result.plg_research.viral_mechanic_patterns!.map((m, i) => (
                            <div key={i} className="flex gap-2">
                              <span className="text-[#a855f7]/40 shrink-0 mt-0.5">·</span>
                              <div>
                                {m.mechanic && <p className="text-xs text-[#666]">{m.mechanic}</p>}
                                {m.example && <p className="text-[10px] text-[#444] italic">e.g. {m.example}</p>}
                                {m.relevant_because && <p className="text-[10px] text-[#3a3a3a]">{m.relevant_because}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 10. Ranked Opportunities */}
                {(step1Result.ranked_opportunities?.length ?? 0) > 0 && (
                  <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-5">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium mb-3">Ranked Opportunities</p>
                    <div className="space-y-5">
                      {step1Result.ranked_opportunities!.slice(0, 3).map((opp, i) => (
                        <div key={i} className="pb-5 border-b border-[#1a1a1a] last:pb-0 last:border-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-[#4f8ef7] font-mono shrink-0 mt-0.5">#{opp.rank ?? i + 1}</span>
                              <p className="text-sm font-medium text-[#f0f0f0]">{opp.opportunity}</p>
                            </div>
                            {opp.composite_score != null && (
                              <span className="text-sm font-semibold text-[#4f8ef7] font-mono shrink-0">{opp.composite_score}<span className="text-[10px] text-[#444]">/10</span></span>
                            )}
                          </div>
                          {opp.target_segment && <p className="text-xs text-[#555] mb-2 ml-4">{opp.target_segment}</p>}
                          <div className="ml-4 grid grid-cols-3 gap-2 mb-2">
                            {opp.segment_size_score != null && (
                              <div className="bg-[#111] rounded-lg p-2">
                                <p className="text-[10px] text-[#444] mb-1">Segment size</p>
                                <p className="text-sm font-semibold text-[#a0a0a0]">{opp.segment_size_score}<span className="text-[10px] text-[#444]">/10</span></p>
                              </div>
                            )}
                            {opp.pain_urgency_score != null && (
                              <div className="bg-[#111] rounded-lg p-2">
                                <p className="text-[10px] text-[#444] mb-1">Pain urgency</p>
                                <p className="text-sm font-semibold text-[#a0a0a0]">{opp.pain_urgency_score}<span className="text-[10px] text-[#444]">/10</span></p>
                              </div>
                            )}
                            {opp.strategic_fit_score != null && (
                              <div className="bg-[#111] rounded-lg p-2">
                                <p className="text-[10px] text-[#444] mb-1">Strategic fit</p>
                                <p className="text-sm font-semibold text-[#a0a0a0]">{opp.strategic_fit_score}<span className="text-[10px] text-[#444]">/10</span></p>
                              </div>
                            )}
                          </div>
                          {opp.recommended_action && <p className="text-xs text-[#555] ml-4 italic">{opp.recommended_action}</p>}
                          {opp.pm_comment && <p className="text-xs text-[#4f8ef7]/60 ml-4 mt-1">PM note: {opp.pm_comment}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 11. Unmet Needs */}
                {(step1Result.unmet_needs?.length ?? 0) > 0 && (
                  <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-5">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium mb-3">Unmet Needs</p>
                    <div className="space-y-4">
                      {step1Result.unmet_needs!.map((n, i) => (
                        <div key={i} className="pb-4 border-b border-[#1a1a1a] last:pb-0 last:border-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-[#f0f0f0]">{n.need}</p>
                            {n.how_widespread && <span className="text-[10px] text-[#555] shrink-0 mt-0.5">{n.how_widespread}</span>}
                          </div>
                          {n.evidence && <p className="text-xs text-[#666] mb-1">{n.evidence}</p>}
                          {n.trend_connection && <p className="text-xs text-[#444] italic">Why now: {n.trend_connection}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 12. Emerging Trends */}
                {(() => {
                  const trends = step1Result.market_trends?.emerging_trends ?? step1Result.emerging_trends ?? []
                  return trends.length > 0 ? (
                    <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-5">
                      <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium mb-3">Emerging Trends</p>
                      <div className="space-y-4">
                        {trends.map((t, i) => (
                          <div key={i} className="pb-4 border-b border-[#1a1a1a] last:pb-0 last:border-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-[#f0f0f0]">{t.trend}</p>
                              {t.momentum && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#666]">{t.momentum}</span>}
                            </div>
                            {t.time_horizon && <p className="text-xs text-[#555] mb-1">{t.time_horizon}</p>}
                            {t.evidence && <p className="text-xs text-[#444] italic">{t.evidence}</p>}
                          </div>
                        ))}
                      </div>
                      {(step1Result.market_trends?.customer_behavior_shifts?.length ?? 0) > 0 && (
                        <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
                          <p className="text-[10px] text-[#444] uppercase tracking-widest mb-2">Customer behavior shifts</p>
                          <ul className="space-y-1">
                            {step1Result.market_trends!.customer_behavior_shifts!.map((s, i) => {
                              const shift = typeof s === 'string' ? s : (s as { shift?: string; evidence?: string }).shift ?? ''
                              const evidence = typeof s === 'string' ? undefined : (s as { shift?: string; evidence?: string }).evidence
                              return (
                                <li key={i} className="flex gap-2">
                                  <span className="shrink-0 text-[#444] mt-0.5">→</span>
                                  <div>
                                    <p className="text-xs text-[#555]">{shift}</p>
                                    {evidence && <p className="text-[10px] text-[#444] italic">{evidence}</p>}
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : null
                })()}

                {/* 13. Momentum Advantages */}
                {(step1Result.momentum_advantages?.length ?? 0) > 0 && (
                  <div className="rounded-xl border border-[#22c55e]/20 bg-[#22c55e]/5 p-5">
                    <p className="text-[10px] text-[#22c55e]/70 uppercase tracking-widest font-medium mb-3">Momentum Advantages</p>
                    <div className="space-y-4">
                      {step1Result.momentum_advantages!.map((m, i) => (
                        <div key={i} className="pb-4 border-b border-[#22c55e]/10 last:pb-0 last:border-0">
                          <p className="text-sm font-medium text-[#f0f0f0] mb-1">{m.advantage}</p>
                          {m.trend_backing && <p className="text-xs text-[#666] mb-1">Backed by: {m.trend_backing}</p>}
                          {m.recommendation && <p className="text-xs text-[#22c55e]/60 italic">{m.recommendation}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 14. Threats */}
                {(() => {
                  const threats = [
                    ...(step1Result.threats ?? []),
                    ...(step1Result.market_trends?.new_threats ?? []),
                    ...(step1Result.new_threats ?? []),
                    ...(step1Result.threats_to_monitor ?? []),
                  ]
                  return threats.length > 0 ? (
                    <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-5">
                      <p className="text-[10px] text-red-500/60 uppercase tracking-widest font-medium mb-3">Threats</p>
                      <div className="space-y-3">
                        {threats.map((t, i) => (
                          <div key={i} className="pb-3 border-b border-red-900/10 last:pb-0 last:border-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-sm font-medium text-[#f0f0f0]">{t.threat}</p>
                              {t.urgency && <span className="text-[10px] text-red-500/60 shrink-0 mt-0.5">{t.urgency}</span>}
                            </div>
                            {t.who_is_driving_it && <p className="text-xs text-[#555]">Driven by: {t.who_is_driving_it}</p>}
                            {t.recommended_response && <p className="text-xs text-[#444] italic mt-1">{t.recommended_response}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}

              </div>

              {/* Right: chat panel */}
              <div className="w-[340px] shrink-0 flex flex-col border border-[#2a2a2a] rounded-xl bg-[#0d0d0d] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2a2a2a] shrink-0">
                  <p className="text-sm font-medium text-[#f0f0f0]">Ask about your strategy</p>
                  <p className="text-xs text-[#444] mt-0.5">Competitors, positioning, opportunities…</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.length === 0 && (
                    <p className="text-xs text-[#444]">Challenge assumptions, add context, or ask NorthStar to evolve any part of this strategy.</p>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-[#4f8ef7] text-white'
                            : 'bg-[#1a1a1a] text-[#e0e0e0] prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:text-[#f0f0f0] prose-headings:font-semibold prose-headings:my-2 prose-li:my-0 prose-ul:my-1 prose-ol:my-1 prose-strong:text-[#f0f0f0] prose-table:text-xs prose-td:py-1 prose-th:py-1'
                        }`}
                      >
                        {m.role === 'assistant'
                          ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                          : m.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#1a1a1a] rounded-lg px-3 py-2">
                        <div className="flex gap-1 items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4f8ef7] animate-pulse" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4f8ef7] animate-pulse" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4f8ef7] animate-pulse" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>
                <div className="border-t border-[#2a2a2a] p-3 shrink-0">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat() } }}
                      placeholder="Evolve the strategy, challenge assumptions…"
                      className="flex-1 bg-[#1a1a1a] text-sm text-[#f0f0f0] placeholder-[#444] border border-[#2a2a2a] rounded-lg px-3 py-2 focus:outline-none focus:border-[#4f8ef7] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleChat}
                      disabled={!chatInput.trim() || chatLoading}
                      className="px-3 py-2 bg-[#4f8ef7] text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-[#6b9ef7] transition-colors"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Goal & Metrics (form → streaming → report) ──────────── */}
        {step === 2 && step2Screen === 'form' && (
          <form onSubmit={handleStep2}>
            <p className="text-xs text-[#4f8ef7] uppercase tracking-widest font-medium mb-2">Step 2 of 6</p>
            <h1 className="text-2xl font-semibold text-[#f0f0f0] mb-1">Set your goal &amp; metrics</h1>
            <p className="text-sm text-[#666] mb-8">
              NorthStar will generate a goal, north star metric, and full KPI hierarchy from your strategy. Optionally hint at your north star metric below.
            </p>

            {step2Error && (
              <div className="mb-5 rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-400 flex flex-wrap items-center justify-between gap-2">
                <span>{step2Error}</span>
                <button type="button" onClick={() => setStep2Error('')} className="text-red-300 hover:text-white underline text-xs">Dismiss</button>
              </div>
            )}

            <div className="mb-5">
              <label className={labelCls}>North star metric hint <span className="text-[#444] normal-case">(optional)</span></label>
              <input
                type="text"
                value={nsMetric}
                onChange={(e) => setNsMetric(e.target.value)}
                placeholder="e.g. ARR, Activation Rate, D30 Retention"
                className={inputCls}
                autoFocus
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

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <label className={labelCls}>Current value <span className="text-[#444] normal-case">(optional)</span></label>
                <input type="text" value={nsCurrent} onChange={(e) => setNsCurrent(e.target.value)}
                  placeholder='e.g. "$450K" or "23%"' className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>90-day target <span className="text-[#444] normal-case">(optional)</span></label>
                <input type="text" value={nsTarget} onChange={(e) => setNsTarget(e.target.value)}
                  placeholder='e.g. "$700K" or "35%"' className={inputCls} />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-lg text-sm font-medium transition-colors duration-150"
              style={{ background: '#4f8ef7', color: '#fff' }}
            >
              Generate goal &amp; metrics →
            </button>
            <BackBtn onClick={() => goToStep(1)} />
          </form>
        )}

        {step === 2 && step2Screen === 'streaming' && (
          <div className="py-8">
            <p className="text-xs text-[#4f8ef7] uppercase tracking-widest font-medium mb-6">Step 2 of 6</p>

            <div className="flex items-center gap-3 mb-2">
              {step2Running ? (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-[#4f8ef7] animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#4f8ef7] animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#4f8ef7] animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-[#22c55e] shrink-0" />
              )}
              <p className="text-sm text-[#a0a0a0] min-h-[1.25rem] truncate flex-1">
                {step2CurrentStatus || 'Generating your goal & metrics…'}
              </p>
            </div>
            <p className="text-xs text-[#555] mb-4">{step2Elapsed}s</p>

            {step2Logs.length > 0 && (
              <div className="mb-4 rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setStep2DetailsOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs text-[#666] hover:text-[#a0a0a0] hover:bg-[#1a1a1a] transition-colors"
                >
                  <span>Details</span>
                  <span className="text-[#444]">{step2DetailsOpen ? '▼' : '▶'}</span>
                </button>
                {step2DetailsOpen && (
                  <div className="max-h-48 overflow-y-auto border-t border-[#2a2a2a] p-3 font-mono text-[12px] text-[#666] leading-relaxed space-y-0.5">
                    {step2Logs.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={cancelStep2Stream}
              className="py-2.5 px-5 text-sm text-[#666] hover:text-[#f0f0f0] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {step === 2 && step2Screen === 'report' && step2Result && (
          <div>
            {/* Header row */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-[#4f8ef7] uppercase tracking-widest font-medium mb-1">Step 2 of 6</p>
                <h2 className="text-xl font-semibold text-[#f0f0f0]">Goal &amp; Metrics</h2>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep2Screen('form'); setStep2Result(null); setStep2ChatMessages([]) }}
                  className="py-2 px-4 rounded-lg text-sm border border-[#2a2a2a] text-[#666] hover:text-[#f0f0f0] hover:border-[#3a3a3a] transition-colors"
                >
                  Re-run
                </button>
                <button
                  type="button"
                  onClick={handleStep2Confirm}
                  disabled={saving}
                  className="py-2 px-5 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ background: '#4f8ef7', color: '#fff' }}
                >
                  {saving ? 'Saving…' : 'Confirm & continue →'}
                </button>
              </div>
            </div>

            {/* Two-column: cards left, chat right */}
            <div className="flex gap-6" style={{ height: 'calc(100vh - 180px)' }}>
              {/* Left: metrics cards */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">

                {/* 1. Goal */}
                {step2Result.goal && (
                  <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-5">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium">Goal</p>
                      {step2Result.goal.timeframe && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#2a2a2a] text-[#4f8ef7]">{step2Result.goal.timeframe}</span>
                      )}
                    </div>
                    {step2Result.goal.objective && (
                      <p className="text-base font-semibold text-[#f0f0f0] mb-2 leading-snug">{step2Result.goal.objective}</p>
                    )}
                    {step2Result.goal.connection_to_strategy && (
                      <p className="text-xs text-[#666] mb-2">{step2Result.goal.connection_to_strategy}</p>
                    )}
                    {step2Result.goal.objective_reasoning && (
                      <p className="text-xs text-[#444] italic">{step2Result.goal.objective_reasoning}</p>
                    )}
                    {step2Result.framework_applied && (
                      <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
                        <p className="text-[10px] text-[#444] uppercase tracking-widest mb-1">Framework</p>
                        <p className="text-xs text-[#666]">{step2Result.framework_applied}</p>
                        {step2Result.framework_reasoning && (
                          <p className="text-xs text-[#3a3a3a] mt-0.5 italic">{step2Result.framework_reasoning}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. North Star Metric */}
                {step2Result.north_star_metric && (
                  <div className="rounded-xl border border-[#4f8ef7]/20 bg-[#0d0d0d] p-5">
                    <p className="text-[10px] text-[#4f8ef7] uppercase tracking-widest font-medium mb-3">North Star Metric</p>
                    {step2Result.north_star_metric.metric && (
                      <p className="text-base font-semibold text-[#f0f0f0] mb-3">{step2Result.north_star_metric.metric}</p>
                    )}
                    {(step2Result.north_star_metric.current_value || step2Result.north_star_metric.target_value) && (
                      <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-[#111] border border-[#1a1a1a]">
                        <div className="text-center">
                          <p className="text-[10px] text-[#444] uppercase tracking-widest mb-0.5">Now</p>
                          <p className="text-sm font-semibold text-[#a0a0a0]">{step2Result.north_star_metric.current_value || '—'}</p>
                        </div>
                        <div className="text-[#2a2a2a] text-lg">→</div>
                        <div className="text-center">
                          <p className="text-[10px] text-[#444] uppercase tracking-widest mb-0.5">Target</p>
                          <p className="text-sm font-semibold text-[#4f8ef7]">{step2Result.north_star_metric.target_value || '—'}</p>
                        </div>
                      </div>
                    )}
                    {step2Result.north_star_metric.why_this_metric && (
                      <p className="text-xs text-[#666] mb-2">{step2Result.north_star_metric.why_this_metric}</p>
                    )}
                    {step2Result.north_star_metric.measurement_method && (
                      <div className="flex gap-2 mb-1">
                        <p className="text-[10px] text-[#444] uppercase tracking-widest shrink-0 w-20 mt-0.5">Measure via</p>
                        <p className="text-xs text-[#555]">{step2Result.north_star_metric.measurement_method}</p>
                      </div>
                    )}
                    {step2Result.north_star_metric.similar_company_example && (
                      <div className="flex gap-2">
                        <p className="text-[10px] text-[#444] uppercase tracking-widest shrink-0 w-20 mt-0.5">Similar co.</p>
                        <p className="text-xs text-[#555] italic">{step2Result.north_star_metric.similar_company_example}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Key Results — both key_results and key_results_full may be objects, not arrays */}
                {(() => {
                  function toArray<T>(v: unknown): T[] {
                    if (!v) return []
                    if (Array.isArray(v)) return v as T[]
                    if (typeof v === 'object') return Object.values(v as Record<string, T>)
                    return []
                  }
                  const krFullArr: MetricsKRFull[] = toArray<MetricsKRFull>(step2Result.key_results_full)
                  const krStrings: string[] = toArray<unknown>(step2Result.key_results)
                    .map((v) => (typeof v === 'string' ? v : typeof v === 'object' && v && 'kr' in v ? String((v as MetricsKRFull).kr ?? '') : String(v)))
                  const items: MetricsKRFull[] = krFullArr.length
                    ? krFullArr
                    : krStrings.map((kr) => ({ kr }))
                  if (!items.length) return null
                  return (
                  <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-5">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium mb-3">Key Results</p>
                    <div className="space-y-2">
                      {items.map((krObj, i) => {
                        const isExpanded = !!step2KrExpanded[i]
                        return (
                          <div key={i} className="rounded-lg border border-[#1a1a1a] bg-[#111] overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setStep2KrExpanded((prev) => ({ ...prev, [i]: !prev[i] }))}
                              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#1a1a1a] transition-colors"
                            >
                              <span className="shrink-0 mt-0.5 text-[10px] font-semibold text-[#4f8ef7]/60 w-5">KR{i + 1}</span>
                              <p className="text-xs text-[#a0a0a0] flex-1 leading-relaxed">{krObj.kr ?? ''}</p>
                              <span className="text-[10px] text-[#444] shrink-0 mt-0.5">{isExpanded ? '▼' : '▶'}</span>
                            </button>
                            {isExpanded && (
                              <div className="px-4 pb-3 border-t border-[#1a1a1a] space-y-2 pt-2">
                                {krObj.why_this_kr && (
                                  <div className="flex gap-2">
                                    <p className="text-[10px] text-[#444] uppercase tracking-widest shrink-0 w-20 mt-0.5">Why</p>
                                    <p className="text-xs text-[#555]">{krObj.why_this_kr}</p>
                                  </div>
                                )}
                                {(krObj.current_baseline || krObj.target) && (
                                  <div className="flex gap-2">
                                    <p className="text-[10px] text-[#444] uppercase tracking-widest shrink-0 w-20 mt-0.5">Baseline→Target</p>
                                    <p className="text-xs text-[#555]">{krObj.current_baseline} → {krObj.target}</p>
                                  </div>
                                )}
                                {krObj.measurement_method && (
                                  <div className="flex gap-2">
                                    <p className="text-[10px] text-[#444] uppercase tracking-widest shrink-0 w-20 mt-0.5">Measure via</p>
                                    <p className="text-xs text-[#555]">{krObj.measurement_method}</p>
                                  </div>
                                )}
                                {krObj.industry_benchmark && (
                                  <div className="flex gap-2">
                                    <p className="text-[10px] text-[#444] uppercase tracking-widest shrink-0 w-20 mt-0.5">Benchmark</p>
                                    <p className="text-xs text-[#444] italic">{krObj.industry_benchmark}</p>
                                  </div>
                                )}
                                {(krObj.metric_type || krObj.leading_or_lagging) && (
                                  <div className="flex gap-2">
                                    {krObj.metric_type && <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#2a2a2a] text-[#555] capitalize">{krObj.metric_type}</span>}
                                    {krObj.leading_or_lagging && <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#2a2a2a] text-[#555] capitalize">{krObj.leading_or_lagging}</span>}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  )
                })()}

                {/* 4. Health Metrics */}
                {(step2Result.health_metrics?.length ?? 0) > 0 && (
                  <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-5">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium mb-3">Health Metrics</p>
                    <div className="space-y-2">
                      {step2Result.health_metrics!.map((h, i) => (
                        <div key={i} className="rounded-lg bg-[#111] border border-[#1a1a1a] p-3">
                          {h.metric && <p className="text-xs font-medium text-[#a0a0a0] mb-1">{h.metric}</p>}
                          {h.threshold && <p className="text-[10px] text-[#22c55e]/70">{h.threshold}</p>}
                          {h.why_it_matters && <p className="text-[10px] text-[#444] mt-0.5 italic">{h.why_it_matters}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Input Metrics */}
                {(step2Result.input_metrics?.length ?? 0) > 0 && (
                  <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-5">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium mb-3">Input Metrics</p>
                    <div className="space-y-2">
                      {step2Result.input_metrics!.map((m, i) => (
                        <div key={i} className="rounded-lg bg-[#111] border border-[#1a1a1a] p-3">
                          {m.metric && <p className="text-xs font-medium text-[#a0a0a0] mb-1">{m.metric}</p>}
                          {m.drives && <p className="text-[10px] text-[#4f8ef7]/70">Drives: {m.drives}</p>}
                          {m.why_high_correlation && <p className="text-[10px] text-[#444] mt-0.5 italic">{m.why_high_correlation}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Do Not Measure */}
                {(step2Result.what_not_to_measure?.length ?? 0) > 0 && (
                  <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-5">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium mb-3">Do Not Measure</p>
                    <div className="space-y-1.5">
                      {step2Result.what_not_to_measure!.map((m, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-red-500/40 shrink-0 mt-0.5 text-xs">✕</span>
                          <div>
                            {m.metric && <p className="text-xs text-[#666] line-through decoration-red-900">{m.metric}</p>}
                            {m.why_not && <p className="text-[10px] text-[#444] italic">{m.why_not}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. Stress Test */}
                {step2Result.stress_test && (
                  <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium">Stress Test</p>
                      <div className="flex items-center gap-2">
                        {step2Result.stress_test.confidence_score != null && (
                          <span className="text-[10px] text-[#666]">Confidence: {step2Result.stress_test.confidence_score}/10</span>
                        )}
                        {step2Result.stress_test.overall_quality && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${
                            step2Result.stress_test.overall_quality === 'strong' ? 'border-[#22c55e]/40 text-[#22c55e]' :
                            step2Result.stress_test.overall_quality === 'weak' ? 'border-red-800/40 text-red-400' :
                            'border-yellow-800/40 text-yellow-400'
                          }`}>{step2Result.stress_test.overall_quality.replace('_', ' ')}</span>
                        )}
                      </div>
                    </div>
                    {step2Result.stress_test.confidence_reasoning && (
                      <p className="text-xs text-[#444] italic mb-3">{step2Result.stress_test.confidence_reasoning}</p>
                    )}
                    {(step2Result.stress_test.issues_found?.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        {step2Result.stress_test.issues_found!.map((issue, i) => (
                          <div key={i} className="rounded-lg bg-[#111] border border-[#1a1a1a] p-3">
                            {issue.issue && <p className="text-xs text-[#a0a0a0] mb-1">{issue.issue}</p>}
                            {issue.affected_kr && <p className="text-[10px] text-[#555]">KR: {issue.affected_kr}</p>}
                            {issue.fix && <p className="text-[10px] text-[#22c55e]/70 mt-0.5">Fix: {issue.fix}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    {(step2Result.stress_test.refined_key_results?.length ?? 0) > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
                        <p className="text-[10px] text-[#444] uppercase tracking-widest mb-1.5">Refined KRs</p>
                        <ul className="space-y-1">
                          {step2Result.stress_test.refined_key_results!.map((kr, i) => (
                            <li key={i} className="text-xs text-[#555] flex gap-2"><span className="text-[#22c55e]/40 shrink-0">→</span>{kr}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Right: chat panel */}
              <div className="w-[360px] shrink-0 flex flex-col rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1a1a1a]">
                  <p className="text-xs font-medium text-[#a0a0a0]">Ask NorthStar</p>
                  <p className="text-[10px] text-[#444] mt-0.5">Challenge or refine your goal &amp; KPIs</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {step2ChatMessages.length === 0 && (
                    <p className="text-xs text-[#444] text-center mt-4">Ask about a KR, suggest a different metric, or challenge the goal.</p>
                  )}
                  {step2ChatMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`rounded-xl px-3 py-2 max-w-[90%] text-xs ${m.role === 'user' ? 'bg-[#4f8ef7]/20 text-[#c0d4f5]' : 'bg-[#1a1a1a] text-[#a0a0a0]'}`}>
                        {m.role === 'assistant' ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert prose-xs max-w-none text-xs [&>*]:text-[#a0a0a0] [&>ul]:pl-4 [&>ol]:pl-4 [&>table]:text-[11px] [&>pre]:text-[11px]">
                            {m.content}
                          </ReactMarkdown>
                        ) : (
                          m.content
                        )}
                      </div>
                    </div>
                  ))}
                  {step2ChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#1a1a1a] rounded-xl px-3 py-2 flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4f8ef7] animate-pulse" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4f8ef7] animate-pulse" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4f8ef7] animate-pulse" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={step2ChatBottomRef} />
                </div>

                <div className="border-t border-[#1a1a1a] p-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={step2ChatInput}
                      onChange={(e) => setStep2ChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStep2Chat() } }}
                      placeholder="e.g. Suggest a better north star metric…"
                      className="flex-1 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-xs text-[#f0f0f0] placeholder:text-[#444] focus:outline-none focus:border-[#4f8ef7]"
                    />
                    <button
                      type="button"
                      onClick={handleStep2Chat}
                      disabled={!step2ChatInput.trim() || step2ChatLoading}
                      className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-40 transition-colors"
                      style={{ background: '#4f8ef7', color: '#fff' }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
