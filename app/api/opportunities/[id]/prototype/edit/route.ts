import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

type Params = { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    screen_id: string
    current_html: string
    instruction: string
    element_context?: string
    plan_markdown?: string
  }

  const { screen_id, current_html, instruction, element_context, plan_markdown } = body
  if (!current_html || !instruction) {
    return NextResponse.json({ error: 'Missing current_html or instruction' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  const anthropic = new Anthropic({ apiKey })

  const system = `You modify an HTML prototype screen based on a user's instruction.

RULES:
- Return ONLY the complete modified HTML document
- Keep all existing styles and structure unless the instruction says otherwise
- Make the minimal change needed to fulfill the instruction
- Preserve the overall design, colors, layout
- Start with <!DOCTYPE html> and end with </html>
- No explanation, no markdown fences, just raw HTML`

  const userPrompt = `Current HTML:
${current_html}

${element_context ? `The user clicked on: ${element_context}\n` : ''}
${plan_markdown ? `Overall plan context:\n${plan_markdown.slice(0, 1000)}\n` : ''}
User instruction: "${instruction}"

Apply this change and return the complete modified HTML.`

  try {
    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      temperature: 0.2,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const html = completion.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    // Update cached prototype in DB
    const { data: cached } = await supabase
      .from('opportunity_prototypes')
      .select('screens')
      .eq('opportunity_id', params.id)
      .eq('user_id', user.id)
      .single()

    if (cached && Array.isArray(cached.screens)) {
      const screens = cached.screens as { id: string; component_code: string }[]
      const updated = screens.map(s =>
        s.id === screen_id ? { ...s, component_code: html } : s
      )
      await supabase.from('opportunity_prototypes').update({ screens: updated })
        .eq('opportunity_id', params.id)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ html, screen_id })
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? 'Failed to edit screen' },
      { status: 500 }
    )
  }
}
