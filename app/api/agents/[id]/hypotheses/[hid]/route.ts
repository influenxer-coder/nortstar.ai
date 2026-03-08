import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { writeLearningEvent } from '@/lib/brain'
import { deriveVertical, derivePageType } from '@/lib/taxonomy'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; hid: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { status?: string; pr_url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validStatuses = ['proposed', 'accepted', 'rejected', 'shipped']
  if (body.status && !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Verify ownership via agent join
  const { data, error } = await supabase
    .from('agent_hypotheses')
    .update({
      ...(body.status ? { status: body.status } : {}),
      ...(body.pr_url !== undefined ? { pr_url: body.pr_url } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.hid)
    .eq('agent_id', params.id)
    .select('*, agents!inner(url, user_id)')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 })
  }

  // Fire-and-forget learning event when status changes to a terminal state
  if (body.status === 'accepted' || body.status === 'rejected') {
    const agentUrl = (data.agents as { url: string | null })?.url ?? ''
    const outcome = body.status as 'accepted' | 'rejected'
    waitUntil(
      writeLearningEvent({
        agentId: params.id,
        userId: user.id,
        vertical: deriveVertical(agentUrl),
        pageType: derivePageType(agentUrl),
        outcome,
        hypothesisTitle: data.title ?? '',
        suggestedChange: data.suggested_change ?? '',
      })
    )
  }

  // Strip the joined agents column before returning
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { agents: _agents, ...hypothesis } = data as typeof data & { agents: unknown }
  return NextResponse.json(hypothesis)
}
