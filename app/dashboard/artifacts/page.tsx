import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, ArrowRight } from 'lucide-react'

export default async function ArtifactsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/dashboard/artifacts')

  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('id, type, title, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="sticky top-0 z-10 border-b border-zinc-900 bg-zinc-950/90 px-6 py-3 backdrop-blur-sm">
        <h1 className="text-sm font-semibold text-zinc-100">Artifacts</h1>
        <p className="text-xs text-zinc-500 mt-0.5">PRDs, insights, and roadmaps from your conversations</p>
      </div>

      <div className="p-6 max-w-4xl">
        {!artifacts?.length ? (
          <div className="py-20 text-center text-zinc-500">
            <FileText className="mx-auto h-12 w-12 opacity-30 mb-4" />
            <p className="text-sm">No artifacts yet.</p>
            <p className="text-xs mt-1">Chat with NorthStar and ask for a PRD, insight report, or roadmap to generate artifacts.</p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300"
            >
              Go to Chat <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {artifacts.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/artifacts/${a.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
              >
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 shrink-0 text-zinc-500 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-zinc-100 truncate">{a.title}</h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                      <span className="uppercase">{a.type}</span>
                      <span>·</span>
                      <span>{new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
