import type { Metadata } from 'next'
import { Inter, Syne } from 'next/font/google'
import PostHogProvider from '@/components/PostHogProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const syne = Syne({ subsets: ['latin'], variable: '--font-syne' })

export const metadata: Metadata = {
  title: 'NorthStar — Autonomous Feature Improvement',
  description: 'NorthStar embeds an autonomous agent on your highest-traffic features. It reads user signals, forms hypotheses, ships code changes, and measures outcomes — continuously.',
  keywords: 'autonomous feature improvement, product, AI agent, conversion optimization',
  openGraph: {
    title: 'NorthStar — Autonomous Feature Improvement',
    description: 'NorthStar embeds an autonomous agent on your highest-traffic features. It reads user signals, forms hypotheses, ships code changes, and measures outcomes — continuously.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} ${syne.variable} antialiased bg-zinc-950 text-zinc-50 font-sans`}>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
