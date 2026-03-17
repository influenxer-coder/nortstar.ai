import { NextRequest } from 'next/server'

// Dynamic import to avoid pulling pdf-parse/mammoth into edge
async function extractPdf(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default
  const data = await pdfParse(buffer)
  return data.text ?? ''
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || !file.size) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }
    const name = (file.name || '').toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''
    if (name.endsWith('.pdf')) {
      text = await extractPdf(buffer)
    } else if (name.endsWith('.docx')) {
      text = await extractDocx(buffer)
    } else if (name.endsWith('.txt') || name.endsWith('.md')) {
      text = buffer.toString('utf-8')
    } else {
      return Response.json({ error: 'Unsupported type. Use .pdf, .txt, .md, or .docx' }, { status: 400 })
    }
    return Response.json({ text: text || '' })
  } catch (e) {
    console.error('[extract-doc-text]', e)
    return Response.json({ error: 'Failed to extract text' }, { status: 500 })
  }
}
