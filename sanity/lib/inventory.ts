import {cache} from 'react'
import {client} from './client'
import type {Litter, Puppy} from '@/lib/inventory'
import {littersQuery, puppiesQuery, puppyQuery} from './inventory-queries'

const publicOptions = {perspective: 'published' as const, next: {revalidate: 60}}

export const getInventory = cache(async () => {
  const [litters, puppies] = await Promise.all([
    client.fetch<Litter[]>(littersQuery, {}, publicOptions),
    client.fetch<Puppy[]>(puppiesQuery, {}, publicOptions),
  ])
  return {litters, puppies}
})

export const getPuppy = cache(async (slug: string) =>
  client.fetch<Puppy | null>(puppyQuery, {slug}, publicOptions)
)
