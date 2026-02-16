"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { FileText, Zap, Search, LayoutDashboard, Settings, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
  category: string
}

interface CommandPaletteProps {
  insightTitles?: Array<{ id: string; title: string }>
}

export function CommandPalette({ insightTitles = [] }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()

  // Cmd+K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const commands: CommandItem[] = [
    {
      id: 'dashboard',
      label: 'Go to Dashboard',
      icon: <LayoutDashboard className="w-4 h-4 text-zinc-400" />,
      shortcut: 'D',
      action: () => { router.push('/dashboard'); setOpen(false) },
      category: 'Navigate',
    },
    {
      id: 'generate-prd',
      label: 'Generate PRD',
      description: 'Create a new PRD from an insight',
      icon: <Zap className="w-4 h-4 text-violet-400" />,
      shortcut: 'G P',
      action: () => { router.push('/dashboard/generate-prd'); setOpen(false) },
      category: 'Actions',
    },
    {
      id: 'search-feedback',
      label: 'Search Feedback',
      description: 'Semantic search across all tickets and calls',
      icon: <Search className="w-4 h-4 text-zinc-400" />,
      shortcut: '/',
      action: () => { setOpen(false) },
      category: 'Actions',
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'Manage integrations and data sources',
      icon: <Settings className="w-4 h-4 text-zinc-400" />,
      action: () => { router.push('/dashboard/settings'); setOpen(false) },
      category: 'Navigate',
    },
    ...insightTitles.map(insight => ({
      id: `prd-${insight.id}`,
      label: `Generate PRD for: ${insight.title}`,
      icon: <FileText className="w-4 h-4 text-violet-400" />,
      action: () => {
        router.push(`/dashboard/generate-prd?insightId=${insight.id}`)
        setOpen(false)
      },
      category: 'Quick Generate',
    })),
  ]

  const filtered = search
    ? commands.filter(c =>
        c.label.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase())
      )
    : commands

  const categories = Array.from(new Set(filtered.map(c => c.category)))

  return (
    <>
      {/* Trigger hint */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        aria-label="Open command palette"
      >
        <span className="kbd">⌘</span>
        <span className="kbd">K</span>
        <span className="ml-1">Command</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 max-w-xl overflow-hidden border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50">
          <Command className="bg-transparent" shouldFilter={false}>
            {/* Search input */}
            <div className="flex items-center border-b border-zinc-800 px-4 py-3">
              <Search className="w-4 h-4 text-zinc-500 mr-3 shrink-0" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Type a command or search…"
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 outline-none"
              />
              <button
                onClick={() => setOpen(false)}
                className="kbd text-[10px] ml-2"
              >
                esc
              </button>
            </div>

            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="py-8 text-center text-sm text-zinc-600">
                No commands found for "{search}"
              </Command.Empty>

              {categories.map(category => {
                const items = filtered.filter(c => c.category === category)
                return (
                  <Command.Group
                    key={category}
                    heading={
                      <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-2 py-1">
                        {category}
                      </span>
                    }
                    className="mb-2"
                  >
                    {items.map(item => (
                      <Command.Item
                        key={item.id}
                        value={item.id}
                        onSelect={item.action}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 data-[selected=true]:bg-zinc-800 data-[selected=true]:text-zinc-100 transition-colors"
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.label}</div>
                          {item.description && (
                            <div className="text-xs text-zinc-600 truncate">{item.description}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.shortcut && item.shortcut.split(' ').map((k, i) => (
                            <span key={i} className="kbd text-[10px]">{k}</span>
                          ))}
                          <ArrowRight className="w-3 h-3 text-zinc-700" />
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )
              })}
            </Command.List>

            {/* Footer */}
            <div className="border-t border-zinc-800 px-4 py-2 flex items-center gap-4 text-[11px] text-zinc-600">
              <span><kbd className="kbd">↑↓</kbd> navigate</span>
              <span><kbd className="kbd">↵</kbd> select</span>
              <span><kbd className="kbd">esc</kbd> close</span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
