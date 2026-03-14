import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'
import { deriveVertical, derivePageType } from '@/lib/taxonomy'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function fetchAndExtract(url: string, maxChars: number): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NorthStar-Enrichment/1.0' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return ''
    const html = await res.text()
    const $ = cheerio.load(html)
    const parts: string[] = []
    const title = $('title').text().trim()
    if (title) parts.push(`Title: ${title}`)
    const metaDesc = $('meta[name="description"]').attr('content')
    if (metaDesc) parts.push(`Meta description: ${metaDesc}`)
    const ogDesc = $('meta[property="og:description"]').attr('content')
    if (ogDesc) parts.push(`OG description: ${ogDesc}`)
    const ogTitle = $('meta[property="og:title"]').attr('content')
    if (ogTitle) parts.push(`OG title: ${ogTitle}`)
    $('h1, h2').each((_, el) => {
      const t = $(el).text().trim()
      if (t) parts.push(t)
    })
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
    if (bodyText) parts.push(bodyText.slice(0, maxChars))
    return parts.join('\n\n')
  } catch {
    return ''
  }
}

async function enrichProject(payload: { projectId: string; url?: string | null; docUrl?: string | null }) {
  const { projectId, url, docUrl } = payload
  const supabase = getSupabase()

  const markFailed = () => {
    supabase
      .from('projects')
      .update({ enrichment_status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .then(() => {})
  }

  const combinedParts: string[] = []

  if (url) {
    const base = await fetchAndExtract(url, 1000)
    if (base) combinedParts.push(`[Main page]\n${base}`)
    try {
      const u = new URL(url)
      const aboutUrl = `${u.origin}${u.pathname.replace(/\/$/, '')}/about`
      const about = await fetchAndExtract(aboutUrl, 800)
      if (about) combinedParts.push(`[About]\n${about}`)
    } catch { /* ignore */ }
    try {
      const u = new URL(url)
      const pricingUrl = `${u.origin}${u.pathname.replace(/\/$/, '')}/pricing`
      const pricing = await fetchAndExtract(pricingUrl, 800)
      if (pricing) combinedParts.push(`[Pricing]\n${pricing}`)
    } catch { /* ignore */ }
  }

  if (docUrl) {
    const doc = await fetchAndExtract(docUrl, 3000)
    if (doc) combinedParts.push(`[Strategy doc]\n${doc}`)
  }

  const combinedContext = combinedParts.join('\n\n---\n\n').slice(0, 15000)
  if (!combinedContext.trim()) {
    markFailed()
    return
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const system = 'You are a product intelligence agent. Analyze this content and return ONLY a valid JSON object with no markdown, no explanation.'
  const userPrompt = `Analyze this content about a software product and extract structured intelligence.

Return this exact JSON shape:
{
  "companyName": string,
  "oneLiner": string,
  "targetCustomer": string,
  "northStarMetric": string,
  "kpiCandidates": string[],
  "painThemesAddressed": string[],
  "competitorsMentioned": string[],
  "pricingModel": string,
  "companyStage": string,
  "productType": string,
  "keyDifferentiators": string[],
  "openQuestions": string[]
}

Content:
${combinedContext}`

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    })
    const text = resp.content[0]?.type === 'text' ? resp.content[0].text : ''
    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
    const enrichment = JSON.parse(cleaned) as Record<string, unknown>
    const companyName = typeof enrichment.companyName === 'string' ? enrichment.companyName : null

    await supabase
      .from('projects')
      .update({
        enrichment,
        enrichment_status: 'done',
        ...(companyName ? { name: companyName } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    // Seed knowledge_base with 3 anonymized chunks — best-effort, never throws
    if (url) {
      seedKnowledgeBase(url, enrichment).catch(() => {})
    }
  } catch {
    markFailed()
  }
}

async function embedText(text: string): Promise<number[] | null> {
  const voyageKey = process.env.VOYAGE_API_KEY
  if (!voyageKey) return null
  try {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${voyageKey}` },
      body: JSON.stringify({ input: [text], model: 'voyage-3-lite' }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.data?.[0]?.embedding ?? null
  } catch {
    return null
  }
}

async function seedKnowledgeBase(
  url: string,
  enrichment: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabase()
  const vertical = deriveVertical(url)
  const pageType = derivePageType(url)

  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]).join(', ') : '')

  const chunks: { chunk: string; framework_type: string }[] = [
    {
      chunk: `Product: ${str(enrichment.oneLiner)}. Target customer: ${str(enrichment.targetCustomer)}. North star metric: ${str(enrichment.northStarMetric)}. Stage: ${str(enrichment.companyStage)}.`,
      framework_type: 'product_profile',
    },
    {
      chunk: `Pricing model: ${str(enrichment.pricingModel)}. Key differentiators: ${arr(enrichment.keyDifferentiators)}. Product type: ${str(enrichment.productType)}.`,
      framework_type: 'pricing_positioning',
    },
    {
      chunk: `Pain themes addressed: ${arr(enrichment.painThemesAddressed)}. KPI candidates: ${arr(enrichment.kpiCandidates)}.`,
      framework_type: 'pain_kpi',
    },
  ]

  await Promise.all(
    chunks.map(async ({ chunk, framework_type }) => {
      const embedding = await embedText(chunk)
      if (!embedding) return
      await supabase.from('knowledge_base').insert({
        vertical,
        page_type: pageType,
        chunk,
        framework_type,
        source: 'enrichment',
        embedding,
      })
    })
  )
}

export async function POST(req: NextRequest) {
  let body: { projectId?: string; url?: string | null; docUrl?: string | null }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }
  const projectId = body.projectId
  if (!projectId || typeof projectId !== 'string') {
    return new Response(JSON.stringify({ error: 'projectId required' }), { status: 400 })
  }

  const response = new Response(JSON.stringify({ status: 'started' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

  enrichProject({
    projectId,
    url: body.url ?? null,
    docUrl: body.docUrl ?? null,
  }).catch(console.error)

  return response
}
