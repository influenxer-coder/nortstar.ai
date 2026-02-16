import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { DEMO_INSIGHTS } from '@/lib/demo-data'

export async function POST(request: Request) {
  try {
    const { orgId, demo } = await request.json()

    const apiKey = process.env.ANTHROPIC_API_KEY

    if (demo || !apiKey) {
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

    const anthropic = new Anthropic({ apiKey })

    const prompt = `You are NorthStar, an AI product analyst. Analyze this customer feedback and extract actionable insights for the product team.

Feedback data (${feedback.length} items):
${JSON.stringify(feedback.slice(0, 100), null, 2)}

Extract and return a JSON object with:
{
  "insights": [
    {
      "insight_type": "pain_point" | "feature_request" | "churn_risk" | "positive",
      "title": "Short, specific title (max 70 chars)",
      "summary": "2-3 sentence explanation with context",
      "severity": "critical" | "high" | "medium" | "low" | "positive",
      "mention_count": number,
      "revenue_impact": "string or null",
      "evidence": [
        {
          "source_type": "zendesk" | "gong" | "intercom",
          "quote": "exact customer quote",
          "customer": "company name if available",
          "date": "ISO date string"
        }
      ]
    }
  ]
}

Rules:
- Only include issues mentioned by 3+ customers (unless critical churn risk)
- severity=critical: customers threatening to cancel or blocking $50K+ deals
- severity=high: >10 mentions or >$100K ARR impact
- Include 2-4 evidence quotes per insight
- Title should be specific ("Invite button broken" not "Collaboration issues")
- Return max 8 insights, prioritized by severity`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}'

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ insights: DEMO_INSIGHTS, source: 'demo_fallback' })
    }

    const parsed = JSON.parse(jsonMatch[0])
    const insights = parsed.insights || []

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
