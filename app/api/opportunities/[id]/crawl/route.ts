import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const maxDuration = 150

export async function POST(req: NextRequest) {
  const endpoint = process.env.BROWSER_SCREENSHOT_URL || process.env.NEXT_PUBLIC_BROWSER_SCREENSHOT_URL
  if (!endpoint) {
    return new Response(JSON.stringify({ type: 'error', message: 'Browser agent endpoint not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await req.json()

  const upstream = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ type: 'error', message: 'Could not reach browser agent' }), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Stream the response through to the client
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
    },
  })
}
