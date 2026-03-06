import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { RISING_PRODUCTS } from '@/lib/rising-products-data'
import { fetchJobsForCompany, summarizeJobDescription } from '@/lib/prospect-jobs'

// Vercel serverless timeout (e.g. 60s on Pro). Sync in small batches to avoid timeout.
export const maxDuration = 60

const DEFAULT_LIMIT = 5
const MAX_JOBS_PER_COMPANY = 5

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const company = body.company as string | undefined
    const limit = Math.min(Number(body.limit) || DEFAULT_LIMIT, 20)
    const offset = Math.max(0, Number(body.offset) || 0)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const allCompanies = company
      ? RISING_PRODUCTS.filter((p) => p.company.toLowerCase() === company.toLowerCase()).map((p) => p.company)
      : RISING_PRODUCTS.map((p) => p.company)

    if (allCompanies.length === 0) {
      return NextResponse.json({ error: 'Company not found', synced: 0 }, { status: 400 })
    }

    const companies = company ? allCompanies : allCompanies.slice(offset, offset + limit)

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

      for (const job of jobs.slice(0, MAX_JOBS_PER_COMPANY)) {
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
    const nextOffset = company ? null : offset + companies.length
    const hasMore = nextOffset !== null && nextOffset < allCompanies.length
    return NextResponse.json({
      ok: true,
      companiesProcessed: companies.length,
      jobsInserted: totalInserted,
      ...(nextOffset !== null ? { nextOffset, totalCompanies: allCompanies.length, hasMore } : {}),
      ...(firstError ? { warning: firstError } : {}),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: message, jobsInserted: 0 }, { status: 500 })
  }
}
