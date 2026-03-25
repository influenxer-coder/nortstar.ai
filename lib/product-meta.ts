// Hardcoded per-product brand metadata — will be variable later

export type ProductMeta = {
  officialName: string
  brandColor: string
  cardBg: string
  label: string
  reach: string
}

const PRODUCT_META: Record<string, ProductMeta> = {
  'reevo': {
    officialName: 'Reevo',
    brandColor: '#7C3AED',
    cardBg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
    label: 'Improve number of user activations measured by users sending their first email',
    reach: '12% to 18%',
  },
  'pygent': {
    officialName: 'Pygent',
    brandColor: '#0EA5E9',
    cardBg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
    label: 'Increase number of users who install the script for measuring LLM cost',
    reach: '8% to 14%',
  },
  'agent northstar': {
    officialName: 'Agent NorthStar',
    brandColor: '#8B5CF6',
    cardBg: 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)',
    label: 'Increase number of users who draft their first feature',
    reach: '15% to 23%',
  },
  'northstar': {
    officialName: 'NorthStar',
    brandColor: '#8B5CF6',
    cardBg: 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)',
    label: 'Increase number of users who draft their first feature',
    reach: '15% to 23%',
  },
}

export function getProductMeta(name: string): ProductMeta | null {
  return PRODUCT_META[name.toLowerCase().trim()] ?? null
}

export function faviconUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  } catch {
    return null
  }
}
