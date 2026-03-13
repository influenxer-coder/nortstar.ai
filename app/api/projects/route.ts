import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/projects — create a new project (step 1 of product onboarding)
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { name?: string; url?: string; doc_url?: string; has_doc?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      name: body.name ?? null,
      url: body.url ?? null,
      doc_url: body.doc_url ?? null,
      has_doc: body.has_doc ?? false,
      enrichment_status: 'running',
      onboarding_step: 1,
    })
    .select('id, name, url, doc_url, enrichment_status, onboarding_step')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// GET /api/projects — list user's projects
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, url, enrichment_status, onboarding_step, onboarding_completed, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
