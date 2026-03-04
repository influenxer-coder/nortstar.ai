'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, CheckCircle2, XCircle, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Log {
  id: string
  step_name: string
  message: string
  status: 'running' | 'done' | 'error'
  created_at: string
}

const STEP_ICONS: Record<string, string> = {
  github: '⬡',
  posthog: '◎',
  product_analysis: '◍',
  code_analysis: '◈',
  research: '◉',
  synthesis: '◆',
  hypotheses: '◇',
}

function LogLine({ log }: { log: Log }) {
  const icon = STEP_ICONS[log.step_name] ?? '○'
  return (
    <div className="flex items-start gap-2.5 text-sm font-mono">
      <span className="mt-0.5 shrink-0 text-zinc-500 text-xs">{icon}</span>
      <div className="flex-1 flex items-start gap-2 min-w-0">
        <span className={`leading-snug ${
          log.status === 'done' ? 'text-zinc-300' :
          log.status === 'error' ? 'text-red-400' :
          'text-zinc-400'
        }`}>
          {log.message}
        </span>
      </div>
      <span className="shrink-0 mt-0.5">
        {log.status === 'running' && <Loader2 className="h-3.5 w-3.5 text-violet-400 animate-spin" />}
        {log.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
        {log.status === 'error' && <XCircle className="h-3.5 w-3.5 text-red-500" />}
      </span>
    </div>
  )
}

interface Props {
  agentId: string
  hasGithubRepo: boolean
}

export default function AgentAnalysisLogs({ agentId, hasGithubRepo }: Props) {
  const [logs, setLogs] = useState<Log[] | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isRunning = logs?.some(l => l.status === 'running') ?? false
  const isDone = logs !== null && logs.length > 0 && !isRunning
  const hasErrors = logs?.some(l => l.status === 'error') ?? false

  const fetchLogs = async () => {
    const res = await fetch(`/api/agents/${agentId}/logs`)
    if (!res.ok) return
    const data: Log[] = await res.json()
    setLogs(data)
    return data
  }

  const startPolling = () => {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      const data = await fetchLogs()
      if (data && !data.some(l => l.status === 'running')) {
        stopPolling()
      }
    }, 2000)
  }

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => {
    fetchLogs().then(data => {
      if (data && data.some(l => l.status === 'running')) {
        setExpanded(true)
        startPolling()
      }
    })
    return () => stopPolling()
  }, [agentId]) // eslint-disable-line react-hooks/exhaustive-deps

  const triggerAnalysis = async () => {
    setTriggering(true)
    setLogs([])
    setExpanded(true)
    await fetch(`/api/agents/${agentId}/analyze`, { method: 'POST' })
    setTriggering(false)
    // Give the server a moment to write the first log entry
    setTimeout(() => {
      fetchLogs()
      startPolling()
    }, 800)
  }

  const noLogs = logs !== null && logs.length === 0

  return (
    <div className="border border-zinc-800 rounded-xl bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-semibold text-zinc-200">Agent briefing</span>
          {isRunning && (
            <span className="text-xs text-violet-400 font-medium animate-pulse">Analyzing…</span>
          )}
          {isDone && !hasErrors && (
            <span className="text-xs text-emerald-400 font-medium">Ready</span>
          )}
          {isDone && hasErrors && (
            <span className="text-xs text-amber-400 font-medium">Partial</span>
          )}
        </div>
        <span className="text-xs text-zinc-600">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Description */}
          <p className="text-xs text-zinc-500">
            {noLogs
              ? `Analyzes GitHub commits, reads PostHog behavior data, and researches optimization frameworks — gives your agent deep context to answer questions intelligently.`
              : isRunning
              ? `Building your agent's knowledge base. This takes about 30–60 seconds.`
              : `Your agent has been briefed on your codebase, user behavior, and optimization research.`
            }
          </p>

          {/* Log stream */}
          {logs && logs.length > 0 && (
            <div className="bg-zinc-950 rounded-lg border border-zinc-800 px-4 py-3 space-y-2.5">
              {logs.map(log => <LogLine key={log.id} log={log} />)}
            </div>
          )}

          {/* Actions */}
          {noLogs ? (
            <Button
              onClick={triggerAnalysis}
              disabled={triggering}
              size="sm"
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
            >
              {triggering
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Starting…</>
                : <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Analyze now</>
              }
            </Button>
          ) : isDone && (
            <button
              onClick={triggerAnalysis}
              disabled={triggering || isRunning}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`h-3 w-3 ${triggering ? 'animate-spin' : ''}`} />
              Re-analyze
            </button>
          )}

          {!hasGithubRepo && noLogs && (
            <p className="text-xs text-zinc-600">
              Tip: connect a GitHub repo in the agent setup to enable commit history analysis.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
