'use client'

import { useState, useEffect } from 'react'
import {
  ChevronRight, Sparkles, BarChart2, GitBranch,
  MessageSquare, Rocket, BookOpen, FileText, Settings,
} from 'lucide-react'

interface AgentStatus {
  posthog_api_key: string | null
  analytics_config: { posthog?: { api_key?: string } } | null
  github_repo: string | null
  slack_channel_id: string | null
  context_summary: string | null
}

type GroupKey = 'analytics' | 'codebase' | 'slack' | 'onboarding' | 'documents'

function lsGet(agentId: string, k: string, def: boolean): boolean {
  try {
    const v = localStorage.getItem(`ns_tree_${agentId}_${k}`)
    return v !== null ? v === 'true' : def
  } catch { return def }
}
function lsSet(agentId: string, k: string, v: boolean) {
  try { localStorage.setItem(`ns_tree_${agentId}_${k}`, String(v)) } catch {}
}

// ── Leaf row ──────────────────────────────────────────────────────────────────

function Leaf({
  view, label, icon, dot, activeView, onNav,
}: {
  view: string; label: string; icon: React.ReactNode
  dot?: boolean; activeView: string; onNav: (v: string) => void
}) {
  const isActive = activeView === view
  return (
    <button
      onClick={() => onNav(view)}
      className={`w-full flex items-center gap-1.5 px-2 rounded transition-colors ${
        isActive
          ? 'bg-violet-500/15 text-white'
          : 'text-[#aaa] hover:text-white hover:bg-zinc-800/60'
      }`}
      style={{ height: 24 }}
    >
      <span className="shrink-0" style={{ lineHeight: 0, opacity: 0.65 }}>{icon}</span>
      <span className="truncate flex-1 text-left" style={{ fontSize: 12, fontWeight: 400 }}>{label}</span>
      {dot && <span className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500" />}
    </button>
  )
}

// ── Group header (collapsible) ─────────────────────────────────────────────────

function Group({
  groupKey, label, open, onToggle, children,
}: {
  groupKey: GroupKey; label: string; open: boolean
  onToggle: (k: GroupKey) => void; children: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={() => onToggle(groupKey)}
        className="w-full flex items-center gap-1 px-2 rounded hover:bg-zinc-800/40 transition-colors"
        style={{ height: 24 }}
      >
        <ChevronRight
          style={{
            width: 10, height: 10, color: '#555', flexShrink: 0,
            transition: 'transform 0.15s',
            transform: open ? 'rotate(90deg)' : 'none',
          }}
        />
        <span style={{ fontSize: 10, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
      </button>
      {open && (
        <div style={{ marginLeft: 10, paddingLeft: 8, borderLeft: '1px solid #3a3a3a' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function AgentNavSection({ agentId }: { agentId: string }) {
  const [activeView, setActiveView] = useState('hypotheses')
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const [groups, setGroups] = useState<Record<GroupKey, boolean>>({
    analytics: true, codebase: true, slack: true, onboarding: true, documents: true,
  })

  // Hydrate collapse state from localStorage (mount-only to avoid SSR mismatch)
  useEffect(() => {
    setGroups({
      analytics: lsGet(agentId, 'analytics', true),
      codebase: lsGet(agentId, 'codebase', true),
      slack: lsGet(agentId, 'slack', true),
      onboarding: lsGet(agentId, 'onboarding', true),
      documents: lsGet(agentId, 'documents', true),
    })
  }, [agentId])

  useEffect(() => {
    fetch(`/api/agents/${agentId}`)
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {})
  }, [agentId])

  useEffect(() => {
    const h = (e: Event) => setActiveView((e as CustomEvent<{ view: string }>).detail.view)
    window.addEventListener('agent-nav', h)
    return () => window.removeEventListener('agent-nav', h)
  }, [])

  const nav = (view: string) => {
    setActiveView(view)
    window.dispatchEvent(new CustomEvent('agent-nav', { detail: { view } }))
  }

  const toggle = (key: GroupKey) => {
    setGroups(prev => {
      const next = { ...prev, [key]: !prev[key] }
      lsSet(agentId, key, next[key])
      return next
    })
  }

  const phOn = !!(status?.posthog_api_key ?? status?.analytics_config?.posthog?.api_key)
  const ghOn = !!status?.github_repo
  const slackOn = !!status?.slack_channel_id
  const briefOn = !!status?.context_summary

  const leafProps = { activeView, onNav: nav }
  const iconSz = { width: 12, height: 12 }

  return (
    <div className="hidden md:block pb-1" style={{ marginLeft: 18, paddingLeft: 10, borderLeft: '1px solid #3a3a3a' }}>

      {/* Growth Opportunities — leaf child */}
      <Leaf view="hypotheses" label="Growth Opportunities"
        icon={<Sparkles style={iconSz} />} {...leafProps} />

      {/* Analytics */}
      <Group groupKey="analytics" label="Analytics" open={groups.analytics} onToggle={toggle}>
        <Leaf view="analytics" label="PostHog" dot={phOn}
          icon={<BarChart2 style={iconSz} />} {...leafProps} />
      </Group>

      {/* Codebase */}
      <Group groupKey="codebase" label="Codebase" open={groups.codebase} onToggle={toggle}>
        <Leaf view="codebase" label="GitHub" dot={ghOn}
          icon={<GitBranch style={iconSz} />} {...leafProps} />
      </Group>

      {/* Slack */}
      <Group groupKey="slack" label="Slack" open={groups.slack} onToggle={toggle}>
        <Leaf view="slack" label={slackOn ? 'Workspace' : 'Not connected'} dot={slackOn}
          icon={<MessageSquare style={iconSz} />} {...leafProps} />
      </Group>

      {/* Onboarding */}
      <Group groupKey="onboarding" label="Onboarding" open={groups.onboarding} onToggle={toggle}>
        <Leaf view="simulation" label="ICP Simulation"
          icon={<Rocket style={iconSz} />} {...leafProps} />
        <Leaf view="briefing" label="Agent Briefing" dot={briefOn}
          icon={<BookOpen style={iconSz} />} {...leafProps} />
      </Group>

      {/* Documents */}
      <Group groupKey="documents" label="Documents" open={groups.documents} onToggle={toggle}>
        <Leaf view="documents" label="Files & uploads"
          icon={<FileText style={iconSz} />} {...leafProps} />
        <Leaf view="instructions" label="Instructions"
          icon={<Settings style={iconSz} />} {...leafProps} />
      </Group>

    </div>
  )
}
