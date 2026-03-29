import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

type Params = { params: { id: string } }

const PLAN_PROMPT = `Generate a specific investigation plan.

Every claim must reference the data above.
Every page listed must be real.
Every hypothesis must cite a competitor or market signal from the data.

Format as clean markdown with these sections:

# Investigation Plan

## The Hypothesis
Why this will work — cite specific evidence.

## What We're Building
Exact change to make — be specific.
Name the screen, the element, the copy change.

## The New Screens
List each screen to add or change.
For each: screen name, what changes, why.

## Files To Change
Based on typical Next.js app structure, which files likely need changing.

## Success Metric
How we measure if this worked.
Specific event or metric to track.

## Evidence
3-5 specific data points from the competitor and market data above.
Each must cite the source.`

export async function POST(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    variation?: Record<string, unknown>
    hypothesis_context?: {
      hypothesis_id?: string
      title?: string
      hypothesis?: string
      suggested_change?: string
      source?: string
      impact_score?: number
      agent_url?: string
      agent_name?: string
      agent_context_summary?: string
      target_element?: { type?: string; text?: string }
    }
  }
  const variation = body.variation ?? {}
  const hypCtx = body.hypothesis_context

  // Fetch opportunity
  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!opportunity) return new Response('Opportunity not found', { status: 404 })

  // Fetch product
  const { data: product } = await supabase
    .from('projects')
    .select('*')
    .eq('id', opportunity.project_id)
    .eq('user_id', user.id)
    .single()
  if (!product) return new Response('Product not found', { status: 404 })

  const strategy = (product.strategy_json ?? {}) as Record<string, unknown>
  const match = (strategy.match ?? {}) as Record<string, unknown>
  const enrichment = (product.enrichment ?? {}) as Record<string, unknown>
  const position = (enrichment.position ?? {}) as Record<string, unknown>
  const subverticalId = (match.subvertical_id as string) ?? null

  // Parallel fetches: subvertical, competitors, homepage scrape
  const [subverticalRes, competitorsRes, pageText] = await Promise.all([
    subverticalId
      ? supabase
          .from('subverticals')
          .select('evolutionary_niches, whitespace, fitness_map, trending_features, primary_icp')
          .eq('id', subverticalId)
          .single()
          .then(r => r.data)
      : Promise.resolve(null),
    subverticalId
      ? supabase
          .from('vertical_products')
          .select('name, known_winning_features, changelog_signals, icp_signals')
          .eq('subvertical_id', subverticalId)
          .eq('is_active', true)
          .limit(8)
          .then(r => r.data ?? [])
      : Promise.resolve([]),
    product.url
      ? fetch(`https://r.jina.ai/${product.url}`, { signal: AbortSignal.timeout(8000) })
          .then(r => r.text())
          .catch(() => null)
      : Promise.resolve(null),
  ])

  const subvertical = subverticalRes as Record<string, unknown> | null
  const competitors = competitorsRes as Record<string, unknown>[]
  const niches = Array.isArray(subvertical?.evolutionary_niches) ? subvertical!.evolutionary_niches as Record<string, unknown>[] : []

  const context = `PRODUCT: ${product.name ?? ''}
URL: ${product.url ?? ''}
WHAT IT DOES: ${product.description ?? ''}
ICP: ${typeof product.icp === 'string' ? product.icp : JSON.stringify(product.icp ?? '')}
GOAL: ${opportunity.goal ?? ''}
NORTH STAR METRIC: ${product.north_star_metric ?? ''}

OPPORTUNITY: ${opportunity.title ?? ''}
EVIDENCE: ${opportunity.evidence ?? ''}

CHOSEN VARIATION: ${String(variation.name ?? '')}
PATTERN: ${String(variation.pattern ?? '')}
WHAT TO BUILD: ${String(variation.what_this_means ?? '')}
VALIDATED BY: ${Array.isArray(variation.validated_by) ? variation.validated_by.join(', ') : ''}
EXPECTED LIFT: +${variation.expected_lift_low ?? '?'}-${variation.expected_lift_high ?? '?'}%

MARKET POSITION:
${String(position.position_summary ?? '')}

EVOLUTIONARY NICHE:
${niches[0] ? String((niches[0] as Record<string, unknown>).niche ?? '') : ''}
${niches[0] ? String((niches[0] as Record<string, unknown>).example_wedge ?? '') : ''}

COMPETITOR SIGNALS:
${competitors.map(c => {
  const changelog = (c.changelog_signals ?? {}) as Record<string, unknown>
  const features90d = Array.isArray(changelog.features_90d) ? (changelog.features_90d as string[]).slice(0, 2).join(', ') : 'nothing recent'
  const icpSignals = (c.icp_signals ?? {}) as Record<string, unknown>
  const whoTheyWin = (icpSignals.who_they_win_with ?? {}) as Record<string, unknown>
  return `${c.name}: recently shipped ${features90d}. Wins with: ${String(whoTheyWin.role ?? 'unknown')}`
}).join('\n')}

HOMEPAGE CONTENT (public):
${pageText?.slice(0, 2000) ?? 'Not available'}
${hypCtx ? `
HYPOTHESIS CONTEXT (from page optimization analysis):
HYPOTHESIS: ${hypCtx.hypothesis ?? ''}
SUGGESTED CHANGE: ${hypCtx.suggested_change ?? ''}
SOURCE: ${hypCtx.source ?? ''}
IMPACT SCORE: ${hypCtx.impact_score ?? '?'}/5
PAGE BEING OPTIMIZED: ${hypCtx.agent_url ?? ''}
PAGE NAME: ${hypCtx.agent_name ?? ''}
TARGET ELEMENT: ${hypCtx.target_element?.text ?? ''}
AGENT ANALYSIS SUMMARY:
${hypCtx.agent_context_summary?.slice(0, 1500) ?? 'Not available'}
` : ''}`

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response('ANTHROPIC_API_KEY not configured', { status: 500 })

  const anthropic = new Anthropic({ apiKey })

  // True streaming from Claude
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      try {
        const response = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: context + '\n\n' + PLAN_PROMPT,
          }],
        })

        response.on('text', (text) => {
          controller.enqueue(encoder.encode(text))
        })

        await response.finalMessage()
        controller.close()
      } catch (e) {
        controller.enqueue(encoder.encode(`\n\n---\n\nError: ${(e as Error).message ?? 'Failed to generate plan'}`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
