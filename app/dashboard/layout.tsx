import Link from 'next/link'
import { LayoutDashboard, FileText, Settings, Bell, LogOut } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-14 md:w-56 border-r border-zinc-900 flex flex-col py-4 shrink-0">
        {/* Logo */}
        <div className="px-3 md:px-4 mb-6">
          <Link href="/dashboard" className="flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-zinc-900 transition-colors">
            <span className="text-xl">🎯</span>
            <span className="hidden md:block font-semibold text-zinc-100 text-sm">NorthStar</span>
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 space-y-1">
          {[
            { href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Insights', shortcut: 'D' },
            { href: '/dashboard/prds', icon: <FileText className="w-4 h-4" />, label: 'PRDs', shortcut: 'P' },
            { href: '/dashboard/alerts', icon: <Bell className="w-4 h-4" />, label: 'Alerts', shortcut: 'A' },
            { href: '/dashboard/settings', icon: <Settings className="w-4 h-4" />, label: 'Settings', shortcut: 'S' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-2 py-2 rounded-md text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900 transition-colors text-sm group"
            >
              {item.icon}
              <span className="hidden md:block flex-1">{item.label}</span>
              <span className="hidden md:block kbd text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                {item.shortcut}
              </span>
            </Link>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-2 mt-4 border-t border-zinc-900 pt-4 space-y-1">
          {/* User avatar placeholder */}
          <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-zinc-900 transition-colors cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
              A
            </div>
            <div className="hidden md:block min-w-0">
              <p className="text-xs font-medium text-zinc-300 truncate">Alex Chen</p>
              <p className="text-[10px] text-zinc-600 truncate">alex@acme.com</p>
            </div>
          </div>
          <Link
            href="/auth/login"
            className="flex items-center gap-3 px-2 py-2 rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:block">Sign out</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  )
}
