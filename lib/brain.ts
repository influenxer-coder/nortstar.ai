/**
 * Brain interface — shared learning layer underneath the agent pipeline.
 * Two exported functions only. All errors caught silently — brain must never
 * break a main request.
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function embedText(text: string): Promise<number[] | null> {
  const voyageKey = process.env.VOYAGE_API_KEY
  if (!voyageKey) return null
  try {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${voyageKey}` },
      body: JSON.stringify({ input: [text], model: 'voyage-4-lite' }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.data?.[0]?.embedding ?? null
  } catch {
    return null
  }
}

/**
 * Retrieves relevant optimization knowledge from the brain layer.
 * Returns a formatted string block ready to prepend to a Claude system prompt.
 * Returns empty string if no data exists or on any error.
 */
export async function getBrainContext(
  vertical: string,
  pageType: string,
  queryText: string
): Promise<string> {
  try {
    const embedding = await embedText(queryText)
    if (!embedding) return ''

    const supabase = getServiceClient()

    const [{ data: chunks }, { data: weights }] = await Promise.all([
      supabase.rpc('match_brain', {
        query_embedding: embedding,
        match_vertical: vertical,
        match_count: 5,
      }),
      supabase
        .from('skill_weights')
        .select('pattern, confidence, sample_size')
        .eq('vertical', vertical)
        .eq('page_type', pageType)
        .order('confidence', { ascending: false })
        .limit(5),
    ])

    const lines: string[] = []

    if (chunks && chunks.length > 0) {
      lines.push('## Brain: Relevant optimization knowledge')
      for (const c of chunks as Array<{ chunk: string; framework_type: string; confidence: number }>) {
        lines.push(`[${c.framework_type}] ${c.chunk}`)
      }
    }

    if (weights && weights.length > 0) {
      lines.push('\n## Brain: High-confidence patterns for this page type')
      for (const w of weights as Array<{ pattern: string; confidence: number; sample_size: number }>) {
        lines.push(`- ${w.pattern} (confidence: ${(w.confidence * 100).toFixed(0)}%, n=${w.sample_size})`)
      }
    }

    return lines.length > 0 ? lines.join('\n') : ''
  } catch {
    return ''
  }
}

/**
 * Records a learning event after a hypothesis is accepted, rejected, or corrected.
 * Extracts an anonymized pattern via Claude, inserts into learning_events,
 * and updates skill_weights. Fire-and-forget — never throws.
 */
export async function writeLearningEvent(payload: {
  agentId: string
  userId: string
  vertical: string
  pageType: string
  outcome: 'accepted' | 'rejected' | 'corrected'
  hypothesisTitle: string
  suggestedChange: string
  correction?: string
}): Promise<void> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const supabase = getServiceClient()

    // Extract anonymized, reusable pattern via Claude (best-effort)
    let patternExtracted: { pattern: string; framework: string } | null = null
    try {
      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        system: `Extract an anonymized, reusable CRO pattern from this hypothesis. Strip all product-specific names, company references, and exact metric values. The pattern must be generic enough to apply to similar pages at other companies. Return ONLY valid JSON: {"pattern": "...", "framework": "..."}`,
        messages: [{
          role: 'user',
          content: `Title: ${payload.hypothesisTitle}\nSuggested change: ${payload.suggestedChange}\nOutcome: ${payload.outcome}${payload.correction ? `\nCorrection: ${payload.correction}` : ''}`,
        }],
      })
      const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
      const match = text.match(/\{[\s\S]*?\}/)
      if (match) patternExtracted = JSON.parse(match[0])
    } catch {
      // pattern extraction is best-effort
    }

    // Insert learning event
    await supabase.from('learning_events').insert({
      org_id: payload.userId,
      agent_id: payload.agentId,
      vertical: payload.vertical,
      page_type: payload.pageType,
      outcome: payload.outcome,
      hypothesis_title: payload.hypothesisTitle,
      suggested_change: payload.suggestedChange,
      correction: payload.correction ?? null,
      pattern_extracted: patternExtracted,
    })

    // Upsert skill weight if we extracted a pattern
    if (patternExtracted?.pattern) {
      const delta = payload.outcome === 'accepted' ? 0.1 : payload.outcome === 'rejected' ? -0.05 : 0.05
      await supabase.rpc('upsert_skill_weight', {
        p_vertical: payload.vertical,
        p_page_type: payload.pageType,
        p_pattern: patternExtracted.pattern,
        p_delta: delta,
      })
    }
  } catch {
    // Brain failures must never surface to end users
  }
}
