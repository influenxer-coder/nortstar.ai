import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ArtifactPreview } from '@/components/chat/ArtifactPreview'

export default async function ArtifactDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/dashboard/artifacts/' + params.id)

  const { data: artifact } = await supabase
    .from('artifacts')
    .select('id, type, title, content')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!artifact) notFound()

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-900 bg-zinc-950/90 px-6 py-3 backdrop-blur-sm">
        <Link
          href="/dashboard/artifacts"
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Artifacts
        </Link>
      </div>
      <div className="flex-1 min-h-0">
        <ArtifactPreview
          artifact={{
            id: artifact.id,
            type: artifact.type,
            title: artifact.title,
            content: artifact.content as Record<string, unknown>,
          }}
          onClose={() => {}}
          showCloseButton={false}
        />
      </div>
    </div>
  )
}
