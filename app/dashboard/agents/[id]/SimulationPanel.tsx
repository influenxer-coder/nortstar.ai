'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, ChevronRight, Play, CheckCircle2, XCircle, AlertCircle, Check } from 'lucide-react'
import type { Simulation, PersonaResult, SimHypothesis } from '@/lib/types'

interface Props {
  agentId: string
  agentUrl: string | null
  targetText: string | null
}

const PROGRESS_MESSAGES = [
  'Crawling your page…',
  'Simulating Senior Engineer…',
  'Simulating Mid-level Engineer…',
  'Simulating Engineering Lead…',
  'Simulating Security Engineer…',
  'Simulating Open Source Engineer…',
  'Simulating Growth PM…',
  'Simulating Senior PM…',
  'Simulating Technical PM…',
  'Simulating CPO…',
  'Running CFR analysis…',
  'Generating hypotheses…',
  'Finalizing results…',
]

const CONFIDENCE_COLORS = {
  high: 'text-emerald-400',
  medium: 'text-amber-400',
  low: 'text-zinc-500',
}

const RISK_COLORS = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-emerald-400',
}

function PersonaDot({ result }: { result: PersonaResult }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div className="relative">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`w-5 h-5 rounded-full cursor-default transition-transform hover:scale-110 ${
          result.converts ? 'bg-[#16a34a]' : 'bg-[#dc2626]'
        }`}
      />
      {hovered && (
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs shadow-xl pointer-events-none">
          <p className="font-medium text-zinc-200">{result.role}</p>
          <p className="text-zinc-400">{result.converts ? 'Converts' : 'Drops off'} · {result.conversion_probability}%</p>
        </div>
      )}
    </div>
  )
}

