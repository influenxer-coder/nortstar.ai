import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase
    .from('projects')
    .select('strategy_json')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ ci_enriched: false })

  const strategy = (project.strategy_json ?? {}) as Record<string, unknown>
  const ciAnalysisId = strategy.ci_analysis_id as string | undefined

  if (!ciAnalysisId) return NextResponse.json({ ci_enriched: false })

  const { data: phases } = await supabase
    .from('ci_phase_outputs')
    .select('phase, payload')
    .eq('analysis_id', ciAnalysisId)
    .in('phase', ['phase2', 'phase3', 'phase5', 'phase6', 'phase8'])

  if (!phases || phases.length === 0) return NextResponse.json({ ci_enriched: false })

  const phaseMap: Record<string, unknown> = {}
  for (const p of phases) {
    phaseMap[p.phase] = p.payload
  }

  const p2 = (phaseMap.phase2 ?? {}) as Record<string, unknown>
  const p3 = (phaseMap.phase3 ?? {}) as Record<string, unknown>
  const p5 = (phaseMap.phase5 ?? {}) as Record<string, unknown>
  const p6 = (phaseMap.phase6 ?? {}) as Record<string, unknown>
  const p8 = (phaseMap.phase8 ?? {}) as Record<string, unknown>

  return NextResponse.json({
    ci_enriched: true,
    segments: Array.isArray(p3.segments) ? p3.segments : [],
    use_case_rows: Array.isArray(p5.rows) ? p5.rows : [],
    gaps: Array.isArray(p6.gaps) ? p6.gaps : [],
    goals: Array.isArray(p8.goals) ? p8.goals : [],
    competitors_detail: Array.isArray(p2.direct) ? p2.direct : [],
  })
}
