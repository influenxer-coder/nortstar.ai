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
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.length === 0) {
      return Response.json({ error: 'File is empty' }, { status: 400 })
    }

    let text = ''
    if (name.endsWith('.pdf')) {
      try {
        text = await extractPdf(buffer)
      } catch (pdfErr) {
        console.error('[extract-doc-text] PDF:', pdfErr)
        return Response.json({
          error: 'Could not read PDF. The file may be corrupted, password-protected, or an image-only PDF.',
        }, { status: 422 })
      }
    } else if (name.endsWith('.docx')) {
      try {
        text = await extractDocx(buffer)
      } catch (docxErr) {
        console.error('[extract-doc-text] DOCX:', docxErr)
        return Response.json({
          error: 'Could not read DOCX. The file may be corrupted or in an unsupported format.',
        }, { status: 422 })
      }
    } else if (name.endsWith('.txt') || name.endsWith('.md')) {
      text = buffer.toString('utf-8')
    } else {
      return Response.json({ error: 'Unsupported type. Use .pdf, .txt, .md, or .docx' }, { status: 400 })
    }
    return Response.json({ text: text || '' })
  } catch (e) {
    console.error('[extract-doc-text]', e)
    const message = e instanceof Error ? e.message : 'Failed to extract text'
    return Response.json({ error: message }, { status: 500 })
  }
}
