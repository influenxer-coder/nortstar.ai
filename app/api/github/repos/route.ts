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

  const token = row?.value?.trim()
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

  // X-OAuth-Scopes is only present for OAuth App tokens, not GitHub App tokens.
  // For GitHub Apps, scope is determined by the app's configured permissions,
  // so we detect private-repo access by checking if private repos appear in results.
  let rawScope = ''

  try {
    let page = 0
    while (url && page < 5) {
      page++
      const res: Response = await fetch(url, {
        headers: auth,
        signal: controller.signal,
        cache: 'no-store',
      })
      if (!res.ok) break

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

  // For OAuth Apps: check X-OAuth-Scopes header.
  // For GitHub Apps: X-OAuth-Scopes is always empty; check if private repos are in the results.
  const grantedScopes = rawScope.split(',').map((s) => s.trim()).filter(Boolean)
  const hasOAuthRepoScope = grantedScopes.includes('repo')
  const hasPrivateRepos = list.some((r) => r.private)
  const isGitHubApp = rawScope === '' // GitHub Apps don't return X-OAuth-Scopes

  // needsReauth is only true for OAuth Apps with insufficient scope.
  // For GitHub Apps, private access is configured in app settings, not here.
  const needsReauth = !isGitHubApp && !hasOAuthRepoScope
  const needsAppPermission = isGitHubApp && !hasPrivateRepos

  return NextResponse.json({
    repos: list,
    connected: true,
    needsReauth,
    needsAppPermission,
    scope: rawScope || (isGitHubApp ? '(GitHub App — no scope header)' : 'none'),
  })
}
