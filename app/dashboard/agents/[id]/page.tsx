import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ArrowLeft, Bot } from 'lucide-react'
import type { Agent } from '@/lib/types'

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, google_drive_roadmap_url, main_kpi, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!agent) notFound()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link
        href="/dashboard/agents"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to agents
      </Link>

      <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-violet-400" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100">
            {(agent as Agent).name || 'Unnamed agent'}
          </h1>
        </div>

        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-zinc-500 font-medium">Main KPI</dt>
            <dd className="text-zinc-100 mt-1">{(agent as Agent).main_kpi}</dd>
          </div>
          {(agent as Agent).google_drive_roadmap_url && (
            <div>
              <dt className="text-zinc-500 font-medium">Google Drive roadmap</dt>
              <dd className="mt-1">
                <a
                  href={(agent as Agent).google_drive_roadmap_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 truncate block max-w-full"
                >
                  {(agent as Agent).google_drive_roadmap_url}
                </a>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-zinc-500 font-medium">Created</dt>
            <dd className="text-zinc-400 mt-1">
              {new Date((agent as Agent).created_at).toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
