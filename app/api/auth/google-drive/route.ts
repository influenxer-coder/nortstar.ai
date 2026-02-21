import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const next = searchParams.get('next') || '/dashboard/agents'
  const clientId = process.env.GOOGLE_CLIENT_ID
  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || ''
  const redirectUri = `${origin.replace(/\/$/, '')}/api/auth/google-drive/callback`

  if (!clientId) {
    console.error('[google-drive] GOOGLE_CLIENT_ID not set')
    return NextResponse.redirect(new URL(`/dashboard/agents/new?error=config`, request.url))
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
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return NextResponse.redirect(`${GOOGLE_OAUTH_URL}?${params.toString()}`)
}
