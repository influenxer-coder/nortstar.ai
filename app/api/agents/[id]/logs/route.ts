import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: logs } = await supabase
    .from('agent_logs')
    .select('id, step_name, message, status, created_at')
    .eq('agent_id', params.id)
    .order('created_at', { ascending: true })

  return NextResponse.json(logs ?? [])
}