function PersonaCard({ result }: { result: PersonaResult }) {
  const converts = result.converts
  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-colors ${
      converts
        ? 'border-[#16a34a]/40 bg-[#16a34a]/5'
        : 'border-[#dc2626]/30 bg-[#dc2626]/5'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${converts ? 'bg-[#16a34a]' : 'bg-[#dc2626]'}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-100 truncate">{result.role}</p>
            <p className="text-[11px] text-zinc-500">{result.company_stage} · {result.device}</p>
          </div>
        </div>
        <div className={`text-[11px] font-semibold shrink-0 ${converts ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
          {result.conversion_probability}%
        </div>
      </div>

      {!converts && result.dropoff_point && result.dropoff_point !== 'evaluation failed' && (
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-0.5">Drops off at</p>
          <p className="text-xs text-zinc-400 leading-relaxed">{result.dropoff_point}</p>
        </div>
      )}

      {result.single_best_change && result.single_best_change !== 'n/a' && (
        <div>
          <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider mb-0.5">Fix</p>
          <p className="text-xs text-violet-300 leading-relaxed">{result.single_best_change}</p>
        </div>
      )}
    </div>
  )
}

function HypothesisCard({
  hyp,
  agentId,
  targetText,
}: {
  hyp: SimHypothesis
  agentId: string
  targetText: string | null
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSetAsTest = async () => {
    if (saving || saved) return
    setSaving(true)
    try {
      await fetch(`/api/agents/${agentId}/hypotheses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: hyp.change.slice(0, 120),
          source: 'Simulation (CFR)',
          hypothesis: `${hyp.change}\n\nPersonas unblocked: ${hyp.personas_unblocked.join(', ')}. Expected lift: ${hyp.expected_lift}.`,
          suggested_change: hyp.implementation,
          impact_score: hyp.confidence === 'high' ? 5 : hyp.confidence === 'medium' ? 3 : 2,
        }),
      })
      setSaved(true)
    } catch {
      // silently fail — user can retry
    } finally {
      setSaving(false)
    }
  }

  const isRecommended = hyp.rank === 1

  return (
    <div className={`rounded-xl border p-5 space-y-4 ${
      isRecommended ? 'border-violet-600/50 bg-violet-500/5' : 'border-zinc-800 bg-zinc-900/40'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isRecommended ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800 text-zinc-500'
          }`}>#{hyp.rank}</span>
          {isRecommended && (
            <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">Recommended</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] shrink-0">
          <span className={CONFIDENCE_COLORS[hyp.confidence]}>
            Confidence: {hyp.confidence}
          </span>
          <span className={RISK_COLORS[hyp.risk]}>
            Risk: {hyp.risk}
          </span>
        </div>
      </div>

      <p className="text-sm font-medium text-zinc-100 leading-snug">{hyp.change}</p>

      {hyp.personas_unblocked.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Unblocks</p>
          <p className="text-xs text-zinc-400">{hyp.personas_unblocked.join(', ')}</p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-0.5">Expected lift</p>
          <p className="text-sm font-semibold text-emerald-400">{hyp.expected_lift}</p>
        </div>
        {targetText && (
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-0.5">Target</p>
            <p className="text-xs text-zinc-400 truncate">{targetText}</p>
          </div>
        )}
      </div>

      {hyp.implementation && (
        <div className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2.5">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">Implementation</p>
          <p className="text-xs text-zinc-300 leading-relaxed">{hyp.implementation}</p>
        </div>
      )}

      <button
        onClick={handleSetAsTest}
        disabled={saving || saved}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50 ${
          saved
            ? 'border-emerald-700 bg-emerald-500/10 text-emerald-400'
            : 'border-violet-600 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20'
        }`}
      >
        {saving ? (
          <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>
        ) : saved ? (
          <><Check className="h-3 w-3" /> Added to hypotheses</>
        ) : (
          <>Set as First Test</>
        )}
      </button>
    </div>
  )
}

export default function SimulationPanel({ agentId, agentUrl, targetText }: Props) {
  const [simulation, setSimulation] = useState<Simulation | null>(null)
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [simError, setSimError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [progressIdx, setProgressIdx] = useState(0)
  const [open, setOpen] = useState(false)
  const [reasoningOpen, setReasoningOpen] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch latest simulation on mount
  useEffect(() => {
    fetch(`/api/agents/${agentId}/simulate`)
      .then(r => r.json())
      .then(data => {
        if (data && data.id) {
          setSimulation(data)
          setOpen(true)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [agentId])

  const startSimulation = async () => {
    setSimulating(true)
    setSimError('')
    setElapsed(0)
    setProgressIdx(0)
    setOpen(true)

    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    progressRef.current = setInterval(() => {
      setProgressIdx(i => Math.min(i + 1, PROGRESS_MESSAGES.length - 1))
    }, 5000)

    try {
      const res = await fetch(`/api/agents/${agentId}/simulate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSimError(data.error ?? 'Simulation failed — try again')
      } else {
        setSimulation(data)
      }
    } catch {
      setSimError('Simulation failed — try again')
    } finally {
      setSimulating(false)
      if (timerRef.current) clearInterval(timerRef.current)
      if (progressRef.current) clearInterval(progressRef.current)
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (progressRef.current) clearInterval(progressRef.current)
    }
  }, [])

  const totalPersonas = simulation?.persona_results.length ?? 9
  const convertingCount = simulation?.converting_personas ?? 0

  return (
    <div className="border-b border-zinc-800/60">
      {/* Header row — always visible */}
      <div
        className="flex items-center justify-between px-6 py-3 cursor-pointer select-none hover:bg-zinc-900/30 transition-colors"
        onClick={() => !simulating && setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <ChevronRight className={`h-3.5 w-3.5 text-zinc-600 transition-transform duration-150 ${open ? 'rotate-90' : ''}`} />
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">ICP Simulation</p>
          {simulation && !simulating && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 font-medium ml-1">
              {convertingCount}/{totalPersonas} convert
            </span>
          )}
          {simulating && (
            <span className="text-[10px] text-violet-400 font-medium animate-pulse ml-1">Running…</span>
          )}
        </div>

        {!simulating && (
          <button
            onClick={e => {
              e.stopPropagation()
              startSimulation()
            }}
            disabled={!agentUrl || loading}
            className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 border border-violet-700/50 hover:border-violet-600 rounded-md px-2.5 py-1 transition-colors disabled:opacity-40"
          >
            <Play className="h-3 w-3 fill-current" />
            {simulation ? 'Re-run' : 'Run Simulation'}
          </button>
        )}
      </div>

      {open && (
        <div className="px-6 pb-6">
          {/* Loading state — initial fetch */}
          {loading && (
            <div className="flex items-center gap-2 text-zinc-500 text-xs py-4">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          )}

          {/* No simulation yet */}
          {!loading && !simulation && !simulating && !simError && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center space-y-3 mt-1">
              <p className="text-sm text-zinc-300 font-medium">
                See how 9 real-world personas respond to your page before real users arrive.
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                The agent uses simulation results as its first hypothesis — grounded in real user mental models, not guesswork.
              </p>
              <button
                onClick={startSimulation}
                disabled={!agentUrl}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-medium transition-colors disabled:opacity-40"
              >
                <Play className="h-4 w-4 fill-current" />
                Run Simulation
              </button>
              {!agentUrl && (
                <p className="text-[11px] text-zinc-600">Add a URL to your agent to enable simulation.</p>
              )}
            </div>
          )}

          {/* Simulating — skeleton + progress */}
          {simulating && (
            <div className="mt-1 space-y-4">
              {/* Progress */}
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Loader2 className="h-4 w-4 animate-spin text-violet-400 shrink-0" />
                <span>{PROGRESS_MESSAGES[progressIdx]}</span>
                <span className="text-zinc-600 text-xs">{elapsed}s</span>
              </div>

              {/* Skeleton persona cards */}
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-2 animate-pulse">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-zinc-700 shrink-0" />
                      <div className="h-3 bg-zinc-700 rounded w-24" />
                    </div>
                    <div className="h-2.5 bg-zinc-800 rounded w-16" />
                    <div className="h-2.5 bg-zinc-800 rounded w-full" />
                    <div className="h-2.5 bg-zinc-800 rounded w-3/4" />
                  </div>
                ))}
              </div>

              {/* Skeleton hypothesis cards */}
              <div className="space-y-3 mt-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-3 animate-pulse">
                    <div className="h-3 bg-zinc-700 rounded w-12" />
                    <div className="h-4 bg-zinc-700 rounded w-3/4" />
                    <div className="h-3 bg-zinc-800 rounded w-full" />
                    <div className="h-3 bg-zinc-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {simError && !simulating && (
            <div className="flex items-center gap-2 text-red-400 text-sm mt-2">
              <XCircle className="h-4 w-4 shrink-0" />
              {simError}
            </div>
          )}

          {/* Results */}
          {simulation && !simulating && (
            <div className="space-y-6 mt-1">

              {/* Section A — Conversion overview */}
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-zinc-100">
                    {simulation.converting_personas}
                    <span className="text-zinc-600"> / {totalPersonas}</span>
                  </p>
                  <p className="text-sm text-zinc-400 mt-1">
                    personas would click{targetText ? ` "${targetText}"` : ' your CTA'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {simulation.persona_results.map(r => (
                    <PersonaDot key={r.persona_id} result={r} />
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#16a34a] inline-block" /> Converts</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#dc2626] inline-block" /> Drops off</span>
                </div>
              </div>

              {/* Section B — Persona cards */}
              <div>
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Persona breakdown</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {simulation.persona_results.map(r => (
                    <PersonaCard key={r.persona_id} result={r} />
                  ))}
                </div>
              </div>

              {/* Section C — Hypothesis cards */}
              {simulation.hypotheses.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Top hypotheses</p>
                  <div className="space-y-3">
                    {simulation.hypotheses.slice(0, 3).map(hyp => (
                      <HypothesisCard
                        key={hyp.rank}
                        hyp={hyp}
                        agentId={agentId}
                        targetText={targetText}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Section D — Reasoning (collapsible) */}
              {simulation.reasoning && (
                <div className="border border-zinc-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setReasoningOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-900/40 transition-colors"
                  >
                    <span className="text-xs font-medium text-zinc-500">Why these hypotheses?</span>
                    <ChevronRight className={`h-3.5 w-3.5 text-zinc-600 transition-transform ${reasoningOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {reasoningOpen && (
                    <div className="px-4 pb-4 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800 pt-3">
                      {simulation.reasoning}
                    </div>
                  )}
                </div>
              )}

              {/* Metadata + re-run */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                <p className="text-[11px] text-zinc-600">
                  {agentUrl && (
                    <span>Simulated against <span className="text-zinc-500">{agentUrl}</span></span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  {simulation.converting_personas === totalPersonas ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-500">
                      <CheckCircle2 className="h-3 w-3" /> All personas convert
                    </span>
                  ) : simulation.converting_personas === 0 ? (
                    <span className="flex items-center gap-1 text-[11px] text-red-400">
                      <AlertCircle className="h-3 w-3" /> No personas convert
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
