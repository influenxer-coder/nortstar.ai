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
  const match = ((project.strategy_json as Record<string, unknown>)?.match as Record<string, unknown> | undefined) ?? {}
  const subverticalId = (match.subvertical_id as string) ?? null

  return (
    <OpportunitiesFeed
      projectId={project.id}
      projectName={project.name ?? 'Product'}
      goal={goal}
      subverticalId={subverticalId}
    />
  )
}
