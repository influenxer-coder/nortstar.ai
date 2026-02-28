import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agent_id')
  if (!agentId) {
    return NextResponse.json({ error: 'agent_id is required' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/signin', request.url))

  // Verify the user owns this agent
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('id', agentId)
    .eq('user_id', user.id)
    .single()

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const clientId = process.env.SLACK_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Slack not configured' }, { status: 503 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const redirectUri = `${siteUrl}/api/auth/slack/callback`

  const slackUrl = new URL('https://slack.com/oauth/v2/authorize')
  slackUrl.searchParams.set('client_id', clientId)
  slackUrl.searchParams.set('scope', 'chat:write,im:write,im:history')
  slackUrl.searchParams.set('redirect_uri', redirectUri)
  slackUrl.searchParams.set('state', agentId)

  return NextResponse.redirect(slackUrl.toString())
}
