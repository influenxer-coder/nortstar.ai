// Supabase Edge Function: Sync feedback from all data sources
// Deploy with: supabase functions deploy sync-feedback
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all active data sources
    const { data: sources, error } = await supabase
      .from('data_sources')
      .select('*')
      .eq('status', 'active')

    if (error) throw error

    const results = []
    for (const source of sources ?? []) {
      try {
        let synced = 0

        if (source.source_type === 'zendesk') {
          synced = await syncZendesk(source, supabase)
        } else if (source.source_type === 'intercom') {
          synced = await syncIntercom(source, supabase)
        }

        await supabase
          .from('data_sources')
          .update({ last_synced_at: new Date().toISOString(), items_synced: synced })
          .eq('id', source.id)

        results.push({ id: source.id, type: source.source_type, synced })
      } catch (err) {
        console.error(`Error syncing ${source.id}:`, err)
        results.push({ id: source.id, error: String(err) })
      }
    }

    // Trigger insight generation for each org
    const orgIds = [...new Set(sources?.map((s: { org_id: string }) => s.org_id) ?? [])]
    for (const orgId of orgIds) {
      await triggerInsightGeneration(orgId as string, supabase)
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function syncZendesk(source: Record<string, string>, supabase: ReturnType<typeof createClient>) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const subdomain = source.config?.subdomain || 'demo'

  const response = await fetch(
    `https://${subdomain}.zendesk.com/api/v2/tickets.json?created_after=${since}`,
    { headers: { Authorization: `Bearer ${source.api_key_encrypted}` } }
  )

  const { tickets } = await response.json()
  let count = 0

  for (const ticket of tickets ?? []) {
    await supabase.from('feedback_items').upsert({
      org_id: source.org_id,
      source_id: source.id,
      source_type: 'zendesk',
      source_item_id: String(ticket.id),
      content: `${ticket.subject}: ${ticket.description || ''}`.slice(0, 2000),
      created_at: ticket.created_at,
    }, { onConflict: 'org_id,source_type,source_item_id' })
    count++
  }

  return count
}

async function syncIntercom(source: Record<string, string>, supabase: ReturnType<typeof createClient>) {
  const response = await fetch('https://api.intercom.io/conversations?per_page=100', {
    headers: {
      Authorization: `Bearer ${source.api_key_encrypted}`,
      'Intercom-Version': '2.10',
    },
  })

  const { conversations } = await response.json()
  let count = 0

  for (const conv of conversations ?? []) {
    await supabase.from('feedback_items').upsert({
      org_id: source.org_id,
      source_id: source.id,
      source_type: 'intercom',
      source_item_id: String(conv.id),
      content: (conv.conversation_message?.body || '').replace(/<[^>]+>/g, '').slice(0, 2000),
      created_at: new Date(conv.created_at * 1000).toISOString(),
    }, { onConflict: 'org_id,source_type,source_item_id' })
    count++
  }

  return count
}

async function triggerInsightGeneration(orgId: string, _supabase: ReturnType<typeof createClient>) {
  const siteUrl = Deno.env.get('NEXT_PUBLIC_SITE_URL')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!siteUrl) return

  await fetch(`${siteUrl}/api/generate-insights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cronSecret}`,
    },
    body: JSON.stringify({ orgId }),
  })
}
