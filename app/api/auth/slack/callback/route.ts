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

  // Create a private channel dedicated to this agent
  // e.g. "Checkout Optimizer" → "northstar-checkout-optimizer"
  const channelName = `northstar-${agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 75)}`
  const createRes = await fetch('https://slack.com/api/conversations.create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${botToken}` },
    body: JSON.stringify({ name: channelName, is_private: true }),
  })
  const createData = await createRes.json()

  // If channel name already exists (reconnect), look up the existing channel
  let channelId: string = createData.channel?.id
  if (!channelId && createData.error === 'name_taken') {
    const listRes = await fetch(`https://slack.com/api/conversations.list?types=private_channel&exclude_archived=true&limit=200`, {
      headers: { Authorization: `Bearer ${botToken}` },
    })
    const listData = await listRes.json()
    const existing = (listData.channels || []).find((c: { name: string; id: string }) => c.name === channelName)
    channelId = existing?.id
  }

  // Invite the user who installed the app into the channel
  if (channelId && slackUserId) {
    await fetch('https://slack.com/api/conversations.invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${botToken}` },
      body: JSON.stringify({ channel: channelId, users: slackUserId }),
    })
  }

  // Save Slack credentials on the agent
  await supabase.from('agents').update({
    slack_bot_token: botToken,
    slack_team_id: teamId,
    slack_user_id: slackUserId,
    slack_channel_id: channelId,
  }).eq('id', agentId)

  // Send welcome message in the new channel
  if (channelId) {
    const welcomeText = `👋 Hi! I'm *${agent.name}*, your NorthStar agent.\n\nI'm here to help you optimize ${agent.url || 'your product'}. Ask me anything about user behavior, conversion, or product strategy.`
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${botToken}` },
      body: JSON.stringify({ channel: channelId, text: welcomeText, username: agent.name, icon_emoji: ':robot_face:' }),
    })
  }

  return NextResponse.redirect(`${siteUrl}/dashboard/agents/${agentId}?slack=connected`)
}
