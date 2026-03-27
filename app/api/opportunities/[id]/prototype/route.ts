import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

type Params = { params: { id: string } }

type FlowNode = {
  id: string
  label: string
  type: 'existing' | 'removed' | 'added' | 'changed'
  cta: string
}

type ProtoScreen = {
  id: string
  label: string
  type: 'new' | 'modified' | 'removed' | 'existing'
  component_code: string
}

function nodeTypeToScreenType(t: string): ProtoScreen['type'] {
  switch (t) {
    case 'added': return 'new'
    case 'changed': return 'modified'
    case 'removed': return 'removed'
    default: return 'existing'
  }
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function POST(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Return cached prototype if available
  const { data: cached } = await supabase
    .from('opportunity_prototypes')
    .select('screens')
    .eq('opportunity_id', params.id)
    .eq('user_id', user.id)
    .single()
  if (cached && Array.isArray(cached.screens) && (cached.screens as unknown[]).length > 0) {
    // Return cached as NDJSON so client handles it the same way
    const encoder = new TextEncoder()
    const lines = (cached.screens as ProtoScreen[]).map(s => JSON.stringify(s) + '\n').join('')
    return new Response(encoder.encode(lines), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const body = await req.json() as {
    plan_markdown?: string
    variation?: Record<string, unknown>
    flow_nodes?: FlowNode[]
  }

  const planMarkdown = body.plan_markdown ?? ''
  const variation = body.variation ?? {}
  const flowNodes = body.flow_nodes ?? []

  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('title, goal, evidence, project_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })

  const { data: product } = await supabase
    .from('projects')
    .select('name, url, description')
    .eq('id', opportunity.project_id as string)
    .eq('user_id', user.id)
    .single()

  // Fetch homepage for design inference
  let pageText = ''
  if (product?.url) {
    try {
      const jinaRes = await fetch(`https://r.jina.ai/${product.url}`, {
        signal: AbortSignal.timeout(8000),
      })
      pageText = await jinaRes.text()
    } catch {
      // continue without it
    }
  }

  // Build screen list from flow nodes
  const screens = flowNodes.map(node => ({
    id: slugify(node.label),
    label: node.label,
    type: nodeTypeToScreenType(node.type),
    cta: node.cta,
  }))

  // Fallback: extract from plan markdown if no flow nodes
  if (screens.length === 0 && planMarkdown) {
    const lines = planMarkdown.split('\n')
    let inSection = false
    for (const line of lines) {
      if (/^## The New Screens/i.test(line) || /^## What We're Building/i.test(line)) {
        inSection = true
        continue
      }
      if (line.startsWith('## ')) inSection = false
      if (inSection && line.trim().startsWith('-')) {
        const text = line.replace(/^-\s*/, '').trim()
        if (text) {
          screens.push({
            id: slugify(text.split(':')[0] ?? text),
            label: text.split(':')[0]?.trim() ?? text,
            type: 'new',
            cta: '',
          })
        }
      }
    }
  }

  if (screens.length === 0) {
    return NextResponse.json({ error: 'No screens found in plan or flow' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  const anthropic = new Anthropic({ apiKey })

  const designContext = pageText
    ? `\nMatch this product's design style.
Homepage content for reference:
${pageText.slice(0, 1200)}

Infer: color scheme, font style, border radius, spacing density.\n`
    : ''

  const productContext = `Product: ${product?.name ?? 'Product'}
What it does: ${product?.description ?? ''}
Goal: ${opportunity.goal ?? ''}
Opportunity: ${opportunity.title ?? ''}
Variation: ${String(variation.name ?? '')}
Pattern: ${String(variation.pattern ?? '')}
${designContext}
Plan:
${planMarkdown.slice(0, 2000)}`

  const systemPrompt = `You generate a single HTML prototype for one product screen.

Output a complete, self-contained HTML document with inline <style>.
Use modern CSS (flexbox, grid, variables).
Make it look like a REAL product screen — not a wireframe.
Use real hex colors, proper spacing, realistic placeholder content.
Modern SaaS design (clean, minimal, professional).
Full-page layout (min-height: 100vh).
Include a nav/header, main content area, realistic text and UI elements.
Keep HTML concise — under 100 lines.

Return ONLY the raw HTML. No JSON wrapper. No markdown fences. No explanation.
Start with <!DOCTYPE html> and end with </html>.`

  // Generate each screen one at a time, stream as NDJSON
  const encoder = new TextEncoder()
  const completedScreens: ProtoScreen[] = []

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      for (const screen of screens) {
        try {
          const completion = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4000,
            temperature: 0.3,
            system: systemPrompt,
            messages: [{
              role: 'user',
              content: `${productContext}

Generate the HTML prototype for this screen:
Name: "${screen.label}"
Type: ${screen.type} (${screen.type === 'new' ? 'brand new screen' : screen.type === 'modified' ? 'existing screen with changes' : screen.type === 'removed' ? 'screen being removed' : 'unchanged screen'})
CTA: "${screen.cta || 'N/A'}"

Return ONLY raw HTML.`,
            }],
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

          const result: ProtoScreen = {
            id: screen.id,
            label: screen.label,
            type: screen.type,
            component_code: html,
          }

          completedScreens.push(result)
          controller.enqueue(encoder.encode(JSON.stringify(result) + '\n'))
        } catch {
          // Send a placeholder for failed screens
          const fallback: ProtoScreen = {
            id: screen.id,
            label: screen.label,
            type: screen.type,
            component_code: `<!DOCTYPE html><html><head><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#9B9A97;}</style></head><body><p>Could not generate preview for "${screen.label}"</p></body></html>`,
          }
          completedScreens.push(fallback)
          controller.enqueue(encoder.encode(JSON.stringify(fallback) + '\n'))
        }
      }

      // Save all completed screens to DB
      if (completedScreens.length > 0) {
        await supabase.from('opportunity_prototypes').upsert({
          opportunity_id: params.id,
          user_id: user.id,
          screens: completedScreens,
        }, { onConflict: 'opportunity_id,user_id' }).then(() => {})
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
