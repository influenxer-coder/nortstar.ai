'use client'

import { Badge } from '@/components/ui/badge'

const severityClass: Record<string, string> = {
  critical: 'bg-red-600',
  high: 'bg-orange-600',
  medium: 'bg-yellow-600',
  low: 'bg-green-600',
}

export function InsightArtifact({ content }: { content: Record<string, unknown> }) {
  const insights = (content.insights as Array<Record<string, unknown>>) || []
  return (
    <div className="space-y-6">
      {insights.map((insight: Record<string, unknown>, i: number) => (
        <div key={i} className="space-y-3 rounded-lg bg-zinc-900 p-4">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold text-zinc-100">{String(insight.title ?? '')}</h3>
            <Badge className={severityClass[String(insight.severity ?? '')] || 'bg-zinc-600'}>
              {String(insight.severity ?? '')}
            </Badge>
          </div>
          <p className="text-zinc-300">{String(insight.description ?? insight.summary ?? '')}</p>
          {insight.mentions != null && (
            <div className="text-sm text-zinc-500">
              <span className="font-medium">{String(insight.mentions)}</span> mentions
            </div>
          )}
          {Array.isArray(insight.evidence) && insight.evidence.length > 0 && (
            <div className="space-y-2 border-t border-zinc-800 pt-3">
              <p className="text-sm font-medium text-zinc-500">Evidence</p>
              {(insight.evidence as Array<{ quote?: string; source?: string }>).map((ev, j) => (
                <div
                  key={j}
                  className="border-l-2 border-zinc-700 pl-3 text-sm italic text-zinc-300"
                >
                  &quot;{ev.quote}&quot; — {ev.source ?? 'Customer'}
                </div>
              ))}
            </div>
          )}
          {Boolean(insight.recommendation) && (
            <div className="border-t border-zinc-800 pt-3">
              <p className="text-sm font-medium text-zinc-500">Recommendation</p>
              <p className="mt-1 text-sm text-zinc-300">{String(insight.recommendation)}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
