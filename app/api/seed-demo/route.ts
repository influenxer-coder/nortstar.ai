import { NextResponse } from 'next/server'
import { DEMO_INSIGHTS, DEMO_ORG_ID } from '@/lib/demo-data'

export async function POST() {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()

    // Create demo org
    await supabase.from('organizations').upsert({
      id: DEMO_ORG_ID,
      name: 'Acme Corp (Demo)',
      domain: 'demo.northstar.ai',
    }, { onConflict: 'id' })

    // Seed insights
    for (const insight of DEMO_INSIGHTS) {
      const { org_id: _, ...insightWithoutOrgId } = insight
      await supabase.from('insights').insert({
        ...insightWithoutOrgId,
        org_id: DEMO_ORG_ID,
        is_demo: true,
      })
    }

    return NextResponse.json({ success: true, seeded: DEMO_INSIGHTS.length })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
