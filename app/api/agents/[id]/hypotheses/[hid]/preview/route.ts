import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(
  _request: Request,
  { params }: { params: { id: string; hid: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: hypothesis }, { data: agent }] = await Promise.all([
    supabase
      .from('agent_hypotheses')
      .select('title, hypothesis, suggested_change, source')
      .eq('id', params.hid)
      .eq('agent_id', params.id)
      .single(),
    supabase
      .from('agents')
      .select('id, name, url, target_element, main_kpi')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single(),
  ])

  if (!hypothesis || !agent) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const targetDesc = (agent.target_element as { text?: string } | null)?.text
  const suggestedChange = hypothesis.suggested_change ?? hypothesis.hypothesis

  // Try to fetch the actual page HTML so we can apply the change on top of it
  let pageHtml: string | null = null
  if (agent.url) {
    try {
      const pageRes = await fetch(agent.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NorthStarBot/1.0)' },
        signal: AbortSignal.timeout(8000),
      })
      if (pageRes.ok) {
        const raw = await pageRes.text()
        // Truncate to ~40KB to stay within context limits, keep head + body start
        pageHtml = raw.length > 40000 ? raw.slice(0, 40000) + '\n<!-- truncated -->' : raw
      }
    } catch {
      // Page unreachable — fall back to reconstructed mockup
    }
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const prompt = pageHtml
    ? `You are a senior frontend engineer applying a single, precise UI change to an existing page.

## The actual page HTML (may be truncated)
\`\`\`html
${pageHtml}
\`\`\`

## The ONE change to apply
**Element targeted:** ${targetDesc ?? 'see suggested change below'}
**Suggested change:** ${suggestedChange}

## Instructions
- Output ONLY the full modified HTML — no markdown, no explanation, no code fences
- Apply ONLY the single change described above — do NOT redesign, restyle, or alter anything else
- Make all external CSS/JS links absolute using the base URL: ${agent.url}
- Wrap <img src="..."> relative URLs to absolute using the base URL
- Add a fixed top banner (z-index 9999, dark bar, violet text): "✦ Preview: ${hypothesis.title.replace(/"/g, '&quot;')}"
- Highlight the changed element with a subtle violet outline: style="outline: 2px solid #7c3aed; outline-offset: 2px;"
- If the change cannot be applied because the element isn't in the truncated HTML, reconstruct just the affected section faithfully and apply the change there`
    : `You are a senior frontend engineer creating a faithful UI mockup of a specific page section.

## Page details
- **URL:** ${agent.url ?? 'unknown'}
- **Target element / section:** ${targetDesc ?? 'not specified'}
- **KPI:** ${agent.main_kpi ?? 'not specified'}

## The ONE change to apply
**Suggested change:** ${suggestedChange}

## Instructions
- Output ONLY valid HTML — no markdown, no code fences, no explanation
- Reconstruct ONLY the relevant section of the page (the part containing the changed element) with enough surrounding context to be recognisable
- Keep the page's actual branding, layout, and copy as accurately as possible — do NOT invent a generic mockup
- Apply ONLY the one change described above; everything else should match the real page
- All CSS inline or in a <style> tag; no external dependencies except Google Fonts
- Add a fixed top banner (dark bar, violet text): "✦ Preview: ${hypothesis.title.replace(/"/g, '&quot;')}"
- Highlight the changed element with style="outline: 2px solid #7c3aed; outline-offset: 2px;"`

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = resp.content[0].type === 'text' ? resp.content[0].text : ''
    const html = raw
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()

    return NextResponse.json({ html })
  } catch (e) {
    console.error('[hypothesis/preview] Claude error:', e)
    return NextResponse.json({ error: 'Preview generation failed' }, { status: 500 })
  }
}
