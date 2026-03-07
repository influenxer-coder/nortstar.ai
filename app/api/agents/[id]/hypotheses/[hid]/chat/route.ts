import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

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

  // Fetch hypothesis + agent (with context)
  const [{ data: hypothesis }, { data: agent }] = await Promise.all([
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
  ])

  if (!hypothesis || !agent) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const targetDesc = (agent.target_element as { text?: string } | null)?.text
  const kpi = (agent as { main_kpi?: string }).main_kpi

  const systemPrompt = `You are a sharp, opinionated product strategist helping refine and pressure-test a CRO hypothesis.

## Context
- **Page being optimized:** ${agent.url ?? 'unknown'}
- **Target element:** ${targetDesc ?? 'not specified'}
- **Primary KPI to move:** ${kpi ?? 'not specified'}

## Current hypothesis under review
**Title:** ${hypothesis.title}
**Source:** ${hypothesis.source}
**Hypothesis statement:** ${hypothesis.hypothesis}
**Suggested change:** ${hypothesis.suggested_change ?? 'not yet defined'}
**Impact score:** ${hypothesis.impact_score}/5

${agent.context_summary ? `## Product context\n${agent.context_summary}\n` : ''}

## Your job
You are NOT just answering questions — you are actively debating and shaping this hypothesis with the user. Your goal is to arrive at a **crisp, implementable, well-framed hypothesis** that:
1. Directly ties to the KPI (${kpi ?? 'primary metric'})
2. Is specific about what changes on the page (${agent.url ?? 'the product'})
3. Has a clear causal mechanism (if we do X, users will do Y because Z)
4. Is testable and scoped enough to ship

**How to engage:**
- Challenge weak assumptions — ask "why would this move the KPI?"
- Push back on vague language — make the user be specific
- Propose sharper reframings when the hypothesis is fuzzy
- When you and the user align, summarize the refined hypothesis clearly in a blockquote
- Be direct and concise. No filler. Bullet points for lists.`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...(body.history ?? []),
    { role: 'user', content: body.message.trim() },
  ]

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    })
    const reply = resp.content[0].type === 'text' ? resp.content[0].text : ''
    return NextResponse.json({ reply })
  } catch (e) {
    console.error('[hypothesis/chat] Claude error:', e)
    return NextResponse.json({ error: 'AI response failed' }, { status: 500 })
  }
}
