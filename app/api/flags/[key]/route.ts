import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type Params = { params: { key: string } }

/**
 * Public endpoint — no auth required.
 * Called by the user's production app to check if a visitor is in the experiment.
 *
 * GET /api/flags/{flag_key}?email=user@example.com&user_id=abc123&is_new_user=true
 *
 * Returns: { enabled: boolean, flag_key: string }
 */
export async function GET(req: NextRequest, { params }: Params) {
  const flagKey = params.key
  const email = req.nextUrl.searchParams.get('email') ?? ''
  const userId = req.nextUrl.searchParams.get('user_id') ?? ''
  const isNewUser = req.nextUrl.searchParams.get('is_new_user')
  const signupDaysAgo = parseInt(req.nextUrl.searchParams.get('signup_days_ago') ?? '', 10)

  // Use service role to bypass RLS for this public read
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: launch } = await supabase
    .from('opportunity_launches')
    .select('flag_enabled, targeting_type, targeting_value, status')
    .eq('flag_key', flagKey)
    .single()

  if (!launch) {
    return NextResponse.json({ enabled: false, flag_key: flagKey }, {
      headers: corsHeaders(),
    })
  }

  // Kill switch or non-active status
  if (!launch.flag_enabled || !['under_testing', 'deployed_to_all'].includes(launch.status)) {
    return NextResponse.json({ enabled: false, flag_key: flagKey }, {
      headers: corsHeaders(),
    })
  }

  // Deployed to all — everyone sees it
  if (launch.status === 'deployed_to_all') {
    return NextResponse.json({ enabled: true, flag_key: flagKey }, {
      headers: corsHeaders(),
    })
  }

  // Evaluate targeting rules
  const targeting = launch.targeting_value as Record<string, unknown>
  let enabled = false

  switch (launch.targeting_type) {
    case 'emails': {
      const emails = Array.isArray(targeting.emails) ? targeting.emails as string[] : []
      enabled = emails.some(e => e.toLowerCase() === email.toLowerCase())
      break
    }
    case 'percentage': {
      const pct = Number(targeting.percentage ?? 0)
      // Deterministic hash based on userId or email so same user always gets same result
      const identifier = userId || email
      if (!identifier) break
      let hash = 0
      for (let i = 0; i < identifier.length; i++) {
        hash = ((hash << 5) - hash + identifier.charCodeAt(i)) | 0
      }
      enabled = (Math.abs(hash) % 100) < pct
      break
    }
    case 'category': {
      const category = String(targeting.category ?? '')
      if (category === 'new_users') {
        enabled = isNewUser === 'true' || (!isNaN(signupDaysAgo) && signupDaysAgo <= 7)
      } else if (category === 'power_users') {
        enabled = isNewUser === 'false' || (!isNaN(signupDaysAgo) && signupDaysAgo > 30)
      }
      break
    }
  }

  return NextResponse.json({ enabled, flag_key: flagKey }, {
    headers: corsHeaders(),
  })
}

// Handle CORS preflight — this endpoint is called from user's app (different origin)
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache, max-age=0',
  }
}
