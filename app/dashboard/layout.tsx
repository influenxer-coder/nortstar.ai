import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LayoutDashboard, FileText, Settings, LogOut } from 'lucide-react'
import { Logo } from '@/components/logo'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, onboarding_completed')
    .eq('id', user.id)
    .single()

  if (profile && !profile.onboarding_completed) redirect('/onboarding')

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'User'
  const initial = displayName.charAt(0).toUpperCase()
  const email = profile?.email ?? user.email ?? ''

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <aside className="flex w-14 shrink-0 flex-col border-r border-zinc-900 py-4 md:w-56">
        <div className="mb-6 px-3 md:px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-md py-1.5 px-1 transition-colors hover:bg-zinc-900"
          >
            <Logo size={24} className="shrink-0" />
            <span className="hidden font-semibold text-zinc-100 text-sm md:block">NorthStar</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-2">
          {[
            { href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Chat', shortcut: 'D' },
            { href: '/dashboard/artifacts', icon: <FileText className="h-4 w-4" />, label: 'Artifacts', shortcut: 'A' },
            { href: '/dashboard/settings', icon: <Settings className="h-4 w-4" />, label: 'Settings', shortcut: 'S' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-100 group"
            >
              {item.icon}
              <span className="hidden flex-1 md:block">{item.label}</span>
              <span className="hidden kbd text-[10px] opacity-0 transition-opacity group-hover:opacity-100 md:block">
                {item.shortcut}
              </span>
            </Link>
          ))}
        </nav>

        <div className="mt-4 space-y-1 border-t border-zinc-900 px-2 pt-4">
          <div className="flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-zinc-900 cursor-default">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white">
              {initial}
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-xs font-medium text-zinc-300">{displayName}</p>
              <p className="truncate text-[10px] text-zinc-600">{email}</p>
            </div>
          </div>
          <Link
            href="/auth/signout"
            className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-900 hover:text-zinc-400"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:block">Sign out</span>
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  )
}
