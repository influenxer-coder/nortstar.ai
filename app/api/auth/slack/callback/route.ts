import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const agentId = searchParams.get('state')
  const error = searchParams.get('error')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  if (error || !code || !agentId) {
    return NextResponse.redirect(`${siteUrl}/dashboard/agents?slack_error=${error || 'missing_params'}`)
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${siteUrl}/signin`)

  // Verify ownership
  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, url')
    .eq('id', agentId)
    .eq('user_id', user.id)
    .single()

  if (!agent) {
    return NextResponse.redirect(`${siteUrl}/dashboard/agents?slack_error=agent_not_found`)
  }

  const clientId = process.env.SLACK_CLIENT_ID!
  const clientSecret = process.env.SLACK_CLIENT_SECRET!
  const redirectUri = `${siteUrl}/api/auth/slack/callback`

  // Exchange code for bot token
  const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri }),
  })
  const tokenData = await tokenRes.json()

  if (!tokenData.ok) {
    return NextResponse.redirect(`${siteUrl}/dashboard/agents/${agentId}?slack_error=${tokenData.error}`)
  }

  const botToken: string = tokenData.access_token
  const teamId: string = tokenData.team?.id
  const slackUserId: string = tokenData.authed_user?.id

  // Open DM channel with the user who installed the app
  const dmRes = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${botToken}` },
    body: JSON.stringify({ users: slackUserId }),
  })
  const dmData = await dmRes.json()
  const channelId: string = dmData.channel?.id

  // Save Slack credentials on the agent
  await supabase.from('agents').update({
    slack_bot_token: botToken,
    slack_team_id: teamId,
    slack_user_id: slackUserId,
    slack_channel_id: channelId,
  }).eq('id', agentId)

  // Send welcome DM
  if (channelId) {
    const welcomeText = `👋 Hi! I'm *${agent.name}*, your NorthStar agent.\n\nI'm here to help you optimize ${agent.url || 'your product'}. Ask me anything about user behavior, conversion, or product strategy.`
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${botToken}` },
      body: JSON.stringify({ channel: channelId, text: welcomeText }),
    })
  }

  return NextResponse.redirect(`${siteUrl}/dashboard/agents/${agentId}?slack=connected`)
}
