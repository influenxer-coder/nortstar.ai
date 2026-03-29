import { NextRequest, NextResponse } from 'next/server'

type DetectedTool = {
  name: string
  key: 'posthog' | 'google_analytics' | 'mixpanel' | 'amplitude' | 'segment' | 'heap' | 'hotjar'
  detected: boolean
  snippet?: string // the detected script/ID
}

const DETECTORS: { key: DetectedTool['key']; name: string; patterns: RegExp[] }[] = [
  {
    key: 'posthog',
    name: 'PostHog',
    patterns: [/posthog\.com/i, /posthog\.init/i, /ph\.posthog/i, /phc_[a-zA-Z0-9]+/],
  },
  {
    key: 'google_analytics',
    name: 'Google Analytics',
    patterns: [/googletagmanager\.com/i, /gtag\(/i, /google-analytics\.com/i, /UA-\d+-\d+/, /G-[A-Z0-9]+/],
  },
  {
    key: 'mixpanel',
    name: 'Mixpanel',
    patterns: [/mixpanel\.com/i, /mixpanel\.init/i, /cdn\.mxpnl\.com/i],
  },
  {
    key: 'amplitude',
    name: 'Amplitude',
    patterns: [/amplitude\.com/i, /amplitude\.init/i, /cdn\.amplitude\.com/i],
  },
  {
    key: 'segment',
    name: 'Segment',
    patterns: [/cdn\.segment\.com/i, /analytics\.load/i, /segment\.io/i],
  },
  {
    key: 'heap',
    name: 'Heap',
    patterns: [/heap\.io/i, /heapanalytics\.com/i, /heap\.load/i],
  },
  {
    key: 'hotjar',
    name: 'Hotjar',
    patterns: [/hotjar\.com/i, /hj\(/i, /static\.hotjar\.com/i],
  },
]

export async function POST(req: NextRequest) {
  const { url } = await req.json() as { url?: string }
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  try {
    // Fetch the page HTML
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 NorthStar Analytics Detector' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Could not fetch URL (${res.status})` }, { status: 400 })
    }

    const html = await res.text()

    const detected: DetectedTool[] = DETECTORS.map(detector => {
      const found = detector.patterns.some(p => p.test(html))
      let snippet: string | undefined
      if (found) {
        // Try to extract the project ID / measurement ID
        if (detector.key === 'posthog') {
          const match = html.match(/phc_[a-zA-Z0-9]+/)
          snippet = match?.[0]
        } else if (detector.key === 'google_analytics') {
          const gMatch = html.match(/G-[A-Z0-9]+/) ?? html.match(/UA-\d+-\d+/)
          snippet = gMatch?.[0]
        } else if (detector.key === 'mixpanel') {
          const mMatch = html.match(/mixpanel\.init\s*\(\s*['"]([^'"]+)['"]/)
          snippet = mMatch?.[1]
        }
      }
      return {
        name: detector.name,
        key: detector.key,
        detected: found,
        ...(snippet ? { snippet } : {}),
      }
    })

    return NextResponse.json({
      tools: detected,
      detected_count: detected.filter(d => d.detected).length,
    })
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? 'Could not analyze URL' },
      { status: 500 }
    )
  }
}
