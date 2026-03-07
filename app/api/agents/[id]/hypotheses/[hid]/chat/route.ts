import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// Tools Claude can call to act on the hypothesis backlog
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'update_hypothesis',
    description: 'Update a hypothesis — change its title, hypothesis statement, suggested change, or status. Use when the user agrees to a refinement or asks to change a hypothesis.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hypothesis_id: { type: 'string', description: 'The ID of the hypothesis to update' },
        title: { type: 'string', description: 'New title (optional)' },
        hypothesis: { type: 'string', description: 'Refined hypothesis statement (optional)' },
        suggested_change: { type: 'string', description: 'Concrete suggested change (optional)' },
        status: { type: 'string', enum: ['proposed', 'accepted', 'rejected', 'in_planning', 'shipped'], description: 'New status (optional)' },
      },
      required: ['hypothesis_id'],
    },
  },
]

export async function POST(
  request: Request,
  { params }: { params: { id: string; hid: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { message: string; history?: Array<{ role: 'user' | 'assistant'; content: string }> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  // Fetch current hypothesis + agent + all other hypotheses in parallel
  const [{ data: hypothesis }, { data: agent }, { data: allHypotheses }] = await Promise.all([
    supabase
      .from('agent_hypotheses')
      .select('*')
      .eq('id', params.hid)
      .eq('agent_id', params.id)
      .single(),
    supabase
      .from('agents')
      .select('id, name, url, context_summary, target_element, main_kpi')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('agent_hypotheses')
      .select('id, title, hypothesis, suggested_change, impact_score, status, source')
      .eq('agent_id', params.id)
      .order('impact_score', { ascending: false }),
  ])

  if (!hypothesis || !agent) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const targetDesc = (agent.target_element as { text?: string } | null)?.text
  const kpi = (agent as { main_kpi?: string }).main_kpi

  // Compact backlog summary — other hypotheses, not the current one
  const otherHypotheses = (allHypotheses ?? []).filter(h => h.id !== params.hid)
  const backlogSummary = otherHypotheses.length > 0
    ? otherHypotheses.map(h =>
        `- [${h.id}] **${h.title}** (${h.status}, impact ${h.impact_score}/5)\n  ${h.hypothesis}`
      ).join('\n')
    : 'No other hypotheses yet.'

  const systemPrompt = `You are a sharp, opinionated product strategist helping refine and pressure-test a CRO hypothesis.

## Agent context
- **Page being optimized:** ${agent.url ?? 'unknown'}
- **Target element:** ${targetDesc ?? 'not specified'}
- **Primary KPI to move:** ${kpi ?? 'not specified'}
${agent.context_summary ? `\n## Product context\n${agent.context_summary}\n` : ''}
## Current hypothesis under review (ID: ${params.hid})
**Title:** ${hypothesis.title}
**Source:** ${hypothesis.source}
**Hypothesis statement:** ${hypothesis.hypothesis}
**Suggested change:** ${hypothesis.suggested_change ?? 'not yet defined'}
**Impact score:** ${hypothesis.impact_score}/5
**Status:** ${hypothesis.status}

## All other hypotheses in this agent's backlog
${backlogSummary}

## Your job
You are NOT just answering questions — you actively debate, challenge, and refine hypotheses. Your goal: arrive at a **crisp, implementable, well-framed hypothesis** that:
1. Directly ties to the KPI (${kpi ?? 'primary metric'})
2. Specifies the exact page change on ${agent.url ?? 'the product'}
3. Has a clear causal mechanism: "if we do X, users will Y because Z"
4. Is testable and scoped enough to ship

**How to engage:**
- Challenge weak assumptions — ask "why would this move the KPI?"
- Push back on vague language — demand specifics
- When you spot a duplicate or similar hypothesis in the backlog, call it out
- Propose sharper reframings when the hypothesis is fuzzy
- When you and the user align on a refinement, use the \`update_hypothesis\` tool to save it
- When summarizing the agreed hypothesis, put it in a blockquote
- Be direct. No filler. Use bullet points for lists.`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const messages: Anthropic.MessageParam[] = [
    ...(body.history ?? []).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: body.message.trim() },
  ]

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    })

    // If Claude wants to call a tool, execute it then get final reply
    if (resp.stop_reason === 'tool_use') {
      const toolUseBlock = resp.content.find(b => b.type === 'tool_use') as Anthropic.ToolUseBlock
      let toolResult = ''

      if (toolUseBlock?.name === 'update_hypothesis') {
        const input = toolUseBlock.input as {
          hypothesis_id: string
          title?: string
          hypothesis?: string
          suggested_change?: string
          status?: string
        }
        const updates: Record<string, string> = {}
        if (input.title) updates.title = input.title
        if (input.hypothesis) updates.hypothesis = input.hypothesis
        if (input.suggested_change) updates.suggested_change = input.suggested_change
        if (input.status) updates.status = input.status

        const { error } = await supabase
          .from('agent_hypotheses')
          .update(updates)
          .eq('id', input.hypothesis_id)
          .eq('agent_id', params.id)

        toolResult = error
          ? `Error updating hypothesis: ${error.message}`
          : `Hypothesis ${input.hypothesis_id} updated successfully: ${JSON.stringify(updates)}`
      }

      // Send tool result back to Claude for final response
      const followUp = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        system: systemPrompt,
        tools: TOOLS,
        messages: [
          ...messages,
          { role: 'assistant', content: resp.content },
          {
            role: 'user',
            content: [{ type: 'tool_result', tool_use_id: toolUseBlock.id, content: toolResult }],
          },
        ],
      })

      const reply = followUp.content.find(b => b.type === 'text')
      return NextResponse.json({
        reply: reply?.type === 'text' ? reply.text : 'Done.',
        tool_called: toolUseBlock.name,
        tool_input: toolUseBlock.input,
      })
    }

    const reply = resp.content.find(b => b.type === 'text')
    return NextResponse.json({ reply: reply?.type === 'text' ? reply.text : '' })
  } catch (e) {
    console.error('[hypothesis/chat] Claude error:', e)
    return NextResponse.json({ error: 'AI response failed' }, { status: 500 })
  }
}
