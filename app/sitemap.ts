import type { MetadataRoute } from 'next'
import { client } from '@/sanity/lib/client'
import {puppySitemapQuery} from '@/sanity/lib/inventory-queries'

export const revalidate = 3600

type PuppySlug = {
  slug: string
  _updatedAt?: string
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://www.fluffytailshihtzu.com'
  const puppies = await client.fetch<PuppySlug[]>(puppySitemapQuery, {}, {perspective: 'published', next: {revalidate: 3600}})

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${base}/about`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/the-breed`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/puppy-resources`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/pricing`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/available-puppies`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${base}/upcoming-litters`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${base}/our-families`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${base}/contact`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/puppy-inquiry`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/privacy-policy`,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${base}/terms-and-conditions`,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ]

  const puppyPages: MetadataRoute.Sitemap = puppies.map((puppy) => ({
    url: `${base}/puppies/${encodeURIComponent(puppy.slug)}`,
    lastModified: puppy._updatedAt ? new Date(puppy._updatedAt) : undefined,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [...staticPages, ...puppyPages]
}

