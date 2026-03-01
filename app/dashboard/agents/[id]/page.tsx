import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Agent, Hypothesis } from '@/lib/types'
import AgentWorkspace from './AgentWorkspace'

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Fetch the current agent (full fields)
  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, url, github_repo, posthog_api_key, posthog_project_id, target_element, status, main_kpi, slack_channel_id, slack_team_id, system_instructions, context_summary, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!agent) notFound()

  // Fetch all user agents for the left-panel project picker
  const { data: allAgents } = await supabase
    .from('agents')
    .select('id, name, status')
    .eq('user_id', user.id)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })

  // Fetch existing hypotheses
  const { data: hypotheses } = await supabase
    .from('agent_hypotheses')
    .select('*')
    .eq('agent_id', id)
    .order('impact_score', { ascending: false })
    .order('created_at', { ascending: true })

  return (
    <AgentWorkspace
      agent={agent as Agent}
      agents={(allAgents ?? []) as { id: string; name: string; status: string | null }[]}
      initialHypotheses={(hypotheses ?? []) as Hypothesis[]}
    />
  )
}
