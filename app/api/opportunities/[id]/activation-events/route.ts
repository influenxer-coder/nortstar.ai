import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

type Params = { params: { id: string } }

type Candidate = {
  event_name: string
  file: string
  line: number
  description: string
  code_snippet: string
}

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch opportunity + project so we can infer product_id (from onboarding_context).
  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('id, project_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!opportunity) return NextResponse.json({ candidates: [] satisfies Candidate[] })

  const { data: project } = await supabase
    .from('projects')
    .select('strategy_json')
    .eq('id', opportunity.project_id)
    .eq('user_id', user.id)
    .single()
  if (!project) return NextResponse.json({ candidates: [] satisfies Candidate[] })

  const ctx = ((project.strategy_json as Record<string, unknown>)?.onboarding_context as Record<string, unknown> | undefined) ?? {}
  const productId = (ctx.created_product_id as string) ?? null
  if (!productId) return NextResponse.json({ candidates: [] satisfies Candidate[] })

  // Find any agent under this product with github connected.
  const { data: agent } = await supabase
    .from('agents')
    .select('github_repo')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .not('github_repo', 'is', null)
    .limit(1)
    .maybeSingle()

  const repo = agent?.github_repo ?? null
  if (!repo) return NextResponse.json({ candidates: [] satisfies Candidate[] })

  // Fetch GitHub token (stored by OAuth flow)
  const { data: tokenRow } = await supabase
    .from('user_context')
    .select('value')
    .eq('user_id', user.id)
    .eq('context_type', 'github')
    .eq('key', 'access_token')
    .single()

  const githubToken = tokenRow?.value ?? null
  if (!githubToken) return NextResponse.json({ candidates: [] satisfies Candidate[] })

  try {
    // Lightweight search to find activation-ish code.
    const q = encodeURIComponent(`repo:${repo} activated OR activation OR onboarding OR "first item" OR "invite"`)
    const searchRes = await fetch(`https://api.github.com/search/code?q=${q}&per_page=10`, {
      headers: { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3+json' },
    })
    if (!searchRes.ok) return NextResponse.json({ candidates: [] satisfies Candidate[] })

    const searchJson = await searchRes.json() as { items?: Array<{ path: string; url: string }> }
    const items = (searchJson.items ?? []).slice(0, 6)

    const fileTexts: Array<{ path: string; content: string }> = []
    for (const item of items) {
      const fileRes = await fetch(item.url, {
        headers: { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3.raw' },
      })
      if (!fileRes.ok) continue
      const text = await fileRes.text()
      fileTexts.push({ path: item.path, content: text.slice(0, 4000) })
    }

    if (fileTexts.length === 0) return NextResponse.json({ candidates: [] satisfies Candidate[] })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ candidates: [] satisfies Candidate[] })
    const anthropic = new Anthropic({ apiKey })

    const prompt = `Find all moments where a user becomes activated or completes a key milestone.
Look for: event tracking calls, status updates, boolean flags set to true, timestamp fields being populated.

Return JSON array ONLY:
[
  {
    "event_name": "string",
    "file": "string",
    "line": 0,
    "description": "string",
    "code_snippet": "string (max 100 chars)"
  }
]`

    const userMsg = `Repo: ${repo}

Files:
${fileTexts.map((f) => `--- ${f.path}\n${f.content}`).join('\n\n')}`

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      temperature: 0.1,
      system: prompt,
      messages: [{ role: 'user', content: userMsg }],
    })

    const text = completion.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()

    const jsonText = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const parsed = JSON.parse(jsonText) as unknown
    const arr = Array.isArray(parsed) ? parsed : []

    const candidates: Candidate[] = arr.slice(0, 8).map((c) => {
      const obj = c as Record<string, unknown>
      return {
        event_name: String(obj.event_name ?? ''),
        file: String(obj.file ?? ''),
        line: Number(obj.line ?? 0) || 0,
        description: String(obj.description ?? ''),
        code_snippet: String(obj.code_snippet ?? '').slice(0, 100),
      }
    }).filter((c) => c.event_name && c.file)

    return NextResponse.json({ candidates })
  } catch {
    return NextResponse.json({ candidates: [] satisfies Candidate[] })
  }
}

