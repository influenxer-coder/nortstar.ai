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

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const prompt = `You are a senior frontend engineer creating a realistic UI mockup.

Generate a complete, self-contained HTML page that visually previews the following UI change:

**Page being changed:** ${agent.url ?? 'unknown'}
**Target element:** ${targetDesc ?? 'not specified'}
**KPI:** ${agent.main_kpi ?? 'not specified'}

**Hypothesis:** ${hypothesis.hypothesis}
**Suggested change:** ${hypothesis.suggested_change ?? hypothesis.hypothesis}

Requirements:
- Output ONLY valid HTML — no markdown, no code fences, no explanation
- Self-contained: all CSS must be inline or in a <style> tag, no external dependencies except Google Fonts
- Realistic: design a believable UI section for this product (${agent.url ?? 'a SaaS product'})
- Dark or light theme is fine — match what feels right for the product
- Show the AFTER state (the change applied), not before
- Highlight the changed element with a subtle violet/purple ring or label "✦ Changed"
- Add a small top banner: "Preview: ${hypothesis.title.replace(/"/g, '&quot;')}" in a dark bar
- Mobile-responsive, clean, modern design
- Focus on the specific component/section being changed — you don't need a full page, just the relevant section with enough context`

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = resp.content[0].type === 'text' ? resp.content[0].text : ''
    // Strip markdown code fences if Claude wrapped the HTML
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
