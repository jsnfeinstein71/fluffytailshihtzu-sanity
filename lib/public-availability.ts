import {canInquireAboutPuppy,getLittersByStatus,type Litter,type Puppy} from './inventory'

export type Place={position:number;status:'Available'|'Pending deposit'|'Reserved'}
export type Availability={kind:'available'|'upcoming'|'full'|'unannounced'|'unknown';availablePuppies:number;currentLitters:number;upcomingLitters:number;allCurrentReserved:boolean;availableLitterIds:string[];version?:string}
export const unknownAvailability:Availability={kind:'unknown',availablePuppies:0,currentLitters:0,upcomingLitters:0,allCurrentReserved:false,availableLitterIds:[]}
export function validAvailability(value:unknown):value is Availability{if(!value||typeof value!=='object')return false;const a=value as Availability;return ['available','upcoming','full','unannounced','unknown'].includes(a.kind)&&[a.availablePuppies,a.currentLitters,a.upcomingLitters].every(n=>Number.isSafeInteger(n)&&n>=0)&&typeof a.allCurrentReserved==='boolean'&&Array.isArray(a.availableLitterIds)&&a.availableLitterIds.every(id=>typeof id==='string')}
export function validPlaces(value:unknown):value is Place[]{return Array.isArray(value)&&value.length===4&&[1,2,3,4].every(n=>value.filter(p=>p?.position===n&&['Available','Pending deposit','Reserved'].includes(p.status)).length===1)}
export function deriveAvailability(inventory:{litters:Litter[];puppies:Puppy[]}|null,boards:Record<string,Place[]|null>):Availability{
 if(!inventory)return {...unknownAvailability}
 const current=getLittersByStatus(inventory.litters,'current'),upcoming=getLittersByStatus(inventory.litters,'planned'),puppies=inventory.puppies.filter(p=>current.some(l=>l._id===p.litterId))
 const availablePuppies=puppies.filter(canInquireAboutPuppy).length,availableLitterIds=upcoming.filter(l=>validPlaces(boards[l._id])&&boards[l._id]!.some(p=>p.status==='Available')).map(l=>l._id)
 const base={availablePuppies,currentLitters:current.length,upcomingLitters:upcoming.length,allCurrentReserved:puppies.length>0&&puppies.every(p=>p.status==='reserved'),availableLitterIds}
 if(availablePuppies)return {...base,kind:'available'}
 if(current.some(l=>!puppies.some(p=>p.litterId===l._id))||puppies.some(p=>!['hold','reserved','sold','gone-home','holdback'].includes(p.status||'')))return {...base,kind:'unknown'}
 if(availableLitterIds.length)return {...base,kind:'upcoming'}
 if(upcoming.some(l=>!validPlaces(boards[l._id])))return {...base,kind:'unknown'}
 return {...base,kind:upcoming.length?'full':'unannounced'}
}

// Editable, predefined presentation. No runtime text generation or inventory changes.
export function availabilityCopy(a:Availability){
 const current=a.currentLitters===1?'my current litter':'my current litters',upcoming=a.upcomingLitters===1?'my upcoming litter':'my upcoming litters'
 if(a.kind==='available')return {title:'Meet the little ones',body:`${a.availablePuppies===1?'A puppy is':'Puppies are'} available to meet. Take a look at the photos and details, and tell me about the home you have in mind.`,brief:`${a.availablePuppies===1?'One puppy is':`${a.availablePuppies} puppies are`} currently available. Ask me about the little one who catches your eye.`,label:'Meet our puppies',href:'/available-puppies'}
 if(a.kind==='upcoming')return {title:'Looking forward to little paws',body:`${a.allCurrentReserved?`Every puppy in ${current} has a family waiting. `:''}If you are hoping for a FluffyTail puppy, I would love to hear what you have in mind. Take a look at ${upcoming}, and we can talk about finding the right fit for you.`,brief:a.allCurrentReserved?'These puppies have families waiting. You can explore upcoming litters and talk with me about the next little paws.':'Take a look at the upcoming litters and talk with me about what you have in mind.',label:'Explore upcoming litters',href:'/upcoming-litters'}
 if(a.kind==='full')return {title:'Let’s talk about a future puppy',body:'The selection positions in my announced upcoming litters are currently occupied. I would love to hear about your timing and what you hope to find in a future litter. An inquiry starts a conversation; it does not hold a position.',brief:'The announced upcoming selection positions are occupied. Ask me about future plans and timing.',label:'Ask about a future litter',href:'/puppy-inquiry?interest=waitlist'}
 if(a.kind==='unannounced')return {title:'Let’s talk about your timing',body:'I do not have an upcoming litter announced here just yet. Tell me what you have in mind, and we can talk about plans and timing.',brief:'No upcoming litter is announced here just yet. Ask me about plans and timing.',label:'Ask about future plans',href:'/puppy-inquiry?interest=waitlist'}
 return {title:'Let’s confirm what’s current',body:'I cannot confirm the latest availability here right now. Please ask me about puppies, upcoming litters and selection positions before making plans.',brief:'Availability could not be confirmed. Please ask me for the current details.',label:'Ask Jeanne',href:'/contact'}
}
