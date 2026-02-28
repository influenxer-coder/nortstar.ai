import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ArrowLeft, Bot, MessageSquare, CheckCircle2 } from 'lucide-react'
import type { Agent } from '@/lib/types'
import AgentSlackSection from './AgentSlackSection'
import AgentAnalysisLogs from './AgentAnalysisLogs'

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, url, github_repo, target_element, status, google_drive_roadmap_url, main_kpi, slack_channel_id, slack_team_id, system_instructions, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!agent) notFound()

  const typedAgent = agent as Agent

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Link
        href="/dashboard/agents"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to agents
      </Link>

      {/* Agent info */}
      <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-violet-400" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100">{typedAgent.name}</h1>
        </div>

        <dl className="space-y-4 text-sm">
          {typedAgent.url && (
            <div>
              <dt className="text-zinc-500 font-medium">Target URL</dt>
              <dd className="mt-1">
                <a href={typedAgent.url} target="_blank" rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 truncate block max-w-full">
                  {typedAgent.url}
                </a>
              </dd>
            </div>
          )}
          {typedAgent.target_element?.text && (
            <div>
              <dt className="text-zinc-500 font-medium">Target element</dt>
              <dd className="text-zinc-100 mt-1">{typedAgent.target_element.text}</dd>
            </div>
          )}
          {typedAgent.status && (
            <div>
              <dt className="text-zinc-500 font-medium">Status</dt>
              <dd className="text-zinc-100 mt-1">{typedAgent.status}</dd>
            </div>
          )}
          <div>
            <dt className="text-zinc-500 font-medium">Created</dt>
            <dd className="text-zinc-400 mt-1">{new Date(typedAgent.created_at).toLocaleString()}</dd>
          </div>
        </dl>
      </div>

      {/* Analysis logs — live briefing stream */}
      <AgentAnalysisLogs
        agentId={typedAgent.id}
        hasGithubRepo={!!typedAgent.github_repo}
      />

      {/* Slack section */}
      <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/50">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Slack</h2>
        </div>

        {typedAgent.slack_channel_id ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="text-emerald-400 font-medium">Connected</p>
              <p className="text-zinc-500 mt-0.5 text-xs">
                Your agent is active in Slack. Message it in the private channel to ask questions.
              </p>
              <a
                href={`/api/auth/slack?agent_id=${typedAgent.id}`}
                className="text-xs text-zinc-500 hover:text-zinc-300 mt-2 inline-block"
              >
                Reconnect workspace
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              Connect Slack so your agent can chat with you directly in a private channel.
            </p>
            <a
              href={`/api/auth/slack?agent_id=${typedAgent.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A154B] hover:bg-[#3a0f3b] text-white text-sm font-medium transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Connect Slack
            </a>
          </div>
        )}
      </div>

      {/* Agent instructions + knowledge base */}
      <AgentSlackSection
        agentId={typedAgent.id}
        initialInstructions={typedAgent.system_instructions ?? ''}
      />
    </div>
  )
}
