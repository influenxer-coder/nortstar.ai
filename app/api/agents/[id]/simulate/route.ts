import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { PERSONAS } from '@/lib/simulation-personas'

export const maxDuration = 120

const BROWSERLESS_BASE = 'https://chrome.browserless.io'

async function crawlPageText(url: string): Promise<{ pageText: string; headlines: string[] }> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  if (!apiKey) throw new Error('Browserless not configured')

  const functionCode = `
export default async ({ page }) => {
  await page.goto(${JSON.stringify(url)}, { waitUntil: 'networkidle0', timeout: 30000 });
  const result = await page.evaluate(() => {
    document.querySelectorAll('script, style, noscript, svg, link').forEach(el => el.remove());
    const pageText = (document.body?.innerText ?? '')
      .replace(/[ \\t]+/g, ' ')
      .replace(/\\n{3,}/g, '\\n\\n')
      .trim()
      .slice(0, 6000);
    const getTexts = (sel) => {
      try {
        return Array.from(document.querySelectorAll(sel))
          .map(el => (el.textContent || '').trim())
          .filter(t => t.length > 0)
          .slice(0, 8);
      } catch { return []; }
    };
    const headlines = [
      ...getTexts('h1'),
      ...getTexts('h2'),
      ...getTexts('h3'),
    ].slice(0, 15);
    return { pageText, headlines };
  });
  return { data: result, type: 'application/json' };
};
`

  const res = await fetch(`${BROWSERLESS_BASE}/function?token=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/javascript' },
    body: functionCode,
  })

  if (!res.ok) throw new Error(`Browserless error: ${res.status}`)

  const body = await res.json()
  const data = body?.data ?? body
  return {
    pageText: typeof data?.pageText === 'string' ? data.pageText : '',
    headlines: Array.isArray(data?.headlines) ? data.headlines : [],
  }
}

export async function GET(
  _req: Request,
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
    .maybeSingle()
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: simulation } = await supabase
    .from('agent_simulations')
    .select('*')
    .eq('agent_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json(simulation ?? null)
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent } = await supabase
    .from('agents')
    .select('id, url, target_element, main_kpi, name')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  if (!agent.url) return NextResponse.json({ error: 'Agent has no URL configured' }, { status: 400 })

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  // Step 1: Crawl the page
  let pageText = ''
  let headlines: string[] = []
  try {
    const crawl = await crawlPageText(agent.url)
    pageText = crawl.pageText
    headlines = crawl.headlines
  } catch (err) {
    console.error('[simulate] crawl error:', err)
    return NextResponse.json({ error: 'Failed to crawl page — ensure the URL is public' }, { status: 502 })
  }

  const targetEl = agent.target_element as { type?: string; text?: string; position?: Record<string, number> } | null
  const targetText = targetEl?.text ?? 'primary CTA'
  const targetType = targetEl?.type ?? 'button'
  const targetPos = targetEl?.position ? JSON.stringify(targetEl.position) : 'not specified'

  const pageContent = headlines.length > 0
    ? `Headlines:\n${headlines.join('\n')}\n\nPage text:\n${pageText}`
    : `Page text:\n${pageText}`

  // Steps 2+3: Evaluate all 9 personas in parallel
  const personaResults = await Promise.all(
    PERSONAS.map(async (persona) => {
      try {
        const resp = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 500,
          system: `You are simulating a specific user visiting a landing page. Evaluate their exact experience honestly and critically. Be skeptical — most pages fail most personas. Respond ONLY with valid JSON, no markdown, no explanation.`,
          messages: [{
            role: 'user',
            content: `Persona: ${persona.role} at ${persona.company_stage}
Device: ${persona.device}
Attention span: ${persona.attention_span}
Primary fear: ${persona.primary_fear}
Primary desire: ${persona.primary_desire}
First question: ${persona.first_question}
Converts if: ${persona.converts_if}

TARGET ELEMENT:
Type: ${targetType}
Text: "${targetText}"
Position: ${targetPos}

PAGE CONTENT:
${pageContent}

Return JSON:
{
  "persona_id": "${persona.id}",
  "answers_first_question": true/false,
  "first_question_location": "exact section name or not found",
  "addresses_fear": true/false,
  "fear_location": "exact section name or not found",
  "notices_target_element": true/false,
  "converts": true/false,
  "dropoff_point": "section name where they leave, or completes",
  "single_best_change": "specific concrete change — exact copy or element name",
  "conversion_probability": 0-100
}`,
          }],
        })

        const text = resp.content[0]?.type === 'text' ? resp.content[0].text : ''
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('No JSON in response')
        const result = JSON.parse(match[0])
        return {
          ...result,
          persona_id: persona.id,
          role: persona.role,
          company_stage: persona.company_stage,
          device: persona.device,
        }
      } catch (err) {
        console.error(`[simulate] persona ${persona.id} error:`, err)
        return {
          persona_id: persona.id,
          role: persona.role,
          company_stage: persona.company_stage,
          device: persona.device,
          answers_first_question: false,
          first_question_location: 'evaluation failed',
          addresses_fear: false,
          fear_location: 'evaluation failed',
          notices_target_element: false,
          converts: false,
          dropoff_point: 'evaluation failed',
          single_best_change: 'n/a',
          conversion_probability: 0,
        }
      }
    })
  )

  // Step 4: CFR hypothesis generation
  let cfrResult: {
    overall_conversion_rate: number
    converting_personas: number
    total_personas: number
    highest_regret_gaps: { gap: string; personas_affected: string[]; severity: string }[]
    hypotheses: {
      rank: number
      change: string
      personas_unblocked: string[]
      expected_lift: string
      confidence: string
      risk: string
      implementation: string
    }[]
    recommended_first_test: string
    reasoning: string
  } | null = null

  try {
    const cfrResp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: `You are a conversion optimization agent running counterfactual regret minimization to find the highest-value improvement for a specific page element. Respond ONLY with valid JSON — no markdown, no explanation.`,
      messages: [{
        role: 'user',
        content: `Target element: "${targetText}"
Goal: Maximize clicks on this element.

Simulation results across 9 personas:
${JSON.stringify(personaResults, null, 2)}

Run CFR analysis. Return JSON:
{
  "overall_conversion_rate": number,
  "converting_personas": number,
  "total_personas": 9,
  "highest_regret_gaps": [
    { "gap": string, "personas_affected": [persona_ids], "severity": "high"|"medium"|"low" }
  ],
  "hypotheses": [
    {
      "rank": number,
      "change": string,
      "personas_unblocked": [persona_ids],
      "expected_lift": "e.g. +18-24%",
      "confidence": "high"|"medium"|"low",
      "risk": "high"|"medium"|"low",
      "implementation": string
    }
  ],
  "recommended_first_test": string,
  "reasoning": string
}`,
      }],
    })

    const cfrText = cfrResp.content[0]?.type === 'text' ? cfrResp.content[0].text : ''
    const cfrMatch = cfrText.match(/\{[\s\S]*\}/)
    if (cfrMatch) cfrResult = JSON.parse(cfrMatch[0])
  } catch (err) {
    console.error('[simulate] CFR error:', err)
  }

  const convertingCount = personaResults.filter(r => r.converts).length
  const overallRate = cfrResult?.overall_conversion_rate ?? Math.round(convertingCount / 9 * 100)

  // Step 5: Save to database
  const { data: saved, error: saveError } = await supabase
    .from('agent_simulations')
    .insert({
      agent_id: agent.id,
      url: agent.url,
      persona_results: personaResults,
      hypotheses: cfrResult?.hypotheses ?? [],
      overall_conversion_rate: overallRate,
      converting_personas: convertingCount,
      recommended_first_test: cfrResult?.recommended_first_test ?? null,
      reasoning: cfrResult?.reasoning ?? null,
    })
    .select()
    .single()

  if (saveError) {
    console.error('[simulate] save error:', saveError)
    return NextResponse.json({
      id: crypto.randomUUID(),
      agent_id: agent.id,
      url: agent.url,
      persona_results: personaResults,
      hypotheses: cfrResult?.hypotheses ?? [],
      overall_conversion_rate: overallRate,
      converting_personas: convertingCount,
      recommended_first_test: cfrResult?.recommended_first_test ?? null,
      reasoning: cfrResult?.reasoning ?? null,
      created_at: new Date().toISOString(),
    })
  }

  return NextResponse.json(saved)
}
