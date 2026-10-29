import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {renderToStaticMarkup} from 'react-dom/server'
import React from 'react'
import {readFileSync} from 'node:fs'
import {parse,evaluate} from 'groq-js'
const {editorialIds,editorialDrafts,editorialSettings,editorialPuppy,editorialLitter}=await import('../sanity/lib/editorial-review.ts')
const {renderPaymentEmail}=await import('../lib/mail/payment-email.ts')
const Customer=(await import('../app/pay/CustomerTestPayment.tsx')).default
const manuscript=readFileSync(new URL('../docs/source/FluffyTail-Website-Copy.md',import.meta.url),'utf8')

test('review mirror affects only the authorized draft fields, never prices, status, photographs, associations or Production',()=>{
 const saved={...process.env}
 try{
  Object.assign(process.env,{VERCEL_ENV:'preview',NEXT_PUBLIC_SANITY_PROJECT_ID:'3glz6dkx',NEXT_PUBLIC_SANITY_DATASET:'production',FLUFFYTAIL_COPY_REVIEW_CONTENT:JSON.stringify([{_id:'drafts.'+editorialIds.settings,_rev:'s',homepageHeadline:'Reviewed headline',homepageIntro:'Reviewed body',serviceArea:'',heroImage:'must not override'},{_id:'drafts.'+editorialIds.puppy,_rev:'p',name:'Girl 1',status:'available',overridePrice:0},{_id:'drafts.'+editorialIds.litter,_rev:'l',summary:'Reviewed archive',price:0}])})
  const published={_id:editorialIds.puppy,name:'Girl.1',status:'reserved',overridePrice:1500,photoUrl:'approved.png',litterId:'original'}
  assert.deepEqual(editorialPuppy(published),{...published,name:'Girl 1'});assert.equal(published.name,'Girl.1')
  assert.deepEqual(editorialLitter({_id:editorialIds.litter,summary:'Old summary',price:1500,deposit:300,status:'past'}),{_id:editorialIds.litter,summary:'Reviewed archive',price:1500,deposit:300,status:'past'})
  assert.deepEqual(editorialSettings({homepageHeadline:'Published headline',heroImage:'original'}),{homepageHeadline:'Reviewed headline',homepageIntro:'Reviewed body',serviceArea:'',heroImage:'original'})
  assert.equal(editorialPuppy({_id:'another',name:'Other'}).name,'Other')
  process.env.VERCEL_ENV='production';assert.deepEqual(editorialDrafts(),[]);assert.deepEqual(editorialPuppy(published),published);assert.equal(editorialSettings({homepageHeadline:'Future CMS edit'}).homepageHeadline,'Future CMS edit')
  process.env.VERCEL_ENV='preview';process.env.NEXT_PUBLIC_SANITY_PROJECT_ID='gu1xkpsg';assert.deepEqual(editorialDrafts(),[])
 }finally{for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved)}
})

test('Jeanne is the sole personal voice while established facts and her approved portrait remain',async()=>{
 const About=(await import('../app/about/page.tsx')).default,html=renderToStaticMarkup(About())
 for(const text of ['Hi, I am Jeanne.','Before a FluffyTail puppy becomes part of your family, I would like you to know a little about me.','I share my home in the Mobile, Alabama area with my Shih Tzus.','I begin socialization and potty-training work while the puppies are with me.','Jeanne · FluffyTail Shih Tzu'])assert.ok(html.includes(text))
 for(const text of ['written vaccination and deworming records, CKC registration papers','food, treats, toys, and a blanket carrying the scent of mom and littermates']){assert.ok(manuscript.includes(text));assert.ok(html.includes(text))}
 assert.doesNotMatch(html,/Jason|I[’']m|We begin|puppies we raise/)
 const {homepageIntro}=await import('../lib/public-copy.ts')
 assert.match(homepageIntro,/^I am Jeanne\b/);assert.doesNotMatch(homepageIntro,/Jason|\bWe’re\b/)
 assert.match(html,/jeanne-portrait.webp/);assert.match(html,/width="960" height="1200"/);assert.doesNotMatch(html,/Jeanne at home|years of experience|kennel|litter photograph/)
})

test('pricing example is derived from the same validated quote and disappears for ambiguous ranges',async()=>{
 let docs=[{_id:'l',_type:'litter',status:'current',price:1500,deposit:300}]
 globalThis.fixtureSanityFetch=async(q,params)=>(await evaluate(parse(q),{dataset:docs,params})).get()
 const Pricing=(await import('../app/pricing/page.tsx')).default
 assert.match(renderToStaticMarkup(await Pricing()),/\$1,500.00<!-- --> total − <!-- -->\$300.00<!-- --> deposit = <!-- -->\$1,200.00|\$1,500.00 total − \$300.00 deposit = \$1,200.00/)
 docs.push({_id:'other',_type:'litter',status:'planned',price:1800,deposit:500});assert.doesNotMatch(renderToStaticMarkup(await Pricing()),/class="pricing-example"/)
})

test('new payment copy follows verified payment/reservation states while prior email versions remain reproducible',()=>{
 const base={version:3,kind:'deposit-confirmation',name:'Family',message:'A saved personal note.',puppyName:'Puppy',amountCents:30000,totalCents:150000,paidCents:30000,depositCents:30000,url:'https://www.fluffytailshihtzu.com/pay/'+'a'.repeat(48),testOnly:false}
 assert.match(renderPaymentEmail({...base,reserved:true}).text,/Your puppy is reserved\./);assert.doesNotMatch(renderPaymentEmail({...base,reserved:false}).text,/puppy is reserved/)
 const prior=renderPaymentEmail({...base,version:2});assert.match(prior.text,/Jeanne will coordinate the remaining balance and pickup/);assert.ok(!prior.text.includes('Thank you —'))
 const request=renderPaymentEmail({...base,kind:'deposit-request',paidCents:0});assert.match(request.html,/A payment request from Jeanne/);assert.match(request.text,/\$300.00 deposit is non-refundable and counts toward the \$1500.00 puppy price/);assert.match(request.text,/Jeanne will confirm the reservation after the deposit is verified/)
 const initial={testOnly:false,puppyName:'Puppy',kind:'deposit',amountCents:30000,totalCents:150000,depositCents:30000,paidCents:30000,remainingCents:120000,reserved:false,state:'confirmed',checkoutUrl:null,confirmation:'submitted'}
 const html=renderToStaticMarkup(React.createElement(Customer,{token:'a'.repeat(48),initial,error:'',canceled:false,testOnly:false}));assert.doesNotMatch(html,/Your puppy is reserved|Continue to secure checkout|delivered/);assert.match(html,/confirmation email has been sent to the mail provider/)
 const pending=renderToStaticMarkup(React.createElement(Customer,{token:'a'.repeat(48),initial:{...initial,state:'pending'},error:'',canceled:false,testOnly:false}));assert.match(pending,/Please don’t pay again/);assert.doesNotMatch(pending,/deposit for Puppy is confirmed|Your puppy is reserved|Continue to secure checkout/)
})
