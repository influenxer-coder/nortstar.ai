import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { conversation_id: conversationId, message } = body as { conversation_id: string; message: string }
    if (!conversationId || !message?.trim()) {
      return NextResponse.json({ error: 'conversation_id and message required' }, { status: 400 })
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const { data: contextRows } = await supabase.from('user_context').select('context_type, key, value').eq('user_id', user.id)

    // Save user message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: 'user',
      content: message.trim(),
    })

    // Call Railway backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
    const startTime = Date.now()
    
    const backendResponse = await fetch(`${backendUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id,
        conversation_id: conversationId,
        message: message.trim(),
        user_context: {
          profile: profile ?? null,
          context: contextRows ?? [],
        },
      }),
    })

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({ error: 'Backend request failed' }))
      throw new Error(errorData.error || `Backend error: ${backendResponse.status}`)
    }

    const result = await backendResponse.json()
    const processingTime = Date.now() - startTime

    // Save assistant message
    const { data: assistantRow } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'assistant',
        content: result.response,
        agent_used: result.agent_used || 'orchestrator',
        processing_time_ms: processingTime,
      })
      .select()
      .single()

    let artifact: { id: string; type: string; title: string; content: Record<string, unknown> } | null = null
    if (result.artifact && assistantRow) {
      const { data: savedArtifact } = await supabase
        .from('artifacts')
        .insert({
          user_id: user.id,
          conversation_id: conversationId,
          message_id: assistantRow.id,
          type: result.artifact.type,
          title: result.artifact.title,
          content: result.artifact.content,
        })
        .select()
        .single()
      if (savedArtifact) {
        artifact = {
          id: savedArtifact.id,
          type: savedArtifact.type,
          title: savedArtifact.title,
          content: savedArtifact.content as Record<string, unknown>,
        }
      }
    }

    return NextResponse.json({
      response: result.response,
      artifact,
      agent_used: result.agent_used || 'orchestrator',
      processing_time_ms: processingTime,
    })
  } catch (error: unknown) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
