import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Bot, Plus, FilePen } from 'lucide-react'
import type { Agent } from '@/lib/types'

export default async function AgentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, url, target_element, status, step, main_kpi, google_drive_roadmap_url, product_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const drafts = (agents ?? []).filter((a) => a.status === 'draft') as Agent[]
  const active = (agents ?? []).filter((a) => a.status !== 'draft') as Agent[]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Agents</h1>
        <Link href="/dashboard/agents/new">
          <Button className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
            <Plus className="h-4 w-4" />
            Improve
          </Button>
        </Link>
      </div>

      {!agents?.length ? (
        <div className="border border-zinc-800 rounded-xl p-12 text-center bg-zinc-900/30">
          <Bot className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">No agents yet</h2>
          <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
            Create an agent: connect a URL, GitHub, and PostHog, then pick the element to optimize.
          </p>
          <Link href="/dashboard/agents/new">
            <Button className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
              <Plus className="h-4 w-4" />
              Improve
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {drafts.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Drafts</h2>
              <ul className="space-y-3">
                {drafts.map((agent) => {
                  const stepLabels = ['', 'Basics', 'GitHub', 'PostHog', 'Element']
                  const stepLabel = stepLabels[agent.step ?? 0] ?? 'Basics'
                  const resumeStep = Math.min((agent.step ?? 0) + 1, 4)
                  return (
                    <li key={agent.id}>
                      <div className="flex items-center justify-between border border-zinc-800 border-dashed rounded-xl p-5 bg-zinc-900/30">
                        <div className="flex items-center gap-3 min-w-0">
                          <FilePen className="h-4 w-4 text-zinc-500 shrink-0" />
                          <div className="min-w-0">
                            <h3 className="font-semibold text-zinc-100 truncate">{agent.name}</h3>
                            {agent.url && (
                              <p className="text-sm text-zinc-500 truncate">{agent.url}</p>
                            )}
                            <p className="text-xs text-zinc-600 mt-0.5">
                              Saved at step {agent.step ?? 0} ({stepLabel})
                            </p>
                          </div>
                        </div>
                        <Link
                          href={`/dashboard/agents/new?draft=${agent.id}&step=${resumeStep}`}
                          className="shrink-0 ml-4"
                        >
                          <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white">
                            Continue
                          </Button>
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {active.length > 0 && (
            <div>
              {drafts.length > 0 && (
                <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Active</h2>
              )}
              <ul className="space-y-4">
                {active.map((agent) => (
                  <li key={agent.id}>
                    <Link
                      href={`/dashboard/agents/${agent.id}`}
                      className="block border border-zinc-800 rounded-xl p-5 bg-zinc-900/50 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-zinc-100 truncate">
                            {agent.name}
                          </h3>
                          {agent.url && (
                            <p className="text-sm text-zinc-400 mt-1 truncate">
                              <span className="text-zinc-500">URL:</span> {agent.url}
                            </p>
                          )}
                          {agent.target_element?.text && (
                            <p className="text-xs text-zinc-500 mt-0.5 truncate">
                              Element: {agent.target_element?.text}
                            </p>
                          )}
                          {!agent.url && agent.main_kpi && (
                            <p className="text-sm text-zinc-400 mt-1">
                              <span className="text-zinc-500">Main KPI:</span> {agent.main_kpi}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-xs text-zinc-500 block">
                            {agent.status || 'Analyzing'}
                          </span>
                          <span className="text-xs text-zinc-500 block mt-0.5">
                            {new Date(agent.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
