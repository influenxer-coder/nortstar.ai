import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { NormalizedIdea } from '@/app/api/onboarding/wow-data/route'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { project_id: string; ideas: NormalizedIdea[] }
  const { project_id, ideas } = body

  if (!project_id || !Array.isArray(ideas) || ideas.length === 0) {
    return NextResponse.json({ error: 'project_id and ideas[] are required' }, { status: 400 })
  }

  // Delete existing opportunities for this project before re-inserting
  await supabase.from('opportunities').delete().eq('project_id', project_id).eq('user_id', user.id)

  const rows = ideas.map((idea) => ({
    user_id:            user.id,
    project_id,
    title:              idea.title,
    goal:               idea.goal,
    effort:             idea.effort,
    evidence:           idea.evidence,
    winning_pattern:    idea.winning_pattern,
    expected_lift_low:  idea.expected_lift_low,
    expected_lift_high: idea.expected_lift_high,
    confidence:         idea.confidence,
    confidence_reason:  idea.confidence_reason,
    impact_score:       idea.impact_score,
    decision_badge:     idea.decision_badge,
    human_number:       idea.human_number,
  }))

  const { error } = await supabase.from('opportunities').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, count: rows.length })
}
