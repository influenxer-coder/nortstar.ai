import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const CHUNK_SIZE = 500   // ~500 tokens per chunk
const CHUNK_OVERLAP = 50 // overlap to preserve context across chunks

function chunkText(text: string): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  let i = 0
  while (i < words.length) {
    chunks.push(words.slice(i, i + CHUNK_SIZE).join(' '))
    i += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks.filter(c => c.trim().length > 20)
}

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    // Dynamic import avoids pdf-parse running its self-test at build time
    const pdfParse = (await import('pdf-parse')).default
    const parsed = await pdfParse(buffer)
    return parsed.text
  }
  return buffer.toString('utf-8')
}

// POST /api/agents/[id]/documents — upload and embed a document
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  // Extract text
  let text: string
  try {
    text = await extractText(file)
  } catch {
    return NextResponse.json({ error: 'Could not extract text from file' }, { status: 400 })
  }

  if (!text.trim()) {
    return NextResponse.json({ error: 'File appears to be empty' }, { status: 400 })
  }

  // Split into chunks
  const chunks = chunkText(text)

  // Embed chunks (requires OPENAI_API_KEY)
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    // Store without embeddings — still searchable via text, RAG won't work
    const rows = chunks.map((content, chunk_index) => ({
      agent_id: params.id,
      file_name: file.name,
      chunk_index,
      content,
    }))
    await supabase.from('agent_documents').insert(rows)
    return NextResponse.json({ chunks: rows.length, embedded: false })
  }

  const openai = new OpenAI({ apiKey: openaiKey })

  // Embed in batches of 20
  const rows: { agent_id: string; file_name: string; chunk_index: number; content: string; embedding: number[] }[] = []
  for (let i = 0; i < chunks.length; i += 20) {
    const batch = chunks.slice(i, i + 20)
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    })
    for (let j = 0; j < batch.length; j++) {
      rows.push({
        agent_id: params.id,
        file_name: file.name,
        chunk_index: i + j,
        content: batch[j],
        embedding: res.data[j].embedding,
      })
    }
  }

  const { error } = await supabase.from('agent_documents').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ chunks: rows.length, embedded: true })
}

// GET /api/agents/[id]/documents — list uploaded documents
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Return distinct file names and chunk counts
  const { data } = await supabase
    .from('agent_documents')
    .select('file_name, created_at')
    .eq('agent_id', params.id)
    .order('created_at', { ascending: true })

  // Deduplicate by file_name, keep earliest created_at
  const seen = new Map<string, string>()
  for (const row of data || []) {
    if (!seen.has(row.file_name)) seen.set(row.file_name, row.created_at)
  }
  const files = Array.from(seen.entries()).map(([file_name, created_at]) => ({ file_name, created_at }))

  return NextResponse.json(files)
}

// DELETE /api/agents/[id]/documents?file_name=xxx
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url)
  const fileName = searchParams.get('file_name')
  if (!fileName) return NextResponse.json({ error: 'file_name is required' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase
    .from('agent_documents')
    .delete()
    .eq('agent_id', params.id)
    .eq('file_name', fileName)

  return NextResponse.json({ ok: true })
}
