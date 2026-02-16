import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NorthStar — AI Product Manager on Your Team',
  description: 'Stop drowning in feedback. NorthStar lives in your workflow—Slack, Linear, Notion—delivering insights and PRDs proactively.',
  keywords: 'product management, AI, insights, PRD, Slack, Linear, Notion',
  openGraph: {
    title: 'NorthStar — AI Product Manager on Your Team',
    description: 'Stop drowning in feedback. NorthStar lives in your workflow—Slack, Linear, Notion—delivering insights and PRDs proactively.',
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
      <body className={`${inter.className} antialiased bg-zinc-950 text-zinc-50`}>
        {children}
      </body>
    </html>
  )
}
