import { NextResponse } from 'next/server'

/**
 * GET /api/rising-products/jobs/debug?company=Vanta
 * Returns raw JSearch API response for one company so we can see the actual structure.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const company = searchParams.get('company') ?? 'Vanta'
  const key = process.env.RAPIDAPI_KEY ?? process.env.JSEARCH_RAPIDAPI_KEY
  if (!key) {
    return NextResponse.json({ error: 'Missing RAPIDAPI_KEY in env' }, { status: 500 })
  }
  const query = encodeURIComponent(`product manager ${company}`)
  const url = `https://jsearch.p.rapidapi.com/search?query=${query}&page=1&num_pages=1`
  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
  })
  const json = await res.json().catch(() => ({}))
  return NextResponse.json({
    status: res.status,
    ok: res.ok,
    company,
    dataIsArray: Array.isArray(json.data),
    dataKeys: json.data && typeof json.data === 'object' ? Object.keys(json.data) : null,
    sampleFirstJobKeys: Array.isArray(json.data) && json.data[0] ? Object.keys(json.data[0]) : null,
    raw: json,
  })
}
