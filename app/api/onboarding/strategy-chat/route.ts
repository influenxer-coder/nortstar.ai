import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: Request) {
  try {
    const { message, strategy_json } = await req.json()
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })

    const contextBlock = strategy_json
      ? `Here is the strategy analysis for this product:\n\`\`\`json\n${JSON.stringify(strategy_json, null, 2)}\n\`\`\``
      : ''

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: `You are NorthStar, an expert product strategy advisor helping refine and evolve this product's strategy based on user input.

${contextBlock}

Your job is to:
1. Listen to what the user wants to change, challenge, or explore about the strategy
2. Help evolve specific sections — competitors, opportunities, positioning, wedge — based on their input
3. Ask clarifying questions when needed to sharpen the strategy
4. Give concrete, actionable updates or alternatives to what's in the report
5. Use markdown formatting: headers, bullet points, bold text, tables where useful

When the user challenges an assumption or provides new information, update your thinking and offer a revised take on the relevant section. Be direct and opinionated — don't hedge everything.`,
      messages: [{ role: 'user', content: message }],
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply })
  } catch (err) {
    console.error('strategy-chat error:', err)
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
  }
}
