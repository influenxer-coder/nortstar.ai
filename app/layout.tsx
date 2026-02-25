import type { Metadata } from 'next'
import PostHogProvider from '@/components/PostHogProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'NorthStar — Autonomous Feature Improvement',
  description: 'NorthStar embeds an autonomous agent on your highest-traffic features. It reads user signals, forms hypotheses, ships code changes, and measures outcomes — continuously.',
  keywords: 'autonomous feature improvement, product, AI agent, conversion optimization',
  openGraph: {
    title: 'NorthStar — Autonomous Feature Improvement',
    description: 'NorthStar embeds an autonomous agent on your highest-traffic features. It reads user signals, forms hypotheses, ships code changes, and measures outcomes — continuously.',
    type: 'website',
  },
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-zinc-950 text-zinc-50 font-sans">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
