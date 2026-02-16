"use client"

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Download, Share2, CheckCircle, Edit3, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PRD } from '@/lib/types'

interface PRDEditorProps {
  prd: PRD
  onUpdate?: (content: string) => void
}

export function PRDEditor({ prd, onUpdate }: PRDEditorProps) {
  const [mode, setMode] = useState<'preview' | 'edit'>('preview')
  const [content, setContent] = useState(prd.content)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${prd.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusConfig = {
    draft: { label: 'Draft', class: 'bg-zinc-700/50 text-zinc-400' },
    reviewed: { label: 'Reviewed', class: 'bg-blue-500/20 text-blue-400' },
    shipped: { label: 'Shipped', class: 'bg-green-500/20 text-green-400' },
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-zinc-100 truncate max-w-xs">
            {prd.title}
          </h2>
          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", statusConfig[prd.status].class)}>
            {statusConfig[prd.status].label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex items-center bg-zinc-800 rounded-md p-0.5">
            <button
              onClick={() => setMode('preview')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors",
                mode === 'preview'
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
            <button
              onClick={() => setMode('edit')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors",
                mode === 'edit'
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </button>
          </div>

          <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 text-xs gap-1.5">
            {copied ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDownload} className="h-7 text-xs gap-1.5">
            <Download className="w-3 h-3" />
            Export
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 bg-violet-600/10 border-violet-500/30 text-violet-300 hover:bg-violet-600/20">
            <Share2 className="w-3 h-3" />
            Share to Linear
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {mode === 'preview' ? (
          <div className="prd-content px-8 py-6 max-w-4xl mx-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={e => {
              setContent(e.target.value)
              onUpdate?.(e.target.value)
            }}
            className="w-full h-full min-h-[600px] bg-transparent text-zinc-300 font-mono text-sm p-8 outline-none resize-none leading-relaxed"
            placeholder="# PRD Content..."
            spellCheck={false}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-600">
        <span>{content.split('\n').length} lines · {content.length} characters</span>
        <div className="flex items-center gap-3">
          <span><kbd className="kbd">⌘</kbd><kbd className="kbd">S</kbd> Save</span>
          <span><kbd className="kbd">⌘</kbd><kbd className="kbd">↵</kbd> Share</span>
        </div>
      </div>
    </div>
  )
}
