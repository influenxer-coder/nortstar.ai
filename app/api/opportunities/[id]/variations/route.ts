import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

type Params = { params: { id: string } }

type Variation = {
  name: string
  pattern: string
  validated_by: string[]
  what_they_did: string
  what_this_means: string
  works_best_for: string
  expected_lift_low: number
  expected_lift_high: number
  risk: 'low' | 'medium' | 'high'
  risk_reason: string
  is_recommended: boolean
}

function clampLift(n: unknown, fallback: number) {
  const x = Number(n)
  if (!Number.isFinite(x)) return fallback
  return Math.max(0, Math.min(200, Math.round(x)))
}

function normalizeRisk(r: unknown): 'low' | 'medium' | 'high' {
  const s = String(r ?? '').toLowerCase()
  if (s === 'low' || s === 'high') return s
  return 'medium'
}

export async function POST(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: opportunity, error: oppErr } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (oppErr || !opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })

  const projectId = opportunity.project_id as string
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('id, name, url, icp, strategy_json')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()
  if (projErr || !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const strategy = (project.strategy_json ?? {}) as Record<string, unknown>
  const match = (strategy.match ?? {}) as Record<string, unknown>
  const subverticalId = (match.subvertical_id as string) ?? null
  if (!subverticalId) {
    return NextResponse.json({ error: 'Missing subvertical_id for this project' }, { status: 422 })
  }

  const [{ data: competitors }, { data: synthesis }] = await Promise.all([
    supabase
      .from('vertical_products')
      .select('name, known_winning_features, changelog_signals, icp_signals, funding_stage, social_signals')
      .eq('subvertical_id', subverticalId)
      .eq('is_active', true),
    supabase
      .from('subverticals')
      .select('evolutionary_niches, whitespace, fitness_map, trending_features')
      .eq('id', subverticalId)
      .single(),
  ])

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  const anthropic = new Anthropic({ apiKey })

  const system = `You are a product strategy expert generating 3 distinct approach variations for a specific product improvement opportunity.

Each variation must be a genuinely different strategic bet — not variations of the same idea.

Variation 1: What the RISING competitor just shipped
Variation 2: What the DOMINANT player does
Variation 3: The CONTRARIAN approach — whitespace

Use ONLY the competitor data provided. Every claim must cite a specific competitor.

Return ONLY valid JSON — no markdown, no explanation.`

  const userPrompt = `Product: ${project.name ?? 'Product'}
URL: ${project.url ?? 'unknown'}
ICP: ${project.icp ?? ''}
Goal: ${opportunity.goal ?? ''}
Opportunity: ${opportunity.title ?? ''}
Evidence: ${opportunity.evidence ?? ''}

Competitor data:
${JSON.stringify(competitors ?? [])}

Subvertical synthesis:
${JSON.stringify({
    evolutionary_niches: synthesis?.evolutionary_niches ?? [],
    whitespace: synthesis?.whitespace ?? {},
    fitness_map: synthesis?.fitness_map ?? [],
  })}

Generate 3 variations as JSON:
{
  "variations": [
    {
      "name": "string",
      "pattern": "string (one line)",
      "validated_by": ["competitor names"],
      "what_they_did": "string",
      "what_this_means": "string (specific to product)",
      "works_best_for": "string (ICP fit)",
      "expected_lift_low": 0,
      "expected_lift_high": 0,
      "risk": "low|medium|high",
      "risk_reason": "string",
      "is_recommended": true
    }
  ]
}`

  let parsed: { variations?: Variation[] } | null = null
  try {
    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      temperature: 0.2,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    })
    const text = completion.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()
    parsed = JSON.parse(
      text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
    ) as { variations?: Variation[] }
  } catch {
    parsed = null
  }

  const rawVars = Array.isArray(parsed?.variations) ? parsed!.variations! : []
  const variations = rawVars.slice(0, 3).map((v, idx) => {
    const low = clampLift(v.expected_lift_low, 5 + idx * 2)
    const high = clampLift(v.expected_lift_high, Math.max(low + 5, 12 + idx * 3))
    return {
      name: String(v.name ?? `Variation ${idx + 1}`),
      pattern: String(v.pattern ?? ''),
      validated_by: Array.isArray(v.validated_by) ? v.validated_by.map(String).slice(0, 6) : [],
      what_they_did: String(v.what_they_did ?? ''),
      what_this_means: String(v.what_this_means ?? ''),
      works_best_for: String(v.works_best_for ?? ''),
      expected_lift_low: low,
      expected_lift_high: Math.max(low, high),
      risk: normalizeRisk(v.risk),
      risk_reason: String(v.risk_reason ?? ''),
      is_recommended: Boolean(v.is_recommended ?? idx === 0),
    } satisfies Variation
  })

  // Ensure exactly one recommended.
  if (variations.length > 0 && variations.every((v) => !v.is_recommended)) {
    variations[0].is_recommended = true
  }

  return NextResponse.json({ variations })
}

