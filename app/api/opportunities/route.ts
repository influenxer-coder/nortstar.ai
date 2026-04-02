import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { NormalizedIdea } from '@/app/api/onboarding/wow-data/route'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('project_id')
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  const goal = req.nextUrl.searchParams.get('goal')

  let query = supabase
    .from('opportunities')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', user.id)

  if (goal && goal.trim()) {
    query = query.eq('goal', goal.trim())
  }

  const { data, error } = await query.order('impact_score', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ideas: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { project_id: string; ideas?: NormalizedIdea[]; idea?: NormalizedIdea & { pdf_url?: string }; append?: boolean }
  const { project_id, append } = body

  if (!project_id) {
    return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
  }

  // Single append — add one idea without clearing existing rows
  if (append && body.idea) {
    const idea = body.idea
    const { error } = await supabase.from('opportunities').insert({
      user_id:            user.id,
      project_id,
      title:              idea.title,
      goal:               idea.goal,
      effort:             idea.effort,
      evidence:           idea.evidence ?? null,
      winning_pattern:    idea.winning_pattern ?? null,
      expected_lift_low:  idea.expected_lift_low ?? null,
      expected_lift_high: idea.expected_lift_high ?? null,
      confidence:         idea.confidence ?? null,
      confidence_reason:  idea.confidence_reason ?? null,
      impact_score:       idea.impact_score ?? null,
      decision_badge:     idea.decision_badge ?? null,
      human_number:       idea.human_number ?? null,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const ideas = body.ideas
  if (!Array.isArray(ideas) || ideas.length === 0) {
    return NextResponse.json({ error: 'ideas[] or { idea, append: true } required' }, { status: 400 })
  }

  // Replace for current goal(s) only — do not wipe other goals.
  // This prevents switching goals from deleting previous goal ideas.
  const goalCandidates = ideas
    .map((i) => (typeof i.goal === 'string' ? i.goal.trim() : ''))
    .filter(Boolean)

  // Avoid Set iteration to keep TS compile target compatibility.
  const distinctGoals = goalCandidates.filter((g, idx, arr) => arr.indexOf(g) === idx)

  const deleteQuery = supabase.from('opportunities').delete().eq('project_id', project_id).eq('user_id', user.id)
  if (distinctGoals.length > 0) {
    await deleteQuery.in('goal', distinctGoals)
  } else {
    // Fallback: if ideas are missing goal, preserve previous behavior to avoid surprising "no update".
    await deleteQuery
  }

  const rows = ideas.map((idea) => {
    // Strip _ci_data from the idea and write it to the ci_data column
    const { _ci_data, ...fields } = idea as typeof idea & { _ci_data?: unknown }
    return {
      user_id:            user.id,
      project_id,
      title:              fields.title,
      goal:               fields.goal,
      effort:             fields.effort,
      evidence:           fields.evidence,
      winning_pattern:    fields.winning_pattern,
      expected_lift_low:  fields.expected_lift_low,
      expected_lift_high: fields.expected_lift_high,
      confidence:         fields.confidence,
      confidence_reason:  fields.confidence_reason,
      impact_score:       fields.impact_score,
      decision_badge:     fields.decision_badge,
      human_number:       fields.human_number,
      ci_data:            _ci_data ?? null,
    }
  })

  const { error } = await supabase.from('opportunities').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, count: rows.length })
}
