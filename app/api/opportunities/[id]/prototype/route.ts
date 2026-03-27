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

  const system = `You are generating React component prototypes for a product flow.

For each screen generate a self-contained React functional component.

STRICT NAMING RULES:
- Screen at index 0 MUST be named Screen_0
- Screen at index 1 MUST be named Screen_1
- Screen at index N MUST be named Screen_N
- Each MUST start with: var Screen_N = function() {
- Each MUST end with a return statement with React.createElement calls

STRICT CODE RULES:
- Use ONLY React.createElement() — NO JSX syntax
- Use React.createElement('div', {style: {...}}, children...)
- React, useState, useEffect, useMemo are available as globals — do NOT import them
- Use var for declarations (not const/let — safer in Function constructor)
- No import statements, no require()
- No external dependencies
- Use only inline styles via style objects — no Tailwind, no CSS classes
- Make it look like a REAL product screen — not a wireframe
- Use real hex colors, proper spacing, realistic placeholder content
- Match modern SaaS design patterns (clean, minimal, professional)
- Each component should be 30-80 lines
- For "existing" screens: show a realistic current state
- For "modified" screens: show the updated version with changes highlighted
- For "new" screens: design a fresh screen matching the product style
- For "removed" screens: show a simplified version of what was there

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

Generate React components for these screens:
${screenDescriptions}

Return JSON:
{
  "screens": [
    {
      "id": "slug-of-label",
      "label": "Screen Name",
      "type": "new|modified|removed|existing",
      "component_code": "var Screen_0 = function() { var el = React.createElement; ... return el('div', {style: {minHeight: 800, background: '#fff'}}, ...); };"
    }
  ]
}

CRITICAL: component_code must use React.createElement() NOT JSX.
CRITICAL: Screen at index N must be named Screen_N.
CRITICAL: Use var for all variable declarations.
CRITICAL: Return valid JSON only — no markdown fences.`

  try {
    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      temperature: 0.3,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = completion.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const parsed = JSON.parse(text) as { screens?: ProtoScreen[] }
    const resultScreens = Array.isArray(parsed.screens) ? parsed.screens : []

    return NextResponse.json({ screens: resultScreens })
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? 'Failed to generate prototype' },
      { status: 500 }
    )
  }
}
