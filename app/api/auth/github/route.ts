import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize'
const SCOPE = 'repo'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const next = searchParams.get('next') || '/dashboard/agents/new'
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
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

  // Revoke any existing GitHub token so GitHub always shows the full
  // authorization screen (with the private-repo permission checkbox).
  // Without this, GitHub silently reuses the old cached authorization
  // and skips the consent screen entirely.
  if (clientSecret) {
    const { data: row } = await supabase
      .from('user_context')
      .select('value')
      .eq('user_id', user.id)
      .eq('context_type', 'github')
      .eq('key', 'access_token')
      .maybeSingle()

    if (row?.value) {
      // Delete the OAuth *grant* (not just the token) so GitHub removes the
      // cached authorization entirely and always shows the full consent screen.
      // DELETE /token only removes the token; the grant stays and GitHub
      // silently re-issues a token with the old scopes without user interaction.
      try {
        await fetch(`https://api.github.com/applications/${clientId}/grant`, {
          method: 'DELETE',
          headers: {
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ access_token: row.value }),
        })
      } catch {
        // Ignore revocation errors
      }

      // Remove the stale token from our DB so we don't show stale data
      await supabase
        .from('user_context')
        .delete()
        .eq('user_id', user.id)
        .eq('context_type', 'github')
        .eq('key', 'access_token')
    }
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
