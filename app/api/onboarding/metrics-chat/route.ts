import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: Request) {
  try {
    const { message, metrics_json, history = [] } = await req.json()
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })

    const contextBlock = metrics_json
      ? `Current goal and metrics plan:\n\`\`\`json\n${JSON.stringify(metrics_json, null, 2)}\n\`\`\``
      : ''

    // Build full conversation history for Claude
    const messages: Anthropic.MessageParam[] = [
      ...history.map((m: { role: 'user' | 'assistant'; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: `You are NorthStar, an expert product metrics advisor helping refine this product's goal and KPI framework.

${contextBlock}

Your job is to:
1. Help the PM understand, challenge, or refine the goal, north star metric, key results, and health metrics
2. Suggest alternatives for KRs that seem weak or unmeasurable
3. Explain the reasoning behind metric choices using industry benchmarks
4. Be direct and opinionated — don't hedge everything
5. Use markdown formatting: headers, bullet points, bold text, tables where useful

IMPORTANT: When the PM explicitly confirms or agrees to a specific change (e.g. "yes use that", "let's go with X", "update it", "I agree, change it"), call the update_metrics tool with the COMPLETE updated metrics object. Apply only the agreed changes — keep all other fields intact from the original metrics_json. Only call update_metrics on clear confirmation, not during discussion.`,
      tools: [
        {
          name: 'update_metrics',
          description: 'Apply confirmed changes to the goal and metrics plan. Call ONLY when the user explicitly confirms a specific change, not during exploration.',
          input_schema: {
            type: 'object' as const,
            properties: {
              updated_metrics: {
                type: 'object',
                description: 'The complete updated MetricsResultData object with all agreed changes applied. Must include all original fields.',
              },
              change_summary: {
                type: 'string',
                description: 'One sentence describing what was changed, e.g. "Updated north star metric to Activation Rate and revised KR1."',
              },
            },
            required: ['updated_metrics', 'change_summary'],
          },
        },
      ],
      messages,
    })

    // Extract text reply (may be empty if model only called the tool)
    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')
      .trim()

    // Extract tool call
    const toolUse = response.content.find((b) => b.type === 'tool_use' && b.name === 'update_metrics')
    const updatedMetrics =
      toolUse && toolUse.type === 'tool_use'
        ? (toolUse.input as { updated_metrics: unknown; change_summary: string }).updated_metrics
        : null
    const changeSummary =
      toolUse && toolUse.type === 'tool_use'
        ? (toolUse.input as { updated_metrics: unknown; change_summary: string }).change_summary
        : null

    return NextResponse.json({ reply, updated_metrics: updatedMetrics, change_summary: changeSummary })
  } catch (err) {
    console.error('metrics-chat error:', err)
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
  }
}
