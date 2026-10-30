import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {parse,evaluate} from 'groq-js'
const {deriveAvailability,availabilityCopy,validPlaces,validAvailability}=await import('../lib/public-availability.ts')
const {reviewInventory,reviewPlaces}=await import('../sanity/lib/public-review.ts')
const {getBrowsingContext}=await import('../sanity/lib/public-availability.ts')
const {GET}=await import('../app/api/availability/route.ts')
const {GET:reviewGET}=await import('../app/review/availability/route.ts')
const Places=(await import('../app/upcoming-litters/LitterPlaces.tsx')).default

test('all isolated availability scenarios use predefined truthful copy, including singular/plural and holds',()=>{
 for(const s of ['available','upcoming','full','unannounced']){const inventory=reviewInventory(s),a=deriveAvailability(inventory,{'review-upcoming':reviewPlaces(s)});assert.equal(a.kind,s);const copy=availabilityCopy(a);assert(copy.title&&copy.label);if(s==='upcoming'){assert.match(copy.body,/Every puppy in my current litter has a family waiting/);assert.match(copy.body,/my upcoming litter,/)}if(s==='full')assert.doesNotMatch(copy.body,/available position|reserve your place/i)}
 const inventory=reviewInventory('upcoming');inventory.litters.push({...inventory.litters[0],_id:'another-current'},{...inventory.litters[1],_id:'another-upcoming'});inventory.puppies.push({...inventory.puppies[0],_id:'another-puppy',litterId:'another-current'});assert.match(availabilityCopy(deriveAvailability(inventory,{'review-upcoming':reviewPlaces('upcoming'),'another-upcoming':reviewPlaces('upcoming')})).body,/my current litters/)
 inventory.puppies[0].status='hold';assert.equal(deriveAvailability(inventory,{}).allCurrentReserved,false)
 assert.match(availabilityCopy(deriveAvailability(reviewInventory('full'),{'review-upcoming':reviewPlaces('full')})).body,/my upcoming litter are/)
})
test('failed and incomplete data never becomes all reserved or occupied positions',()=>{
 const inventory=reviewInventory('upcoming');for(const boards of [{},{'review-upcoming':[]},{'review-upcoming':[{position:1,status:'Reserved'}]}]){assert.equal(deriveAvailability(inventory,boards).kind,'unknown')}
 assert.equal(deriveAvailability(null,{}).kind,'unknown');assert(!validPlaces([1,1,3,4].map(position=>({position,status:'Available'}))));assert(!validAvailability({kind:'full'}))
 assert.doesNotMatch(availabilityCopy(deriveAvailability(null,{})).body,/all reserved|no puppies|no upcoming/i)
})
test('actual availability handler refreshes from changed isolated status and board data without writes',async()=>{
 let inventory=reviewInventory('available'),places=reviewPlaces('available')
 globalThis.fixtureSanityFetch=async(q,params)=>{const dataset=[...inventory.litters.map(l=>({...l,_type:'litter'})),...inventory.puppies.map(p=>({...p,_type:'puppy',litter:{_ref:p.litterId}}))];return (await evaluate(parse(q),{dataset,params})).get()}
 globalThis.fixturePublicPlaces=async()=>places
 const first=(await (await GET()).json()).availability;assert.equal(first.kind,'available')
 inventory.puppies[0].status='available';inventory.puppies[1].status='reserved';const swapped=(await (await GET()).json()).availability;assert.equal(swapped.availablePuppies,1);assert.notEqual(swapped.version,first.version)
 inventory.puppies.forEach(p=>p.status='reserved');assert.equal((await (await GET()).json()).availability.kind,'upcoming')
 places=reviewPlaces('full');assert.equal((await (await GET()).json()).availability.kind,'full')
 globalThis.fixturePublicPlaces=async()=>{throw Error('Disconnected')};assert.equal((await (await GET()).json()).availability.kind,'unknown')
 globalThis.fixtureSanityFetch=async()=>{throw Error('Disconnected')};assert.equal((await getBrowsingContext()).availability.kind,'unknown');delete globalThis.fixturePublicPlaces
})
test('scenario controls cannot be activated in Production and preserve isolated fixture inquiry context',async()=>{
 const saved={...process.env};try{Object.assign(process.env,{VERCEL_ENV:'production',FLUFFYTAIL_PUBLIC_REVIEW:'1'});assert.equal((await reviewGET(new Request('https://example.test/review/availability?scenario=full'))).status,404);Object.assign(process.env,{VERCEL_ENV:'preview'});const r=await reviewGET(new Request('https://example.test/review/availability?scenario=full'));assert.equal(r.status,307);assert.match(r.headers.get('set-cookie'),/fluffytail-public-review=full/);assert.equal((await reviewGET(new Request('https://example.test/review/availability?scenario=invalid'))).status,400)}finally{for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved)}
 const full=renderToStaticMarkup(React.createElement(Places,{litterId:'review-upcoming',title:'Review litter',depositCents:40000,initialPlaces:reviewPlaces('full')}));assert.match(full,/Ask about the waiting list/);assert.doesNotMatch(full,/Reserve your place/);assert.match(full,/litterId=review-upcoming/)
 const unknown=renderToStaticMarkup(React.createElement(Places,{litterId:'review-upcoming',title:'Review litter',depositCents:40000}));assert.doesNotMatch(unknown,/Reserve your place/);assert.match(unknown,/confirm availability/)
})
test('review inquiries preserve litter context without inviting unavailable positions or permitting submission',async()=>{
 const Form=(await import('../app/components/InquiryForm.tsx')).default
 const html=renderToStaticMarkup(React.createElement(Form,{reviewOnly:true,litterId:'review-upcoming',litterTitle:'Review litter',interest:'waitlist'}))
 assert.match(html,/Submissions disabled in review/);assert.match(html,/No message will be sent or saved/);assert.match(html,/talk about Review litter and future plans/);assert.doesNotMatch(html,/ask about reserving a selection/);assert.match(html,/disabled=""/)
})
