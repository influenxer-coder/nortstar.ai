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

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const supabase = serviceClient()

  const [
    { count: knowledgeCount },
    { count: eventsCount },
    { count: weightsCount },
    { data: topPatterns },
  ] = await Promise.all([
    supabase.from('knowledge_base').select('*', { count: 'exact', head: true }),
    supabase.from('learning_events').select('*', { count: 'exact', head: true }),
    supabase.from('skill_weights').select('*', { count: 'exact', head: true }),
    supabase
      .from('skill_weights')
      .select('vertical, page_type, pattern, confidence, sample_size')
      .order('confidence', { ascending: false })
      .limit(10),
  ])

  return NextResponse.json({
    knowledge_base: knowledgeCount ?? 0,
    learning_events: eventsCount ?? 0,
    skill_weights: weightsCount ?? 0,
    top_patterns: topPatterns ?? [],
  })
}
