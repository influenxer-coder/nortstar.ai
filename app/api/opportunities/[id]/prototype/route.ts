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

  const screenDescriptions = screens.map(s =>
    `Screen: "${s.label}" | Type: ${s.type} | CTA: "${s.cta || 'N/A'}"`
  ).join('\n')

  const system = `You are generating React component prototypes for a product flow.

For each screen generate a self-contained React functional component named "Component".

RULES:
- Use ONLY inline styles (no Tailwind, no CSS imports)
- No imports — React, useState, useEffect, useMemo are passed as globals
- Component must be named exactly "Component" (function Component() { ... })
- Make it look like a REAL product screen — not a wireframe
- Use real colors (#hex), proper spacing, realistic placeholder content
- Match modern SaaS design patterns (clean, minimal, professional)
- Each component should be 30-80 lines
- Use React.createElement() NOT JSX (code runs in Function constructor)
- Return ONLY valid JSON — no markdown, no explanation
- For "existing" screens: show a realistic current state
- For "modified" screens: show the updated version with changes highlighted
- For "new" screens: design a fresh screen matching the product style
- For "removed" screens: show a simplified version of what was there`

  const userPrompt = `Product: ${product?.name ?? 'Product'}
What it does: ${product?.description ?? ''}
Goal: ${opportunity.goal ?? ''}
Opportunity: ${opportunity.title ?? ''}

Variation: ${String(variation.name ?? '')}
Pattern: ${String(variation.pattern ?? '')}

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
      "component_code": "function Component() { var el = React.createElement; ... return el('div', ...); }"
    }
  ]
}

CRITICAL: component_code must use React.createElement() not JSX.
CRITICAL: Each component must be named "Component".
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
