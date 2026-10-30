import {editorialPuppy,editorialLitter} from './editorial-review'
import {litterReservationMode} from '@/lib/litter-reservations'
import {cache} from 'react'
import {client} from './client'
import type {Litter, Puppy} from '@/lib/inventory'
import {littersQuery, puppiesQuery, puppyQuery} from './inventory-queries'
import {reviewInventory,reviewScenario} from './public-review'
import {publicReviewEnabled,type ReviewScenario} from '@/lib/public-review'

const publicOptions = () => publicReviewEnabled()?{perspective:'published' as const,cache:'no-store' as const}:{perspective: 'published' as const, next: {revalidate: 60}}

export const getInventory = cache(async (requested?:ReviewScenario) => {
  const fixture=reviewInventory(await reviewScenario(requested))
  if(fixture)return fixture
  const [litters, puppies] = await Promise.all([
    client.fetch<Litter[]>(littersQuery, {}, publicOptions()),
    client.fetch<Puppy[]>(puppiesQuery, {}, publicOptions()),
  ])
  if(litterReservationMode()==='test'){
    const testIds=await client.fetch<string[]>('*[_type=="litter" && litterReservationTest==true && !(_id in path("drafts.**"))]._id',{},{cache:'no-store'})
    return {litters:litters.filter(l=>testIds.includes(l._id)).map(editorialLitter),puppies:puppies.filter(p=>testIds.includes(p.litterId||'')).map(editorialPuppy)}
  }
  return {litters:litters.map(editorialLitter), puppies:puppies.map(editorialPuppy)}
})

export const getPuppy = cache(async (slug: string) => {
  const fixture=reviewInventory(await reviewScenario())
  if(fixture)return fixture.puppies.find(p=>p.slug===slug)||null
  const puppy=await client.fetch<Puppy | null>(puppyQuery, {slug}, publicOptions())
  return puppy?editorialPuppy(puppy):null
})
