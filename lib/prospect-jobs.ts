/**
 * Fetch PM jobs for a company (JSearch), filter last 3 months, optionally summarize with Claude.
 * Set RAPIDAPI_KEY for JSearch; ANTHROPIC_API_KEY for summarization.
 */

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000

// JSearch response job shape (partial). See https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
interface JSearchJob {
  job_id?: string
  job_title?: string
  employer_name?: string
  job_description?: string
  job_apply_link?: string
  job_posted_at_timestamp?: number // seconds since epoch
  job_posted_at_datetime_utc?: string
  job_posted_at?: string
}

function isPMJob(title: string, description: string): boolean {
  const t = (title || '').toLowerCase()
  const d = (description || '').toLowerCase()
  const hasPM = /\bproduct\s*manager\b|\bpm\b|\bproduct\s*management\b|\bassociate\s*pm\b|\bapm\b|\btechnical\s*pm\b|\bgrowth\s*pm\b/i.test(t) || /\bproduct\s*manager\b|\bproduct\s*management\b|\bpm\s+experience\b/i.test(d)
  return hasPM
}

function postedInLast3Months(job: JSearchJob): boolean {
  let ts = job.job_posted_at_timestamp
  if (ts == null && job.job_posted_at_datetime_utc) {
    const d = Date.parse(job.job_posted_at_datetime_utc)
    if (!Number.isNaN(d)) ts = d / 1000
  }
  if (ts == null) return true // include if no date
  const posted = typeof ts === 'number' ? ts * 1000 : Date.parse(String(ts))
  if (Number.isNaN(posted)) return true
  return Date.now() - posted <= THREE_MONTHS_MS
}

export async function fetchJobsForCompany(company: string): Promise<{
  title: string
  url: string | null
  description_raw: string
  posted_at: Date | null
}[]> {
  const key = process.env.RAPIDAPI_KEY ?? process.env.JSEARCH_RAPIDAPI_KEY
  if (!key) return []

  const query = encodeURIComponent(`product manager ${company}`)
  const res = await fetch(
    `https://jsearch.p.rapidapi.com/search?query=${query}&page=1&num_pages=1`,
    {
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
    }
  )
  if (!res.ok) return []

  const json = await res.json()
  const data = json.data
  if (!Array.isArray(data)) return []

  const jobs: { title: string; url: string | null; description_raw: string; posted_at: Date | null }[] = []
  for (const j of data as JSearchJob[]) {
    const title = j.job_title ?? 'Product Manager'
    const desc = j.job_description ?? ''
    if (!isPMJob(title, desc)) continue
    if (!postedInLast3Months(j)) continue
    jobs.push({
      title,
      url: j.job_apply_link ?? null,
      description_raw: desc,
      posted_at: j.job_posted_at_timestamp
        ? new Date(j.job_posted_at_timestamp * 1000)
        : null,
    })
  }
  return jobs
}

export async function summarizeJobDescription(
  title: string,
  descriptionRaw: string
): Promise<{ summary: string; skills: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || !descriptionRaw.trim()) {
    return { summary: descriptionRaw.slice(0, 500) || '—', skills: [] }
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const anthropic = new Anthropic({ apiKey })
  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    system: 'You are a concise analyst. Output only valid JSON with no markdown or code fences.',
    messages: [
      {
        role: 'user',
        content: `From this job posting, extract:
1. "summary": 2-3 sentences on what they expect the PM to drive (outcomes, ownership, key responsibilities).
2. "skills": array of specific skills they look for (e.g. "SQL", "A/B testing", "roadmap prioritization"). Max 10 items.

Job title: ${title}

Description:
${descriptionRaw.slice(0, 6000)}

Return JSON: {"summary": "...", "skills": ["...", ...]}`,
      },
    ],
  })
  const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
  try {
    const parsed = JSON.parse(text.trim()) as { summary?: string; skills?: string[] }
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : descriptionRaw.slice(0, 500),
      skills: Array.isArray(parsed.skills) ? parsed.skills.slice(0, 10) : [],
    }
  } catch {
    return { summary: descriptionRaw.slice(0, 500), skills: [] }
  }
}
