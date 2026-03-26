import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('opportunity_explore_state')
    .select('selected_variation_index')
    .eq('opportunity_id', params.id)
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    selected_variation_index: data?.selected_variation_index ?? null,
  })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { selected_variation_index: number | null }

  await supabase.from('opportunity_explore_state').upsert({
    opportunity_id: params.id,
    user_id: user.id,
    selected_variation_index: body.selected_variation_index,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'opportunity_id,user_id' })

  return NextResponse.json({ ok: true })
}
