import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

type Params = { params: { id: string } }

function sse(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(sse({ type: 'error', message: 'Unauthorized' }), { status: 401 })

  // Ensure opportunity exists + belongs to user.
  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!opportunity) return new Response(sse({ type: 'error', message: 'Opportunity not found' }), { status: 404 })

  const body = await req.json().catch(() => ({})) as {
    current_prototype_code?: string
    edit_instruction?: string
    variation?: Record<string, unknown>
    plan_markdown?: string
  }

  const current = String(body.current_prototype_code ?? '')
  const instruction = String(body.edit_instruction ?? '').trim()
  if (!current || !instruction) {
    return new Response(sse({ type: 'error', message: 'current_prototype_code and edit_instruction are required' }), { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response(sse({ type: 'error', message: 'ANTHROPIC_API_KEY not configured' }), { status: 500 })
  const anthropic = new Anthropic({ apiKey })

  const system = `You are editing a React prototype.
Make ONLY the change requested.
Return ONLY the complete updated component code. No markdown. No explanation.`

  const userPrompt = `Current component:
${current}

Change requested:
${instruction}

Context:
Variation: ${JSON.stringify(body.variation ?? {})}
Plan: ${String(body.plan_markdown ?? '')}

Return the full updated component.`

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      try {
        controller.enqueue(encoder.encode(sse({ type: 'log', message: 'Applying your edit...' })))
        const completion = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2400,
          temperature: 0.2,
          system,
          messages: [{ role: 'user', content: userPrompt }],
        })
        const code = completion.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim()
        controller.enqueue(encoder.encode(sse({ type: 'result', code })))
        controller.enqueue(encoder.encode(sse({ type: 'done' })))
        controller.close()
      } catch (e) {
        controller.enqueue(encoder.encode(sse({ type: 'error', message: (e as Error).message ?? 'Failed to apply edit' })))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

