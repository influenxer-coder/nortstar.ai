import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BROWSERLESS_BASE = 'https://chrome.browserless.io'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agent_id')
  if (!agentId) return NextResponse.json({ error: 'agent_id is required' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent } = await supabase
    .from('agents')
    .select('url')
    .eq('id', agentId)
    .eq('user_id', user.id)
    .single()

  if (!agent?.url) return NextResponse.json({ installed: false })

  const apiKey = process.env.BROWSERLESS_API_KEY
  if (!apiKey) return NextResponse.json({ installed: false })

  const functionCode = `
export default async ({ page }) => {
  await page.goto(${JSON.stringify(agent.url)}, { waitUntil: 'networkidle0', timeout: 20000 });
  const installed = await page.evaluate(() => typeof window.posthog !== 'undefined');
  return { data: { installed }, type: 'application/json' };
};`

  try {
    const res = await fetch(`${BROWSERLESS_BASE}/function?token=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/javascript' },
      body: functionCode,
    })
    if (!res.ok) return NextResponse.json({ installed: false })
    const body = await res.json()
    const data = body?.data ?? body
    return NextResponse.json({ installed: data?.installed === true })
  } catch {
    return NextResponse.json({ installed: false })
  }
}
