import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { id: string; hid: string } }

/**
 * POST /api/agents/{id}/hypotheses/{hid}/implement
 *
 * Creates an opportunity from a hypothesis so it can go through
 * the InvestigateModal flow (plan → prototype → launch).
 * Returns the opportunity ID + context needed for the modal.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch hypothesis
  const { data: hypothesis } = await supabase
    .from('agent_hypotheses')
    .select('*')
    .eq('id', params.hid)
    .eq('agent_id', params.id)
    .single()
  if (!hypothesis) return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 })

  // Fetch agent with all context
  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, url, product_id, project_id, goal, target_element, main_kpi, context_summary')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  // Find the project_id — try agent.project_id first, then look up from product
  let projectId = agent.project_id as string | null
  if (!projectId && agent.product_id) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, strategy_json')
      .eq('user_id', user.id)
      .eq('onboarding_completed', true)
    const proj = projects?.find(p => {
      const ctx = ((p.strategy_json as Record<string, unknown>)?.onboarding_context as Record<string, unknown> | undefined)
      return ctx?.created_product_id === agent.product_id
    })
    projectId = proj?.id ?? null
  }

  // Get product URL from project
  let productUrl = agent.url ?? ''
  if (projectId) {
    const { data: proj } = await supabase.from('projects').select('url').eq('id', projectId).single()
    if (proj?.url) productUrl = proj.url
  }

  // Check if opportunity already exists for this hypothesis
  const { data: existing } = await supabase
    .from('opportunities')
    .select('id')
    .eq('user_id', user.id)
    .eq('title', hypothesis.title as string)
    .eq('project_id', projectId ?? '')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      opportunity_id: existing.id,
      project_id: projectId,
      product_url: productUrl,
      goal: agent.goal,
      hypothesis_context: {
        hypothesis_id: hypothesis.id,
        title: hypothesis.title,
        hypothesis: hypothesis.hypothesis,
        suggested_change: hypothesis.suggested_change,
        source: hypothesis.source,
        impact_score: hypothesis.impact_score,
        agent_url: agent.url,
        agent_name: agent.name,
        agent_context_summary: agent.context_summary,
        target_element: agent.target_element,
      },
    })
  }

  // Create opportunity from hypothesis
  const { data: opportunity, error } = await supabase
    .from('opportunities')
    .insert({
      user_id: user.id,
      project_id: projectId,
      title: hypothesis.title as string,
      goal: (agent.goal as string) ?? '',
      evidence: hypothesis.hypothesis as string,
      winning_pattern: hypothesis.suggested_change as string ?? '',
      confidence: (hypothesis.impact_score as number) >= 4 ? 'high' : (hypothesis.impact_score as number) >= 3 ? 'medium' : 'low',
      confidence_reason: `Source: ${hypothesis.source}`,
      impact_score: hypothesis.impact_score as number,
      decision_badge: 'do_first',
      expected_lift_low: (hypothesis.impact_score as number) * 3,
      expected_lift_high: (hypothesis.impact_score as number) * 7,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update hypothesis status to in_planning
  await supabase
    .from('agent_hypotheses')
    .update({ status: 'in_planning' })
    .eq('id', params.hid)

  return NextResponse.json({
    opportunity_id: opportunity.id,
    project_id: projectId,
    product_url: productUrl,
    goal: agent.goal,
    hypothesis_context: {
      hypothesis_id: hypothesis.id,
      title: hypothesis.title,
      hypothesis: hypothesis.hypothesis,
      suggested_change: hypothesis.suggested_change,
      source: hypothesis.source,
      impact_score: hypothesis.impact_score,
      agent_url: agent.url,
      agent_name: agent.name,
      agent_context_summary: agent.context_summary,
      target_element: agent.target_element,
    },
  })
}
