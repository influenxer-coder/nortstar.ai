'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageList, type ChatMessageItem } from './MessageList'
import { MessageInput } from './MessageInput'
import { ArtifactPreview, type ArtifactData } from './ArtifactPreview'

export function ChatInterface() {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactData | null>(null)

  const loadMessages = useCallback(async () => {
    if (!conversationId) return
    const { data } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (data) {
      setMessages(
        data.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          created_at: m.created_at,
        }))
      )
    }
  }, [conversationId, supabase])

  useEffect(() => {
    let mounted = true
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) return
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (existing) {
        setConversationId(existing.id)
        return
      }
      const { data: created } = await supabase
        .from('conversations')
        .insert({ user_id: user.id })
        .select('id')
        .single()
      if (created && mounted) setConversationId(created.id)
    }
    init()
    return () => { mounted = false }
  }, [supabase])

  useEffect(() => {
    if (conversationId) loadMessages()
  }, [conversationId, loadMessages])

  const handleSendMessage = async (content: string) => {
    if (!conversationId) return
    const userMsg: ChatMessageItem = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, message: content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      const assistantMsg: ChatMessageItem = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        artifact: data.artifact,
      }
      setMessages((prev) => [...prev, assistantMsg])
      if (data.artifact) setSelectedArtifact(data.artifact)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong'
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: `Error: ${errMsg}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-0px)] bg-zinc-950">
      <div className="flex flex-1 flex-col min-w-0">
        <MessageList messages={messages} loading={loading} />
        <MessageInput onSend={handleSendMessage} disabled={loading} />
      </div>
      {selectedArtifact && (
        <div className="hidden w-1/2 border-l border-zinc-800 lg:block">
          <ArtifactPreview artifact={selectedArtifact} onClose={() => setSelectedArtifact(null)} />
        </div>
      )}
    </div>
  )
}
