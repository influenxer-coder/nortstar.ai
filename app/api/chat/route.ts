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
    
    if (!backendUrl || backendUrl === 'http://localhost:3001') {
      console.warn('[Chat API] WARNING: BACKEND_URL not set, using localhost fallback. Set BACKEND_URL in Vercel env vars.')
    }
    
    const startTime = Date.now()
    
    const backendPayload = {
      user_id: user.id,
      conversation_id: conversationId,
      message: message.trim(),
      user_context: {
        profile: profile ?? null,
        context: contextRows ?? [],
      },
    }

    // Try different endpoint paths - adjust based on your Railway backend structure
    const endpointPath = '/api/chat' // Change to '/chat' or '/v1/chat' if your backend uses different path
    const backendEndpoint = `${backendUrl}${endpointPath}`
    
    console.log(`[Chat API] Calling backend: ${backendEndpoint}`)
    console.log(`[Chat API] Backend URL env: ${process.env.BACKEND_URL || 'NOT SET (using localhost fallback)'}`)
    console.log(`[Chat API] Payload:`, JSON.stringify(backendPayload, null, 2))

    const backendResponse = await fetch(backendEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendPayload),
    })

    console.log(`[Chat API] Backend response status: ${backendResponse.status}`)

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error(`[Chat API] Backend error response:`, errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: `Backend error: ${backendResponse.status} - ${errorText}` }
      }
      throw new Error(errorData.error || errorData.message || `Backend error: ${backendResponse.status}`)
    }

    const result = await backendResponse.json()
    console.log(`[Chat API] Backend result:`, { response: result.response?.substring(0, 100), artifact: result.artifact?.type })
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
    console.error('[Chat API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('[Chat API] Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
