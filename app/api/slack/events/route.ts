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

// Convert Claude's markdown to Slack mrkdwn.
// Claude outputs **bold** and ## headers; Slack uses *bold* and plain text.
function toSlackMrkdwn(text: string): string {
  return text
    .replace(/^#{1,3}\s+(.+)$/gm, '*$1*')   // ## Header → *Header*
    .replace(/\*\*(.+?)\*\*/g, '*$1*')         // **bold** → *bold*
    .replace(/^---+$/gm, '')                   // remove --- dividers
    .replace(/\n{3,}/g, '\n\n')               // collapse excessive blank lines
    .trim()
}

async function getSlackUserName(token: string, userId: string): Promise<string> {
  try {
    const res = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.ok && data.user) {
      return (
        data.user.profile?.display_name ||
        data.user.profile?.real_name ||
        data.user.name ||
        userId
      )
    }
  } catch { /* noop */ }
  return userId
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

// ── Hypothesis creation tool ───────────────────────────────────────────────────
// Claude calls this when it has validated a hypothesis through back-and-forth.
// It must NOT call this on the first message — always ask at least one question first.

const CREATE_HYPOTHESIS_TOOL: Anthropic.Tool = {
  name: 'create_hypothesis',
  description:
    'Create a validated improvement hypothesis from feedback gathered in this conversation. ' +
    'Only call this after asking at least 1 KPI-focused validation question and receiving a meaningful answer. ' +
    'Never call this on the first message — always engage first.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description: 'Action-oriented title, verb-first, max 8 words',
      },
      hypothesis: {
        type: 'string',
        description:
          '2–3 sentences: (1) what problem the evidence shows, citing specifics from the conversation, ' +
          '(2) the proposed fix, (3) which KPI it would move and in which direction',
      },
      suggested_change: {
        type: 'string',
        description:
          'Exact change — element name, copy wording, layout detail. ' +
          'Quote current state vs proposed state where possible.',
      },
      impact_score: {
        type: 'number',
        description: 'Your estimated impact 1–5 based on evidence quality and KPI relevance',
      },
      evidence_summary: {
        type: 'string',
        description: 'Concise summary of the evidence and reasoning shared in this conversation',
      },
    },
    required: ['title', 'hypothesis', 'suggested_change', 'impact_score', 'evidence_summary'],
  },
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
  const slackUserId = event.user as string | undefined

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

      // Resolve the Slack user's display name for hypothesis attribution
      const slackUserName = slackUserId
        ? await getSlackUserName(agent.slack_bot_token, slackUserId)
        : 'Team member'

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

      // Post a typing indicator immediately so the user sees the bot is thinking
      const placeholderRes = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agent.slack_bot_token}` },
        body: JSON.stringify({
          channel: channelId,
          text: '…',
          username: agent.name,
          icon_emoji: ':robot_face:',
        }),
      })
      const placeholderData = await placeholderRes.json()
      const placeholderTs = placeholderData.ok ? (placeholderData.ts as string) : null

      // Helper: update the placeholder message or post a new one if placeholder failed
      // agent is guaranteed non-null past the `if (!agent?.slack_bot_token) return` check above
      const sendReply = async (text: string) => {
        if (placeholderTs) {
          await fetch('https://slack.com/api/chat.update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agent!.slack_bot_token}` },
            body: JSON.stringify({ channel: channelId, ts: placeholderTs, text }),
          })
        } else {
          await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agent!.slack_bot_token}` },
            body: JSON.stringify({ channel: channelId, text, username: agent!.name, icon_emoji: ':robot_face:' }),
          })
        }
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
- Write like a smart colleague in Slack — short, direct, human. No consultant-speak.
- 1–3 sentences for most replies. Only go longer when genuinely needed.
- Skip all preamble ("Great question!", "That's interesting", "Certainly!") — get straight to the point.
- Use *bold* for emphasis, never **double asterisks**. No ## headers.
- Use a bullet list only for 3+ truly distinct items. Otherwise just write a sentence.
- One idea per message. Don't overwhelm.
- If you don't know something specific to this product, say so in one sentence and move on.`

      systemPrompt += `\n\n## Hypothesis intake — when someone shares feedback or research

When someone shares customer feedback, user research, a complaint pattern, or a product improvement idea, treat it as a potential hypothesis to validate and add to the workspace.

Your validation process:

1. **First message — always ask one question first.** Never call \`create_hypothesis\` immediately. Acknowledge the signal briefly (1 sentence), then ask a single focused question — the most important one missing: e.g. how many people said this, what's the current ${agent.main_kpi ?? 'metric'}, or why they think this change would help.

2. **One question per turn.** Don't list multiple questions. If the answer is vague, ask one specific follow-up: "How many tickets mentioned it last month?" or "What's your current completion rate?"

3. **Do your own research.** Use your knowledge of published case studies, A/B test results, and conversion research to assess whether the proposed change is likely to work. Be honest — if the evidence is weak or the hypothesis contradicts known patterns, say so.

4. **Call \`create_hypothesis\` when you have:** a specific problem, at least some evidence (even 3–4 anecdotal reports is fine), a clear proposed change, and a plausible mechanism for moving ${agent.main_kpi ?? 'the KPI'}. Don't demand perfect data.

5. **After creating:** You will receive a confirmation. Let the user know the hypothesis was added and they can review it in the NorthStar workspace.

Hypothesis signal phrases: "customers are saying...", "I noticed...", "users keep complaining...", "what if we changed...", "our research shows...", "feedback from...", "a user told me...", "I think we should..."

Normal questions (not hypothesis signals): answer them directly without invoking hypothesis intake.`

      // Build message history for Claude
      const messages: Anthropic.MessageParam[] = [
        ...((history || []).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))),
        { role: 'user', content: userMessage },
      ]

      // Call Claude with the hypothesis creation tool available
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        tools: [CREATE_HYPOTHESIS_TOOL],
        tool_choice: { type: 'auto' },
        messages,
      })

      // ── Handle tool use: Claude decided to create a hypothesis ───────────────
      const toolUseBlock = response.content.find(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'create_hypothesis'
      )

      if (toolUseBlock) {
        const toolInput = toolUseBlock.input as {
          title: string
          hypothesis: string
          suggested_change: string
          impact_score: number
          evidence_summary: string
        }

        // Research validation: quick Claude pass to assess and refine the hypothesis
        // before committing it to the DB
        let validatedHypothesis = toolInput.hypothesis
        let validatedImpactScore = Math.min(5, Math.max(1, Math.round(toolInput.impact_score || 3)))
        let confidenceNote = ''

        try {
          const validationResp = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 600,
            system: `You are a product optimization researcher. Evaluate a hypothesis and return ONLY valid JSON — no markdown, no explanation.`,
            messages: [{
              role: 'user',
              content: `Product: ${agent.url ?? 'unknown'}
Target: ${targetDesc}
KPI to improve: ${agent.main_kpi ?? 'conversion rate'}

Hypothesis submitted: ${toolInput.hypothesis}
Suggested change: ${toolInput.suggested_change}
Evidence from team: ${toolInput.evidence_summary}

Evaluate this. Return JSON:
{
  "validated_hypothesis": "Refined 2-3 sentence hypothesis incorporating any relevant research you know about this type of change. Keep the team's evidence as the primary source.",
  "impact_score": 1-5,
  "confidence_reason": "1-2 sentences citing what published research or known case studies support or challenge this hypothesis"
}`,
            }],
          })

          const validText = validationResp.content[0].type === 'text' ? validationResp.content[0].text : ''
          const jsonMatch = validText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            if (parsed.validated_hypothesis) validatedHypothesis = parsed.validated_hypothesis
            if (parsed.impact_score) validatedImpactScore = Math.min(5, Math.max(1, Number(parsed.impact_score)))
            if (parsed.confidence_reason) confidenceNote = parsed.confidence_reason
          }
        } catch {
          // Keep original values if validation fails — don't block insertion
        }

        // Insert into agent_hypotheses with source attributed to the Slack person
        await supabase.from('agent_hypotheses').insert({
          agent_id: agent.id,
          title: toolInput.title.slice(0, 200),
          source: `${slackUserName} via Slack`,
          hypothesis: validatedHypothesis,
          suggested_change: toolInput.suggested_change || null,
          impact_score: validatedImpactScore,
          status: 'proposed',
        })

        // Post confirmation to Slack
        const impactDots = '●'.repeat(validatedImpactScore) + '○'.repeat(5 - validatedImpactScore)
        const confirmMsg = [
          `✓ *${toolInput.title}* — added to your hypothesis list.`,
          confidenceNote ? `_${confidenceNote}_` : '',
          `Impact: ${impactDots}  ·  Review and accept it in the NorthStar workspace.`,
        ].filter(Boolean).join('\n')

        await sendReply(confirmMsg)

        // Persist: store user message + the confirmation as assistant turn
        await supabase.from('slack_messages').insert([
          { agent_id: agent.id, role: 'user', content: userMessage, slack_ts: slackTs },
          { agent_id: agent.id, role: 'assistant', content: confirmMsg },
        ])

      } else {
        // ── Normal conversation reply (asking validation questions, or answering) ──
        const textBlock = response.content.find(
          (b): b is Anthropic.TextBlock => b.type === 'text'
        )
        const reply = toSlackMrkdwn(textBlock?.text ?? '')
        if (!reply) return

        await sendReply(reply)

        await supabase.from('slack_messages').insert([
          { agent_id: agent.id, role: 'user', content: userMessage, slack_ts: slackTs },
          { agent_id: agent.id, role: 'assistant', content: reply },
        ])
      }
    } catch (err) {
      console.error('[slack/events] error:', err)
    }
  })())

  return NextResponse.json({ ok: true })
}
