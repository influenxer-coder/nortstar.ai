import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

type RawIdea = {
  title?: string
  goal?: string
  effort?: 'low' | 'medium' | 'high' | string
  evidence?: string
  winning_pattern?: string
  expected_lift_low?: number
  expected_lift_high?: number
  confidence?: 'high' | 'medium' | 'low' | string
  confidence_reason?: string
  impact_score?: number
  decision_badge?: string
  human_number?: string
}

const CONFIDENCE_WEIGHT: Record<string, number> = { high: 1.0, medium: 0.7, low: 0.4 }
const EFFORT_WEIGHT: Record<string, number>     = { low: 1.0, medium: 1.5, high: 2.5 }

function calcImpactScore(idea: RawIdea): number {
  const liftLow  = typeof idea.expected_lift_low  === 'number' ? idea.expected_lift_low  : 10
  const liftHigh = typeof idea.expected_lift_high === 'number' ? idea.expected_lift_high : 20
  const avgLift  = (liftLow + liftHigh) / 2
  const conf     = CONFIDENCE_WEIGHT[String(idea.confidence ?? 'medium')] ?? 0.7
  const eff      = EFFORT_WEIGHT[String(idea.effort ?? 'medium').toLowerCase()] ?? 1.5
  return Math.min(10, Math.round(((avgLift * conf) / eff) * 10) / 10)
}

function calcDecisionBadge(idea: RawIdea): 'do_first' | 'worth_bet' | 'quick_win' | 'plan_sprint' {
  const liftHigh  = typeof idea.expected_lift_high === 'number' ? idea.expected_lift_high : 15
  const conf      = String(idea.confidence ?? 'medium')
  const eff       = String(idea.effort ?? 'medium').toLowerCase()
  const highLift  = liftHigh >= 20
  const medLift   = liftHigh >= 10

  if (highLift && conf === 'high' && eff === 'high')  return 'plan_sprint'
  if (highLift && conf === 'high' && eff !== 'high')  return 'do_first'
  if (highLift && conf === 'low')                     return 'worth_bet'
  if (medLift  && conf === 'high' && eff === 'low')   return 'quick_win'
  return 'worth_bet'
}

function normalizeIdeas(raw: unknown, goal: string) {
  const ideas = Array.isArray((raw as { ideas?: unknown[] })?.ideas)
    ? ((raw as { ideas: RawIdea[] }).ideas ?? [])
    : []

  return ideas.slice(0, 3).map((idea, idx): NormalizedIdea => {
    const effortRaw = String(idea.effort || 'medium').toLowerCase()
    const effort = (effortRaw === 'low' || effortRaw === 'high' ? effortRaw : 'medium') as 'low' | 'medium' | 'high'
    const confRaw = String(idea.confidence || 'medium').toLowerCase()
    const confidence = (['high', 'medium', 'low'].includes(confRaw) ? confRaw : 'medium') as 'high' | 'medium' | 'low'
    const badgeRaw = idea.decision_badge ?? ''
    const decision_badge = (['do_first', 'worth_bet', 'quick_win', 'plan_sprint'].includes(badgeRaw)
      ? badgeRaw
      : calcDecisionBadge({ ...idea, effort, confidence })) as NormalizedIdea['decision_badge']

    const impact_score = typeof idea.impact_score === 'number' && idea.impact_score > 0
      ? idea.impact_score
      : calcImpactScore({ ...idea, effort, confidence })

    return {
      title:              idea.title || `Opportunity ${idx + 1}`,
      goal:               idea.goal || goal,
      effort,
      evidence:           idea.evidence || 'Pattern identified from active products in this subvertical.',
      winning_pattern:    idea.winning_pattern || 'Multiple competitors are validating this behavior.',
      expected_lift_low:  typeof idea.expected_lift_low  === 'number' ? idea.expected_lift_low  : null,
      expected_lift_high: typeof idea.expected_lift_high === 'number' ? idea.expected_lift_high : null,
      confidence,
      confidence_reason:  idea.confidence_reason || null,
      impact_score,
      decision_badge,
      human_number:       idea.human_number || null,
    }
  }).sort((a, b) => (b.impact_score ?? 0) - (a.impact_score ?? 0))
}

export type NormalizedIdea = {
  title: string
  goal: string
  effort: 'low' | 'medium' | 'high'
  evidence: string
  winning_pattern: string
  expected_lift_low: number | null
  expected_lift_high: number | null
  confidence: 'high' | 'medium' | 'low'
  confidence_reason: string | null
  impact_score: number
  decision_badge: 'do_first' | 'worth_bet' | 'quick_win' | 'plan_sprint'
  human_number: string | null
  _ci_data?: {
    okr: unknown
    design: unknown | null
    analysis_id: string
  }
}

