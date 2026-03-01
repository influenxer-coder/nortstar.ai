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
      .select('id, name, url, context_summary, target_element')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single(),
  ])

  if (!hypothesis || !agent) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const targetDesc = (agent.target_element as { text?: string } | null)?.text ?? 'the target feature'

  const systemPrompt = `You are ${agent.name}, a NorthStar AI agent helping optimize ${agent.url ?? 'this product'}.

The user wants to understand the following improvement hypothesis:

**${hypothesis.title}**
Source: ${hypothesis.source}
Hypothesis: ${hypothesis.hypothesis}
Suggested change: ${hypothesis.suggested_change ?? 'No specific change suggested yet'}
Impact score: ${hypothesis.impact_score}/5

${agent.context_summary ? `\n## Background context\n${agent.context_summary}` : ''}

Answer the user's questions about this hypothesis specifically. Explain where the insight came from, what data supports it, how confident you are, and how they should act on it. Be concise and specific — you're in a product workspace, not a chat. Use bullet points.`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...(body.history ?? []),
    { role: 'user', content: body.message.trim() },
  ]

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
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
