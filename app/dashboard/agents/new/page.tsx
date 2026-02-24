import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateAgentFlow from './CreateAgentFlow'

export default async function NewAgentPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin?next=/dashboard/agents/new')

  return <CreateAgentFlow />
}
