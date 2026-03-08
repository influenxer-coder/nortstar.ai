import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!user || !adminEmail || user.email !== adminEmail) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex">
      {/* Sidebar */}
      <nav className="w-48 shrink-0 border-r border-zinc-800 flex flex-col p-4 gap-1">
        <p className="text-xs font-semibold uppercase text-zinc-500 tracking-wider mb-3 px-2">Admin</p>
        <Link
          href="/admin/brain"
          className="px-2 py-1.5 rounded text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          Dashboard
        </Link>
        <Link
          href="/admin/brain/agents"
          className="px-2 py-1.5 rounded text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          All Agents
        </Link>
        <Link
          href="/admin/brain/ingest"
          className="px-2 py-1.5 rounded text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          Ingest
        </Link>
        <Link
          href="/admin/brain/knowledge"
          className="px-2 py-1.5 rounded text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          Knowledge Base
        </Link>
        <Link
          href="/admin/brain/patterns"
          className="px-2 py-1.5 rounded text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          Patterns
        </Link>
        <div className="mt-auto">
          <Link
            href="/dashboard"
            className="px-2 py-1.5 rounded text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Back to app
          </Link>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
