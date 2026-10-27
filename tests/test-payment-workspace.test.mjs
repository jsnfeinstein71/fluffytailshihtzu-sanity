import './register-typescript.mjs'
import {test,beforeEach} from 'node:test'
import assert from 'node:assert/strict'
import Stripe from 'stripe'
import {workspaceStoreFixture} from './workspace-store-fixture.mjs'
const email=await import('../app/inbox/workspace/api/email/route.ts'),state=await import('../app/inbox/workspace/api/state/route.ts'),webhook=await import('../app/api/stripe/test-webhook/route.ts'),access=await import('../app/inbox/access/api/route.ts')
const {workspaceId}=await import('../sanity/lib/workspace.ts')
const {requireOperator}=await import('../lib/operator-auth.ts')
const {readTestPaymentReceipt}=await import('../sanity/lib/test-payment-webhook.ts')
const origin='https://payments.example.test',familyId='inquiry-'+'b'.repeat(64),auth='Basic '+Buffer.from('staff:test-password').toString('base64'),secret='whsec_offline_test_only'
let store,sessions,calls
const request=(path,body)=>new Request(origin+path,{method:body?'POST':'GET',headers:{authorization:auth,origin,'content-type':'application/json'},body:body?JSON.stringify(body):undefined})
const action=body=>email.POST(request('/inbox/workspace/api/email',body))
async function json(response){assert.equal(response.status,200,await response.clone().text());return response.json()}
beforeEach(()=>{
 Object.assign(process.env,{VERCEL_ENV:'preview',NEXT_PUBLIC_SANITY_PROJECT_ID:'gu1xkpsg',NEXT_PUBLIC_SANITY_DATASET:'synthetic',FLUFFYTAIL_PAYMENT_TEST_WORKSPACE:'1',FLUFFYTAIL_STRIPE_TEST_ENABLED:'1',FLUFFYTAIL_STRIPE_TEST_SECRET_KEY:'sk_test_offline_only',FLUFFYTAIL_STRIPE_TEST_WEBHOOK_SECRET:secret,FLUFFYTAIL_PAYMENT_TEST_ORIGIN:origin,INBOX_BASIC_AUTH_USER:'staff',INBOX_BASIC_AUTH_PASS:'test-password',FLUFFYTAIL_WRITE_FREEZE:'0',STRIPE_SECRET_KEY:'sk_live_forbidden_fallback'})
 store=workspaceStoreFixture([{_id:'test-litter',_type:'litter',title:'TEST litter',status:'current',isVisible:true,price:1600,deposit:400},{_id:'test-puppy',_rev:'initial-puppy',_type:'puppy',name:'TEST Poppy',status:'available',isVisible:true,paymentTestScenario:'offline',slug:{current:'test-poppy'},litter:{_ref:'test-litter'}},{_id:workspaceId(familyId),_rev:'initial-family',_type:'staffFamily',workspace:'review-v1',schemaVersion:1,familyKey:familyId,profile:{id:familyId,source:'inquiry',name:'TEST Family',initials:'TF',email:'test-family@example.test',phone:'',preference:'Email',smsConsent:false,stage:'Ready',next:'Test only',paymentTestScenario:'offline',puppyId:'test-puppy',puppySlug:'test-poppy',messages:[],records:[]},drafts:{Email:'',Text:''},notes:[],checks:[]}]);globalThis.fixtureOperatorClient=store;sessions=new Map();calls=0
 globalThis.fixtureStripe={webhooks:new Stripe('sk_test_offline').webhooks,checkout:{sessions:{create:async data=>{calls++;const session={...data,id:'cs_test_offline'+calls,url:'https://checkout.stripe.com/c/pay/cs_test_offline'+calls,livemode:false,currency:'usd',amount_total:data.line_items[0].price_data.unit_amount,payment_status:'unpaid'};sessions.set(session.id,session);return session},retrieve:async id=>structuredClone(sessions.get(id))}}}
})
async function create(kind,requestId){const prepared=await json(await action({type:'payment',familyId,puppyId:'test-puppy',kind,requestId}));await json(await action({type:'checkout',familyId,paymentRequestId:prepared.preparedPaymentId}));return (await json(await email.GET(request('/inbox/workspace/api/email')))).paymentRequests.find(r=>r._id===prepared.preparedPaymentId)}
function paidEvent(sessionId,id='evt_offline1'){const session=sessions.get(sessionId);session.payment_status='paid';return {id,type:'checkout.session.completed',livemode:false,data:{object:structuredClone(session)}}}
function deliver(event,signature=true){const payload=JSON.stringify(event),header=signature?globalThis.fixtureStripe.webhooks.generateTestHeaderString({payload,secret}):'invalid';return webhook.POST(new Request(origin+'/api/stripe/test-webhook',{method:'POST',headers:{'stripe-signature':header},body:payload}))}
const firstId='00000000-0000-4000-8000-000000000801',lastId='00000000-0000-4000-8000-000000000802'
test('actual handlers settle deposit and final payment only from signed test webhooks, preserve history and prevent repeat requests',async()=>{
 const deposit=await create('deposit',firstId);assert.equal(deposit.amountCents,40000);assert.match(sessions.get(deposit.checkoutSessionId).success_url,/\/inbox\/workspace\/payment-return/)
 assert.equal((await readTestPaymentReceipt(deposit.checkoutSessionId)).webhookVerified,false)
 const event=paidEvent(deposit.checkoutSessionId);await json(await deliver(event));const revision=store.documents.get('test-puppy')._rev
 assert.equal(store.documents.get('test-puppy').status,'reserved');assert.equal((await readTestPaymentReceipt(deposit.checkoutSessionId)).paidCents,40000)
 await json(await deliver(event));await json(await deliver({...event,id:'evt_duplicate_object'}));assert.equal(store.documents.get('test-puppy')._rev,revision);assert.equal([...store.documents.values()].filter(d=>d._type==='paymentRecord').length,1)
 assert.equal((await action({type:'payment',familyId,puppyId:'test-puppy',kind:'deposit',requestId:lastId})).status,409)
 const final=await create('balance',lastId);assert.equal(final.amountCents,120000);await json(await deliver(paidEvent(final.checkoutSessionId,'evt_offline2')))
 const receipt=await readTestPaymentReceipt(final.checkoutSessionId);assert.equal(receipt.webhookVerified,true);assert.equal(receipt.paidCents,160000);assert.equal(receipt.remainingCents,0);assert.equal(receipt.records.length,2);assert.equal(store.documents.get('test-puppy')._rev,revision)
 assert.equal((await action({type:'payment',familyId,puppyId:'test-puppy',kind:'balance',requestId:'00000000-0000-4000-8000-000000000803'})).status,409)
 const data=await json(await state.GET(request('/inbox/workspace/api/state')));assert.equal(data.families[0].profile.records.reduce((sum,r)=>sum+r.amountPaid,0),1600)
})
test('incomplete test configuration, bad signatures, live events and mismatched family associations fail closed without ledger changes',async()=>{
 const deposit=await create('deposit',firstId),event=paidEvent(deposit.checkoutSessionId)
 assert.equal((await deliver(event,false)).status,400);assert.equal((await deliver({...event,livemode:true})).status,400)
 assert.equal((await deliver({...event,data:{object:{...event.data.object,metadata:{...event.data.object.metadata,staffFamilyId:'inquiry-'+'c'.repeat(64)}}}})).status,500)
 delete process.env.FLUFFYTAIL_STRIPE_TEST_SECRET_KEY;assert.equal((await deliver(event)).status,503);assert.equal((await action({type:'checkout',familyId,paymentRequestId:deposit._id})).status,503)
 assert.equal([...store.documents.values()].filter(d=>d._type==='paymentRecord').length,0);assert.equal(store.documents.get('test-puppy').status,'available')
 process.env.VERCEL_ENV='production';assert.equal((await deliver(event)).status,503)
})
test('active unpaid requests share one checkout; concurrent duplicate callbacks make one payment and reservation transition',async()=>{
 const deposit=await create('deposit',firstId);const another=await create('deposit',lastId);assert.equal(another._id,deposit._id);assert.equal(calls,1)
 const event=paidEvent(deposit.checkoutSessionId);const results=await Promise.all([deliver(event),deliver({...event,id:'evt_concurrent2'})]);for(const response of results)await json(response)
 assert.equal([...store.documents.values()].filter(d=>d._type==='paymentRecord').length,1);assert.equal(store.documents.get('test-puppy').testReservationSessionId,deposit.checkoutSessionId)
})
test('fresh branded sign-in covers workspace and existing Inbox on the same host without authentication popups',async()=>{
 const response=await access.POST(request('/inbox/access/api',{username:'staff',password:'test-password'}));await json(response)
 const header=response.headers.get('set-cookie'),cookie=header.split(';')[0];assert.match(header,/Path=\/inbox;/);assert.match(header,/HttpOnly/);assert.match(header,/SameSite=lax/)
 for(const path of ['/inbox','/inbox/workspace','/inbox/workspace/payment-return'])assert.equal(requireOperator(new Request(origin+path,{headers:{cookie}})),null)
 assert.equal(requireOperator(new Request('https://different.example.test/inbox/workspace',{headers:{cookie}})).status,401)
 assert.equal(requireOperator(new Request(origin+'/inbox')).headers.has('www-authenticate'),false)
})
