import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export interface ProspectJobRow {
  id: string
  company_name: string
  title: string
  url: string | null
  description_raw: string | null
  description_summary: string | null
  skills: string[]
  posted_at: string | null
  source: string | null
  created_at: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const company = searchParams.get('company')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let q = supabase
    .from('prospect_jobs')
    .select('id, company_name, title, url, description_summary, skills, posted_at, source, created_at')
    .order('posted_at', { ascending: false })

  if (company) q = q.eq('company_name', company)
  const { data, error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as ProspectJobRow[])
}
