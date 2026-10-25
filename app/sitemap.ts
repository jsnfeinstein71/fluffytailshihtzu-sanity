import type { MetadataRoute } from 'next'
import { client } from '@/sanity/lib/client'
import {puppySitemapQuery} from '@/sanity/lib/inventory-queries'

export const revalidate = 60

type PuppySlug = {
  slug: string
  _updatedAt?: string
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://www.fluffytailshihtzu.com'
  const puppies = await client.fetch<PuppySlug[]>(puppySitemapQuery, {}, {perspective: 'published', next: {revalidate: 60}})

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${base}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/the-breed`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/puppy-resources`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/available-puppies`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${base}/upcoming-litters`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${base}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/puppy-inquiry`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${base}/terms-and-conditions`,
      lastModified: new Date(),
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

