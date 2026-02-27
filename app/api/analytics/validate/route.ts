import { NextResponse } from 'next/server'

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

// Required credential keys per tool
const REQUIRED_FIELDS: Record<string, string[]> = {
  posthog:   ['api_key', 'project_id'],
  mixpanel:  ['project_token'],
  ga4:       ['measurement_id'],
  amplitude: ['api_key'],
  segment:   ['write_key'],
  heap:      ['app_id'],
  fullstory: ['org_id'],
  hotjar:    ['site_id'],
}

export async function POST(request: Request) {
  let body: { tool: string; credentials: Record<string, string> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { tool, credentials } = body
  const required = REQUIRED_FIELDS[tool]
  if (!required) {
    return NextResponse.json({ valid: false, error: 'Unknown analytics tool' }, { status: 400 })
  }

  const missing = required.filter((f) => !credentials?.[f]?.trim())
  if (missing.length > 0) {
    return NextResponse.json({ valid: false, error: `Required: ${missing.join(', ')}` })
  }

  // PostHog: real API validation
  if (tool === 'posthog') {
    const apiKey = credentials.api_key.trim()
    const projectId = credentials.project_id?.trim()
    try {
      const base = POSTHOG_HOST.replace(/\/$/, '')
      const res = await fetch(`${base}/api/projects/`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!res.ok) {
        return NextResponse.json({ valid: false, error: 'Invalid API key' })
      }
      const data = await res.json()
      const projects = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
      const hasProject = !projectId || projects.some((p: { id?: string }) => String(p?.id) === String(projectId))
      return NextResponse.json(hasProject
        ? { valid: true }
        : { valid: false, error: 'Project ID not found under this API key' }
      )
    } catch {
      return NextResponse.json({ valid: false, error: 'Could not reach PostHog' })
    }
  }

  // GA4: validate Measurement ID format (G-XXXXXXX)
  if (tool === 'ga4') {
    const mid = credentials.measurement_id?.trim()
    if (!mid.match(/^G-[A-Z0-9]{4,}$/i)) {
      return NextResponse.json({ valid: false, error: 'Measurement ID should be in the format G-XXXXXXXXXX' })
    }
  }

  // All other tools: format check passed — will verify on first agent run
  return NextResponse.json({
    valid: true,
    note: 'Credentials saved — connection will be verified when the agent first runs.',
  })
}
