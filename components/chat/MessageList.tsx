'use client'

import { useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'

export interface ChatMessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  artifact?: { id: string; type: string; title: string; content: Record<string, unknown> }
  created_at?: string
}

export function MessageList({
  messages,
  loading,
}: {
  messages: ChatMessageItem[]
  loading: boolean
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
      {messages.length === 0 && (
        <div className="flex h-full min-h-[40vh] flex-col items-center justify-center text-center">
          <h2 className="mb-2 text-2xl font-bold text-zinc-100">Welcome to NorthStar AI</h2>
          <p className="max-w-md text-zinc-400">
            Your L4 Product Manager. Ask me to analyze feedback, write PRDs, build roadmaps, or
            answer questions about your product.
          </p>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-3xl rounded-lg px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-900 text-zinc-100'
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
            {msg.artifact && (
              <div className="mt-3 border-t border-zinc-800 pt-3">
                <Badge variant="secondary" className="text-xs">
                  {msg.artifact.type.toUpperCase()}
                </Badge>
                <p className="mt-1 text-sm text-zinc-400">{msg.artifact.title}</p>
              </div>
            )}
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex justify-start">
          <div className="rounded-lg bg-zinc-900 px-4 py-3 text-zinc-100">
            <div className="flex space-x-2">
              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: '0.1s' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
