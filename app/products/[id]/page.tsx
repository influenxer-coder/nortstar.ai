import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ProductIntelligence from './ProductIntelligence'

type Params = { params: { id: string } }

export default async function ProductPage({ params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/products/' + params.id)

  // Fetch project (source of all intelligence data)
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !project) notFound()

  // Extract subvertical_id from strategy_json
  const strategyJson = (project.strategy_json ?? {}) as Record<string, unknown>
  const matchData = (strategyJson.match ?? {}) as Record<string, unknown>
  const subverticalId = (matchData.subvertical_id as string) ?? null

  // Fetch subvertical intelligence in parallel with agents
  const [subverticalResult, agentsResult] = await Promise.all([
    subverticalId
      ? supabase
          .from('subverticals')
          .select('evolutionary_niches, whitespace, fitness_map, competitive_intensity, trending_features')
          .eq('id', subverticalId)
          .single()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('agents')
      .select('id, name, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <ProductIntelligence
      project={project}
      subvertical={subverticalResult.data}
      agents={agentsResult.data ?? []}
    />
  )
}
