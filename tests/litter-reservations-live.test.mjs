import './register-typescript.mjs'
import {test,beforeEach} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import Stripe from 'stripe'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {workspaceStoreFixture} from './workspace-store-fixture.mjs'
const route=await import('../app/inbox/workspace/api/litter-reservations/route.ts'),hook=await import('../app/api/stripe/webhook/route.ts'),email=await import('../app/inbox/workspace/api/email/route.ts'),customer=await import('../app/api/payment/[token]/route.ts')
const core=await import('../sanity/lib/litter-reservations.ts'),{workspaceId,mutateWorkspace}=await import('../sanity/lib/workspace.ts'),{sendEmailDraft}=await import('../app/inbox/workspace/send-draft.ts')
const Customer=(await import('../app/pay/CustomerTestPayment.tsx')).default
const origin='https://www.fluffytailshihtzu.com',secret='whsec_litter_live_fixture_only',authorization='Basic '+Buffer.from('staff:fixture').toString('base64')
let db,sessions,intents,seq,sent
const familyId=n=>'inquiry-'+String(n).repeat(64)
const req=body=>new Request(origin+'/inbox/workspace/api/litter-reservations',{method:'POST',headers:{origin,'content-type':'application/json',authorization},body:JSON.stringify(body)})
async function ok(r){assert.equal(r.status,200,await r.clone().text());return r.json()}
const action=body=>route.POST(req(body)).then(ok)
const emailAction=body=>email.POST(req(body)).then(ok)
async function offer(n=1,litterId='fictional-autumn',position=1){return (await action({type:'offer',familyId:familyId(n),litterId,position,preferences:'Agreed timing; preferences are not guarantees.',requestId:randomUUID(),confirmed:true})).paymentRequest}
async function deliver(p,{type='checkout.session.completed',paid=true,live=true,valid=true}={}){const s=sessions.get(p.checkoutSessionId);s.payment_status=paid?'paid':'unpaid';if(paid)s.status='complete';const payload=JSON.stringify({id:'evt_'+randomUUID(),type,livemode:live,data:{object:s}});return hook.POST(new Request(origin+'/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':globalThis.fixtureStripe.webhooks.generateTestHeaderString({payload,secret:valid?secret:'wrong'})},body:payload}))}
const receipt=p=>customer.GET(new Request(origin+'/api/payment/'+p.publicToken),{params:Promise.resolve({token:p.publicToken})}).then(ok)
async function sendRequest(p){const data=await email.GET(new Request(origin+'/inbox/workspace/api/email',{headers:{authorization}})).then(ok),draft=data.drafts.find(d=>d.familyId===p.familyId);return sendEmailDraft(p.familyId,{familyId:p.familyId,revision:draft.revision,value:{subject:'Your approved litter selection position',body:'A personal message from Jeanne.',replyToId:null,paymentRequestId:p._id}},randomUUID(),emailAction)}
beforeEach(()=>{
 Object.assign(process.env,{INQUIRY_FORM_SECRET:'fixture-litter-inquiry-secret-at-least-32-characters',FLUFFYTAIL_STAFF_WORKSPACE_ENABLED:'1',NEXT_PUBLIC_SITE_URL:origin,FLUFFYTAIL_LITTER_RESERVATIONS_LIVE_ENABLED:'1',STRIPE_SECRET_KEY:'sk_live_fixture_only',STRIPE_WEBHOOK_SECRET:secret,VERCEL_ENV:'production',NEXT_PUBLIC_SANITY_PROJECT_ID:'3glz6dkx',NEXT_PUBLIC_SANITY_DATASET:'production',STAFF_PASSKEY_MODE:'off',FLUFFYTAIL_LITTER_RESERVATIONS_ENABLED:'0',FLUFFYTAIL_PAYMENT_TEST_WORKSPACE:'0',FLUFFYTAIL_STRIPE_TEST_ENABLED:'1',FLUFFYTAIL_STRIPE_TEST_SECRET_KEY:'sk_test_litter_fixture',FLUFFYTAIL_STRIPE_TEST_WEBHOOK_SECRET:secret,FLUFFYTAIL_PAYMENT_TEST_ORIGIN:origin,FLUFFYTAIL_WRITE_FREEZE:'0',INBOX_BASIC_AUTH_USER:'staff',INBOX_BASIC_AUTH_PASS:'fixture'})
 delete process.env.FLUFFYTAIL_TEST_CUSTOMER_COMMUNICATIONS;delete globalThis.fixtureTestContacts
 db=workspaceStoreFixture();globalThis.fixtureOperatorClient=db;sessions=new Map();intents=new Map();seq=0;sent=[]
 for(const id of ['fictional-autumn','fictional-spring'])db.documents.set(id,{_id:id,_rev:'litter-v1',_type:'litter',title:id==='fictional-autumn'?'Autumn fixture litter':'Spring fixture litter',status:'planned',price:1600,deposit:400,isVisible:true})
 for(const n of [1,2,3,4,5]){const id=familyId(n);db.documents.set(workspaceId(id),{_id:workspaceId(id),_rev:'family-'+n,_type:'staffFamily',workspace:'live-v1',schemaVersion:1,familyKey:id,profile:{id,name:'Fictional Family '+n,email:'family'+n+'@example.test',phone:'',source:'inquiry',preference:'Email',smsConsent:false,initials:'FF',location:'Test home',stage:'Litter inquiry',next:'Discuss',messages:[],records:[],unread:false},drafts:{Email:'',Text:''},notes:[],checks:[]})}
 db.documents.set('fictional-puppy',{_id:'fictional-puppy',_rev:'puppy-v1',_type:'puppy',name:'Willow fixture puppy',slug:{current:'practice-willow-litter'},status:'available',litter:{_ref:'fictional-spring'},isVisible:true})
 globalThis.fixtureStripe={webhooks:new Stripe('sk_test_fixture').webhooks,paymentIntents:{retrieve:async id=>structuredClone(intents.get(id))},checkout:{sessions:{create:async(data,opts)=>{const same=[...sessions.values()].find(s=>s.idempotency===opts?.idempotencyKey);if(same)return structuredClone(same);const s={...structuredClone(data),id:'cs_live_litter'+(++seq),livemode:true,currency:'usd',amount_total:data.line_items[0].price_data.unit_amount,url:'https://checkout.stripe.com/c/pay/cs_live_litter'+seq,status:'open',payment_status:'unpaid',idempotency:opts?.idempotencyKey};sessions.set(s.id,s);return structuredClone(s)},retrieve:async id=>structuredClone(sessions.get(id)),expire:async id=>{const s=sessions.get(id);s.status='expired';return structuredClone(s)}}}}
 globalThis.fixtureMailProvider={capabilities:{provider:'pair',canDispatch:true,canSync:true},send:async message=>{sent.push(structuredClone(message));return {outcome:'accepted',code:'OFFLINE_PAIR'}},sync:async()=>({validity:'offline-mailbox',lastUid:1,messages:[]})}
})
test('live reservation release switch is disabled by default and rejects mixed configuration without writes',async()=>{
 process.env.FLUFFYTAIL_LITTER_RESERVATIONS_LIVE_ENABLED='0';let before=JSON.stringify([...db.documents]);assert.equal((await route.POST(req({}))).status,400);await assert.rejects(()=>core.loadLitterReservations());assert.equal(JSON.stringify([...db.documents]),before)
 process.env.FLUFFYTAIL_LITTER_RESERVATIONS_LIVE_ENABLED='1';process.env.FLUFFYTAIL_LITTER_RESERVATIONS_ENABLED='1';assert.equal((await route.GET(req({}))).status,503);assert.equal(JSON.stringify([...db.documents]),before)
})
test('live-shaped litter request, signed deposit, transfer, puppy selection and existing final balance share one deposit credit',async()=>{
 const p=await offer();assert.equal(p.testOnly,false);assert.equal(p.amountCents,40000);let view=await receipt(p);assert.equal(view.state,'ready')
 const html=renderToStaticMarkup(React.createElement(Customer,{token:p.publicToken,initial:view,error:'',canceled:false,testOnly:false}));assert.doesNotMatch(html,/TEST|fictional|inbox\/|family1@/);assert.match(html,/secure checkout/)
 await sendRequest(p);assert.equal(sent.length,1);assert.match(sent[0].html,/View deposit request/);assert.match(sent[0].html,/selection position/);assert.doesNotMatch(sent[0].html,/TEST|Your puppy is reserved/);assert.match(sent[0].body,/A personal message/)
 await ok(await deliver(p));await ok(await deliver(p));assert.equal(sent.length,2);assert.equal(sent[1].inReplyTo,sent[0].messageId);assert.match(sent[1].html,/Your deposit is confirmed/);assert.doesNotMatch(sent[1].html,/TEST|Your puppy is reserved/);assert.equal((await core.publicLitterPlaces('fictional-autumn'))[0].status,'Reserved');assert.equal(db.documents.get('fictional-puppy').status,'available')
 await assert.rejects(()=>mutateWorkspace({type:'associate',familyId:familyId(1),puppyId:'fictional-puppy'}),/Assign the selected puppy/)
 await action({type:'transfer',confirmed:true,id:p.litterReservationId,litterId:'fictional-spring',position:1,requestId:randomUUID(),note:'Suitable puppy unavailable.'});assert.equal((await core.publicLitterPlaces('fictional-autumn'))[0].status,'Available');assert.equal((await core.publicLitterPlaces('fictional-spring'))[0].status,'Reserved')
 assert.equal((await route.POST(req({type:'test-born',litterId:'fictional-spring'}))).status,403)
 const litter=db.documents.get('fictional-spring');litter.status='current';litter.price=1800;litter.deposit=450
 await action({type:'assign',confirmed:true,id:p.litterReservationId,puppyId:'fictional-puppy',requestId:randomUUID()});assert.equal(db.documents.get('fictional-puppy').status,'reserved');assert.equal([...db.documents.values()].filter(d=>d._type==='litterCreditApplication').length,1)
 const prepared=await emailAction({type:'payment',familyId:familyId(1),puppyId:'fictional-puppy',kind:'balance',requestId:randomUUID()});const final0=prepared.paymentRequests.find(p=>p._id===prepared.preparedPaymentId);assert.equal(final0.amountCents,140000);assert.equal(final0.depositCents,40000)
 const final=(await emailAction({type:'checkout',familyId:familyId(1),paymentRequestId:final0._id})).paymentRequests.find(p=>p._id===final0._id);await ok(await deliver(final));view=await receipt(final);assert.equal(view.paidCents,180000);assert.equal(view.remainingCents,0);assert.equal([...db.documents.values()].filter(d=>d._type==='paymentRecord').length,2);assert.equal(db.documents.get('fictional-puppy').status,'reserved')
})
test('live-shaped competing offers and delayed terminal outcomes keep public and private positions consistent',async()=>{
 const results=await Promise.all([1,2].map(n=>route.POST(req({type:'offer',confirmed:true,familyId:familyId(n),litterId:'fictional-autumn',position:1,preferences:'',requestId:randomUUID()}))));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);const p=(await results.find(r=>r.status===200).json()).paymentRequest,s=sessions.get(p.checkoutSessionId)
 s.payment_intent='pi_delay';intents.set('pi_delay',{livemode:true,status:'processing'});s.status='complete';await ok(await deliver(p,{paid:false}));assert.equal((await core.publicLitterPlaces('fictional-autumn'))[0].status,'Pending deposit');assert.equal(sent.length,0)
 s.status='expired';await ok(await deliver(p,{type:'checkout.session.expired',paid:false}));assert.equal((await core.publicLitterPlaces('fictional-autumn'))[0].status,'Pending deposit');intents.get('pi_delay').status='requires_payment_method';await ok(await deliver(p,{type:'checkout.session.async_payment_failed',paid:false}));assert.equal((await core.publicLitterPlaces('fictional-autumn'))[0].status,'Available')
 const n=p.familyId===familyId(1)?2:1,other=await offer(n);await ok(await deliver(other));await ok(await deliver(p,{type:'checkout.session.async_payment_succeeded'}));assert.equal(db.documents.get(p.litterReservationId).state,'reconciliation');assert.equal((await core.publicLitterPlaces('fictional-autumn'))[0].status,'Reserved');assert.equal(sent.length,1)
})
test('manual-review credit floor and live/test identity validation preserve ledger and inventory',async()=>{
 const p=await offer();assert.equal((await deliver(p,{valid:false})).status,400);assert.equal((await deliver(p,{live:false})).status,400);await ok(await deliver(p));await action({type:'transfer',confirmed:true,id:p.litterReservationId,litterId:'fictional-spring',position:1,requestId:randomUUID(),note:''});db.documents.get('fictional-spring').status='current';db.documents.get('fictional-puppy').overridePrice=300
 const before=JSON.stringify([...db.documents]);assert.equal((await route.POST(req({type:'assign',confirmed:true,id:p.litterReservationId,puppyId:'fictional-puppy',requestId:randomUUID()}))).status,409);assert.equal(JSON.stringify([...db.documents]),before)
})


