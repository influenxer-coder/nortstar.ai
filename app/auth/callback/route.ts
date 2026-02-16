import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? ''

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
  }

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code)

  if (authError || !user) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
  }

  // Ensure profile exists (create from auth user)
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!existing) {
    await supabase.from('profiles').insert({
      id: user.id,
      email: user.email ?? '',
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      onboarding_completed: false,
    })
  }

  const profile = existing ?? (await supabase.from('profiles').select('onboarding_completed').eq('id', user.id).single()).data

  // Redirect: onboarding first, then dashboard; or requested next
  if (next && !next.startsWith('/onboarding') && !next.startsWith('/dashboard')) {
    return NextResponse.redirect(`${origin}${next}`)
  }
  if (profile && !profile.onboarding_completed) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }
  return NextResponse.redirect(`${origin}/dashboard`)
}
