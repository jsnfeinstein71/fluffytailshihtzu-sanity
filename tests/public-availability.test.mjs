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
const {GET:reviewGET,POST:reviewPOST}=await import('../app/review/availability/route.ts')
const {GET:placesGET}=await import('../app/api/litter-places/route.ts')
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
test('immediate scenario application is Preview-only, same-origin and returns confirmation without redirect',async()=>{
 const saved={...process.env};try{
  process.env.FLUFFYTAIL_PUBLIC_REVIEW='1';process.env.VERCEL_ENV='production'
  const request=(scenario,origin='https://preview.example')=>new Request('https://preview.example/review/availability',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({scenario})})
  assert.equal((await reviewPOST(request('full'))).status,404);process.env.VERCEL_ENV='preview'
  assert.equal((await reviewPOST(request('full','https://other.example'))).status,403)
  assert.equal((await reviewPOST(request('invalid'))).status,400)
  for(const scenario of ['available','upcoming','full','unannounced','unknown','live']){const r=await reviewPOST(request(scenario));assert.equal(r.status,200);assert.equal(r.headers.get('location'),null);assert.equal((await r.json()).scenario,scenario);assert.match(r.headers.get('set-cookie'),new RegExp('fluffytail-public-review='+scenario));assert.equal(r.headers.get('cache-control'),'no-store')}
 }finally{for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved)}
})
test('automatic reads stay pinned to the selected fictional scenario even when the cookie changes',async()=>{
 const saved={...process.env};try{
  Object.assign(process.env,{VERCEL_ENV:'preview',FLUFFYTAIL_PUBLIC_REVIEW:'1'});globalThis.fixtureReviewCookie='live'
  const full=(await (await GET(new Request('https://preview.example/api/availability?reviewScenario=full'))).json()).availability
  assert.equal(full.kind,'full');assert.equal(full.reviewScenario,'full')
  const positions=await (await placesGET(new Request('https://preview.example/api/litter-places?litter=review-upcoming&reviewScenario=full'))).json();assert.deepEqual(positions.places.map(p=>p.status),['Reserved','Reserved','Reserved','Pending deposit'])
  globalThis.fixtureReviewCookie='available';assert.equal((await (await GET(new Request('https://preview.example/api/availability?reviewScenario=full'))).json()).availability.kind,'full')
  const unknown=(await (await GET(new Request('https://preview.example/api/availability?reviewScenario=unknown'))).json()).availability;assert.equal(unknown.kind,'unknown');assert.equal(unknown.reviewScenario,'unknown')
  assert.equal((await GET(new Request('https://preview.example/api/availability?reviewScenario=invalid'))).status,400)
  process.env.VERCEL_ENV='production';const r=(await (await GET(new Request('https://preview.example/api/availability?reviewScenario=full'))).json()).availability;assert.equal(r.reviewScenario,undefined)
 }finally{delete globalThis.fixtureReviewCookie;for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved)}
})
