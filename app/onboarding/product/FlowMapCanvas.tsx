'use client'

export interface FlowMapCanvasProps {
  projectId: string
  onConfirm: (cta: unknown) => void
  onBack: () => void
}

export function FlowMapCanvas({ projectId, onConfirm, onBack }: FlowMapCanvasProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <p className="text-sm text-[#888]">Flow map for project {projectId}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg text-sm text-[#888] border border-[#2a2a2a] hover:border-[#444] transition-colors"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => onConfirm(null)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[#4f8ef7] text-white hover:bg-[#3a7de6] transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
