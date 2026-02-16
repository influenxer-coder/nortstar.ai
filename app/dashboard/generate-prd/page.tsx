'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { PRDEditor } from '@/components/prd-editor'
import { Button } from '@/components/ui/button'
import { DEMO_INSIGHTS, DEMO_PRD_CONTENT } from '@/lib/demo-data'
import type { PRD, Insight } from '@/lib/types'

const GENERATION_STEPS = [
  { icon: '🔍', text: 'Analyzing customer conversations' },
  { icon: '📝', text: 'Extracting user quotes & pain points' },
  { icon: '🏗️', text: 'Drafting PRD sections' },
  { icon: '📊', text: 'Suggesting success metrics' },
  { icon: '✅', text: 'Finalizing document' },
]

function GeneratingAnimation({ insight }: { insight: Insight | null }) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  useEffect(() => {
    GENERATION_STEPS.forEach((_, i) => {
      setTimeout(() => {
        setCompletedSteps(prev => [...prev, i])
      }, (i + 1) * 600)
    })
  }, [])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-6 relative">
          <span className="text-2xl">🧠</span>
          <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-ping" />
        </div>

        <h3 className="text-lg font-semibold text-zinc-100 mb-1">NorthStar is thinking…</h3>
        {insight && (
          <p className="text-sm text-zinc-500 mb-6 truncate max-w-xs mx-auto">
            Generating PRD for: {insight.title}
          </p>
        )}

        <div className="space-y-3 text-left">
          {GENERATION_STEPS.map((step, i) => {
            const isDone = completedSteps.includes(i)
            const isActive = !isDone && completedSteps.length === i
            return (
              <div
                key={i}
                className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                  isDone ? 'text-zinc-300' : isActive ? 'text-violet-400' : 'text-zinc-700'
                }`}
              >
                <span className="text-base w-5 text-center">
                  {isDone ? <CheckCircle className="w-4 h-4 text-green-400 inline" /> : isActive ? <Loader2 className="w-4 h-4 animate-spin inline" /> : step.icon}
                </span>
                {step.text}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function GeneratePRDContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const insightId = searchParams.get('insightId')

  const [state, setState] = useState<'selecting' | 'generating' | 'done'>('generating')
  const [insight, setInsight] = useState<Insight | null>(null)
  const [prd, setPrd] = useState<PRD | null>(null)
  const [error] = useState('')

  useEffect(() => {
    // Load insight
    if (insightId) {
      const demoInsight = DEMO_INSIGHTS.find((_, i) => `demo-insight-${i}` === insightId)
        || DEMO_INSIGHTS[0]
      setInsight({ ...demoInsight, id: insightId } as Insight)
    } else {
      // Default to first insight for demo
      setInsight({ ...DEMO_INSIGHTS[1], id: 'demo-insight-1' } as Insight)
    }
    setState('generating')

    // Auto-generate after showing animation
    const timer = setTimeout(() => {
      generatePRD()
    }, 3200)
    return () => clearTimeout(timer)
  }, [insightId])

  async function generatePRD() {
    try {
      // Try real API first, fall back to demo
      const response = await fetch('/api/generate-prd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightId: insightId || 'demo-insight-1',
          demo: true,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPrd(data.prd)
      } else {
        throw new Error('API unavailable')
      }
    } catch {
      // Use demo PRD content
      setPrd({
        id: 'demo-prd-1',
        org_id: 'demo-org',
        insight_id: insightId,
        title: insight?.title || 'Single Sign-On (SSO) Integration',
        content: DEMO_PRD_CONTENT,
        status: 'draft',
        created_by: null,
        is_demo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as PRD)
    } finally {
      setState('done')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 px-6 py-3 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="h-7 text-xs gap-1.5 text-zinc-500"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </Button>
          <span className="text-zinc-800">|</span>
          <h1 className="text-sm font-semibold text-zinc-100">Generate PRD</h1>
        </div>
        {state === 'generating' && (
          <div className="flex items-center gap-2 text-xs text-violet-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Generating…
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {state === 'generating' && <GeneratingAnimation insight={insight} />}

        {state === 'done' && prd && (
          <div className="max-w-5xl mx-auto h-[calc(100vh-100px)]">
            <PRDEditor prd={prd} />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-red-400 text-sm">{error}</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={generatePRD}>
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GeneratePRDPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>}>
      <GeneratePRDContent />
    </Suspense>
  )
}
