import 'server-only'
import {cache} from 'react'
import {createHash} from 'node:crypto'
import {getInventory} from './inventory'
import {reviewPlaces,reviewScenario} from './public-review'
import {deriveAvailability,type Place} from '@/lib/public-availability'
import {publishedPlaces} from './public-places'
import {publicReviewEnabled,type ReviewScenario} from '@/lib/public-review'

// Reuse the existing minimal public projection. No private records or payment
// credentials are needed by the content-review Preview, and this never writes.
export const getBrowsingContext=cache(async(requested?:ReviewScenario)=>{
 let inventory:Awaited<ReturnType<typeof getInventory>>|null=null
 try{inventory=await getInventory(requested)}catch{}
 const boards:Record<string,Place[]|null>={};const scenario=await reviewScenario(requested)
 if(inventory)await Promise.all(inventory.litters.filter(l=>['planned','upcoming'].includes(l.status||'')).map(async l=>{try{boards[l._id]=scenario==='live'?await publishedPlaces(l._id):reviewPlaces(scenario)}catch{boards[l._id]=null}}))
 const version=createHash('sha256').update(JSON.stringify({inventory,boards})).digest('hex')
 return {litters:inventory?.litters||[],puppies:inventory?.puppies||[],boards,inventoryFailed:inventory===null,availability:{...deriveAvailability(inventory,boards),version,...(publicReviewEnabled()?{reviewScenario:scenario}:{})}}
})
