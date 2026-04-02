import { createClient } from '@/lib/supabase/server'
import { normalizeUrl, getDomain } from './normalizeUrl'

export interface CiEnrichment {
  ci_analysis_id: string
  ci_enriched: true
  competitors: Array<{
    name: string
    one_line: string
    is_direct: boolean
  }>
  competitive_intensity: 'high' | 'medium' | 'low'
  position_summary: string
  icp_signal: string | null
  okrs: unknown[]
  designs: unknown[]
}

/**
 * Look up CI (Competitive Intelligence) analysis data for a given URL.
 * Returns enrichment data if the CI agent has already analyzed this URL, else null.
 *
 * Never throws — all errors are caught and logged.
 */
export async function lookupCiAnalysis(url: string): Promise<CiEnrichment | null> {
  try {
    const supabase = createClient()
    const normalized = normalizeUrl(url)
    const domain = getDomain(url)

    // Step 2 — Exact URL lookup (bidirectional contains)
    let analysisId: string | null = null

    const { data: exactMatches } = await supabase
      .from('competitive_intelligence_analyses')
      .select('id, product_url')
      .gte('phase_completed', 9)
      .order('created_at', { ascending: false })
      .limit(20)

    if (exactMatches) {
      const match = exactMatches.find(row => {
        const rowNorm = normalizeUrl(row.product_url ?? '')
        return rowNorm.includes(normalized) || normalized.includes(rowNorm)
      })
      if (match) analysisId = match.id
    }

    // Step 3 — Domain fallback
    if (!analysisId) {
      if (exactMatches) {
        const domainMatch = exactMatches.find(row => {
          const rowNorm = normalizeUrl(row.product_url ?? '')
          return rowNorm.includes(domain)
        })
        if (domainMatch) analysisId = domainMatch.id
      }

      // If the initial fetch didn't cover enough, query specifically by domain
      if (!analysisId) {
        const { data: domainMatches } = await supabase
          .from('competitive_intelligence_analyses')
          .select('id')
          .ilike('product_url', `%${domain}%`)
          .gte('phase_completed', 9)
          .order('created_at', { ascending: false })
          .limit(1)

        if (domainMatches?.[0]) analysisId = domainMatches[0].id
      }
    }

    // Step 4 — No match found
    if (!analysisId) return null

    // Step 5 — Load phase outputs
    const { data: phases } = await supabase
      .from('ci_phase_outputs')
      .select('phase, payload')
      .eq('analysis_id', analysisId)
      .in('phase', ['phase2', 'phase3', 'phase6', 'phase8', 'phase9', 'phase10'])

    if (!phases || phases.length === 0) return null

    const phaseMap: Record<string, Record<string, unknown>> = {}
    for (const p of phases) {
      phaseMap[p.phase] = (p.payload ?? {}) as Record<string, unknown>
    }

    // Step 6 — Build CiEnrichment

    // Competitors from phase2.direct (max 6)
    const directCompetitors = Array.isArray((phaseMap.phase2 as Record<string, unknown>)?.direct)
      ? ((phaseMap.phase2 as Record<string, unknown>).direct as Array<{ name?: string; one_line?: string }>)
          .slice(0, 6)
          .map(c => ({
            name: String(c.name ?? ''),
            one_line: String(c.one_line ?? ''),
            is_direct: true,
          }))
      : []

    // Competitive intensity from phase6 gap count
    const gaps = Array.isArray((phaseMap.phase6 as Record<string, unknown>)?.gaps)
      ? (phaseMap.phase6 as Record<string, unknown>).gaps as unknown[]
      : []
    const gapCount = gaps.length
    const competitive_intensity: CiEnrichment['competitive_intensity'] =
      gapCount >= 7 ? 'high' : gapCount >= 4 ? 'medium' : 'low'

    // Position summary from phase8 goals (non-inferred, first 2)
    const goals = Array.isArray((phaseMap.phase8 as Record<string, unknown>)?.goals)
      ? (phaseMap.phase8 as Record<string, unknown>).goals as Array<{ goal_text?: string; inferred?: boolean }>
      : []
    const position_summary = goals
      .filter(g => !g.inferred)
      .slice(0, 2)
      .map(g => String(g.goal_text ?? ''))
      .join(' ')

    // ICP signal from phase3 segments
    const segments = Array.isArray((phaseMap.phase3 as Record<string, unknown>)?.segments)
      ? (phaseMap.phase3 as Record<string, unknown>).segments as Array<{ primary_kpi?: string }>
      : []
    const icp_signal = segments[0]?.primary_kpi ?? null

    // OKRs from phase9
    const okrs = Array.isArray((phaseMap.phase9 as Record<string, unknown>)?.okrs)
      ? (phaseMap.phase9 as Record<string, unknown>).okrs as unknown[]
      : []

    // Designs from phase10
    const designs = Array.isArray((phaseMap.phase10 as Record<string, unknown>)?.designs)
      ? (phaseMap.phase10 as Record<string, unknown>).designs as unknown[]
      : []

    // Step 7 — Guard: empty OKRs means incomplete CI run
    if (okrs.length === 0) return null

    // Step 8 — Return
    return {
      ci_analysis_id: analysisId,
      ci_enriched: true,
      competitors: directCompetitors,
      competitive_intensity,
      position_summary,
      icp_signal,
      okrs,
      designs,
    }
  } catch (e) {
    console.error('[lookupCiAnalysis] Error:', e)
    return null
  }
}
