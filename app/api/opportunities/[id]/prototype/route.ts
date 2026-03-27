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
    return NextResponse.json({ screens: cached.screens })
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

  const screenDescriptions = screens.map((s, i) =>
    `Screen index ${i}: "${s.label}" | Type: ${s.type} | CTA: "${s.cta || 'N/A'}"`
  ).join('\n')

  const designContext = pageText
    ? `\nIMPORTANT: Match this product's design style.
Public homepage content for reference:
${pageText.slice(0, 1500)}

Infer from this:
- Color scheme (primary color, backgrounds)
- Font style (serif/sans, sizes)
- Border radius (sharp/rounded)
- Spacing density (compact/spacious)
- Component style (minimal/detailed)

Apply these patterns to every component.\n`
    : ''

  const system = `You are generating HTML prototypes for product screens.

For each screen generate a complete, self-contained HTML document.

RULES:
- Output complete HTML with inline <style> in <head>
- Use modern CSS (flexbox, grid, variables)
- Make it look like a REAL product screen — not a wireframe
- Use real hex colors, proper spacing, realistic placeholder content
- Match modern SaaS design (clean, minimal, professional)
- Each screen should be a full-page layout (min-height: 100vh)
- Include a nav/header, main content, realistic text
- Keep HTML concise — under 80 lines per screen
- For "existing" screens: realistic current state
- For "modified" screens: updated version with changes visible
- For "new" screens: fresh screen matching the product style
- For "removed" screens: simplified version of what was there

Return ONLY valid JSON — no markdown, no explanation, no code fences.`

  const userPrompt = `Product: ${product?.name ?? 'Product'}
What it does: ${product?.description ?? ''}
Goal: ${opportunity.goal ?? ''}
Opportunity: ${opportunity.title ?? ''}

Variation: ${String(variation.name ?? '')}
Pattern: ${String(variation.pattern ?? '')}
${designContext}
Plan:
${planMarkdown.slice(0, 3000)}

Generate HTML prototypes for these screens:
${screenDescriptions}

Return JSON:
{
  "screens": [
    {
      "id": "slug-of-label",
      "label": "Screen Name",
      "type": "new|modified|removed|existing",
      "component_code": "<!DOCTYPE html><html><head><style>...</style></head><body>...</body></html>"
    }
  ]
}

CRITICAL: component_code must be complete valid HTML — NOT React code.
CRITICAL: Keep each HTML under 80 lines.
CRITICAL: Return valid JSON only — no markdown fences.`

  try {
    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      temperature: 0.3,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    })

    let text = completion.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    // Attempt to repair truncated JSON — extract complete screen objects
    let parsed: { screens?: ProtoScreen[] }
    try {
      parsed = JSON.parse(text) as { screens?: ProtoScreen[] }
    } catch {
      // JSON was truncated — try to extract whatever complete screens we got
      const screenRegex = /\{\s*"id"\s*:\s*"[^"]+"\s*,\s*"label"\s*:\s*"[^"]+"\s*,\s*"type"\s*:\s*"[^"]+"\s*,\s*"component_code"\s*:\s*"(?:[^"\\]|\\.)*"\s*\}/g
      const matches = text.match(screenRegex)
      if (matches && matches.length > 0) {
        const repaired = matches.map(m => {
          try { return JSON.parse(m) as ProtoScreen } catch { return null }
        }).filter((s): s is ProtoScreen => s !== null)
        parsed = { screens: repaired }
      } else {
        throw new Error('Could not parse prototype response — try again')
      }
    }

    const resultScreens = Array.isArray(parsed.screens) ? parsed.screens : []

    // Persist to DB for future requests
    if (resultScreens.length > 0) {
      await supabase.from('opportunity_prototypes').upsert({
        opportunity_id: params.id,
        user_id: user.id,
        screens: resultScreens,
      }, { onConflict: 'opportunity_id,user_id' }).then(() => {})
    }

    return NextResponse.json({ screens: resultScreens })
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? 'Failed to generate prototype' },
      { status: 500 }
    )
  }
}
