import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || ''
  const redirectUri = `${origin.replace(/\/$/, '')}/api/auth/google-drive/callback`

  let next = '/dashboard/agents/new'
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
      if (decoded.next) next = decoded.next
    } catch {
      // ignore
    }
  }

  if (error) {
    return NextResponse.redirect(new URL(`${next}?error=access_denied`, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL(`${next}?error=no_code`, request.url))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`${next}?error=config`, request.url))
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error('[google-drive callback] token error:', err)
    return NextResponse.redirect(new URL(`${next}?error=token`, request.url))
  }

  const tokens = await tokenRes.json()
  const refreshToken = tokens.refresh_token || tokens.access_token
  if (!refreshToken) {
    return NextResponse.redirect(new URL(`${next}?error=no_token`, request.url))
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL(`/auth/signin?next=${encodeURIComponent(next)}`, request.url))
  }

  await supabase.from('user_context').upsert(
    {
      user_id: user.id,
      context_type: 'google_drive',
      key: 'refresh_token',
      value: refreshToken,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,context_type,key' }
  )

  return NextResponse.redirect(new URL(`${next}?google_drive=connected`, request.url))
}