// ── CI ideas from OKRs ────────────────────────────────────────────────────

function scoreToBadge(impact: number, feasibility: number): NormalizedIdea['decision_badge'] {
  if (impact >= 85 && feasibility >= 80) return 'do_first'
  if (impact >= 80 && feasibility < 70)  return 'worth_bet'
  if (impact < 75 && feasibility >= 85)  return 'quick_win'
  return 'plan_sprint'
}

function buildCiIdeas(
  okrs: Array<Record<string, unknown>>,
  designs: Array<Record<string, unknown>>,
  goal: string,
  ciAnalysisId: string
): NormalizedIdea[] {
  if (!okrs?.length) return []

  const designByRank = Object.fromEntries(
    (designs || []).map((d) => [d.gap_rank, d])
  )

  const sorted = [...okrs]
    .sort((a, b) =>
      ((b.impact_score as number ?? 0) * (b.feasibility_score as number ?? 0)) -
      ((a.impact_score as number ?? 0) * (a.feasibility_score as number ?? 0))
    )
    .slice(0, 3)

  return sorted.map((okr, i) => ({
    title: String(okr.objective ?? `Opportunity ${i + 1}`),
    goal,
    effort: (okr.feasibility_score as number ?? 0) >= 85 ? 'low' as const
          : (okr.feasibility_score as number ?? 0) >= 75 ? 'medium' as const
          : 'high' as const,
    evidence: String(okr.gap_description ?? ''),
    winning_pattern: String(okr.differentiation_mechanism ?? ''),
    expected_lift_low: Math.round(((okr.impact_score as number) ?? 0) * 0.6),
    expected_lift_high: (okr.impact_score as number) ?? null,
    confidence: (okr.feasibility_score as number ?? 0) >= 85 ? 'high' as const
              : (okr.feasibility_score as number ?? 0) >= 75 ? 'medium' as const
              : 'low' as const,
    confidence_reason: String(okr.key_risk ?? '') || null,
    impact_score: Math.round(
      (((okr.impact_score as number) ?? 0) * ((okr.feasibility_score as number) ?? 0)) / 100
    ),
    decision_badge: scoreToBadge(
      (okr.impact_score as number) ?? 0,
      (okr.feasibility_score as number) ?? 0
    ),
    human_number: null,
    _ci_data: {
      okr,
      design: designs.find((d: Record<string, unknown>) =>
        typeof d.use_case === 'string' && typeof okr.use_case === 'string' &&
        d.use_case.toLowerCase().trim() === (okr.use_case as string).toLowerCase().trim()
      ) ?? designByRank[okr.gap_rank as number] ?? null,
      analysis_id: ciAnalysisId,
    },
  }))
}

// ── VI DB + Claude generation (existing logic, extracted into function) ────

async function generateViDbIdeas(
  synthesis: Record<string, unknown>,
  competitors: Record<string, unknown>[] | null,
  goal: string
): Promise<NormalizedIdea[]> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')
    const anthropic = new Anthropic({ apiKey })

    const prompt = [
      'You are an expert B2B product strategy analyst.',
      `Generate exactly 3 specific, actionable ideas to help a new entrant win at goal "${goal}" in this subvertical.`,
      'Rules:',
      '- Tie each idea to real patterns from competitor data and synthesis data.',
      '- Avoid generic advice.',
      '- effort must be one of: low, medium, high.',
      '- evidence must be 1-2 concise sentences grounded in data.',
      '- winning_pattern should mention what pattern is already winning in this market.',
      '- expected_lift_low / expected_lift_high: realistic % lift range from competitor evidence (integers).',
      '- confidence: high | medium | low — how certain the evidence is.',
      '- confidence_reason: one sentence explaining the confidence level.',
      '- impact_score 1-10: use formula (avg_lift × confidence_weight) / effort_weight where confidence high=1.0 medium=0.7 low=0.4 and effort low=1.0 medium=1.5 high=2.5. Cap at 10.',
      '- decision_badge: do_first (high lift + high confidence + low/medium effort) | worth_bet (high lift + low confidence) | quick_win (medium lift + high confidence + low effort) | plan_sprint (high lift + high confidence + high effort).',
      '- human_number: one plain sentence translating % lift into people e.g. "Fix this = ~50 more activations per week". Use market benchmarks if exact data is unavailable.',
      'Return ONLY valid JSON with this exact schema:',
      '{"ideas":[{"title":"string","goal":"string","effort":"low|medium|high","evidence":"string","winning_pattern":"string","expected_lift_low":number,"expected_lift_high":number,"confidence":"high|medium|low","confidence_reason":"string","impact_score":number,"decision_badge":"do_first|worth_bet|quick_win|plan_sprint","human_number":"string"}]}',
      '',
      `Selected goal: ${goal}`,
      `Synthesis data: ${JSON.stringify(synthesis)}`,
      `Competitor data: ${JSON.stringify(competitors ?? [])}`,
    ].join('\n')

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = completion.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')

    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
    const parsed = JSON.parse(cleaned) as unknown
    return normalizeIdeas(parsed, goal)
  } catch {
    const fallback = (competitors ?? []).slice(0, 3)
    return normalizeIdeas({
      ideas: fallback.map((c, idx) => ({
        title: `Build a differentiated ${goal.replaceAll('_', ' ')} play around ${(c as Record<string, unknown>).name ?? 'market leader'} signals`,
        goal,
        effort: idx === 0 ? 'medium' : idx === 1 ? 'low' : 'high',
        evidence: `Recent feature and changelog signals from ${(c as Record<string, unknown>).name ?? 'top competitors'} suggest this area is actively contested and still improving.`,
        winning_pattern: 'Winning pattern in your vertical: teams that pair clearer onboarding moments with measurable in-product value events.',
        expected_lift_low: 10 + idx * 5,
        expected_lift_high: 20 + idx * 5,
        confidence: 'medium',
        confidence_reason: 'Based on competitor signals; direct evidence limited.',
        human_number: 'Could move the needle by ~30–60 activations per week at typical B2B SaaS scale.',
      })),
    }, goal)
  }
}

