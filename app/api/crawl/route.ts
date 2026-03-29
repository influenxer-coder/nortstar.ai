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

  let body: { url?: string; email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const url = typeof body.url === 'string' ? body.url.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
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
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(${JSON.stringify(url)}, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));

  // If credentials provided, try to log in
  ${email ? `
  try {
    // Look for email/username input
    const emailSel = await page.$('input[type="email"], input[name="email"], input[name="username"], input[type="text"][autocomplete="email"], input[type="text"][autocomplete="username"], input[placeholder*="email" i], input[placeholder*="username" i]');
    const passSel = await page.$('input[type="password"]');
    if (emailSel && passSel) {
      await emailSel.click({ clickCount: 3 });
      await emailSel.type(${JSON.stringify(email)}, { delay: 30 });
      await passSel.click({ clickCount: 3 });
      await passSel.type(${JSON.stringify(password)}, { delay: 30 });
      // Click submit — find the button by type or by text content
      let submitBtn = await page.$('button[type="submit"], input[type="submit"]');
      if (!submitBtn) {
        // Fallback: find button by text content
        submitBtn = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(b => {
            const t = (b.textContent || '').trim().toLowerCase();
            return ['sign in', 'log in', 'login', 'submit', 'continue'].includes(t);
          }) || null;
        });
        if (submitBtn && !(await submitBtn.evaluate(el => el !== null).catch(() => false))) {
          submitBtn = null;
        }
      }
      if (submitBtn) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {}),
          submitBtn.click(),
        ]);
      } else {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {}),
          passSel.press('Enter'),
        ]);
      }
      await new Promise(r => setTimeout(r, 2000));

      // If the target URL is different from current (e.g. login redirected to dashboard), navigate to target
      const currentUrl = page.url();
      if (!currentUrl.includes(${JSON.stringify(new URL(url).pathname)})) {
        await page.goto(${JSON.stringify(url)}, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  } catch (e) {
    // Login failed, continue with whatever page we're on
  }
  ` : ''}

  const screenshot = await page.screenshot({ type: 'png', fullPage: false, encoding: 'base64' });
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
  const analyticsDetected = await page.evaluate(() => {
    // Scan all script tags (src + inline content) as a fallback for async setups
    // where the global might not be attached yet (e.g. React hydration, CDN blocked).
    const scriptText = Array.from(document.querySelectorAll('script'))
      .map(s => (s.src || '') + (s.textContent || ''))
      .join(' ');
    const has = (...patterns) => patterns.some(p => scriptText.includes(p));
    return {
      posthog:   typeof window.posthog !== 'undefined' || has('posthog.init(', 'posthog-js', 'us.i.posthog.com'),
      mixpanel:  typeof window.mixpanel !== 'undefined' || has('mixpanel.init(', 'cdn.mxpnl.com'),
      amplitude: typeof window.amplitude !== 'undefined' || has('amplitude.getInstance(', 'cdn.amplitude.com'),
      segment:   typeof window.analytics !== 'undefined' || has('analytics.load(', 'cdn.segment.com'),
      ga4:       typeof window.gtag !== 'undefined' ||
                 (Array.isArray(window.dataLayer) && window.dataLayer.length > 0) ||
                 has('googletagmanager.com', 'google-analytics.com', 'gtag('),
      heap:      typeof window.heap !== 'undefined' || has('heap.load(', 'heapanalytics.com'),
      fullstory: typeof window.FS !== 'undefined' || has('fullstory.com'),
      hotjar:    typeof window.hj !== 'undefined' || has('hotjar.com', 'hjid'),
    };
  });
  return { data: { screenshot, elements, analyticsDetected }, type: 'application/json' };
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

    const rawAnalytics = data?.analyticsDetected && typeof data.analyticsDetected === 'object'
      ? data.analyticsDetected as Record<string, unknown>
      : {}
    const detected: Record<string, boolean> = {}
    for (const key of ['posthog','mixpanel','amplitude','segment','ga4','heap','fullstory','hotjar']) {
      detected[key] = Boolean(rawAnalytics[key])
    }
    const hasAny = Object.values(detected).some(Boolean)

    return NextResponse.json({
      screenshot: typeof screenshot === 'string' ? screenshot : '',
      elements,
      analytics: { detected, hasAny },
    })
  } catch (err) {
    console.error('[crawl] error:', err)
    return NextResponse.json(
      { error: "We couldn't crawl this page. Please check the URL is public and try again." },
      { status: 502 }
    )
  }
}
