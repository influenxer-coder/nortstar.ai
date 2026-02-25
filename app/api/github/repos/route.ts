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

  let needsReauth = false

  try {
    let page = 0
    while (url && page < 5) {
      page++
      const res: Response = await fetch(url, {
        headers: auth,
        signal: controller.signal,
      })
      if (!res.ok) break

      // On the first page, check that the token actually has `repo` scope.
      // GitHub returns the token's granted scopes in every response header.
      if (page === 1) {
        const grantedScopes = (res.headers.get('X-OAuth-Scopes') || '')
          .split(',')
          .map((s) => s.trim())
        if (!grantedScopes.includes('repo')) {
          needsReauth = true
          break
        }
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

  if (needsReauth) {
    return NextResponse.json({ repos: [], connected: true, needsReauth: true })
  }

  const list = allRepos
    .map((r) => ({ full_name: r.full_name || '', name: r.name || '', private: r.private ?? false }))
    .filter((r) => r.full_name)

  return NextResponse.json({ repos: list, connected: true })
}