// ── Main handler ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subverticalId = req.nextUrl.searchParams.get('subvertical_id')
  const goal = req.nextUrl.searchParams.get('goal')
  if (!subverticalId || !goal) {
    return NextResponse.json({ error: 'Missing required query params: subvertical_id and goal' }, { status: 400 })
  }

  // Check if the user's current project has CI data
  let ciAnalysisId: string | null = null
  let ciOkrs: Array<Record<string, unknown>> = []
  let ciDesigns: Array<Record<string, unknown>> = []

  try {
    const projectId = req.nextUrl.searchParams.get('project_id')
    if (projectId) {
      const { data: project } = await supabase
        .from('projects')
        .select('strategy_json')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single()

      const strategyJson = (project?.strategy_json ?? {}) as Record<string, unknown>
      ciAnalysisId = (strategyJson.ci_analysis_id as string) ?? null
      if (ciAnalysisId) {
        ciOkrs = Array.isArray(strategyJson.ci_okrs) ? strategyJson.ci_okrs as Array<Record<string, unknown>> : []
        ciDesigns = Array.isArray(strategyJson.ci_designs) ? strategyJson.ci_designs as Array<Record<string, unknown>> : []
      }
    }
  } catch { /* proceed without CI */ }

  const { data: synthesis, error: synthesisError } = await supabase
    .from('subverticals')
    .select('evolutionary_niches, whitespace, fitness_map, competitive_intensity, trending_features')
    .eq('id', subverticalId)
    .single()

  if (synthesisError || !synthesis) {
    return NextResponse.json({ error: 'Could not load market synthesis data' }, { status: 404 })
  }

  const { data: competitors, error: competitorsError } = await supabase
    .from('vertical_products')
    .select('name, known_winning_features, changelog_signals, icp_signals')
    .eq('subvertical_id', subverticalId)
    .eq('is_active', true)
    .limit(8)

  if (competitorsError) {
    return NextResponse.json({ error: 'Could not load competitor data' }, { status: 500 })
  }

  // ── Generate ideas: CI path first, VI DB fallback ─────────────────────
  let ideas: NormalizedIdea[]

  if (ciAnalysisId && ciOkrs.length > 0) {
    ideas = buildCiIdeas(ciOkrs, ciDesigns, goal, ciAnalysisId)
    // If CI returned empty (shouldn't happen due to guard above), fall back
    if (!ideas.length) {
      ideas = await generateViDbIdeas(synthesis, competitors, goal)
    }
  } else {
    ideas = await generateViDbIdeas(synthesis, competitors, goal)
  }

  return NextResponse.json({
    evolutionary_niches: synthesis.evolutionary_niches ?? [],
    whitespace: synthesis.whitespace ?? {},
    fitness_map: synthesis.fitness_map ?? [],
    competitive_intensity: synthesis.competitive_intensity ?? 'medium',
    trending_features: synthesis.trending_features ?? [],
    ideas,
  })
}
