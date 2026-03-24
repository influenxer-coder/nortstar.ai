import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, name, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  // Ensure a profiles row exists — products.user_id references profiles(id),
  // and the trigger that creates it can silently miss some signups.
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, email: user.email ?? '' }, { onConflict: 'id', ignoreDuplicates: true })
  if (profileError) {
    return NextResponse.json({ error: `Could not ensure profile: ${profileError.message}` }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('products')
    .insert({ user_id: user.id, name })
    .select('id, name, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
