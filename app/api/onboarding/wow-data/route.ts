import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

type RawIdea = {
  title?: string
  goal?: string
  effort?: 'low' | 'medium' | 'high' | string
  evidence?: string
  winning_pattern?: string
}

function normalizeIdeas(raw: unknown, goal: string) {
  const ideas = Array.isArray((raw as { ideas?: unknown[] })?.ideas)
    ? ((raw as { ideas: RawIdea[] }).ideas ?? [])
    : []

  return ideas.slice(0, 3).map((idea, idx) => {
    const effort = String(idea.effort || 'medium').toLowerCase()
    return {
      title: idea.title || `Opportunity ${idx + 1}`,
      goal: idea.goal || goal,
      effort: (effort === 'low' || effort === 'high' ? effort : 'medium') as 'low' | 'medium' | 'high',
      evidence: idea.evidence || 'Pattern identified from active products in this subvertical.',
      winning_pattern: idea.winning_pattern || 'Multiple competitors are validating this behavior.',
    }
  })
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subverticalId = req.nextUrl.searchParams.get('subvertical_id')
  const goal = req.nextUrl.searchParams.get('goal')
  if (!subverticalId || !goal) {
    return NextResponse.json({ error: 'Missing required query params: subvertical_id and goal' }, { status: 400 })
  }

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

  let ideas: Array<{
    title: string
    goal: string
    effort: 'low' | 'medium' | 'high'
    evidence: string
    winning_pattern: string
  }> = []

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
      'Return ONLY valid JSON with this schema:',
      '{"ideas":[{"title":"string","goal":"string","effort":"low|medium|high","evidence":"string","winning_pattern":"string"}]}',
      '',
      `Selected goal: ${goal}`,
      `Synthesis data: ${JSON.stringify(synthesis)}`,
      `Competitor data: ${JSON.stringify(competitors ?? [])}`,
    ].join('\n')

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
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
    ideas = normalizeIdeas(parsed, goal)
  } catch {
    const fallback = (competitors ?? []).slice(0, 3)
    ideas = fallback.map((c, idx) => ({
      title: `Build a differentiated ${goal.replaceAll('_', ' ')} play around ${c.name ?? 'market leader'} signals`,
      goal,
      effort: (idx === 0 ? 'medium' : idx === 1 ? 'low' : 'high') as 'low' | 'medium' | 'high',
      evidence: `Recent feature and changelog signals from ${c.name ?? 'top competitors'} suggest this area is actively contested and still improving.`,
      winning_pattern: 'Winning pattern in your vertical: teams that pair clearer onboarding moments with measurable in-product value events.',
    }))
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

