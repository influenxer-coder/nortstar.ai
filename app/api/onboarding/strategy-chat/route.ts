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
      max_tokens: 1024,
      system: `You are NorthStar, an expert product strategy advisor. ${contextBlock}\n\nAnswer questions about this product's strategy concisely and helpfully. Focus on actionable insights. Keep responses under 200 words unless the question requires more depth.`,
      messages: [{ role: 'user', content: message }],
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply })
  } catch (err) {
    console.error('strategy-chat error:', err)
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
  }
}
