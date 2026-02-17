import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? ''
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Supabase may redirect here with error if magic link is invalid/expired (e.g. opened in different browser)
  if (!code) {
    const params = new URLSearchParams()
    if (error) params.set('error', error)
    if (errorDescription) params.set('error_description', errorDescription)
    if (!error && !errorDescription) params.set('error', 'no_code')
    return NextResponse.redirect(`${origin}/auth/login?${params.toString()}`)
  }

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code)

  if (authError || !user) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
  }

  // Check if this is a new user (just verified email)
  const isNewUser = !user.user_metadata?.password_set

  // Ensure profile exists (create from auth user)
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (!existing) {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email ?? '',
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      onboarding_completed: false,
    })
    if (insertError) {
      console.error('[Callback] Error creating profile:', insertError)
    }
  }

  const profile = existing ?? (await supabase.from('profiles').select('onboarding_completed').eq('id', user.id).maybeSingle()).data

  // Redirect: onboarding first, then dashboard; or requested next
  if (next && !next.startsWith('/onboarding') && !next.startsWith('/dashboard')) {
    return NextResponse.redirect(`${origin}${next}`)
  }
  if (profile && !profile.onboarding_completed) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }
  return NextResponse.redirect(`${origin}/dashboard`)
}
