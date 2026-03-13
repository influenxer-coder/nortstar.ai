import { AgentStatus } from '@/components/AgentStatus'

export default function OnboardingDocumentsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0f0f0]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="flex justify-end mb-6">
          <span className="text-xs text-[#555]">Step 2 of 6</span>
        </div>
        <h1 className="text-2xl font-medium text-[#f0f0f0] mb-2">
          What has your team already built?
        </h1>
        <p className="text-sm text-[#666] mb-12">
          Drop your existing docs, links, and data sources. NorthStar reads everything.
        </p>
        <p className="text-center text-[#333] text-lg py-16">
          Screen 2 — coming in next session
        </p>
      </div>
      <AgentStatus />
    </div>
  )
}
