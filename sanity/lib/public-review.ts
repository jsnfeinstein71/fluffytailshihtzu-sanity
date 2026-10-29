import 'server-only'
import {cookies} from 'next/headers'
import {publicReviewEnabled,reviewCookie,reviewScenarios,type ReviewScenario} from '@/lib/public-review'
import type {Litter,Puppy} from '@/lib/inventory'
import type {Place} from '@/lib/public-availability'
export async function reviewScenario():Promise<ReviewScenario>{if(!publicReviewEnabled())return 'live';const value=(await cookies()).get(reviewCookie)?.value;return reviewScenarios.find(s=>s===value)||'live'}
export function reviewInventory(s:ReviewScenario):{litters:Litter[];puppies:Puppy[]}|null{
 if(s==='live')return null
 if(s==='unknown')throw Error('Isolated availability failure fixture')
 const current:Litter={_id:'review-current',title:'Review current litter',status:'current',birthDate:'2026-10-17',price:1600,deposit:400},upcoming:Litter={_id:'review-upcoming',title:'Review upcoming litter',status:'planned',expectedBirthDate:'2026-12-15',price:1600,deposit:400}
 return {litters:s==='unannounced'?[]:[current,upcoming],puppies:s==='unannounced'?[]:[1,2,3].map((n):Puppy=>({_id:'review-puppy-'+n,name:'Review puppy '+n,slug:'review-puppy-'+n,status:s==='available'&&n===2?'available':'reserved',litterId:current._id,litterTitle:current.title,litterStatus:'current',birthDate:current.birthDate,litterPrice:1600,litterDeposit:400,sex:'female'}))}
}
export function reviewPlaces(s:ReviewScenario):Place[]|null{return s==='live'||s==='unknown'?null:[1,2,3,4].map(position=>({position,status:s==='full'?(position===4?'Pending deposit':'Reserved'):'Available'}))}
