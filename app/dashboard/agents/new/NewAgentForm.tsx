'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'

const GOOGLE_DRIVE_AUTH_URL = '/api/auth/google-drive?next=' + encodeURIComponent('/dashboard/agents/new')

export default function NewAgentForm({
  googleDriveConnected: initialDriveConnected,
}: {
  googleDriveConnected: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [mainKpi, setMainKpi] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleDriveConnected, setGoogleDriveConnected] = useState(initialDriveConnected)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const connected = searchParams.get('google_drive')
    const err = searchParams.get('error')
    if (connected === 'connected') {
      setMessage({ type: 'success', text: 'Google Drive connected.' })
      setGoogleDriveConnected(true)
      router.replace('/dashboard/agents/new', { scroll: false })
    } else if (err) {
      const msg =
        err === 'access_denied'
          ? 'Google Drive access was denied.'
          : err === 'config'
            ? 'Google Drive is not configured.'
            : 'Could not connect Google Drive. Try again.'
      setMessage({ type: 'error', text: msg })
      router.replace('/dashboard/agents/new', { scroll: false })
    }
  }, [searchParams, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Agent name is required (it will appear in Slack and meetings).')
      return
    }
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
        name: trimmedName,
        google_drive_roadmap_url: null,
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
        Give your agent a name (used in Slack and meetings), link Google Drive for your roadmap, and set the main KPI.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
            Agent name <span className="text-red-400">*</span>
          </label>
          <Input
            id="name"
            type="text"
            placeholder="e.g. Product roadmap Q1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full"
          />
          <p className="text-xs text-zinc-500 mt-1">
            This name will appear in Slack and in meetings.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Roadmap (Google Drive)
          </label>
          {googleDriveConnected ? (
            <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              Google Drive connected
            </div>
          ) : (
            <>
              <a
                href={GOOGLE_DRIVE_AUTH_URL}
                className="inline-flex items-center justify-center rounded-md border border-violet-500/50 bg-violet-600/20 px-4 py-2 text-sm font-medium text-violet-300 hover:bg-violet-600/30"
              >
                Link Google Drive through SSO
              </a>
              <p className="text-xs text-zinc-500 mt-1">
                Connect your Google account so we can access your roadmap. You can create the agent and link Drive later.
              </p>
            </>
          )}
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

        {message && (
          <div
            className={
              message.type === 'success'
                ? 'rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400'
                : 'rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400'
            }
          >
            {message.text}
          </div>
        )}

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
