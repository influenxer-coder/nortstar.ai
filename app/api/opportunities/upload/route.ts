import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext      = file.name.split('.').pop() ?? 'pdf'
  const path     = `${user.id}/${Date.now()}.${ext}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from('opportunity-docs')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('opportunity-docs')
    .getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
