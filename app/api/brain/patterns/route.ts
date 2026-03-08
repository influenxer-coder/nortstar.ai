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

// GET /api/brain/patterns — list skill_weights ordered by confidence desc
export async function GET(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0'))
  const limit = 50

  const supabase = serviceClient()
  const { data, count, error } = await supabase
    .from('skill_weights')
    .select('*', { count: 'exact' })
    .order('confidence', { ascending: false })
    .range(page * limit, page * limit + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rows: data ?? [], total: count ?? 0, page, limit })
}

// POST /api/brain/patterns — manually insert a pattern
export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let body: { vertical: string; page_type: string; pattern: string; confidence?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.vertical || !body.page_type || !body.pattern) {
    return NextResponse.json({ error: 'vertical, page_type, and pattern are required' }, { status: 400 })
  }

  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('skill_weights')
    .upsert({
      vertical: body.vertical,
      page_type: body.page_type,
      pattern: body.pattern,
      confidence: body.confidence ?? 0.5,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'vertical,page_type,pattern' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
