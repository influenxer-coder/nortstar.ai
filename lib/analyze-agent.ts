/**
 * Agent analysis pipeline — runs in the background after agent creation.
 *
 * Steps:
 * 1. Fetch the last 30 GitHub commits for the agent's repo
 * 2. Fetch user behavior from PostHog (last 7 days): sessions, pageviews, top events
 * 3. Ask Claude to synthesize what the team has been working on + why
 * 4. Ask Claude to research the best optimization frameworks for this page type
 * 5. Store the combined insight as agent.context_summary so every Slack reply is informed
 *
 * Each step writes a row to agent_logs so the UI can stream progress in real time.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getBrainContext } from '@/lib/brain'
import { deriveVertical, derivePageType } from '@/lib/taxonomy'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceClient = SupabaseClient<any, any, any>

export interface AgentInfo {
  name: string
  url: string | null
  github_repo: string | null
  posthog_api_key?: string | null
  posthog_project_id?: string | null
  target_element: { type?: string; text?: string } | null
  main_kpi: string | null
  project_id?: string | null
  goal?: string | null
}

interface ProductContext {
  productName: string
  productUrl: string
  description: string
  icp: string
  goal: string
  northStarMetric: string
  competitorSignals: string
  subverticalNiche: string
}

// ── Log helpers ────────────────────────────────────────────────────────────────

async function addLog(
  supabase: ServiceClient,
  agentId: string,
  stepName: string,
  message: string,
  status: 'running' | 'done' | 'error'
): Promise<string | null> {
  const { data } = await supabase
    .from('agent_logs')
    .insert({ agent_id: agentId, step_name: stepName, message, status })
    .select('id')
    .single()
  return data?.id ?? null
}

async function updateLog(
  supabase: ServiceClient,
  logId: string,
  message: string,
  status: 'done' | 'error'
): Promise<void> {
  await supabase.from('agent_logs').update({ message, status }).eq('id', logId)
}

// PostHog management API base (Query API lives here, not on the ingestion host)
const POSTHOG_API_BASE = (
  (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com')
    .replace('us.i.posthog.com', 'us.posthog.com')
    .replace('eu.i.posthog.com', 'eu.posthog.com')
    .replace(/\/$/, '')
)

async function queryPostHog(
  apiKey: string,
  projectId: string,
  sql: string
): Promise<unknown[][] | null> {
  try {
    const res = await fetch(`${POSTHOG_API_BASE}/api/projects/${projectId}/query/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql } }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data.results) ? data.results : null
  } catch {
    return null
  }
}

// ── Main pipeline ──────────────────────────────────────────────────────────────

export async function analyzeAgent(
  supabase: ServiceClient,
  agentId: string,
  agent: AgentInfo,
  githubToken: string | null
): Promise<void> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  // Clear stale logs before re-running
  await supabase.from('agent_logs').delete().eq('agent_id', agentId)

  // ── Step 0: Fetch product/project context ──────────────────────────────────
  let productCtx: ProductContext = {
    productName: agent.name, productUrl: agent.url ?? '', description: '',
    icp: '', goal: agent.goal ?? '', northStarMetric: agent.main_kpi ?? '',
    competitorSignals: '', subverticalNiche: '',
  }

  if (agent.project_id) {
    try {
      const { data: project } = await supabase
        .from('projects')
        .select('name, url, description, icp, north_star_metric, strategy_json')
        .eq('id', agent.project_id)
        .single()

      if (project) {
        productCtx.productName = project.name ?? productCtx.productName
        productCtx.productUrl = project.url ?? productCtx.productUrl
        productCtx.description = project.description ?? ''
        productCtx.icp = typeof project.icp === 'string' ? project.icp : JSON.stringify(project.icp ?? '')
        productCtx.northStarMetric = project.north_star_metric ?? productCtx.northStarMetric

        const strategy = (project.strategy_json ?? {}) as Record<string, unknown>
        const ctx = (strategy.onboarding_context ?? {}) as Record<string, unknown>
        productCtx.goal = (ctx.goal as string) ?? agent.goal ?? ''

        const match = (strategy.match ?? {}) as Record<string, unknown>
        const subverticalId = match.subvertical_id as string | undefined

        if (subverticalId) {
          const [{ data: subvertical }, { data: competitors }] = await Promise.all([
            supabase.from('subverticals')
              .select('evolutionary_niches, trending_features')
              .eq('id', subverticalId).single(),
            supabase.from('vertical_products')
              .select('name, known_winning_features, changelog_signals')
              .eq('subvertical_id', subverticalId).eq('is_active', true).limit(5),
          ])

          const niches = Array.isArray((subvertical as Record<string, unknown>)?.evolutionary_niches)
            ? (subvertical as Record<string, unknown>).evolutionary_niches as Record<string, unknown>[]
            : []
          if (niches[0]) {
            productCtx.subverticalNiche = `${niches[0].niche ?? ''}: ${niches[0].example_wedge ?? ''}`
          }

          if (competitors && competitors.length > 0) {
            productCtx.competitorSignals = competitors.map(c => {
              const cl = ((c as Record<string, unknown>).changelog_signals ?? {}) as Record<string, unknown>
              const features = Array.isArray(cl.features_90d) ? (cl.features_90d as string[]).slice(0, 2).join(', ') : ''
              return `${(c as Record<string, unknown>).name}: ${features || 'no recent features'}`
            }).join('\n')
          }
        }
      }
    } catch { /* continue without product context */ }
  }

  const productContextBlock = `
PRODUCT: ${productCtx.productName}
URL: ${productCtx.productUrl}
DESCRIPTION: ${productCtx.description}
ICP: ${productCtx.icp}
GOAL: ${productCtx.goal}
NORTH STAR METRIC: ${productCtx.northStarMetric}
${productCtx.subverticalNiche ? `MARKET NICHE: ${productCtx.subverticalNiche}` : ''}
${productCtx.competitorSignals ? `COMPETITORS:\n${productCtx.competitorSignals}` : ''}
`.trim()

  // ── Step 1: Fetch GitHub commits (kept for code context, NOT for hypotheses) ─
  let commitContext = ''
  if (agent.github_repo && githubToken) {
    const logId = await addLog(
      supabase, agentId, 'github',
      `Fetching recent commits from ${agent.github_repo}…`, 'running'
    )
    try {
      const res = await fetch(
        `https://api.github.com/repos/${agent.github_repo}/commits?per_page=30`,
        { headers: { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3+json' } }
      )
      if (res.ok) {
        const commits = await res.json() as Array<{
          sha: string
          commit: { message: string; author: { date: string; name: string } }
        }>
        commitContext = commits.slice(0, 25).map(c =>
          `${c.commit.author.date.split('T')[0]} [${c.commit.author.name}]: ${c.commit.message.split('\n')[0]}`
        ).join('\n')
        if (logId) await updateLog(supabase, logId, `Fetched ${commits.length} commits from ${agent.github_repo}`, 'done')
      } else {
        const errBody = await res.json().catch(() => ({}))
        const msg = res.status === 404
          ? `Repo ${agent.github_repo} not found — check the repo name`
          : res.status === 401
          ? `GitHub token expired — reconnect GitHub in settings`
          : `GitHub returned ${res.status}: ${(errBody as { message?: string }).message ?? 'unknown error'}`
        if (logId) await updateLog(supabase, logId, msg, 'error')
      }
    } catch (e) {
      if (logId) await updateLog(supabase, logId, `Could not reach GitHub — skipping commit history`, 'error')
      console.error('[analyze-agent] github fetch error:', e)
    }
  }

  // ── Step 2: Fetch PostHog behavior data ──────────────────────────────────────
  let posthogSummary = ''
  if (agent.posthog_api_key && agent.posthog_project_id) {
    const phLogId = await addLog(
      supabase, agentId, 'posthog',
      'Fetching user behavior from PostHog (last 7 days)…', 'running'
    )
    try {
      const [sessionRows, eventRows] = await Promise.all([
        queryPostHog(
          agent.posthog_api_key,
          agent.posthog_project_id,
          `SELECT count(distinct $session_id) as sessions, count() as pageviews
           FROM events
           WHERE timestamp > now() - interval 7 day AND event = '$pageview'`
        ),
        queryPostHog(
          agent.posthog_api_key,
          agent.posthog_project_id,
          `SELECT event, count() as cnt
           FROM events
           WHERE timestamp > now() - interval 7 day AND event NOT LIKE '$%'
           GROUP BY event ORDER BY cnt DESC LIMIT 10`
        ),
      ])

      if (sessionRows) {
        const [sessions, pageviews] = (sessionRows[0] as [number, number]) ?? [0, 0]
        const topEvents = (eventRows ?? []).map(
          (row) => `  • ${row[0]}: ${row[1]}`
        )

        posthogSummary = [
          `Sessions (last 7 days): ${sessions.toLocaleString()}`,
          `Pageviews (last 7 days): ${pageviews.toLocaleString()}`,
          topEvents.length > 0
            ? `Top custom events:\n${topEvents.join('\n')}`
            : null,
        ].filter(Boolean).join('\n')

        if (phLogId) await updateLog(
          supabase, phLogId,
          `Watching — seen ${sessions.toLocaleString()} sessions and ${pageviews.toLocaleString()} pageviews in the last 7 days`,
          'done'
        )
      } else {
        if (phLogId) await updateLog(supabase, phLogId, 'Could not fetch PostHog data — check API key and project ID', 'error')
      }
    } catch (e) {
      if (phLogId) await updateLog(supabase, phLogId, 'PostHog connection failed', 'error')
      console.error('[analyze-agent] posthog fetch error:', e)
    }
  }

  // ── Step 2.5: Synthesize product understanding ──────────────────────────────
  // Runs after both commits and PostHog are fetched so it has maximum signal.
  // Result goes FIRST in context_summary so every downstream step is grounded.
  let productUnderstanding = ''
  {
    const prodLogId = await addLog(
      supabase, agentId, 'product_analysis',
      'Building product understanding…', 'running'
    )
    try {
      const targetDescProd = agent.target_element?.text
        ? `"${agent.target_element.text}" (${agent.target_element.type || 'element'})`
        : 'the primary conversion element'

      const prodResp = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: `You are a product analyst. Write a concise, specific product profile grounded in the product data, user behavior, and market context provided. Return plain text, 2–3 short paragraphs.`,
        messages: [{
          role: 'user',
          content: `${productContextBlock}

Page being optimized: ${agent.url ?? 'not provided'}
Target feature: ${targetDescProd}
Primary success metric: ${agent.main_kpi ?? 'not specified'}
${posthogSummary ? `User behavior data (last 7 days):\n${posthogSummary}` : ''}

Write 2–3 paragraphs covering:
1. What this product does and who uses it — use the ICP, description, and behavior data
2. What the target feature (${targetDescProd}) does within the product and why users interact with it
3. What the competitive landscape looks like and what moving ${agent.main_kpi ?? 'the primary KPI'} means for winning against competitors

Be specific to THIS product and market.`
        }]
      })
      productUnderstanding = prodResp.content[0].type === 'text' ? prodResp.content[0].text : ''
      if (prodLogId) await updateLog(supabase, prodLogId, 'Product profile built', 'done')
    } catch (e) {
      if (prodLogId) await updateLog(supabase, prodLogId, 'Product understanding failed — skipping', 'error')
      console.error('[analyze-agent] product understanding error:', e)
    }
  }

  // ── Step 3: Analyze commits with Claude ─────────────────────────────────────
  let codeAnalysis = ''
  if (commitContext) {
    const logId = await addLog(supabase, agentId, 'code_analysis', 'Analyzing code changes…', 'running')
    try {
      const targetDesc = agent.target_element?.text
        ? `"${agent.target_element.text}" (${agent.target_element.type || 'element'})`
        : 'the main CTA'

      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        system: `You are a senior product analyst reading commit history to understand what a team has been working on and why. Focus specifically on changes that affect user-facing pages and features — UI, copy, flows, layout, and front-end behaviour. Skip backend/infrastructure/devops changes unless they directly affect the user experience on the target page.`,
        messages: [{
          role: 'user',
          content: `Agent context:
- Product: ${agent.url || 'unknown URL'}
- Target feature: ${targetDesc}
- Primary KPI: ${agent.main_kpi || 'not specified'}

Recent commit log (newest first):
${commitContext}

In 4-6 bullet points, focusing ONLY on page and feature-level changes:
• What UI, copy, or flow changes has the team shipped recently?
• Which of these directly affect the target feature (${targetDesc})?
• What user problems or conversion hypotheses are these changes addressing?
• Are there recent A/B tests, feature flags, or experiments related to this page?

Ignore database migrations, CI/CD, dependency bumps, and server-side-only changes. Be specific — reference commit message language directly.`
        }]
      })
      codeAnalysis = resp.content[0].type === 'text' ? resp.content[0].text : ''
      if (logId) await updateLog(supabase, logId, 'Code analysis complete — identified recent product changes', 'done')
    } catch (e) {
      if (logId) await updateLog(supabase, logId, 'Code analysis failed', 'error')
      console.error('[analyze-agent] code analysis error:', e)
    }
  }

  // ── Step 4: Research optimization frameworks ─────────────────────────────────
  const logId4 = await addLog(
    supabase, agentId, 'research',
    `Researching what drives improvements for this type of feature…`, 'running'
  )
  let researchInsights = ''
  try {
    const targetDesc = agent.target_element?.text
      ? `"${agent.target_element.text}" ${agent.target_element.type || 'element'}`
      : 'the primary conversion action'

    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: `You are a CRO strategist and product optimization expert. You have studied hundreds of A/B tests, growth experiments, and conversion case studies across SaaS and e-commerce. Give specific, evidence-backed advice — not platitudes.`,
      messages: [{
        role: 'user',
        content: `I need you to brief an AI agent that will advise a product team on optimizing their page.

${productContextBlock}

Page being optimized: ${agent.url || 'a web product'}
Target: ${targetDesc}
Primary metric: ${agent.main_kpi || 'conversion rate'}

Answer these four questions in structured bullet points:

1. **High-impact frameworks**: What are the 3-5 most proven optimization frameworks for this type of feature? (e.g., JTBD, friction audits, value prop clarity, urgency/scarcity, social proof placement) — and which specific aspect of each is most often overlooked?

2. **What moves the needle**: Based on published case studies and A/B test results from the past few years, what types of changes have driven 10%+ lifts on similar pages? Be specific about the mechanic (not just "better copy" — what about the copy, exactly?).

3. **Common mistakes**: What mistakes do teams typically make when optimizing this feature that kill conversion? What should we investigate first to rule out?

4. **First questions to ask**: If this agent were advising this team, what are the top 5 questions it should ask to diagnose the current state before making recommendations?

The agent will use this brief to answer questions from the product team in Slack. Be specific and opinionated.`
      }]
    })
    researchInsights = resp.content[0].type === 'text' ? resp.content[0].text : ''
    if (logId4) await updateLog(supabase, logId4, 'Research complete — optimization playbook ready', 'done')
  } catch (e) {
    if (logId4) await updateLog(supabase, logId4, 'Research failed', 'error')
    console.error('[analyze-agent] research error:', e)
  }

  // ── Step 5: Synthesize and store ─────────────────────────────────────────────
  const logId5 = await addLog(supabase, agentId, 'synthesis', 'Building agent context…', 'running')
  try {
    const parts: string[] = []
    // Product understanding goes first — anchors all downstream context
    if (productUnderstanding) {
      parts.push(`## Product understanding\n${productUnderstanding}`)
    }
    if (posthogSummary) {
      parts.push(`## User behavior (last 7 days)\n${posthogSummary}`)
    }
    if (codeAnalysis) {
      parts.push(`## What the team has been shipping\n${codeAnalysis}`)
    }
    if (researchInsights) {
      parts.push(`## Optimization research for this page type\n${researchInsights}`)
    }

    const contextSummary = parts.join('\n\n---\n\n')
    if (contextSummary) {
      await supabase.from('agents').update({ context_summary: contextSummary }).eq('id', agentId)
      if (logId5) await updateLog(supabase, logId5, 'Agent is fully briefed — ready to help in Slack', 'done')

      // ── Step 6: Generate structured hypotheses ──────────────────────────────
      const hypLogId = await addLog(supabase, agentId, 'hypotheses', 'Generating improvement hypotheses…', 'running')
      try {
        const targetDesc = agent.target_element?.text
          ? `"${agent.target_element.text}" (${agent.target_element.type || 'element'})`
          : 'the primary conversion element'

        // Feed product context + behavior data. Exclude commits from hypothesis
        // sourcing — they produce generic ideas based on past work rather than
        // forward-looking opportunities grounded in market/product strategy.
        const dataContext = [
          `## Product & Market Context\n${productContextBlock}`,
          productUnderstanding ? `## Product Understanding\n${productUnderstanding}` : null,
          posthogSummary ? `## User behavior (last 7 days)\n${posthogSummary}` : null,
          productCtx.competitorSignals ? `## Competitor Activity\n${productCtx.competitorSignals}` : null,
        ].filter(Boolean).join('\n\n')

        const vertical = deriveVertical(agent.url ?? '')
        const pageType = derivePageType(agent.url ?? '')
        const brainCtx = await getBrainContext(
          vertical,
          pageType,
          `${agent.url ?? ''} ${targetDesc} ${agent.main_kpi ?? ''}`
        )

        const hypResp = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2500,
          system: `You are a product optimization expert. Generate specific, testable hypotheses grounded in the actual data provided. Every hypothesis MUST cite a concrete data point — an event name, a commit message phrase, or a specific metric. Do not generate generic best-practice advice. Return ONLY a valid JSON array — no markdown, no explanation, no code fences.${brainCtx ? `\n\n${brainCtx}` : ''}`,
          messages: [{
            role: 'user',
            content: `Product: ${productCtx.productName} (${productCtx.productUrl})
Page being optimized: ${agent.url ?? 'unknown'}
Target: ${targetDesc}
KPI: ${agent.main_kpi ?? 'conversion rate'}
Goal: ${productCtx.goal}

Data:
${dataContext || contextSummary}

Generate 5–7 improvement hypotheses. Rules:
- Each hypothesis MUST reference specific evidence: a user behavior metric, a competitor's feature, an ICP insight, or a market gap
- Do NOT reference commit messages or past code changes as evidence
- Every suggested change must name the exact element, copy, or interaction to modify — no vague statements like "improve the CTA"
- Consider what competitors are doing and what the ICP cares about
- Scope strictly to the page being optimized (${agent.url ?? 'this page'}): UI, copy, flow, or interaction changes
- Do NOT suggest backend refactors, database changes, or infrastructure work
- Order by impact_score descending

Return a JSON array where each item has exactly:
{
  "title": "Verb-first title max 8 words",
  "source": "User behavior | Competitor analysis | Market insight | ICP research",
  "hypothesis": "2–3 sentences: (1) what specific evidence shows this opportunity, (2) what change captures it, (3) which metric moves and in which direction",
  "suggested_change": "Exact change — specific copy wording, element name, layout detail, or interaction. Quote current state vs proposed state where possible.",
  "impact_score": 1-5
}`
          }]
        })

        const hypText = hypResp.content[0].type === 'text' ? hypResp.content[0].text : ''
        const jsonMatch = hypText.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hypotheses: Array<Record<string, any>> = JSON.parse(jsonMatch[0])
          await supabase.from('agent_hypotheses').delete().eq('agent_id', agentId)
          const rows = hypotheses.map(h => ({
            agent_id: agentId,
            title: String(h.title ?? '').slice(0, 200),
            source: String(h.source ?? 'Analysis').slice(0, 100),
            hypothesis: String(h.hypothesis ?? ''),
            suggested_change: h.suggested_change ? String(h.suggested_change) : null,
            impact_score: Math.min(5, Math.max(1, Number(h.impact_score) || 3)),
            status: 'proposed',
          }))
          await supabase.from('agent_hypotheses').insert(rows)
          if (hypLogId) await updateLog(supabase, hypLogId, `Generated ${rows.length} hypotheses — ready to review in workspace`, 'done')
        } else {
          if (hypLogId) await updateLog(supabase, hypLogId, 'Could not parse hypotheses — try re-analyzing', 'error')
        }
      } catch (e) {
        if (hypLogId) await updateLog(supabase, hypLogId, 'Hypothesis generation failed', 'error')
        console.error('[analyze-agent] hypotheses error:', e)
      }
    } else {
      if (logId5) await updateLog(supabase, logId5, 'No context generated — connect GitHub or PostHog for richer analysis', 'error')
    }
  } catch (e) {
    if (logId5) await updateLog(supabase, logId5, 'Synthesis failed', 'error')
    console.error('[analyze-agent] synthesis error:', e)
  }
}
