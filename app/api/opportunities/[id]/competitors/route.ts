import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: opportunity, error: oppErr } = await supabase
    .from('opportunities')
    .select('project_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (oppErr || !opportunity) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  }

  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('strategy_json')
    .eq('id', opportunity.project_id as string)
    .eq('user_id', user.id)
    .single()

  if (projErr || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const strategy = (project.strategy_json ?? {}) as Record<string, unknown>
  const match = (strategy.match ?? {}) as Record<string, unknown>
  const subverticalId = (match.subvertical_id as string) ?? null

  if (!subverticalId) {
    return NextResponse.json({ competitors: [] })
  }

  const { data: competitors, error: compErr } = await supabase
    .from('vertical_products')
    .select('name, one_liner, funding_stage, icp_signals, known_winning_features')
    .eq('subvertical_id', subverticalId)
    .eq('is_active', true)
    .limit(12)

  if (compErr) {
    return NextResponse.json({ error: compErr.message }, { status: 500 })
  }

  return NextResponse.json({ competitors: competitors ?? [] })
}
