import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Bot, Plus } from 'lucide-react'
import type { Agent } from '@/lib/types'

export default async function AgentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, main_kpi, google_drive_roadmap_url, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Agents</h1>
        <Link href="/dashboard/agents/new">
          <Button className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
            <Plus className="h-4 w-4" />
            Create agent
          </Button>
        </Link>
      </div>

      {!agents?.length ? (
        <div className="border border-zinc-800 rounded-xl p-12 text-center bg-zinc-900/30">
          <Bot className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">No agents yet</h2>
          <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
            Create an agent to link your Google Drive roadmap and define the main KPI for prioritization.
          </p>
          <Link href="/dashboard/agents/new">
            <Button className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
              <Plus className="h-4 w-4" />
              Create your first agent
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {(agents as Agent[]).map((agent) => (
            <li key={agent.id}>
              <Link
                href={`/dashboard/agents/${agent.id}`}
                className="block border border-zinc-800 rounded-xl p-5 bg-zinc-900/50 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-zinc-100 truncate">
                      {agent.name || 'Unnamed agent'}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                      <span className="text-zinc-500">Main KPI:</span> {agent.main_kpi}
                    </p>
                    {agent.google_drive_roadmap_url && (
                      <p className="text-xs text-zinc-500 mt-1 truncate">
                        Roadmap: {agent.google_drive_roadmap_url}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 shrink-0">
                    {new Date(agent.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
