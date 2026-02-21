import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewAgentForm from './NewAgentForm'

export default async function NewAgentPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin?next=/dashboard/agents/new')

  const { data: row } = await supabase
    .from('user_context')
    .select('id')
    .eq('user_id', user.id)
    .eq('context_type', 'google_drive')
    .eq('key', 'refresh_token')
    .maybeSingle()

  return <NewAgentForm googleDriveConnected={!!row} />
}
