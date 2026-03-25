import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import OpportunitiesFeed from './OpportunitiesFeed'

type Params = { params: { id: string } }

export default async function OpportunitiesPage({ params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/products/' + params.id + '/opportunities')

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, strategy_json')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !project) notFound()

  const ctx = ((project.strategy_json as Record<string, unknown>)?.onboarding_context as Record<string, unknown> | undefined)
  const goal = (ctx?.goal as string) ?? null
  const productName = (ctx?.product_name as string) ?? project.name ?? 'Product'
  const match = ((project.strategy_json as Record<string, unknown>)?.match as Record<string, unknown> | undefined) ?? {}
  const subverticalId = (match.subvertical_id as string) ?? null

  // Fetch recent commits for NorthStar product
  type CommitRow = { sha: string; message: string; date: string; url: string }
  let recentCommits: CommitRow[] = []
  const isNorthStar = /northstar/i.test(productName)
  if (isNorthStar) {
    try {
      const res = await fetch(
        'https://api.github.com/repos/influenxer-coder/nortstar.ai/commits?per_page=10',
        { headers: { Accept: 'application/vnd.github.v3+json' }, next: { revalidate: 300 } }
      )
      if (res.ok) {
        const raw = await res.json() as Array<{ sha: string; commit: { message: string; author: { date: string } }; html_url: string }>
        recentCommits = raw.map((c) => ({
          sha: c.sha.slice(0, 7),
          message: c.commit.message.split('\n')[0],
          date: c.commit.author.date,
          url: c.html_url,
        }))
      }
    } catch { /* silently skip */ }
  }

  return (
    <OpportunitiesFeed
      projectId={project.id}
      projectName={project.name ?? 'Product'}
      productName={productName}
      goal={goal}
      subverticalId={subverticalId}
      recentCommits={recentCommits}
    />
  )
}
