import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function requireAdmin() {
  const supabase = createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!user || !adminEmail || user.email !== adminEmail) return null
  return user
}

// PATCH /api/brain/knowledge/[kid] — update confidence score
export async function PATCH(
  request: Request,
  { params }: { params: { kid: string } }
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let body: { confidence?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.confidence !== undefined && (body.confidence < 0 || body.confidence > 1)) {
    return NextResponse.json({ error: 'confidence must be between 0 and 1' }, { status: 400 })
  }

  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('knowledge_base')
    .update({ ...(body.confidence !== undefined ? { confidence: body.confidence } : {}) })
    .eq('id', params.kid)
    .select('id, confidence')
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

// DELETE /api/brain/knowledge/[kid]
export async function DELETE(
  _request: Request,
  { params }: { params: { kid: string } }
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const supabase = serviceClient()
  const { error } = await supabase.from('knowledge_base').delete().eq('id', params.kid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
