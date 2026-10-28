export const analyticsOrigin = 'https://www.fluffytailshihtzu.com'
export const measurementId = 'G-Y8FN5J7876'
export const consentKey = 'fluffytail.analytics-consent.v1'
export const consentLifetime = 180 * 24 * 60 * 60 * 1000
export type AnalyticsChoice = 'accepted' | 'declined'
export type AnalyticsPage = {path: string; title: string}

const titles: Record<string, string> = {
  '/': 'FluffyTail Shih Tzu | Home-Raised Shih Tzu Puppies in Alabama',
  '/available-puppies': 'Our puppies | FluffyTail Shih Tzu',
  '/upcoming-litters': 'Upcoming litters | FluffyTail Shih Tzu',
  '/about': 'Meet Jeanne | FluffyTail Shih Tzu',
  '/pricing': 'Pricing & process | FluffyTail Shih Tzu',
  '/the-breed': 'About the Shih Tzu breed | FluffyTail Shih Tzu',
  '/puppy-resources': 'Getting ready for home | FluffyTail Shih Tzu',
  '/privacy-policy': 'Privacy Policy | FluffyTail Shih Tzu',
  '/terms-and-conditions': 'Terms & Conditions | FluffyTail Shih Tzu',
}

export function staticAnalyticsPage(path: string): AnalyticsPage | null {
  return Object.hasOwn(titles, path) ? {path, title: titles[path]} : null
}

/** Called only by the successfully resolved published puppy page, never by a URL prefix gate. */
export function publishedPuppyAnalyticsPage(slug: string): AnalyticsPage | null {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,159}$/.test(slug)) return null
  return {path: `/puppies/${encodeURIComponent(slug)}`, title: 'Shih Tzu puppy profile | FluffyTail Shih Tzu'}
}

export function readAnalyticsChoice(raw: string | null, now = Date.now()): AnalyticsChoice | null {
  try {
    const value = JSON.parse(raw || 'null')
    return value?.version === 1 && ['accepted', 'declined'].includes(value.choice)
      && Number.isFinite(value.at) && value.at <= now && now - value.at < consentLifetime
      ? value.choice : null
  } catch { return null }
}

/** No raw referral paths or query values enter either provider. Unsupported cases are omitted. */
export function safeAnalyticsReferrer(raw: string): string | null {
  if (!raw) return ''
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null
    if (url.origin === analyticsOrigin) return staticAnalyticsPage(url.pathname) ? `${analyticsOrigin}${url.pathname}` : null
    return url.pathname === '/' ? `${url.origin}/` : null
  } catch { return null }
}

export function cleanAnalyticsDocument(href: string, production: boolean): boolean {
  try {
    const url = new URL(href)
    return production && url.origin === analyticsOrigin && !url.username && !url.password && !url.search && !url.hash
  } catch { return false }
}

export function consentRecord(choice: AnalyticsChoice, now = Date.now()): string {
  return JSON.stringify({version: 1, choice, at: now})
}
