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
  let url: string | null = 'https://api.github.com/user/repos?per_page=100&sort=updated&visibility=all&affiliation=owner,collaborator,organization_member'

  while (url) {
    const res = await fetch(url, { headers: auth })
    if (!res.ok) {
      return NextResponse.json({ repos: [], connected: false }, { status: 200 })
    }
    const page: { full_name?: string; name?: string; private?: boolean }[] = await res.json()
    allRepos.push(...page)

    const link = res.headers.get('Link')
    const nextMatch = link?.match(/<([^>]+)>;\s*rel="next"/)
    url = nextMatch ? nextMatch[1] : null
  }

  const list = allRepos.map((r) => ({
    full_name: r.full_name || '',
    name: r.name || '',
    private: r.private ?? false,
  })).filter((r) => r.full_name)

  return NextResponse.json({ repos: list, connected: true })
}
