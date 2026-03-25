import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

type Params = { params: { id: string } }

function sse(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(sse({ type: 'error', message: 'Unauthorized' }), { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    variation?: Record<string, unknown>
    activation_event?: Record<string, unknown> | string
  }

  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!opportunity) return new Response(sse({ type: 'error', message: 'Opportunity not found' }), { status: 404 })

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, url, icp, strategy_json')
    .eq('id', opportunity.project_id)
    .eq('user_id', user.id)
    .single()
  if (!project) return new Response(sse({ type: 'error', message: 'Project not found' }), { status: 404 })

  const strategy = (project.strategy_json ?? {}) as Record<string, unknown>
  const match = (strategy.match ?? {}) as Record<string, unknown>
  const subverticalId = (match.subvertical_id as string) ?? null

  const [subverticalRes, competitorsRes] = await Promise.all([
    subverticalId
      ? supabase
          .from('subverticals')
          .select('evolutionary_niches, whitespace, fitness_map, competitive_intensity, trending_features')
          .eq('id', subverticalId)
          .single()
      : Promise.resolve({ data: null, error: null }),
    subverticalId
      ? supabase
          .from('vertical_products')
          .select('name, known_winning_features, changelog_signals, icp_signals, funding_stage, social_signals')
          .eq('subvertical_id', subverticalId)
          .eq('is_active', true)
      : Promise.resolve({ data: [], error: null }),
  ])

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response(sse({ type: 'error', message: 'ANTHROPIC_API_KEY not configured' }), { status: 500 })
  const anthropic = new Anthropic({ apiKey })

  const variationName = String((body.variation as Record<string, unknown> | undefined)?.name ?? '')
  const variationMeans = String((body.variation as Record<string, unknown> | undefined)?.what_this_means ?? '')
  const activationEvent = typeof body.activation_event === 'string'
    ? body.activation_event
    : String((body.activation_event as Record<string, unknown> | undefined)?.event_name ?? body.activation_event ?? '')

  const system = `You are NorthStar's investigation planner.
Generate a specific actionable investigation plan grounded entirely in the data provided.

Every claim must reference specific evidence. Every page listed must exist in the product. Every hypothesis must cite a competitor or data point.

Format as clean markdown:
# Investigation Plan
## The Hypothesis
## What We're Building
## Pages To Crawl
## Pre-Seeded Hypotheses
## GitHub Files To Change
## Success Metric
## Competitor Evidence`

  const userPrompt = `Variation chosen: ${variationName}
Pattern: ${variationMeans}
Activation event: ${activationEvent}

Product:
${JSON.stringify({ id: project.id, name: project.name, url: project.url, icp: project.icp })}

Opportunity:
${JSON.stringify({
    id: opportunity.id,
    title: opportunity.title,
    goal: opportunity.goal,
    evidence: opportunity.evidence,
    winning_pattern: opportunity.winning_pattern,
  })}

Vertical data:
${JSON.stringify(subverticalRes.data ?? {})}

Competitor signals:
${JSON.stringify(competitorsRes.data ?? [])}

Public page scrape:
(not available)

GitHub recent commits:
(not available)

PostHog funnel data:
(not available)

Generate a grounded investigation plan.`

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      try {
        controller.enqueue(encoder.encode(sse({ type: 'log', message: 'Reading competitor patterns...' })))
        controller.enqueue(encoder.encode(sse({ type: 'log', message: 'Analyzing your product data...' })))
        controller.enqueue(encoder.encode(sse({ type: 'log', message: 'Mapping pages to crawl...' })))
        controller.enqueue(encoder.encode(sse({ type: 'log', message: 'Writing investigation plan...' })))

        const completion = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2200,
          temperature: 0.2,
          system,
          messages: [{ role: 'user', content: userPrompt }],
        })

        const md = completion.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n')

        // Chunk to simulate streaming markdown.
        const chunkSize = 900
        for (let i = 0; i < md.length; i += chunkSize) {
          const chunk = md.slice(i, i + chunkSize)
          controller.enqueue(encoder.encode(sse({ type: 'chunk', content: chunk })))
        }

        controller.enqueue(encoder.encode(sse({ type: 'done' })))
        controller.close()
      } catch (e) {
        controller.enqueue(encoder.encode(sse({ type: 'error', message: (e as Error).message ?? 'Failed to generate plan' })))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

