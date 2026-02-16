'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function MessageInput({
  onSend,
  disabled,
}: {
  onSend: (message: string) => void
  disabled: boolean
}) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || disabled) return
    onSend(input.trim())
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  return (
    <div className="border-t border-zinc-800 p-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask NorthStar anything... (Enter to send, Shift+Enter for new line)"
          disabled={disabled}
          rows={1}
          className="min-h-[44px] max-h-[200px] flex-1 resize-none border-zinc-700 bg-zinc-900 text-zinc-100 focus-visible:ring-violet-500"
        />
        <Button type="submit" disabled={!input.trim() || disabled} className="bg-violet-600 px-6 hover:bg-violet-500">
          Send
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSend('What are the top 3 pain points I should focus on?')}
          className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          Top pain points
        </button>
        <button
          type="button"
          onClick={() => onSend('Generate a PRD for improving onboarding flow')}
          className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          Generate PRD
        </button>
        <button
          type="button"
          onClick={() => onSend('Help me prioritize my roadmap for next quarter')}
          className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          Prioritize roadmap
        </button>
      </div>
    </div>
  )
}
