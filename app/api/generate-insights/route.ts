import { NextResponse } from 'next/server'
import { DEMO_INSIGHTS } from '@/lib/demo-data'

export async function POST(request: Request) {
  try {
    const { orgId, demo } = await request.json()

    if (demo) {
      // Return demo insights
      return NextResponse.json({ insights: DEMO_INSIGHTS, source: 'demo' })
    }

    // Fetch recent feedback from Supabase
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()

    const { data: feedback } = await supabase
      .from('feedback_items')
      .select('content, source_type, sentiment, customer_company, created_at, source_item_id')
      .eq('org_id', orgId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(200)

    if (!feedback || feedback.length === 0) {
      return NextResponse.json({ insights: [], message: 'No recent feedback found' })
    }

    // Call Railway backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
    
    const backendResponse = await fetch(`${backendUrl}/api/generate-insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        org_id: orgId,
        feedback: feedback.slice(0, 100),
      }),
    })

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({ error: 'Backend request failed' }))
      console.error('Backend error:', errorData)
      return NextResponse.json({ insights: DEMO_INSIGHTS, source: 'demo_fallback' })
    }

    const result = await backendResponse.json()
    const insights = result.insights || []

    // Save insights to DB
    for (const insight of insights) {
      await supabase.from('insights').insert({
        org_id: orgId,
        ...insight,
        generated_at: new Date().toISOString(),
      })
    }

    // Send Slack alert for critical insights
    const criticalInsights = insights.filter((i: { severity: string }) => i.severity === 'critical')
    if (criticalInsights.length > 0) {
      const slackWebhook = process.env.SLACK_WEBHOOK_URL
      if (slackWebhook) {
        await sendSlackAlert(slackWebhook, criticalInsights)
      }
    }

    return NextResponse.json({ insights, count: insights.length })
  } catch (error) {
    console.error('Insight generation error:', error)
    return NextResponse.json({ insights: DEMO_INSIGHTS, source: 'demo_fallback' })
  }
}

async function sendSlackAlert(webhookUrl: string, criticalInsights: Array<{ title: string; mention_count: number; revenue_impact?: string; summary: string }>) {
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🤖 NorthStar Alert*\n⚠️ ${criticalInsights.length} critical insight${criticalInsights.length > 1 ? 's' : ''} detected`,
      },
    },
    ...criticalInsights.map((insight) => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${insight.title}*\n${insight.mention_count} mentions${insight.revenue_impact ? ` · ${insight.revenue_impact}` : ''}\n${insight.summary}`,
      },
      accessory: {
        type: 'button',
        text: { type: 'plain_text', text: 'View Insight' },
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
      },
    })),
  ]

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks }),
  })
}
