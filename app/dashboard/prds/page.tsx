'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus, Clock, CheckCircle, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DEMO_INSIGHTS } from '@/lib/demo-data'
import { formatRelativeTime } from '@/lib/utils'

const MOCK_PRDS = [
  {
    id: 'prd-1',
    insight_id: 'demo-insight-1',
    title: 'PRD: Single Sign-On (SSO) Integration',
    status: 'draft',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    sections: 7,
    evidence_count: 3,
  },
  {
    id: 'prd-2',
    insight_id: 'demo-insight-0',
    title: 'PRD: Team Invite Flow Redesign',
    status: 'reviewed',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    sections: 7,
    evidence_count: 4,
  },
]

const STATUS_CONFIG = {
  draft: { icon: <Clock className="w-3 h-3" />, label: 'Draft', class: 'text-zinc-500' },
  reviewed: { icon: <CheckCircle className="w-3 h-3 text-blue-400" />, label: 'Reviewed', class: 'text-blue-400' },
  shipped: { icon: <Rocket className="w-3 h-3 text-green-400" />, label: 'Shipped', class: 'text-green-400' },
}

export default function PRDsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="sticky top-0 z-10 px-6 py-3 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold text-zinc-100">PRDs</h1>
          <Button
            size="sm"
            className="h-7 text-xs bg-violet-600 hover:bg-violet-500 gap-1.5"
            onClick={() => router.push('/dashboard/generate-prd')}
          >
            <Plus className="w-3 h-3" />
            New PRD
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl">
        {MOCK_PRDS.length > 0 ? (
          <div className="space-y-3">
            {MOCK_PRDS.map(prd => {
              const statusConf = STATUS_CONFIG[prd.status as keyof typeof STATUS_CONFIG]
              return (
                <Card
                  key={prd.id}
                  className="p-4 hover:border-zinc-700 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/generate-prd?prdId=${prd.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-zinc-100 truncate">{prd.title}</h3>
                        <div className={`flex items-center gap-1 text-xs shrink-0 ${statusConf.class}`}>
                          {statusConf.icon}
                          {statusConf.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span>{prd.sections} sections</span>
                        <span>{prd.evidence_count} evidence quotes</span>
                        <span>{formatRelativeTime(prd.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20 text-zinc-600">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm mb-4">No PRDs yet.</p>
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-500"
              onClick={() => router.push('/dashboard/generate-prd')}
            >
              Generate Your First PRD
            </Button>
          </div>
        )}

        {/* Quick generate from insights */}
        <div className="mt-8">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Quick Generate from Insights
          </h2>
          <div className="space-y-2">
            {DEMO_INSIGHTS.slice(0, 3).map((insight, i) => (
              <button
                key={i}
                onClick={() => router.push(`/dashboard/generate-prd?insightId=demo-insight-${i}`)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900 transition-colors text-left"
              >
                <span className="text-sm">⚡</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-300 truncate">{insight.title}</p>
                  <p className="text-[10px] text-zinc-600">{insight.mention_count} mentions</p>
                </div>
                <span className="text-xs text-violet-400 shrink-0">Generate PRD →</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
