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
  'facebook': {
    officialName: 'Facebook / Meta Reels Ads',
    brandColor: '#1877F2',
    cardBg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    label: 'Increase reels monetization efficiency by 20%',
    reach: '10% to 16%',
  },
  'meta': {
    officialName: 'Facebook / Meta Reels Ads',
    brandColor: '#1877F2',
    cardBg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    label: 'Increase reels monetization efficiency by 20%',
    reach: '10% to 16%',
  },
  'snapchat': {
    officialName: 'Snapchat for Business',
    brandColor: '#FFFC00',
    cardBg: 'linear-gradient(135deg, #fffde7 0%, #fff9c4 100%)',
    label: 'Continue to be the platform to find younger population most effectively, measured by MMM',
    reach: '10% to 16%',
  },
  'snapchat for business': {
    officialName: 'Snapchat for Business',
    brandColor: '#FFFC00',
    cardBg: 'linear-gradient(135deg, #fffde7 0%, #fff9c4 100%)',
    label: 'Continue to be the platform to find younger population most effectively, measured by MMM',
    reach: '10% to 16%',
  },
}

export function getProductMeta(name: string): ProductMeta | null {
  return PRODUCT_META[name.toLowerCase().trim()] ?? null
}

// Friendly labels for goal slugs stored in DB — will be variable later
const GOAL_LABELS: Record<string, { label: string; reach: string }> = {
  'improve_activation': {
    label: 'Improve number of user activations',
    reach: '12% to 18%',
  },
  'beat_competitor': {
    label: 'Increase reels monetization efficiency by 20%',
    reach: '10% to 16%',
  },
}

export function getGoalLabel(goal: string | null | undefined): { label: string; reach: string } | null {
  if (!goal) return null
  return GOAL_LABELS[goal.toLowerCase().trim()] ?? null
}

/** Returns true for colors that need dark text (luminance > 0.6) */
export function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.6
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
