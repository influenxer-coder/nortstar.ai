'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function NewAgentPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [googleDriveRoadmapUrl, setGoogleDriveRoadmapUrl] = useState('')
  const [mainKpi, setMainKpi] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!mainKpi.trim()) {
      setError('Main KPI is required.')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not signed in.')
      setLoading(false)
      return
    }

    const { data, error: err } = await supabase
      .from('agents')
      .insert({
        user_id: user.id,
        name: name.trim() || null,
        google_drive_roadmap_url: googleDriveRoadmapUrl.trim() || null,
        main_kpi: mainKpi.trim(),
      })
      .select('id')
      .single()

    if (err) {
      setError(err.message || 'Failed to create agent.')
      setLoading(false)
      return
    }

    router.push(`/dashboard/agents/${data.id}`)
    router.refresh()
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <Link
        href="/dashboard/agents"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to agents
      </Link>

      <h1 className="text-2xl font-bold text-zinc-100 mb-2">Create a new agent</h1>
      <p className="text-zinc-400 text-sm mb-8">
        Link your roadmap and define the main KPI so this agent can help prioritize work.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
            Agent name <span className="text-zinc-500">(optional)</span>
          </label>
          <Input
            id="name"
            type="text"
            placeholder="e.g. Product roadmap Q1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="google_drive" className="block text-sm font-medium text-zinc-300 mb-2">
            Google Drive roadmap link
          </label>
          <Input
            id="google_drive"
            type="url"
            placeholder="https://docs.google.com/... or https://drive.google.com/..."
            value={googleDriveRoadmapUrl}
            onChange={(e) => setGoogleDriveRoadmapUrl(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Paste the link to your roadmap (Doc, Sheet, or shared drive folder).
          </p>
        </div>

        <div>
          <label htmlFor="main_kpi" className="block text-sm font-medium text-zinc-300 mb-2">
            Main KPI for prioritization <span className="text-red-400">*</span>
          </label>
          <Input
            id="main_kpi"
            type="text"
            placeholder="e.g. MRR growth, Activation rate, NPS"
            value={mainKpi}
            onChange={(e) => setMainKpi(e.target.value)}
            required
            className="w-full"
          />
          <p className="text-xs text-zinc-500 mt-1">
            The metric this agent will use to help prioritize roadmap items.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-500 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              'Create agent'
            )}
          </Button>
          <Link href="/dashboard/agents">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
