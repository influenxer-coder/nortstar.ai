import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OrchestratorAgent } from '@/lib/agents/orchestrator'

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

    const orchestrator = new OrchestratorAgent({
      user_id: user.id,
      user_context: {
        profile: profile ?? null,
        context: contextRows ?? [],
      },
    })

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: 'user',
      content: message.trim(),
    })

    const startTime = Date.now()
    const result = await orchestrator.handleTask({ type: 'query', query: message.trim() })
    const processingTime = Date.now() - startTime

    const { data: assistantRow } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'assistant',
        content: result.response,
        agent_used: result.agent_used,
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
      agent_used: result.agent_used,
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
