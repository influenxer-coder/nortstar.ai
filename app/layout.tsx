import type { Metadata } from 'next'
import { Instrument_Serif, DM_Sans } from 'next/font/google'
import PostHogProvider from '@/components/PostHogProvider'
import './globals.css'

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-instrument-serif',
})
const dmSans = DM_Sans({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

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
      <body className={`${dmSans.variable} ${instrumentSerif.variable} ${dmSans.className} antialiased bg-zinc-950 text-zinc-50 font-sans`}>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
