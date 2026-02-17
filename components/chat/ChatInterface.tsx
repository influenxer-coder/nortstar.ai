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
  const [initError, setInitError] = useState<string | null>(null)

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
      try {
        console.log('[ChatInterface] Initializing...')
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('[ChatInterface] Auth error:', userError)
          return
        }
        
        if (!user) {
          console.warn('[ChatInterface] No user found')
          return
        }
        
        if (!mounted) return
        
        console.log('[ChatInterface] User:', user.id)
        
        // Ensure profile exists first (required for foreign key constraint)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()
        
        if (profileError) {
          console.error('[ChatInterface] Error checking profile:', profileError)
        }
        
        if (!profile) {
          console.log('[ChatInterface] Creating profile...')
          const { error: createProfileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email ?? '',
              full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
              onboarding_completed: false,
            })
          
          if (createProfileError) {
            console.error('[ChatInterface] Error creating profile:', createProfileError)
            return
          }
          console.log('[ChatInterface] Profile created')
        }
        
        if (!mounted) return
        
        // Try to get existing conversation
        const { data: existing, error: existingError } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (existingError) {
          console.error('[ChatInterface] Error fetching conversation:', existingError)
          console.error('[ChatInterface] Error details:', JSON.stringify(existingError, null, 2))
        }
        
        if (existing && mounted) {
          console.log('[ChatInterface] Found existing conversation:', existing.id)
          setConversationId(existing.id)
          return
        }
        
        // Create new conversation
        console.log('[ChatInterface] Creating new conversation...')
        const { data: created, error: createError } = await supabase
          .from('conversations')
          .insert({ user_id: user.id })
          .select('id')
          .single()
        
        if (createError) {
          console.error('[ChatInterface] Error creating conversation:', createError)
          console.error('[ChatInterface] Error details:', JSON.stringify(createError, null, 2))
          console.error('[ChatInterface] User ID:', user.id)
          if (mounted) {
            setInitError(`Failed to create conversation: ${createError.message}`)
          }
          return
        }
        
        if (created && mounted) {
          console.log('[ChatInterface] Created conversation:', created.id)
          setConversationId(created.id)
          setInitError(null)
        } else if (!created) {
          console.error('[ChatInterface] No conversation returned after insert')
          if (mounted) {
            setInitError('Failed to create conversation: No data returned')
          }
        }
      } catch (err) {
        console.error('[ChatInterface] Init error:', err)
        if (err instanceof Error) {
          console.error('[ChatInterface] Error message:', err.message)
          console.error('[ChatInterface] Error stack:', err.stack)
          if (mounted) {
            setInitError(`Initialization error: ${err.message}`)
          }
        }
      }
    }
    init()
    return () => { mounted = false }
  }, [supabase])

  useEffect(() => {
    if (conversationId) loadMessages()
  }, [conversationId, loadMessages])

  const handleSendMessage = async (content: string) => {
    console.log('[ChatInterface] handleSendMessage called:', { conversationId, content })
    
    if (!conversationId) {
      console.error('[ChatInterface] No conversationId, cannot send message')
      alert('Error: No conversation found. Please refresh the page.')
      return
    }
    
    const userMsg: ChatMessageItem = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    }
    
    console.log('[ChatInterface] Adding user message to state')
    setMessages((prev) => {
      const updated = [...prev, userMsg]
      console.log('[ChatInterface] Messages after adding user:', updated.length)
      return updated
    })
    setLoading(true)
    try {
      console.log('[ChatInterface] Sending message:', { conversation_id: conversationId, message: content })
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, message: content }),
      })
      
      console.log('[ChatInterface] Response status:', res.status)
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        console.error('[ChatInterface] API error:', errorData)
        throw new Error(errorData.error || 'Request failed')
      }
      
      const data = await res.json()
      console.log('[ChatInterface] Response data:', { 
        hasResponse: !!data.response, 
        responseLength: data.response?.length,
        hasArtifact: !!data.artifact 
      })
      
      if (!data.response) {
        throw new Error('No response from backend')
      }
      
      const assistantMsg: ChatMessageItem = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        artifact: data.artifact,
      }
      setMessages((prev) => [...prev, assistantMsg])
      if (data.artifact) setSelectedArtifact(data.artifact)
    } catch (err) {
      console.error('[ChatInterface] Error:', err)
      const errMsg = err instanceof Error ? err.message : 'Something went wrong'
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: `Error: ${errMsg}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  // Debug: Log state changes
  useEffect(() => {
    console.log('[ChatInterface] State update:', {
      conversationId,
      messagesCount: messages.length,
      loading,
      hasArtifact: !!selectedArtifact,
    })
  }, [conversationId, messages.length, loading, selectedArtifact])

  return (
    <div className="flex h-[calc(100vh-0px)] bg-zinc-950">
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50 rounded bg-zinc-900 p-2 text-xs text-zinc-400">
          Conv: {conversationId ? '✓' : '✗'} | Msgs: {messages.length} | Loading: {loading ? '✓' : '✗'}
        </div>
      )}
      <div className="flex flex-1 flex-col min-w-0">
        {!conversationId ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center max-w-md px-4">
              {initError ? (
                <>
                  <div className="mb-4 text-4xl">⚠️</div>
                  <h3 className="mb-2 text-lg font-semibold text-zinc-100">Error setting up conversation</h3>
                  <p className="mb-4 text-sm text-red-400">{initError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="rounded-md bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-500"
                  >
                    Reload page
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-4 text-4xl">⏳</div>
                  <h3 className="mb-2 text-lg font-semibold text-zinc-100">Setting up your conversation...</h3>
                  <p className="text-sm text-zinc-400">Please wait a moment</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <MessageList messages={messages} loading={loading} />
            <MessageInput onSend={handleSendMessage} disabled={loading} />
          </>
        )}
      </div>
      {selectedArtifact && (
        <div className="hidden w-1/2 border-l border-zinc-800 lg:block">
          <ArtifactPreview artifact={selectedArtifact} onClose={() => setSelectedArtifact(null)} />
        </div>
      )}
    </div>
  )
}
