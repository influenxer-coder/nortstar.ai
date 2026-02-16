'use client'

import { Bell, ExternalLink, AlertTriangle, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/utils'

const MOCK_ALERTS = [
  {
    id: '1',
    type: 'churn_risk',
    title: '⚠️ CHURN RISK: 3 new tickets mention canceling',
    message: 'Customers affected: Acme Corp (Enterprise, $50K ARR), StartupCo (Pro, $5K ARR), BuildFast (Pro, $5K ARR)',
    time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    severity: 'critical',
    actions: ['View Tickets', 'Notify @eng-team', 'Add to Sprint'],
  },
  {
    id: '2',
    type: 'critical_insight',
    title: '🔴 NEW CRITICAL: Invite button reported broken by 5 more users',
    message: '5 new Zendesk tickets in the last 2 hours reporting the same invite button issue. Total now: 23 mentions.',
    time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    severity: 'critical',
    actions: ['View Insight', 'Generate PRD', 'Escalate'],
  },
  {
    id: '3',
    type: 'weekly_report',
    title: '📊 Weekly Insights Report — Week of Feb 8-14, 2026',
    message: 'Your weekly report is ready: 5 top pain points, 3 feature requests trending up, 2 positive signals.',
    time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    severity: 'info',
    actions: ['View Report'],
  },
]

const SEVERITY_STYLES = {
  critical: 'border-red-500/20 bg-red-500/5',
  high: 'border-orange-500/20 bg-orange-500/5',
  info: 'border-zinc-700 bg-zinc-900/50',
}

export default function AlertsPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top bar */}
      <div className="sticky top-0 z-10 px-6 py-3 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold text-zinc-100">Alerts</h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-zinc-500">Monitoring live</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-3xl">
        {/* Slack integration banner */}
        <div className="border border-violet-500/20 bg-violet-500/5 rounded-lg p-4 mb-6 flex items-start gap-3">
          <div className="text-2xl">💬</div>
          <div className="flex-1">
            <div className="text-sm font-medium text-violet-300 mb-1">NorthStar posts alerts to Slack</div>
            <div className="text-xs text-zinc-500">
              Critical insights and churn risks are automatically posted to{' '}
              <span className="text-zinc-300 font-mono">#product-insights</span> in real-time.
              You never miss an important signal.
            </div>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs border-violet-500/30 text-violet-400">
            Configure
          </Button>
        </div>

        {/* Alert list */}
        <div className="space-y-3">
          {MOCK_ALERTS.map(alert => (
            <Card
              key={alert.id}
              className={`p-4 ${SEVERITY_STYLES[alert.severity as keyof typeof SEVERITY_STYLES]}`}
            >
              <div className="flex items-start gap-3">
                <Bell className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-medium text-zinc-100">{alert.title}</h3>
                    <span className="text-xs text-zinc-600 shrink-0">{formatRelativeTime(alert.time)}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{alert.message}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {alert.actions.map(action => (
                      <Button key={action} size="sm" variant="outline" className="h-6 text-[11px] px-2">
                        {action}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Sample Slack message */}
        <div className="mt-8">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Sample Slack Alert
          </h2>
          <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900 font-mono text-xs">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🤖</span>
              <div>
                <span className="font-bold text-zinc-100">NorthStar</span>
                <span className="text-zinc-600 ml-2">App · 2:34 PM</span>
              </div>
            </div>
            <div className="space-y-2 text-zinc-300">
              <div className="font-bold">⚠️ CHURN RISK: 3 new tickets mention canceling due to team invite bug</div>
              <div className="text-zinc-400">Customers affected:</div>
              <div className="pl-3 space-y-1 text-zinc-400">
                <div>• Acme Corp (Enterprise, $50K ARR)</div>
                <div>• StartupCo (Pro, $5K ARR)</div>
                <div>• BuildFast (Pro, $5K ARR)</div>
              </div>
              <div className="text-violet-400 mt-2">💡 Recommended: Escalate to engineering ASAP</div>
              <div className="flex gap-2 mt-3">
                {['View Tickets', 'Notify @eng-team', 'Add to Sprint'].map(btn => (
                  <span key={btn} className="border border-zinc-700 rounded px-2 py-1 text-zinc-300 cursor-pointer hover:bg-zinc-800 flex items-center gap-1">
                    {btn} <ExternalLink className="w-3 h-3" />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
