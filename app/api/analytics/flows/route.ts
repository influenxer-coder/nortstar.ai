import { NextResponse } from 'next/server'

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

export interface FlowStep {
  path: string
  count: number
}

export interface AnalyticsFlow {
  steps: FlowStep[]
}

function cleanPath(label: string): string {
  return label
    .replace(/^Step \d+:\s*/, '')
    .replace(/^\$pageview\s*-\s*/i, '')
    .replace(/^\$screen\s*-\s*/i, '')
    .trim() || '(unknown)'
}

async function fetchPostHogFlows(apiKey: string, projectId: string): Promise<AnalyticsFlow[]> {
  const base = POSTHOG_HOST.replace(/\/$/, '')
  const res = await fetch(`${base}/api/projects/${projectId}/insights/path/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      insight: 'PATHS',
      include_event_types: ['$pageview'],
      step_limit: 5,
      date_from: '-30d',
      filter_test_accounts: true,
    }),
  })

  if (!res.ok) throw new Error(`PostHog paths API returned ${res.status}`)

  const data = await res.json()
  const edges: Array<{ source: string; target: string; value: number }> = data.result ?? []

  if (edges.length === 0) return []

  // Build step-aware adjacency sorted by count
  const adj = new Map<string, Array<{ target: string; count: number }>>()
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, [])
    adj.get(e.source)!.push({ target: e.target, count: e.value })
  }
  for (const [, children] of Array.from(adj.entries())) {
    children.sort((a: { count: number }, b: { count: number }) => b.count - a.count)
  }

  // Entry points: Step 1 sources
  const step1Sources = Array.from(
    new Set(edges.filter((e) => e.source.match(/^Step 1:/i)).map((e) => e.source))
  )

  const flows: AnalyticsFlow[] = []

  function walk(node: string, currentSteps: FlowStep[], depth: number) {
    if (depth >= 5) {
      flows.push({ steps: currentSteps })
      return
    }
    const children = adj.get(node)
    if (!children || children.length === 0) {
      flows.push({ steps: currentSteps })
      return
    }
    // Take top 3 branches at depth 1, top 2 deeper
    const branching = depth <= 1 ? 3 : 2
    for (const child of children.slice(0, branching)) {
      walk(child.target, [...currentSteps, { path: cleanPath(child.target), count: child.count }], depth + 1)
    }
  }

  for (const entry of step1Sources.slice(0, 3)) {
    const totalCount = (adj.get(entry) ?? []).reduce((s, c) => s + c.count, 0)
    walk(entry, [{ path: cleanPath(entry), count: totalCount }], 1)
  }

  // Sort by first-step count, deduplicate
  flows.sort((a, b) => (b.steps[0]?.count ?? 0) - (a.steps[0]?.count ?? 0))
  const seen = new Set<string>()
  return flows
    .filter((f) => {
      const key = f.steps.map((s) => s.path).join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 6)
}

export async function POST(req: Request) {
  try {
    const { tool, credentials } = await req.json()

    if (tool === 'posthog') {
      const { api_key, project_id } = credentials ?? {}
      if (!api_key || !project_id) {
        return NextResponse.json({ tool, flows: [], error: 'Missing credentials' }, { status: 400 })
      }
      try {
        const flows = await fetchPostHogFlows(api_key.trim(), project_id.trim())
        return NextResponse.json({ tool, flows })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        return NextResponse.json({ tool, flows: [], error: msg })
      }
    }

    // Other tools: flow reading not yet available
    return NextResponse.json({ tool, flows: [], unsupported: true })
  } catch (err) {
    console.error('analytics/flows error:', err)
    return NextResponse.json({ error: 'Failed to fetch flows' }, { status: 500 })
  }
}
