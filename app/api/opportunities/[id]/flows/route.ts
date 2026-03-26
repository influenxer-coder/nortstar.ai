import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

type Params = { params: { id: string } }

type VariationInput = {
  name: string
  pattern: string
  what_they_did?: string
  what_this_means?: string
}

type FlowNode = {
  id: string
  label: string
  type: 'existing' | 'removed' | 'added' | 'changed'
  cta: string
}

type FlowObject = {
  variation_index: number
  current_flow: FlowNode[]
  proposed_flow: FlowNode[]
  summary: {
    removed_count: number
    added_count: number
    changed_count: number
    key_change: string
  }
}

// In-memory cache: opportunityId → flows
const cache = new Map<string, FlowObject[]>()

export async function POST(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Return cached result if available
  const cached = cache.get(params.id)
  if (cached) return NextResponse.json({ flows: cached })

  const body = await req.json() as { variations?: VariationInput[] }
  const variations = body.variations ?? []
  if (!variations.length) return NextResponse.json({ flows: [] })

  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('title, goal, evidence, project_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })

  const { data: project } = await supabase
    .from('projects')
    .select('name, url, enrichment')
    .eq('id', opportunity.project_id as string)
    .eq('user_id', user.id)
    .single()

  const enrich = (project?.enrichment ?? {}) as Record<string, unknown>
  const oneLiner = String(enrich.oneLiner ?? '')
  const northStar = String(enrich.northStarMetric ?? '')
  const differentiators = Array.isArray(enrich.keyDifferentiators)
    ? (enrich.keyDifferentiators as unknown[]).map(String).join(', ')
    : String(enrich.keyDifferentiators ?? '')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  const anthropic = new Anthropic({ apiKey })

  const system = `You are a product flow architect.
Generate simple before/after flow diagrams for 3 product improvement variations.

Each flow is a sequence of steps/screens.
Keep it simple — 3 to 7 nodes per flow.

Each node has:
  id: string
  label: string (screen or step name, max 3 words)
  type: 'existing' | 'removed' | 'added' | 'changed'
  cta: string (main action on this screen, max 4 words)

existing = stays the same (gray)
removed = eliminated in proposed (red, strikethrough)
added = new in proposed (green)
changed = modified in proposed (amber)

Return ONLY valid JSON. No explanation.`

  const varBlocks = variations.slice(0, 3).map((v, i) => `Variation ${i + 1}: ${v.name}
Pattern: ${v.pattern}
What changes: ${v.what_this_means ?? ''}
Evidence: ${v.what_they_did ?? ''}`).join('\n\n')

  const userPrompt = `Product: ${project?.name ?? 'Product'}
What it does: ${oneLiner}
North star metric: ${northStar}
Key differentiators: ${differentiators}

Goal: ${opportunity.goal ?? ''}
Opportunity: ${opportunity.title ?? ''}
Evidence: ${opportunity.evidence ?? ''}

Generate flows for these 3 variations:

${varBlocks}

For EACH variation return:
{
  "variation_index": 0|1|2,
  "current_flow": [
    { "id": "string", "label": "string", "type": "existing", "cta": "string" }
  ],
  "proposed_flow": [
    { "id": "string", "label": "string", "type": "existing|removed|added|changed", "cta": "string" }
  ],
  "summary": {
    "removed_count": number,
    "added_count": number,
    "changed_count": number,
    "key_change": "string (one sentence, max 10 words)"
  }
}

Return as a JSON array of exactly 3 flow objects.`

  let flows: FlowObject[] = []
  try {
    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      temperature: 0.2,
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
    flows = JSON.parse(text) as FlowObject[]
    if (!Array.isArray(flows)) flows = []
  } catch {
    flows = []
  }

  cache.set(params.id, flows)
  return NextResponse.json({ flows })
}
