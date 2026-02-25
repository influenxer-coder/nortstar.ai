import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || ''
  const redirectUri = `${origin.replace(/\/$/, '')}/api/auth/github/callback`

  let next = '/dashboard/agents/new?step=2'
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
      if (decoded.next) next = decoded.next
    } catch {
      // keep default
    }
  }

  if (error) {
    return NextResponse.redirect(new URL(`${next}&error=access_denied`, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL(`${next}&error=no_code`, request.url))
  }

  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`${next}&error=config`, request.url))
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL(`${next}&error=token`, request.url))
  }

  const tokens = await tokenRes.json()
  const accessToken = tokens.access_token
  if (!accessToken) {
    return NextResponse.redirect(new URL(`${next}&error=no_token`, request.url))
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL(`/auth/signin?next=${encodeURIComponent(next)}`, request.url))
  }

  await supabase.from('user_context').upsert(
    {
      user_id: user.id,
      context_type: 'github',
      key: 'access_token',
      value: accessToken,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,context_type,key' }
  )

  const redirectUrl = `${next}${next.includes('?') ? '&' : '?'}github=connected`
  return NextResponse.redirect(new URL(redirectUrl, request.url))
}
