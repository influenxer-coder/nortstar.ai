import { NextResponse } from 'next/server'

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

export async function POST(request: Request) {
  let body: { posthog_api_key?: string; posthog_project_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const apiKey = typeof body.posthog_api_key === 'string' ? body.posthog_api_key.trim() : ''
  const projectId = typeof body.posthog_project_id === 'string' ? body.posthog_project_id.trim() : ''

  if (!apiKey || !projectId) {
    return NextResponse.json({ valid: false, error: 'API key and project ID are required' }, { status: 400 })
  }

  try {
    const base = POSTHOG_HOST.replace(/\/$/, '')
    const res = await fetch(`${base}/api/projects/`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json({ valid: false, error: 'Invalid API key or project ID' }, { status: 200 })
      }
      const text = await res.text()
      return NextResponse.json({ valid: false, error: text || 'Validation failed' }, { status: 200 })
    }

    const data = await res.json()
    const projects = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
    const hasProject = !projectId || projects.some((p: { id?: string }) => String(p?.id) === String(projectId))
    return NextResponse.json(hasProject ? { valid: true } : { valid: false, error: 'Project not found' }, { status: 200 })
  } catch (err) {
    console.error('[posthog validate]', err)
    return NextResponse.json(
      { valid: false, error: 'Could not reach PostHog' },
      { status: 200 }
    )
  }
}
