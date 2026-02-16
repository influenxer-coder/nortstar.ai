import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return n.toString()
}

export const SEVERITY_CONFIG = {
  critical: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    dot: 'bg-red-500',
    badge: 'bg-red-500/20 text-red-300',
    emoji: '🔴',
    label: 'CRITICAL',
  },
  high: {
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    dot: 'bg-orange-500',
    badge: 'bg-orange-500/20 text-orange-300',
    emoji: '🟠',
    label: 'HIGH',
  },
  medium: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    dot: 'bg-yellow-500',
    badge: 'bg-yellow-500/20 text-yellow-300',
    emoji: '🟡',
    label: 'MEDIUM',
  },
  low: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    dot: 'bg-blue-500',
    badge: 'bg-blue-500/20 text-blue-300',
    emoji: '🟢',
    label: 'LOW',
  },
  positive: {
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    dot: 'bg-green-500',
    badge: 'bg-green-500/20 text-green-300',
    emoji: '🟢',
    label: 'POSITIVE',
  },
} as const
