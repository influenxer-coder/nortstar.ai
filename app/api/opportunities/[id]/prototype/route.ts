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

  const body = await req.json().catch(() => ({})) as {
    variation?: Record<string, unknown>
    activation_event?: unknown
    plan_markdown?: string
  }

  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!opportunity) return new Response(sse({ type: 'error', message: 'Opportunity not found' }), { status: 404 })

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, url')
    .eq('id', opportunity.project_id)
    .eq('user_id', user.id)
    .single()
  if (!project) return new Response(sse({ type: 'error', message: 'Project not found' }), { status: 404 })

  // Optional crawl for a “current page structure” screenshot + element list.
  let crawl: { screenshot?: string; elements?: unknown[] } | null = null
  try {
    if (project.url) {
      const crawlRes = await fetch(new URL('/api/crawl', req.nextUrl).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: project.url }),
      })
      if (crawlRes.ok) {
        const j = await crawlRes.json() as { screenshot?: string; elements?: unknown[] }
        crawl = j
      }
    }
  } catch {
    crawl = null
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response(sse({ type: 'error', message: 'ANTHROPIC_API_KEY not configured' }), { status: 500 })
  const anthropic = new Anthropic({ apiKey })

  const proposedChange = String((body.variation as Record<string, unknown> | undefined)?.what_this_means ?? '')
  const planMarkdown = String(body.plan_markdown ?? '')

  const system = `You are building a React prototype showing before/after comparison of a UI change.

Return ONLY a single self-contained React component named BeforeAfterPrototype.
No imports. No markdown. No explanations. No comments.

LENGTH CONSTRAINT (critical): Keep the entire component under 180 lines. Be concise — use short variable names, minimal inline styles, reuse patterns. Do NOT add extra polish, animations, or detailed copy.

Hard constraints:
- Render validity: return a top-level single <div> only. Avoid invalid HTML nesting (no <table>/<tr>/<tbody>/<thead>/<tfoot>, no <html>/<body>/<head>).
- Determinism: do NOT use Math.random() or Date.now() during render.
- Use only safe, common elements: div, button, span, p, h3/h4, input, textarea.

Behavior constraints:
- Render side-by-side BEFORE and AFTER columns on desktop (a simple 2-column flex layout).
- Include a top toggle to switch between BEFORE and AFTER on mobile.
- Use only inline styles. Keep styles minimal.
- Buttons/toggles must be interactive.`

  const userPrompt = `Product: ${project.name ?? 'Product'}
URL: ${project.url ?? ''}

Clickable elements on page: ${JSON.stringify(crawl?.elements ?? [])}

Proposed change: ${proposedChange}

Plan: ${planMarkdown}

Build a concise before/after prototype (under 180 lines).`

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      try {
        controller.enqueue(encoder.encode(sse({ type: 'log', message: 'Reading current page structure...' })))
        controller.enqueue(encoder.encode(sse({ type: 'log', message: `Applying ${String((body.variation as Record<string, unknown> | undefined)?.name ?? 'variation')} pattern...` })))
        controller.enqueue(encoder.encode(sse({ type: 'log', message: 'Generating BEFORE state...' })))
        controller.enqueue(encoder.encode(sse({ type: 'log', message: 'Generating AFTER state...' })))
        controller.enqueue(encoder.encode(sse({ type: 'log', message: 'Rendering preview...' })))

        const completion = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 8192,
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
        controller.enqueue(encoder.encode(sse({ type: 'error', message: (e as Error).message ?? 'Failed to generate prototype' })))
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

