import type {Metadata} from 'next'
import {formatDate, formatPuppyStatus, normalizeLitterStatus, puppyPath, type Puppy} from './inventory'
import {getPuppyProfilePortrait} from './puppy-portraits'

export const siteUrl = 'https://www.fluffytailshihtzu.com'
export const siteName = 'FluffyTail Shih Tzu'
export const homeTitle = `${siteName} | Home-Raised Shih Tzu Puppies in Alabama`

type ShareImage = {url: string; alt: string; width?: number; height?: number}
const homeImage: ShareImage = {
  url: `${siteUrl}/design-preview/IMG_6731.JPEG`,
  alt: 'Two cream-colored FluffyTail Shih Tzu puppies sitting together outdoors',
  width: 2048,
  height: 1536,
}

// Each public page declares its own social fields: Next merges metadata shallowly.
// Do not derive canonical/share URLs from the incoming host, query or fragment.
export function publicPageMetadata({title, description, path, image = homeImage}: {
  title: string; description: string; path: string; image?: ShareImage | null
}): Metadata {
  const fullTitle = path === '/' ? title : `${title} | ${siteName}`
  const images = image ? [{...image, url: new URL(image.url, siteUrl).href}] : []
  return {
    title: {absolute: fullTitle},
    description,
    alternates: {canonical: new URL(path, siteUrl).href},
    openGraph: {type: 'website', siteName, title: fullTitle, description, url: new URL(path, siteUrl).href, images},
    twitter: {card: image ? 'summary_large_image' : 'summary', title: fullTitle, description, images},
  }
}

export function puppyMetadata(puppy: Puppy, slug: string): Metadata {
  const name = puppy.name?.trim() || 'Puppy'
  const litter = puppy.litterTitle?.trim()
  const born = formatDate(puppy.birthDate)
  const title = `${name} - Shih Tzu${litter ? ` from ${litter}` : born ? ` born ${born}` : ''}`
  const sex = puppy.sex === 'female' || puppy.sex === 'male' ? `${puppy.sex} ` : ''
  const identity = `${name}, a ${sex}Shih Tzu${puppy.color?.trim() ? ` (${puppy.color.trim()})` : ''}${litter ? ` from ${litter}` : ''}`
  const status = formatPuppyStatus(puppy.status)
  const history = normalizeLitterStatus(puppy.litterStatus) === 'past' ? 'Past litter profile. Recorded status' : 'Status'
  const description = `Meet ${identity}. ${born ? `Born ${born}. ` : ''}${history}: ${status}. See photos and details at ${siteName}.`
  const portrait = getPuppyProfilePortrait(puppy)
  const photo = portrait || puppy.photoUrl
  return publicPageMetadata({
    title, description, path: puppyPath(slug),
    image: photo ? {url: photo, alt: `${name}${litter ? ` from ${litter}` : ''} - ${siteName}`, ...(portrait ? {width: 1254, height: 1254} : {})} : null,
  })
}

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${siteUrl}/#organization`,
  name: siteName,
  url: `${siteUrl}/`,
  logo: `${siteUrl}/brand/fluffytail-logo-color.svg`,
}

export function puppyBreadcrumbs(puppy: Puppy, slug: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {name: 'Home', item: `${siteUrl}/`},
      {name: 'Our puppies', item: `${siteUrl}/available-puppies`},
      {name: puppy.name || 'Puppy details', item: `${siteUrl}${puppyPath(slug)}`},
    ].map((item, index) => ({'@type': 'ListItem', position: index + 1, ...item})),
  }
}

// CMS text must remain data even when it contains a closing script tag.
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
