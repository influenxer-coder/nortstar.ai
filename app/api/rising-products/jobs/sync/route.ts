import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { RISING_PRODUCTS } from '@/lib/rising-products-data'
import { fetchJobsForCompany, summarizeJobDescription } from '@/lib/prospect-jobs'

export const maxDuration = 300 // allow long run for many companies

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const company = body.company as string | undefined

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const companies = company
    ? RISING_PRODUCTS.filter((p) => p.company.toLowerCase() === company.toLowerCase()).map((p) => p.company)
    : RISING_PRODUCTS.map((p) => p.company)

  if (companies.length === 0) {
    return NextResponse.json({ error: 'Company not found', synced: 0 }, { status: 400 })
  }

  let totalInserted = 0
  let firstError: string | null = null

  for (const c of companies) {
    const result = await fetchJobsForCompany(c)
    if (!result.ok) {
      if (!firstError) firstError = result.error
      continue
    }
    const jobs = result.jobs
    if (jobs.length === 0) continue

    await supabase.from('prospect_jobs').delete().eq('company_name', c)

    for (const job of jobs.slice(0, 15)) {
      const { summary, skills } = await summarizeJobDescription(job.title, job.description_raw)
      await supabase.from('prospect_jobs').insert({
        company_name: c,
        title: job.title,
        url: job.url,
        description_raw: job.description_raw.slice(0, 15000),
        description_summary: summary,
        skills,
        posted_at: job.posted_at?.toISOString() ?? null,
        source: 'jsearch',
      })
      totalInserted += 1
    }
  }

  if (totalInserted === 0 && firstError) {
    return NextResponse.json({ ok: false, error: firstError, jobsInserted: 0 }, { status: 502 })
  }
  return NextResponse.json({
    ok: true,
    companies: companies.length,
    jobsInserted: totalInserted,
    ...(firstError ? { warning: firstError } : {}),
  })
}