test('litter credit assignment respects an individual-puppy claim and blocks stale competing checkout snapshots',async()=>{
 const p=await offer();await ok(await deliver(p));await action({type:'transfer',confirmed:true,id:p.litterReservationId,litterId:'fictional-spring',position:1,requestId:randomUUID(),note:''});db.documents.get('fictional-spring').status='current'
 const {getPaymentContext}=await import('../sanity/lib/payment-context.ts'),{privateRecordId}=await import('../sanity/lib/private-records.ts'),{createDepositCheckout}=await import('../sanity/lib/deposit-checkout.ts')
 const earlier=await getPaymentContext('practice-willow-litter'),claimId=privateRecordId('deposit','fictional-puppy');db.documents.set(claimId,{_id:claimId,_rev:'claim-initial',_type:'depositLink',active:true,token:'historical-token',stripeCheckoutUrl:'https://checkout.stripe.com/prior'})
 const assign={type:'assign',confirmed:true,id:p.litterReservationId,puppyId:'fictional-puppy',requestId:randomUUID()};assert.equal((await route.POST(req(assign))).status,409);assert.equal(db.documents.get('fictional-puppy').status,'available')
 db.documents.get(claimId).active=false;await action(assign);assert.equal(db.documents.get(claimId).token,'historical-token');assert.equal(db.documents.get(claimId).stripeCheckoutUrl,'https://checkout.stripe.com/prior');const count=sessions.size
 await assert.rejects(()=>createDepositCheckout(earlier,{customerName:'Other fixture family',customerEmail:'other@example.test',customerPhone:''},origin,{staffTestOnly:'0'}),/applied litter deposit/);assert.equal(sessions.size,count)
})
