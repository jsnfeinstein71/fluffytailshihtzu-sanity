import './register-typescript.mjs'
import {test,beforeEach} from 'node:test'
import assert from 'node:assert/strict'
import {workspaceStoreFixture} from './workspace-store-fixture.mjs'
const state=await import('../app/inbox/workspace/api/state/route.ts')
const email=await import('../app/inbox/workspace/api/email/route.ts')
const sms=await import('../app/inbox/workspace/api/sms/route.ts')
const access=await import('../app/inbox/access/api/route.ts')
const {familyMailCursorId}=await import('../sanity/lib/email-workflow.ts')
const {requireOperator}=await import('../lib/operator-auth.ts')
const origin='https://www.fluffytailshihtzu.com',auth='Basic '+Buffer.from('staff:offline-password').toString('base64')
let store,mailCalls,smsCalls,scope,sessions
const request=(path,body,extra={})=>new Request(origin+path,{method:body?'POST':'GET',headers:{authorization:auth,origin,'content-type':'application/json',...extra},body:body?JSON.stringify(body):undefined})
const send=body=>email.POST(request('/inbox/workspace/api/email',body))
async function json(response){assert.equal(response.status,200,await response.clone().text());return response.json()}
const legacy={_id:'legacy-inquiry',_type:'puppyInquiry',source:'fluffytail',submittedAt:'2026-10-26T20:00:00Z',name:'Offline Family',email:'offline-family@example.org',phone:'+12025550123',preferredContactMethod:'Either',smsConsent:true,message:'An existing inquiry',puppyId:'live-puppy'}
beforeEach(()=>{
 Object.assign(process.env,{VERCEL_ENV:'production',NEXT_PUBLIC_SANITY_PROJECT_ID:'3glz6dkx',NEXT_PUBLIC_SANITY_DATASET:'production',FLUFFYTAIL_STAFF_WORKSPACE_ENABLED:'1',FLUFFYTAIL_MAIL_MODE:'pair',FLUFFYTAIL_PAIR_SEND_ENABLED:'1',FLUFFYTAIL_PAIR_READ_ENABLED:'1',FLUFFYTAIL_PAIR_MAIL_PASSWORD:'offline-only',FLUFFYTAIL_WRITE_FREEZE:'0',INBOX_BASIC_AUTH_USER:'staff',INBOX_BASIC_AUTH_PASS:'offline-password',TWILIO_FROM_NUMBER:'+12025550100',STRIPE_SECRET_KEY:'sk_live_offline_fixture'})
 store=workspaceStoreFixture([legacy,{_id:'live-litter',_type:'litter',title:'Existing litter',status:'current',price:1600,deposit:400},{_id:'live-puppy',_rev:'p1',_type:'puppy',name:'Puppy',status:'available',slug:{current:'puppy'},litter:{_ref:'live-litter'}}]);globalThis.fixtureOperatorClient=store;mailCalls=0;smsCalls=0;scope=[];sessions=new Map()
 globalThis.fixtureMailProvider={capabilities:{provider:'pair',canDispatch:true,canSync:true},send:async message=>{mailCalls++;assert.equal(message.to,legacy.email);return {outcome:'accepted',code:'OFFLINE_ACCEPTED'}},sync:async input=>{scope.push(input);return {validity:'mailbox',lastUid:10,messages:[]}}}
 globalThis.fixtureTwilio={messages:{create:async()=>{smsCalls++;return {sid:'SM'+'a'.repeat(32),status:'queued'}}}}
 globalThis.fixtureStripe={checkout:{sessions:{create:async data=>{const s={id:'cs_live_offline',url:'https://checkout.stripe.com/c/pay/cs_live_offline',livemode:true,currency:'usd',amount_total:data.line_items[0].price_data.unit_amount,metadata:data.metadata,payment_status:'unpaid'};sessions.set(s.id,s);return s},retrieve:async id=>structuredClone(sessions.get(id))}}}
})
async function load(){return json(await state.GET(request('/inbox/workspace/api/state')))}
async function prepare(){const family=(await load()).families[0];const saved=await json(await send({type:'save',familyId:family.familyKey,revision:null,value:{subject:'Your puppy inquiry',body:'This message is exercised only against an offline provider.',replyToId:null,paymentRequestId:null}}));const draft=saved.drafts[0];const reviewed=await json(await send({type:'review',familyId:family.familyKey,revision:draft.revision,requestId:'00000000-0000-4000-8000-000000000601'}));return {family,review:reviewed.reviews[0]}}
test('live workspace projects existing real-shaped inquiries privately, never seeds examples, and folds exact repeat identities without overwriting drafts',async()=>{
 let data=await load();assert.equal(data.families.length,1);assert.equal(data.families[0].workspace,'live-v1');assert.equal(data.families[0].profile.email,legacy.email)
 await json(await state.POST(request('/inbox/workspace/api/state',{type:'draft',familyId:data.families[0].familyKey,channel:'Text',body:'Keep this draft',base:''})))
 store.documents.set('another-inquiry',{...legacy,_id:'another-inquiry',message:'A follow-up inquiry',submittedAt:'2026-10-26T21:00:00Z'});data=await load();assert.equal(data.families.length,1);assert.equal(data.families[0].profile.messages.length,2);assert.equal(data.families[0].drafts.Text,'Keep this draft');assert.equal(store.documents.get(legacy._id).message,legacy.message)
})
test('live email requires explicit confirmation, persists acceptance once, initializes a future-only family cursor and never changes payments',async()=>{
 const {family,review}=await prepare();assert.equal((await send({type:'dispatch',reviewId:review._id})).status,400);assert.equal(mailCalls,0)
 await json(await send({type:'dispatch',reviewId:review._id,confirmed:true}));await json(await send({type:'dispatch',reviewId:review._id,confirmed:true}));assert.equal(mailCalls,1);assert.equal(scope.length,1);assert.equal(scope[0].cursor.validity,'');assert.deepEqual(scope[0].threads,[]);assert.equal(store.documents.get(familyMailCursorId(family.familyKey)).validity,'mailbox');assert.equal(store.documents.get('live-puppy').status,'available')
 assert.equal((await send({type:'sync'})).status,400);await json(await send({type:'sync',familyId:family.familyKey}));assert.equal(scope.at(-1).threads.length,1)
})
test('live SMS checks saved draft, latest consent and STOP, claims before provider, deduplicates repeated clicks and retains draft',async()=>{
 const family=(await load()).families[0];await json(await state.POST(request('/inbox/workspace/api/state',{type:'draft',familyId:family.familyKey,channel:'Text',body:'Saved offline text',base:''})))
 const body={familyId:family.familyKey,body:'Saved offline text',confirmed:true}
 assert.equal((await sms.POST(request('/inbox/workspace/api/sms',{...body,confirmed:false}))).status,400)
 await json(await sms.POST(request('/inbox/workspace/api/sms',body)));await json(await sms.POST(request('/inbox/workspace/api/sms',body)));assert.equal(smsCalls,1)
 store.documents.set('stop',{_id:'stop',_type:'smsMessage',from:legacy.phone,direction:'inbound',body:'STOP',signatureVerified:true,receivedAt:'2026-10-26T22:00:00Z'});assert.equal((await sms.POST(request('/inbox/workspace/api/sms',body))).status,403);assert.equal(smsCalls,1);assert.equal((await load()).families[0].drafts.Text,body.body)
})
test('live Stripe link uses a current quote; verification is independent of ledger/reservation and rejects test sessions',async()=>{
 const family=(await load()).families[0];const p=await json(await send({type:'payment',familyId:family.familyKey,puppyId:'live-puppy',kind:'deposit',requestId:'00000000-0000-4000-8000-000000000602'}));const id=p.preparedPaymentId
 await json(await send({type:'checkout',familyId:family.familyKey,paymentRequestId:id}));let result=await json(await send({type:'verify',familyId:family.familyKey,paymentRequestId:id}));assert.equal(result.paymentRequests[0].paymentVerification,'unpaid');sessions.get('cs_live_offline').payment_status='paid';result=await json(await send({type:'verify',familyId:family.familyKey,paymentRequestId:id}));assert.equal(result.paymentRequests[0].paymentVerification,'paid');assert.equal([...store.documents.values()].filter(d=>d._type==='paymentRecord').length,0);assert.equal(store.documents.get('live-puppy').status,'available');sessions.get('cs_live_offline').livemode=false;assert.equal((await send({type:'verify',familyId:family.familyKey,paymentRequestId:id})).status,409)
})
test('production staff password sign-in issues a host-bound staff session and rejects forged credentials/cross-origin writes',async()=>{
 assert.equal((await access.POST(request('/inbox/access/api',{username:'staff',password:'wrong'},{authorization:''}))).status,401)
 const response=await access.POST(request('/inbox/access/api',{username:'staff',password:'offline-password'},{authorization:''}));await json(response);const cookie=response.headers.get('set-cookie').split(';')[0];assert.equal(requireOperator(new Request(origin+'/inbox/workspace/api/state',{headers:{cookie}})),null);assert.equal(requireOperator(new Request(origin+'/inbox',{headers:{cookie}})),null);assert.equal(requireOperator(new Request('https://other.example/inbox/workspace',{headers:{cookie}})).status,401);assert.equal(requireOperator(new Request(origin+'/inbox/workspace/api/state',{method:'POST',headers:{cookie,origin:'https://evil.example'}})).status,403)
})
test('historical balances require a verified agreed price; modern balance uses that snapshot rather than a changed public price',async()=>{
 const family=(await load()).families[0];await json(await state.POST(request('/inbox/workspace/api/state',{type:'associate',familyId:family.familyKey,puppyId:'live-puppy'})))
 const paid={_id:'existing-paid',_type:'paymentRecord',paymentStatus:'paid',amountPaid:300,customerEmail:legacy.email,puppySlug:'puppy'};store.documents.set(paid._id,paid)
 const body={type:'payment',familyId:family.familyKey,puppyId:'live-puppy',kind:'balance',requestId:'00000000-0000-4000-8000-000000000603'}
 assert.equal((await send(body)).status,409);assert.equal((await load()).families[0].profile.historicalBalanceNeedsReview,true)
 Object.assign(paid,{quotedTotalCents:150000,quotedDepositCents:30000});const prepared=await json(await send(body));const saved=prepared.paymentRequests[0];assert.equal(saved.totalCents,150000);assert.equal(saved.amountCents,120000)
 await json(await send({type:'checkout',familyId:family.familyKey,paymentRequestId:saved._id}));assert.equal(sessions.get('cs_live_offline').amount_total,120000);assert.equal(sessions.get('cs_live_offline').metadata.totalPriceCents,'150000');assert.equal(paid.amountPaid,300)
})
test('uncertain SMS attempts survive a changed draft and cannot be bypassed with another text version',async()=>{
 const family=(await load()).families[0];await json(await state.POST(request('/inbox/workspace/api/state',{type:'draft',familyId:family.familyKey,channel:'Text',body:'First text',base:''})))
 globalThis.fixtureTwilio.messages.create=async()=>{smsCalls++;throw new Error('Acknowledgement lost')}
 assert.equal((await sms.POST(request('/inbox/workspace/api/sms',{familyId:family.familyKey,body:'First text',confirmed:true}))).status,409)
 await json(await state.POST(request('/inbox/workspace/api/state',{type:'draft',familyId:family.familyKey,channel:'Text',body:'Changed text',base:'First text'})))
 assert.equal((await sms.POST(request('/inbox/workspace/api/sms',{familyId:family.familyKey,body:'Changed text',confirmed:true}))).status,409);assert.equal(smsCalls,1)
})
