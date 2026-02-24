'use client'

// Side effect: ensures PostHog is initialized when this client tree loads
import '@/lib/posthog'

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
