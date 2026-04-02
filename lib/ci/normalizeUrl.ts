/**
 * Normalize a URL to a consistent lowercase string with no protocol, no www, no trailing slash.
 *
 * Examples:
 *   https://beacons.ai/i/for-brands   → beacons.ai/i/for-brands
 *   http://beacons.ai/i/for-brands    → beacons.ai/i/for-brands
 *   beacons.ai/i/for-brands           → beacons.ai/i/for-brands
 *   https://beacons.ai/i/for-brands/  → beacons.ai/i/for-brands
 *   https://www.beacons.ai/i/for-brands → beacons.ai/i/for-brands
 *   https://BEACONS.AI/i/for-brands   → beacons.ai/i/for-brands
 */
export function normalizeUrl(url: string): string {
  let s = url.toLowerCase().trim()
  s = s.replace(/^https?:\/\//, '')
  s = s.replace(/^www\./, '')
  s = s.replace(/\/+$/, '')
  return s
}

/**
 * Extract just the domain from a URL.
 *
 * Example: normalizeUrl gives beacons.ai/i/for-brands → getDomain gives beacons.ai
 */
export function getDomain(url: string): string {
  const normalized = normalizeUrl(url)
  const slashIdx = normalized.indexOf('/')
  return slashIdx === -1 ? normalized : normalized.slice(0, slashIdx)
}
