import { createHmac } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

// Use service-role client (no user session in Slack events)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function verifySlackSignature(body: string, headers: Headers): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) return false

  const timestamp = headers.get('x-slack-request-timestamp')
  const signature = headers.get('x-slack-signature')
  if (!timestamp || !signature) return false

  // Reject requests older than 5 minutes (replay attack prevention)
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false

  const baseString = `v0:${timestamp}:${body}`
  const computed = `v0=${createHmac('sha256', signingSecret).update(baseString).digest('hex')}`
  return computed === signature
}

async function embedText(text: string): Promise<number[]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.VOYAGE_API_KEY}` },
    body: JSON.stringify({ input: [text], model: 'voyage-3-lite' }),
  })
  const data = await res.json()
  return data.data[0].embedding
}

async function findRelevantChunks(
  supabase: ReturnType<typeof getServiceClient>,
  agentId: string,
  question: string,
  topK = 3
): Promise<string[]> {
  try {
    const embedding = await embedText(question)
    const { data } = await supabase.rpc('match_agent_documents', {
      agent_id_param: agentId,
      query_embedding: embedding,
      match_count: topK,
    })
    return (data || []).map((row: { content: string }) => row.content)
  } catch {
    return []
  }
}

export async function POST(request: Request) {
  const body = await request.text()

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Handle URL verification challenge BEFORE signature check —
  // Slack sends this once during app setup to confirm we control the URL.
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge })
  }

  // Verify Slack signature for all real events
  if (!verifySlackSignature(body, request.headers)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Only handle message events — respond immediately with 200 then process async
  const event = payload.event as Record<string, unknown> | undefined
  if (payload.type !== 'event_callback' || !event) {
    return NextResponse.json({ ok: true })
  }

  // Ignore bot messages, message edits, deletions
  if (
    event.type !== 'message' ||
    event.channel_type !== 'im' ||
    event.bot_id ||
    event.subtype
  ) {
    return NextResponse.json({ ok: true })
  }

  const teamId = payload.team_id as string
  const channelId = event.channel as string
  const userMessage = (event.text as string || '').trim()
  const slackTs = event.ts as string

  if (!userMessage) return NextResponse.json({ ok: true })

  // Process asynchronously so we return 200 to Slack within 3 seconds
  void (async () => {
    try {
      const supabase = getServiceClient()

      // Route to the right agent by (team_id, channel_id)
      const { data: agent } = await supabase
        .from('agents')
        .select('id, name, url, target_element, system_instructions, slack_bot_token')
        .eq('slack_team_id', teamId)
        .eq('slack_channel_id', channelId)
        .single()

      if (!agent?.slack_bot_token) return

      // Fetch conversation history (last 10 messages)
      const { data: history } = await supabase
        .from('slack_messages')
        .select('role, content')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: true })
        .limit(10)

      // Find relevant document chunks via pgvector (if Voyage key present)
      let docChunks: string[] = []
      if (process.env.VOYAGE_API_KEY) {
        docChunks = await findRelevantChunks(supabase, agent.id, userMessage)
      }

      // Build system prompt
      const targetEl = agent.target_element as { type?: string; text?: string } | null
      let systemPrompt = `You are ${agent.name}, a NorthStar AI agent helping optimize ${agent.url || 'this product'}.`
      if (targetEl?.text) {
        systemPrompt += `\nGoal: improve the "${targetEl.text}" ${targetEl.type || 'element'} conversion rate.`
      }
      if (agent.system_instructions) {
        systemPrompt += `\n\n${agent.system_instructions}`
      }
      systemPrompt += `\n\nYou are communicating via Slack DM. Keep replies concise, use bullet points when listing, and avoid markdown headers.`
      if (docChunks.length > 0) {
        systemPrompt += `\n\nRelevant knowledge:\n${docChunks.join('\n\n---\n\n')}`
      }

      // Build message history for Claude
      const messages: Anthropic.MessageParam[] = [
        ...((history || []).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))),
        { role: 'user', content: userMessage },
      ]

      // Call Claude
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        messages,
      })

      const reply = response.content[0].type === 'text' ? response.content[0].text : ''
      if (!reply) return

      // Post reply to Slack
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agent.slack_bot_token}` },
        body: JSON.stringify({ channel: channelId, text: reply, thread_ts: slackTs }),
      })

      // Save conversation to history
      await supabase.from('slack_messages').insert([
        { agent_id: agent.id, role: 'user', content: userMessage, slack_ts: slackTs },
        { agent_id: agent.id, role: 'assistant', content: reply },
      ])
    } catch (err) {
      console.error('[slack/events] error:', err)
    }
  })()

  return NextResponse.json({ ok: true })
}
