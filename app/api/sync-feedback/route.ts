import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()

    // Get all active data sources
    const { data: sources, error } = await supabase
      .from('data_sources')
      .select('*, organizations(id, name)')
      .eq('status', 'active')

    if (error || !sources) {
      return NextResponse.json({ error: 'Failed to load data sources' }, { status: 500 })
    }

    const results = []
    for (const source of sources) {
      try {
        let synced = 0
        if (source.source_type === 'zendesk') {
          synced = await syncZendesk(source, supabase)
        } else if (source.source_type === 'gong') {
          synced = await syncGong(source, supabase)
        } else if (source.source_type === 'intercom') {
          synced = await syncIntercom(source, supabase)
        }

        // Update last synced
        await supabase
          .from('data_sources')
          .update({ last_synced_at: new Date().toISOString(), items_synced: synced })
          .eq('id', source.id)

        results.push({ source_id: source.id, type: source.source_type, synced })
      } catch (err) {
        console.error(`Sync error for ${source.id}:`, err)
        await supabase
          .from('data_sources')
          .update({ status: 'error' })
          .eq('id', source.id)
        results.push({ source_id: source.id, type: source.source_type, error: String(err) })
      }
    }

    return NextResponse.json({ results, synced_at: new Date().toISOString() })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

async function syncZendesk(source: { id: string; org_id: string; api_key_encrypted: string; config: Record<string, string> }, supabase: ReturnType<typeof import('@/lib/supabase/server').createClient>) {
  const { api_key_encrypted: apiKey, config } = source
  const subdomain = config?.subdomain || 'demo'
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const response = await fetch(
    `https://${subdomain}.zendesk.com/api/v2/tickets.json?created_after=${since}&per_page=100`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) throw new Error(`Zendesk API error: ${response.status}`)

  const { tickets } = await response.json()
  let count = 0

  for (const ticket of tickets || []) {
    const content = `${ticket.subject}: ${ticket.description || ''}`
    await supabase.from('feedback_items').upsert({
      org_id: source.org_id,
      source_id: source.id,
      source_type: 'zendesk',
      source_item_id: String(ticket.id),
      content: content.slice(0, 2000),
      customer_name: ticket.requester?.name,
      created_at: ticket.created_at,
    }, { onConflict: 'org_id,source_type,source_item_id' })
    count++
  }

  return count
}

async function syncGong(source: { id: string; org_id: string; api_key_encrypted: string; config: Record<string, string> }, supabase: ReturnType<typeof import('@/lib/supabase/server').createClient>) {
  const { api_key_encrypted: apiKey } = source
  const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const response = await fetch('https://us-71006.api.gong.io/v2/calls', {
    headers: {
      'Authorization': `Basic ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) throw new Error(`Gong API error: ${response.status}`)

  const { calls } = await response.json()
  let count = 0

  for (const call of (calls || []).slice(0, 50)) {
    await supabase.from('feedback_items').upsert({
      org_id: source.org_id,
      source_id: source.id,
      source_type: 'gong',
      source_item_id: String(call.id),
      content: call.title || call.id,
      customer_company: call.parties?.find((p: { affiliation: string; name: string }) => p.affiliation === 'External')?.name,
      created_at: call.started || fromDate,
      metadata: { duration: call.duration, url: call.url },
    }, { onConflict: 'org_id,source_type,source_item_id' })
    count++
  }

  return count
}

async function syncIntercom(source: { id: string; org_id: string; api_key_encrypted: string; config: Record<string, string> }, supabase: ReturnType<typeof import('@/lib/supabase/server').createClient>) {
  const { api_key_encrypted: accessToken } = source

  const response = await fetch('https://api.intercom.io/conversations?per_page=100', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Intercom-Version': '2.10',
    },
  })

  if (!response.ok) throw new Error(`Intercom API error: ${response.status}`)

  const { conversations } = await response.json()
  let count = 0

  for (const conv of conversations || []) {
    const firstMessage = conv.conversation_message?.body || conv.source?.body || ''
    await supabase.from('feedback_items').upsert({
      org_id: source.org_id,
      source_id: source.id,
      source_type: 'intercom',
      source_item_id: String(conv.id),
      content: firstMessage.replace(/<[^>]+>/g, '').slice(0, 2000),
      customer_email: conv.contacts?.contacts?.[0]?.email,
      created_at: new Date(conv.created_at * 1000).toISOString(),
    }, { onConflict: 'org_id,source_type,source_item_id' })
    count++
  }

  return count
}
