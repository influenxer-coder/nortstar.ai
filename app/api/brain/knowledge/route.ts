import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'

const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 50

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function requireAdmin() {
  const supabase = createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!user || !adminEmail || user.email !== adminEmail) return null
  return user
}

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
    const pdfParse = (await import('pdf-parse')).default
    const parsed = await pdfParse(buffer)
    return parsed.text
  }
  return buffer.toString('utf-8')
}

async function embedBatch(texts: string[]): Promise<number[][] | null> {
  const voyageKey = process.env.VOYAGE_API_KEY
  if (!voyageKey) return null
  try {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${voyageKey}` },
      body: JSON.stringify({ input: texts, model: 'voyage-3-lite' }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.data.map((d: { embedding: number[] }) => d.embedding)
  } catch {
    return null
  }
}

// GET /api/brain/knowledge — paginated list
export async function GET(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0'))
  const limit = 50
  const search = searchParams.get('search') ?? ''

  const supabase = serviceClient()
  let query = supabase
    .from('knowledge_base')
    .select('id, vertical, page_type, framework_type, source, confidence, sample_size, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * limit, page * limit + limit - 1)

  if (search) {
    query = query.ilike('framework_type', `%${search}%`)
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ rows: data ?? [], total: count ?? 0, page, limit })
}

// POST /api/brain/knowledge — ingest text or file (PDF, txt, md) into knowledge_base
export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let text: string
  let vertical: string
  let frameworkType: string
  let source: string

  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    // File upload path
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    vertical = formData.get('vertical') as string ?? 'universal'
    frameworkType = formData.get('framework_type') as string ?? ''
    source = formData.get('source') as string ?? ''

    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })

    try {
      text = await extractText(file)
    } catch {
      return NextResponse.json({ error: 'Could not extract text from file' }, { status: 400 })
    }

    if (!source) source = file.name.replace(/\.[^.]+$/, '')
  } else {
    // JSON text-paste path
    let body: { text: string; vertical: string; framework_type: string; source: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    text = body.text ?? ''
    vertical = body.vertical ?? 'universal'
    frameworkType = body.framework_type ?? ''
    source = body.source ?? ''
  }

  if (!text.trim() || !frameworkType.trim() || !source.trim()) {
    return NextResponse.json({ error: 'text/file, framework_type, and source are required' }, { status: 400 })
  }

  const chunks = chunkText(text)
  if (chunks.length === 0) return NextResponse.json({ error: 'No content to ingest' }, { status: 400 })

  const supabase = serviceClient()
  const rows: Array<{
    vertical: string
    page_type: string
    chunk: string
    framework_type: string
    source: string
    embedding?: number[]
  }> = []

  for (let i = 0; i < chunks.length; i += 128) {
    const batch = chunks.slice(i, i + 128)
    const embeddings = await embedBatch(batch)
    for (let j = 0; j < batch.length; j++) {
      rows.push({
        vertical,
        page_type: 'universal',
        chunk: batch[j],
        framework_type: frameworkType,
        source,
        ...(embeddings ? { embedding: embeddings[j] } : {}),
      })
    }
  }

  const { error } = await supabase.from('knowledge_base').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ inserted: rows.length, embedded: !!process.env.VOYAGE_API_KEY })
}
