"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, FileText, Plus, ExternalLink, Zap } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, SEVERITY_CONFIG, formatRelativeTime } from '@/lib/utils'
import type { Insight } from '@/lib/types'

interface InsightCardProps {
  insight: Insight
  index?: number
}

const SOURCE_ICONS = {
  zendesk: '🎫',
  gong: '📞',
  intercom: '💬',
}

const TYPE_LABELS = {
  pain_point: 'PAIN POINT',
  feature_request: 'FEATURE REQUEST',
  churn_risk: 'CHURN RISK',
  positive: 'POSITIVE SIGNAL',
}

export function InsightCard({ insight, index = 0 }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [generating, setGenerating] = useState(false)
  const router = useRouter()
  const config = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.medium

  async function handleGeneratePRD() {
    setGenerating(true)
    try {
      router.push(`/dashboard/generate-prd?insightId=${insight.id}`)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div
      className={cn(
        "animate-fade-in opacity-0",
        "group relative"
      )}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
    >
      <Card
        className={cn(
          "p-0 border transition-all duration-200 cursor-pointer",
          "hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20",
          config.border,
          config.bg,
        )}
      >
        {/* Top accent line */}
        <div className={cn("h-[2px] w-full rounded-t-lg", config.dot)} />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded", config.badge)}>
                {config.emoji} {TYPE_LABELS[insight.insight_type]}
              </span>
              <span className="text-zinc-500 text-xs">
                {insight.mention_count} mention{insight.mention_count !== 1 ? 's' : ''}
              </span>
              {insight.revenue_impact && (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-medium">
                  💰 {insight.revenue_impact}
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-600 shrink-0">
              {formatRelativeTime(insight.generated_at)}
            </span>
          </div>

          {/* Title */}
          <h3 className={cn("text-base font-semibold mb-2 leading-snug", config.color)}>
            {insight.title}
          </h3>

          {/* Summary */}
          <p className="text-zinc-400 text-sm leading-relaxed mb-4">
            {insight.summary}
          </p>

          {/* Evidence preview (collapsed) */}
          {insight.evidence && insight.evidence.length > 0 && !expanded && (
            <div className="mb-4 space-y-2">
              {insight.evidence.slice(0, 2).map((ev, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-zinc-500">
                  <span>{SOURCE_ICONS[ev.source_type as keyof typeof SOURCE_ICONS] || '📌'}</span>
                  <blockquote className="italic truncate">
                    "{ev.quote.length > 80 ? ev.quote.slice(0, 80) + '…' : ev.quote}"
                  </blockquote>
                </div>
              ))}
              {insight.evidence.length > 2 && (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-xs text-zinc-600 hover:text-zinc-400 flex items-center gap-1"
                >
                  <ChevronDown className="w-3 h-3" />
                  +{insight.evidence.length - 2} more quotes
                </button>
              )}
            </div>
          )}

          {/* Evidence expanded */}
          {expanded && insight.evidence && (
            <div className="mb-4 space-y-3 border-t border-zinc-800 pt-3">
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Evidence ({insight.evidence.length} sources)
              </h4>
              {insight.evidence.map((ev, i) => (
                <div key={i} className="bg-zinc-950/50 rounded-md p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>{SOURCE_ICONS[ev.source_type as keyof typeof SOURCE_ICONS] || '📌'}</span>
                    <span className="capitalize">{ev.source_type}</span>
                    {ev.customer && <span>· {ev.customer}</span>}
                    <span>· {formatRelativeTime(ev.date)}</span>
                    {ev.recording_url && (
                      <a
                        href={ev.recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-violet-400 hover:text-violet-300 flex items-center gap-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Listen
                      </a>
                    )}
                  </div>
                  <blockquote className="text-xs text-zinc-300 italic leading-relaxed">
                    "{ev.quote}"
                  </blockquote>
                </div>
              ))}
              <button
                onClick={() => setExpanded(false)}
                className="text-xs text-zinc-600 hover:text-zinc-400 flex items-center gap-1"
              >
                <ChevronUp className="w-3 h-3" />
                Collapse
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={handleGeneratePRD}
              disabled={generating}
              className="bg-violet-600 hover:bg-violet-500 text-white text-xs h-7 gap-1.5"
            >
              {generating ? (
                <>
                  <span className="animate-pulse">●</span>
                  Generating…
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3" />
                  Generate PRD
                </>
              )}
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5">
              <FileText className="w-3 h-3" />
              View Evidence
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-7 gap-1.5 text-zinc-500">
              <Plus className="w-3 h-3" />
              Add to Sprint
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
