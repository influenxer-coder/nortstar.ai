'use client'

import { useState, useEffect } from 'react'
import { Sparkles, BarChart2, GitBranch, MessageSquare, Rocket, BookOpen, FileText, Settings } from 'lucide-react'

interface AgentConnectionStatus {
  posthog_api_key: string | null
  analytics_config: { posthog?: { api_key?: string } } | null
  github_repo: string | null
  slack_channel_id: string | null
  context_summary: string | null
}

interface Props {
  agentId: string
}

export default function AgentNavSection({ agentId }: Props) {
  const [activeView, setActiveView] = useState('hypotheses')
  const [status, setStatus] = useState<AgentConnectionStatus | null>(null)

  useEffect(() => {
    fetch(`/api/agents/${agentId}`)
      .then(r => r.json())
      .then((data: AgentConnectionStatus) => setStatus(data))
      .catch(() => {})
  }, [agentId])

  useEffect(() => {
    const handler = (e: Event) => {
      setActiveView((e as CustomEvent<{ view: string }>).detail.view)
    }
    window.addEventListener('agent-nav', handler)
    return () => window.removeEventListener('agent-nav', handler)
  }, [])

  const navigate = (view: string) => {
    setActiveView(view)
    window.dispatchEvent(new CustomEvent('agent-nav', { detail: { view } }))
  }

  const phConnected = !!(status?.posthog_api_key ?? status?.analytics_config?.posthog?.api_key)
  const ghConnected = !!status?.github_repo
  const slackConnected = !!status?.slack_channel_id
  const hasBriefing = !!status?.context_summary

  const itemClass = (view: string) =>
    `w-full flex items-center gap-2 rounded-md pl-8 pr-2 py-1.5 text-xs transition-colors ${
      activeView === view
        ? 'bg-zinc-800 text-zinc-100'
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
    }`

  return (
    <div className="hidden md:block">
      {/* Growth Opportunities */}
      <button onClick={() => navigate('hypotheses')} className={itemClass('hypotheses')}>
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden md:block truncate flex-1">Growth Opportunities</span>
      </button>

      {/* Analytics */}
      <div className="px-4 pt-3 pb-1 hidden md:block">
        <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Analytics</p>
      </div>
      <button onClick={() => navigate('analytics')} className={itemClass('analytics')}>
        <BarChart2 className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden md:block truncate flex-1">PostHog</span>
        {phConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto shrink-0" />}
      </button>

      {/* Codebase */}
      <div className="px-4 pt-3 pb-1 hidden md:block">
        <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Codebase</p>
      </div>
      <button onClick={() => navigate('codebase')} className={itemClass('codebase')}>
        <GitBranch className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden md:block truncate flex-1">GitHub</span>
        {ghConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto shrink-0" />}
      </button>

      {/* Slack */}
      <div className="px-4 pt-3 pb-1 hidden md:block">
        <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Slack</p>
      </div>
      <button onClick={() => navigate('slack')} className={itemClass('slack')}>
        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden md:block truncate flex-1">
          {slackConnected ? 'Workspace' : 'Not connected'}
        </span>
        {slackConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto shrink-0" />}
      </button>

      {/* Onboarding */}
      <div className="px-4 pt-3 pb-1 hidden md:block">
        <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Onboarding</p>
      </div>
      <button onClick={() => navigate('simulation')} className={itemClass('simulation')}>
        <Rocket className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden md:block truncate flex-1">ICP Simulation</span>
      </button>
      <button onClick={() => navigate('briefing')} className={itemClass('briefing')}>
        <BookOpen className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden md:block truncate flex-1">Agent Briefing</span>
        {hasBriefing && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto shrink-0" />}
      </button>

      {/* Documents */}
      <div className="px-4 pt-3 pb-1 hidden md:block">
        <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Documents</p>
      </div>
      <button onClick={() => navigate('documents')} className={itemClass('documents')}>
        <FileText className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden md:block truncate flex-1">Files &amp; uploads</span>
      </button>
      <button onClick={() => navigate('instructions')} className={itemClass('instructions')}>
        <Settings className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden md:block truncate flex-1">Instructions</span>
      </button>
    </div>
  )
}
