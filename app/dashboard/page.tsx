'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, RefreshCw, TrendingUp, AlertTriangle, Smile } from 'lucide-react'
import { CommandPalette } from '@/components/command-palette'
import { InsightCard } from '@/components/insight-card'
import { Button } from '@/components/ui/button'
import { DEMO_INSIGHTS, DEMO_STATS } from '@/lib/demo-data'
import type { Insight } from '@/lib/types'

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-zinc-100">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function LoadingAnimation() {
  const [step, setStep] = useState(0)
  const steps = [
    '✓ Connecting to Zendesk…',
    '✓ Pulling 127 support tickets…',
    '✓ Analyzing 23 sales call transcripts…',
    '✓ Processing 89 Intercom conversations…',
    '✓ Running AI analysis…',
    '✓ Generating insights…',
  ]

  useEffect(() => {
    if (step < steps.length - 1) {
      const timer = setTimeout(() => setStep(s => s + 1), 400)
      return () => clearTimeout(timer)
    }
  }, [step, steps.length])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🎯</span>
        </div>
        <h3 className="text-lg font-semibold text-zinc-100 mb-6">NorthStar is analyzing your data…</h3>
        <div className="space-y-2 text-left">
          {steps.slice(0, step + 1).map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-zinc-400 animate-fade-in" style={{ animationFillMode: 'both' }}>
              <span className="text-green-400">✓</span>
              {s.replace('✓ ', '')}
            </div>
          ))}
          {step < steps.length - 1 && (
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
              Processing…
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [generating, setGenerating] = useState(false)

  const loadInsights = useCallback(async () => {
    setLoading(true)
    try {
      if (isDemo) {
        // Use demo data with artificial delay for loading animation
        await new Promise(resolve => setTimeout(resolve, 2600))
        setInsights(DEMO_INSIGHTS.map((insight, i) => ({
          ...insight,
          id: `demo-insight-${i}`,
        })) as Insight[])
      } else {
        // Load from Supabase
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data, error } = await supabase
          .from('insights')
          .select('*')
          .order('generated_at', { ascending: false })
          .limit(20)

        if (error) throw error
        setInsights(data || [])
      }
    } catch (err) {
      console.error('Failed to load insights:', err)
      // Fall back to demo data
      setInsights(DEMO_INSIGHTS.map((insight, i) => ({
        ...insight,
        id: `demo-insight-${i}`,
      })) as Insight[])
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [isDemo])

  useEffect(() => {
    loadInsights()
  }, [loadInsights])

  async function handleGenerateInsights() {
    setGenerating(true)
    try {
      const response = await fetch('/api/generate-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: 'demo-org', demo: isDemo }),
      })
      if (response.ok) {
        await loadInsights()
      }
    } finally {
      setGenerating(false)
    }
  }

  const criticalCount = insights.filter(i => i.severity === 'critical').length
  const highCount = insights.filter(i => i.severity === 'high').length
  const positiveCount = insights.filter(i => i.severity === 'positive' || i.insight_type === 'positive').length

  const insightTitles = insights.slice(0, 5).map(i => ({ id: i.id, title: i.title }))

  if (initialLoad && loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="px-6 py-4 border-b border-zinc-900">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold text-zinc-100">Insights</h1>
          </div>
        </div>
        <LoadingAnimation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top bar */}
      <div className="sticky top-0 z-10 px-6 py-3 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-zinc-100">Insights</h1>
          {isDemo && (
            <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">
              Demo Mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <CommandPalette insightTitles={insightTitles} />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleGenerateInsights}
            disabled={generating}
            className="h-7 text-xs gap-1.5"
          >
            {generating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl">
        {/* Welcome message */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-zinc-100 mb-1">
            Hi Alex! 👋
          </h2>
          <p className="text-sm text-zinc-500">
            I analyzed{' '}
            <span className="text-zinc-300 font-medium">{DEMO_STATS.ticketsAnalyzed} tickets</span>,{' '}
            <span className="text-zinc-300 font-medium">{DEMO_STATS.callsAnalyzed} sales calls</span>, and{' '}
            <span className="text-zinc-300 font-medium">{DEMO_STATS.chatsAnalyzed} chats</span> from the last 90 days.
            Here&apos;s what matters:
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard
            icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
            label="Critical"
            value={criticalCount}
            sub="needs immediate action"
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4 text-orange-400" />}
            label="High Priority"
            value={highCount}
            sub="review soon"
          />
          <StatCard
            icon={<Smile className="w-4 h-4 text-green-400" />}
            label="Positive"
            value={positiveCount}
            sub="what's working"
          />
          <StatCard
            icon={<span className="text-sm">📊</span>}
            label="Total Sources"
            value={DEMO_STATS.totalDataPoints}
            sub="data points analyzed"
          />
        </div>

        {/* Insight cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : insights.length > 0 ? (
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <InsightCard key={insight.id} insight={insight} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-zinc-600">
            <div className="text-4xl mb-4">🎯</div>
            <p className="text-sm">No insights yet. Connect a data source to get started.</p>
            <Button size="sm" variant="outline" className="mt-4">
              Connect Data Source
            </Button>
          </div>
        )}

        {/* Keyboard shortcuts hint */}
        {insights.length > 0 && (
          <div className="mt-8 pt-6 border-t border-zinc-900 flex items-center gap-6 text-xs text-zinc-600">
            <span><kbd className="kbd">⌘K</kbd> command palette</span>
            <span><kbd className="kbd">G</kbd><kbd className="kbd">P</kbd> generate PRD</span>
            <span><kbd className="kbd">↑↓</kbd> navigate</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>}>
      <DashboardContent />
    </Suspense>
  )
}
