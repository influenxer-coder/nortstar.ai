import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize'
const SCOPE = 'repo'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const next = searchParams.get('next') || '/dashboard/agents/new'
  const clientId = process.env.GITHUB_CLIENT_ID
  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || ''
  const redirectUri = `${origin.replace(/\/$/, '')}/api/auth/github/callback`

  if (!clientId) {
    return NextResponse.redirect(new URL(`${next}?step=2&error=config`, request.url))
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL(`/auth/signin?next=${encodeURIComponent(request.url)}`, request.url))
  }

  const state = Buffer.from(JSON.stringify({ next, userId: user.id })).toString('base64url')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPE,
    state,
  })

  return NextResponse.redirect(`${GITHUB_OAUTH_URL}?${params.toString()}`)
}
