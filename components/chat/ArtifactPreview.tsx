'use client'

import { X, Download, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PRDArtifact } from '@/components/artifacts/PRDArtifact'
import { InsightArtifact } from '@/components/artifacts/InsightArtifact'
import { RoadmapArtifact } from '@/components/artifacts/RoadmapArtifact'

export interface ArtifactData {
  id: string
  type: string
  title: string
  content: Record<string, unknown>
}

export function ArtifactPreview({
  artifact,
  onClose,
  showCloseButton = true,
}: {
  artifact: ArtifactData
  onClose: () => void
  showCloseButton?: boolean
}) {
  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(artifact.content, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${artifact.title.replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(artifact.content, null, 2))
  }

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">{artifact.title}</h3>
          <p className="text-sm text-zinc-500">{artifact.type.toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="text-zinc-400 hover:text-zinc-100">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload} className="text-zinc-400 hover:text-zinc-100">
            <Download className="h-4 w-4" />
          </Button>
          {showCloseButton && (
            <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-400 hover:text-zinc-100">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {artifact.type === 'prd' && <PRDArtifact content={artifact.content} />}
        {artifact.type === 'insight' && <InsightArtifact content={artifact.content} />}
        {artifact.type === 'roadmap' && <RoadmapArtifact content={artifact.content} />}
        {!['prd', 'insight', 'roadmap'].includes(artifact.type) && (
          <pre className="whitespace-pre-wrap text-sm text-zinc-400">
            {JSON.stringify(artifact.content, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}
