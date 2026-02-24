import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BROWSERLESS_BASE = 'https://chrome.browserless.io'

type CrawlElement = {
  type: string
  text: string
  position: { x: number; y: number; width: number; height: number }
}

export async function POST(request: Request) {
  const apiKey = process.env.BROWSERLESS_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Crawl service not configured' },
      { status: 503 }
    )
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const url = typeof body.url === 'string' ? body.url.trim() : ''
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const token = apiKey

  const functionCode = `
export default async ({ page }) => {
  await page.goto(${JSON.stringify(url)}, { waitUntil: 'networkidle0', timeout: 30000 });
  const screenshot = await page.screenshot({ type: 'png', fullPage: true, encoding: 'base64' });
  const elements = await page.evaluate(() => {
    const selectors = ['a[href]', 'button', 'input[type="submit"]', '[onclick]', '[role="button"]'];
    const seen = new Set();
    const result = [];
    for (const sel of selectors) {
      try {
        document.querySelectorAll(sel).forEach((el) => {
          const rect = el.getBoundingClientRect();
          const key = rect.top + '-' + rect.left;
          if (seen.has(key)) return;
          seen.add(key);
          if (rect.width < 2 || rect.height < 2) return;
          const tag = el.tagName.toLowerCase();
          let type = 'element';
          if (tag === 'a') type = 'link';
          else if (tag === 'button' || (tag === 'input' && el.type === 'submit')) type = 'button';
          else if (el.getAttribute('role') === 'button' || el.onclick) type = 'cta';
          const text = (el.textContent || '').trim().slice(0, 80) || (el.getAttribute('aria-label') || el.title || '');
          result.push({
            type,
            text,
            position: {
              x: Math.round(rect.x + window.scrollX),
              y: Math.round(rect.y + window.scrollY),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
          });
        });
      } catch (e) {}
    }
    return result;
  });
  return { data: { screenshot, elements }, type: 'application/json' };
};
`

  try {
    const res = await fetch(`${BROWSERLESS_BASE}/function?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/javascript' },
      body: functionCode,
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[crawl] browserless error:', err)
      return NextResponse.json(
        { error: "We couldn't crawl this page. Please check the URL is public and try again." },
        { status: 502 }
      )
    }

    const body = await res.json()
    const data = body?.data && typeof body.data === 'object' ? body.data : body
    const screenshot = data?.screenshot ?? ''
    const rawElements = data?.elements ?? []
    const elements: CrawlElement[] = Array.isArray(rawElements)
      ? rawElements.map((e: Record<string, unknown>) => ({
          type: typeof e.type === 'string' ? e.type : 'element',
          text: typeof e.text === 'string' ? e.text : '',
          position: e.position && typeof e.position === 'object' && !Array.isArray(e.position)
            ? {
                x: Number((e.position as Record<string, unknown>).x) || 0,
                y: Number((e.position as Record<string, unknown>).y) || 0,
                width: Number((e.position as Record<string, unknown>).width) || 0,
                height: Number((e.position as Record<string, unknown>).height) || 0,
              }
            : { x: 0, y: 0, width: 0, height: 0 },
        }))
      : []

    return NextResponse.json({
      screenshot: typeof screenshot === 'string' ? screenshot : '',
      elements,
    })
  } catch (err) {
    console.error('[crawl] error:', err)
    return NextResponse.json(
      { error: "We couldn't crawl this page. Please check the URL is public and try again." },
      { status: 502 }
    )
  }
}
