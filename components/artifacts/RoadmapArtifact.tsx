'use client'

export function RoadmapArtifact({ content }: { content: Record<string, unknown> }) {
  const items = (content.items as Array<Record<string, unknown>>) || content.roadmap as Array<Record<string, unknown>> || []
  return (
    <div className="space-y-4">
      {items.map((item: Record<string, unknown>, i: number) => (
        <div key={i} className="flex gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-sm font-medium text-violet-400">
            {i + 1}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-zinc-100">{String(item.title ?? item.name ?? '')}</h3>
            {item.description && (
              <p className="mt-1 text-sm text-zinc-400">{String(item.description)}</p>
            )}
            {item.quarter && (
              <p className="mt-1 text-xs text-zinc-500">Target: {String(item.quarter)}</p>
            )}
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-zinc-500">No roadmap items. Content: {JSON.stringify(content)}</p>
      )}
    </div>
  )
}
