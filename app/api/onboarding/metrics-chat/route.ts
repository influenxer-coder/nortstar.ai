import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: Request) {
  try {
    const { message, metrics_json } = await req.json()
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })

    const contextBlock = metrics_json
      ? `Here is the goal and metrics plan for this product:\n\`\`\`json\n${JSON.stringify(metrics_json, null, 2)}\n\`\`\``
      : ''

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: `You are NorthStar, an expert product metrics advisor helping refine and evolve this product's goal and KPI framework.

${contextBlock}

Your job is to:
1. Help the PM understand, challenge, or refine the goal, north star metric, key results, and health metrics
2. Suggest alternatives for KRs that seem weak or unmeasurable
3. Explain the reasoning behind metric choices using industry benchmarks
4. Be direct and opinionated — don't hedge everything
5. Use markdown formatting: headers, bullet points, bold text, tables where useful

When the PM challenges an assumption or provides new information, update your thinking and offer a revised take on the relevant section.`,
      messages: [{ role: 'user', content: message }],
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply })
  } catch (err) {
    console.error('metrics-chat error:', err)
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
  }
}
