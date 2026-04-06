import type { MetadataRoute } from 'next'
import { client } from '@/sanity/lib/client'

type PuppySlug = {
  slug?: string
}

const puppiesQuery = `*[_type == "puppy" && defined(slug.current)]{
  "slug": slug.current
}`

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://www.fluffytailshihtzu.com'
  const puppies = await client.fetch<PuppySlug[]>(puppiesQuery)

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
  ]

  const puppyPages: MetadataRoute.Sitemap = puppies.map((puppy) => ({
    url: `${base}/puppies/${puppy.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [...staticPages, ...puppyPages]
}

