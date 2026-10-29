import 'server-only'
import {cache} from 'react'
import {getInventory} from './inventory'
import {reviewPlaces,reviewScenario} from './public-review'
import {deriveAvailability,type Place} from '@/lib/public-availability'
import {publishedPlaces} from './public-places'

// Reuse the existing minimal public projection. No private records or payment
// credentials are needed by the content-review Preview, and this never writes.
export const getBrowsingContext=cache(async()=>{
 let inventory:Awaited<ReturnType<typeof getInventory>>|null=null
 try{inventory=await getInventory()}catch{}
 const boards:Record<string,Place[]|null>={};const scenario=await reviewScenario()
 if(inventory)await Promise.all(inventory.litters.filter(l=>['planned','upcoming'].includes(l.status||'')).map(async l=>{try{boards[l._id]=scenario==='live'?await publishedPlaces(l._id):reviewPlaces(scenario)}catch{boards[l._id]=null}}))
 return {litters:inventory?.litters||[],puppies:inventory?.puppies||[],boards,inventoryFailed:inventory===null,availability:deriveAvailability(inventory,boards)}
})
