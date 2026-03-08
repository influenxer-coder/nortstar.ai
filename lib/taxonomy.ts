/**
 * Derive vertical and page_type from a URL.
 * Used by the brain layer to route knowledge retrieval and skill-weight updates.
 */

export function deriveVertical(url: string): string {
  const lower = url.toLowerCase()
  if (/financ|bank|pay|fintech|stripe|plaid|invest|wallet|lending|credit/.test(lower)) return 'fintech'
  if (/shop|store|marketplace|amazon|etsy|ebay|commerce|cart|retail/.test(lower)) return 'marketplace'
  if (/saas|platform|dashboard|app\.|tool|software|suite|workflow|crm|erp/.test(lower)) return 'b2b_saas'
  if (/consumer|social|game|music|media|news|health|fitness|dating|travel/.test(lower)) return 'consumer'
  return 'universal'
}

export function derivePageType(url: string): string {
  try {
    const path = new URL(url).pathname.toLowerCase()
    if (/pric/.test(path)) return 'pricing'
    if (/onboard|welcome|setup|getting-started|get-started/.test(path)) return 'onboarding'
    if (/checkout|cart|payment|purchase|buy/.test(path)) return 'checkout'
    if (/dashboard|overview|portal|home/.test(path)) return 'dashboard'
    if (/feature|product|solution|capabilit/.test(path)) return 'feature'
    if (path === '/' || path === '') return 'landing'
    return 'other'
  } catch {
    return 'other'
  }
}
