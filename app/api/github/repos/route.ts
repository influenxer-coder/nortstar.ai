import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: row } = await supabase
    .from('user_context')
    .select('value')
    .eq('user_id', user.id)
    .eq('context_type', 'github')
    .eq('key', 'access_token')
    .maybeSingle()

  const token = row?.value
  if (!token) {
    return NextResponse.json({ repos: [], connected: false }, { status: 200 })
  }

  const auth = { Authorization: `Bearer ${token}` }
  const allRepos: { full_name?: string; name?: string; private?: boolean }[] = []
  let url: string | null =
    'https://api.github.com/user/repos?per_page=100&sort=updated&visibility=all&affiliation=owner,collaborator,organization_member'

  // Abort the entire pagination loop after 10 seconds
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000)

  let rawScope = ''

  try {
    let page = 0
    while (url && page < 5) {
      page++
      const res: Response = await fetch(url, {
        headers: auth,
        signal: controller.signal,
      })
      if (!res.ok) break

      // Capture the granted scope from the first page for reporting back to the client.
      // Do NOT break early — always fetch all repos so at minimum public repos show.
      if (page === 1) {
        rawScope = res.headers.get('X-OAuth-Scopes') || ''
      }

      const items: { full_name?: string; name?: string; private?: boolean }[] = await res.json()
      allRepos.push(...items)
      const link = res.headers.get('Link')
      const nextMatch = link?.match(/<([^>]+)>;\s*rel="next"/)
      url = nextMatch ? nextMatch[1] : null
    }
  } catch {
    // Timeout or network error — return whatever we have
  } finally {
    clearTimeout(timeoutId)
  }

  const list = allRepos
    .map((r) => ({ full_name: r.full_name || '', name: r.name || '', private: r.private ?? false }))
    .filter((r) => r.full_name)

  // Check if the token has full repo (private) access.
  const grantedScopes = rawScope.split(',').map((s) => s.trim()).filter(Boolean)
  const hasFullRepoAccess = grantedScopes.includes('repo')

  return NextResponse.json({
    repos: list,
    connected: true,
    needsReauth: !hasFullRepoAccess,
    scope: rawScope, // exposed for debugging
  })
}
