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
  const product = (strategy.product ?? {}) as Record<string, unknown>
  const productName = String(product.product_name ?? '')

  if (!ciAnalysisId) return NextResponse.json({ ci_enriched: false })

  const { data: phases } = await supabase
    .from('ci_phase_outputs')
    .select('phase, payload')
    .eq('analysis_id', ciAnalysisId)
    .in('phase', ['phase2', 'phase3', 'phase5', 'phase6', 'phase8', 'phase9', 'phase10'])

  if (!phases || phases.length === 0) return NextResponse.json({ ci_enriched: false })

  const phaseMap: Record<string, unknown> = {}
  for (const p of phases) {
    phaseMap[p.phase] = p.payload
  }

  const p = (phase: string) => (phaseMap[phase] ?? {}) as Record<string, unknown>

  return NextResponse.json({
    ci_enriched: true,
    product_name: productName,
    segments: Array.isArray(p('phase3').segments) ? p('phase3').segments : [],
    use_case_rows: Array.isArray(p('phase5').rows) ? p('phase5').rows : [],
    gaps: Array.isArray(p('phase6').gaps) ? p('phase6').gaps : [],
    goals: Array.isArray(p('phase8').goals) ? p('phase8').goals : [],
    okrs: Array.isArray(p('phase9').okrs) ? p('phase9').okrs : [],
    designs: Array.isArray(p('phase10').designs) ? p('phase10').designs : [],
    competitors_direct: Array.isArray(p('phase2').direct) ? p('phase2').direct : [],
  })
}
