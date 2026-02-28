import { createHmac } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'

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

  // Handle URL verification challenge BEFORE signature check
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge })
  }

  // Verify Slack signature for all real events
  if (!verifySlackSignature(body, request.headers)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = payload.event as Record<string, unknown> | undefined

  if (payload.type !== 'event_callback' || !event) {
    return NextResponse.json({ ok: true })
  }

  // Ignore bot messages, message edits/deletions, non-channel messages
  // Accept private channels (group) — each agent gets its own channel
  if (
    event.type !== 'message' ||
    (event.channel_type !== 'im' && event.channel_type !== 'group') ||
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

  // Process async — waitUntil keeps the Vercel function alive after returning 200
  waitUntil((async () => {
    try {
      const supabase = getServiceClient()

      // Route to the right agent by (team_id, channel_id)
      const { data: agent } = await supabase
        .from('agents')
        .select('id, name, url, github_repo, target_element, main_kpi, system_instructions, context_summary, slack_bot_token')
        .eq('slack_team_id', teamId)
        .eq('slack_channel_id', channelId)
        .single()

      if (!agent?.slack_bot_token) return

      // Check if analysis is still running (affects how we frame the response)
      const { data: runningLogs } = await supabase
        .from('agent_logs')
        .select('id')
        .eq('agent_id', agent.id)
        .eq('status', 'running')
        .limit(1)
      const isAnalyzing = (runningLogs?.length ?? 0) > 0

      // If analysis is running and we have no context yet, send a quick heads-up first
      if (isAnalyzing && !agent.context_summary) {
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agent.slack_bot_token}` },
          body: JSON.stringify({
            channel: channelId,
            text: `I'm still warming up — analyzing your page and codebase in the background. I'll answer your question with full context in just a moment.`,
            username: agent.name,
            icon_emoji: ':robot_face:',
          }),
        })
      }

      // Fetch conversation history (last 12 messages for good context window)
      const { data: history } = await supabase
        .from('slack_messages')
        .select('role, content')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: true })
        .limit(12)

      // Find relevant document chunks via pgvector (if Voyage key present)
      let docChunks: string[] = []
      if (process.env.VOYAGE_API_KEY) {
        docChunks = await findRelevantChunks(supabase, agent.id, userMessage)
      }

      // ── Build rich system prompt ─────────────────────────────────────────────
      const targetEl = agent.target_element as { type?: string; text?: string } | null
      const targetDesc = targetEl?.text
        ? `"${targetEl.text}" ${targetEl.type || 'element'}`
        : 'the primary conversion action'

      let systemPrompt = `You are ${agent.name}, an AI product analyst and optimization specialist built by NorthStar.`

      systemPrompt += `\n\nYour mission: help this team optimize ${targetDesc} on ${agent.url || 'their product page'}`
      if (agent.main_kpi) {
        systemPrompt += ` and improve ${agent.main_kpi}`
      }
      systemPrompt += `.`

      // Deep context from the analysis pipeline
      if (agent.context_summary) {
        systemPrompt += `\n\n## What I know about this product\n${agent.context_summary}`
      } else if (isAnalyzing) {
        systemPrompt += `\n\nNote: I'm still analyzing the codebase and researching optimization frameworks for this product — my answers will get richer once that completes. Answer as helpfully as possible with general product knowledge for now.`
      }

      // Team-written instructions
      if (agent.system_instructions) {
        systemPrompt += `\n\n## Instructions from the team\n${agent.system_instructions}`
      }

      // Relevant uploaded documents
      if (docChunks.length > 0) {
        systemPrompt += `\n\n## Relevant context from team documents\n${docChunks.join('\n\n---\n\n')}`
      }

      systemPrompt += `\n\n## How to respond
- You're in Slack. Be direct, specific, and immediately useful.
- Lead with the insight or recommendation — not with caveats.
- Use bullet points for lists; avoid markdown headers (## ###).
- When you have context about recent code changes, reference them specifically.
- When you recommend something, explain the mechanism — why it works.
- If you don't know something about this specific product, say so, and offer what you do know about similar products.
- Suggest concrete next steps or experiments, not vague advice.
- Aim for the quality of a senior product consultant, not a generic chatbot.`

      // Build message history for Claude
      const messages: Anthropic.MessageParam[] = [
        ...((history || []).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))),
        { role: 'user', content: userMessage },
      ]

      // Call Claude — higher token limit for thorough answers
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages,
      })

      const reply = response.content[0].type === 'text' ? response.content[0].text : ''
      if (!reply) return

      // Post reply to Slack
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agent.slack_bot_token}` },
        body: JSON.stringify({
          channel: channelId,
          text: reply,
          username: agent.name,
          icon_emoji: ':robot_face:',
        }),
      })

      // Persist conversation history
      await supabase.from('slack_messages').insert([
        { agent_id: agent.id, role: 'user', content: userMessage, slack_ts: slackTs },
        { agent_id: agent.id, role: 'assistant', content: reply },
      ])
    } catch (err) {
      console.error('[slack/events] error:', err)
    }
  })())

  return NextResponse.json({ ok: true })
}
