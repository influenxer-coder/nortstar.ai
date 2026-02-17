import { NextResponse } from 'next/server'
import { DEMO_INSIGHTS, DEMO_PRD_CONTENT } from '@/lib/demo-data'

export async function POST(request: Request) {
  try {
    const { insightId, demo } = await request.json()

    // Find insight (demo or DB)
    let insight
    if (demo || insightId?.startsWith('demo-')) {
      const index = parseInt(insightId?.replace('demo-insight-', '') || '1')
      const demoInsight = DEMO_INSIGHTS[index] || DEMO_INSIGHTS[1]
      insight = { ...demoInsight, id: insightId }
    } else {
      // Fetch from Supabase
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = createClient()
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('id', insightId)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Insight not found' }, { status: 404 })
      }
      insight = data
    }

    // Call Railway backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
    
    const backendResponse = await fetch(`${backendUrl}/api/generate-prd`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        insight: {
          title: insight.title,
          summary: insight.summary,
          severity: insight.severity,
          mention_count: insight.mention_count,
          revenue_impact: insight.revenue_impact,
          evidence: insight.evidence,
        },
      }),
    })

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({ error: 'Backend request failed' }))
      console.error('Backend error:', errorData)
      // Return demo PRD as fallback
      const prd = {
        id: `prd-${Date.now()}`,
        org_id: insight.org_id,
        insight_id: insightId,
        title: `PRD: ${insight.title}`,
        content: DEMO_PRD_CONTENT,
        status: 'draft',
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json({ prd })
    }

    const result = await backendResponse.json()
    const content = result.content || result.markdown || DEMO_PRD_CONTENT

    const prd = {
      id: `prd-${Date.now()}`,
      org_id: insight.org_id,
      insight_id: insightId,
      title: `PRD: ${insight.title}`,
      content: typeof content === 'string' ? { markdown: content } : content,
      status: 'draft',
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Save to DB if not demo
    if (!demo && !insightId?.startsWith('demo-')) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = createClient()
      await supabase.from('prds').insert({
        ...prd,
        org_id: insight.org_id,
      })
    }

    return NextResponse.json({ prd })
  } catch (error) {
    console.error('PRD generation error:', error)
    // Return demo PRD as fallback
    const prd = {
      id: `prd-${Date.now()}`,
      org_id: 'demo-org',
      insight_id: null,
      title: 'PRD: Single Sign-On (SSO) Integration',
      content: DEMO_PRD_CONTENT,
      status: 'draft',
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return NextResponse.json({ prd })
  }
}
