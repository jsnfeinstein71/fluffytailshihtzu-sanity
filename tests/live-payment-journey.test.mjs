import './register-typescript.mjs'
import {test,beforeEach} from 'node:test'
import assert from 'node:assert/strict'
import Stripe from 'stripe'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {workspaceStoreFixture} from './workspace-store-fixture.mjs'
const email=await import('../app/inbox/workspace/api/email/route.ts'),webhook=await import('../app/api/stripe/webhook/route.ts')
const customer=await import('../app/api/payment/[token]/route.ts'),checkout=await import('../app/api/payment/[token]/checkout/route.ts'),Customer=(await import('../app/pay/CustomerTestPayment.tsx')).default
const {workspaceId}=await import('../sanity/lib/workspace.ts'),{sendEmailDraft}=await import('../app/inbox/workspace/send-draft.ts')
const {liveConfirmationId}=await import('../sanity/lib/live-payment.ts'),{liveConfirmationSnapshot}=await import('../sanity/lib/live-payment-confirmation.ts')
const origin='https://www.fluffytailshihtzu.com',familyId='inquiry-'+'b'.repeat(64),auth='Basic '+Buffer.from('staff:offline-password').toString('base64'),secret='whsec_live_fixture_only'
let store,sessions,sent,outcome,reads,sequence
function request(path,body){return new Request(origin+path,{method:body?'POST':'GET',headers:{authorization:auth,origin,'content-type':'application/json'},body:body?JSON.stringify(body):undefined})}
async function ok(response){assert.equal(response.status,200,await response.clone().text());return response.json()}
const action=body=>email.POST(request('/inbox/workspace/api/email',body)),receipt=token=>customer.GET(new Request(origin+'/api/payment/'+token),{params:Promise.resolve({token})})
beforeEach(()=>{
 Object.assign(process.env,{VERCEL_ENV:'production',NEXT_PUBLIC_SITE_URL:origin,NEXT_PUBLIC_SANITY_PROJECT_ID:'3glz6dkx',NEXT_PUBLIC_SANITY_DATASET:'production',FLUFFYTAIL_STAFF_WORKSPACE_ENABLED:'1',STRIPE_SECRET_KEY:'sk_live_fixture_only',STRIPE_WEBHOOK_SECRET:secret,FLUFFYTAIL_MAIL_MODE:'pair',FLUFFYTAIL_PAIR_SEND_ENABLED:'1',FLUFFYTAIL_PAIR_READ_ENABLED:'1',FLUFFYTAIL_PAIR_MAIL_PASSWORD:'offline-only',FLUFFYTAIL_WRITE_FREEZE:'0',INBOX_BASIC_AUTH_USER:'staff',INBOX_BASIC_AUTH_PASS:'offline-password'})
 delete process.env.FLUFFYTAIL_PAYMENT_TEST_WORKSPACE;globalThis.fixtureTestContacts=null;sequence=0;sessions=new Map();sent=[];outcome='accepted';reads=[]
 store=workspaceStoreFixture([{_id:'litter',_type:'litter',title:'Fixture litter',status:'current',isVisible:true,price:1600,deposit:400},{_id:'puppy',_rev:'puppy-initial',_type:'puppy',name:'Fixture puppy',status:'available',isVisible:true,slug:{current:'fixture-puppy'},litter:{_ref:'litter'}},{_id:workspaceId(familyId),_rev:'family-initial',_type:'staffFamily',workspace:'live-v1',schemaVersion:1,familyKey:familyId,profile:{id:familyId,source:'inquiry',inquiryId:'fixture-inquiry',name:'Fixture family',initials:'FF',email:'fixture@example.test',phone:'',preference:'Email',smsConsent:false,stage:'Ready',next:'Fixture',puppyId:'puppy',puppySlug:'fixture-puppy',messages:[],records:[]},drafts:{Email:'',Text:''},notes:[],checks:[]}]);globalThis.fixtureOperatorClient=store
 globalThis.fixtureStripe={webhooks:new Stripe('sk_test_fixture').webhooks,checkout:{sessions:{create:async data=>{const s={...data,id:'cs_live_fixture'+(++sequence),url:'https://checkout.stripe.com/c/pay/cs_live_fixture'+sequence,livemode:true,currency:'usd',amount_total:data.line_items[0].price_data.unit_amount,payment_status:'unpaid',status:'open'};sessions.set(s.id,s);return structuredClone(s)},retrieve:async id=>structuredClone(sessions.get(id))}}}
 globalThis.fixtureMailProvider={capabilities:{provider:'pair',canDispatch:true,canSync:true},send:async message=>{sent.push(structuredClone(message));return {outcome,code:'FIXTURE_'+outcome}},sync:async input=>{reads.push(input);return {validity:'fixture-mailbox',lastUid:1,messages:[]}}}
})
async function create(kind,number=1){const p=await ok(await action({type:'payment',familyId,puppyId:'puppy',kind,requestId:`00000000-0000-4000-8000-${String(number).padStart(12,'0')}`}));const data=await ok(await action({type:'checkout',familyId,paymentRequestId:p.preparedPaymentId}));return data.paymentRequests.find(r=>r._id===p.preparedPaymentId)}
async function signed(payment,{paid=true,type='checkout.session.completed',valid=true,live=true}={}){const s=sessions.get(payment.checkoutSessionId);s.payment_status=paid?'paid':'unpaid';s.status=type.endsWith('expired')?'expired':'complete';const payload=JSON.stringify({id:'evt_fixture'+sequence,type,livemode:live,data:{object:s}});return webhook.POST(new Request(origin+'/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':globalThis.fixtureStripe.webhooks.generateTestHeaderString({payload,secret:valid?secret:'wrong_secret'})},body:payload}))}
async function sendRequest(payment,body='A personal note from Jeanne.',replyToId=null){const data=await ok(await email.GET(request('/inbox/workspace/api/email')));const prior=data.drafts.find(d=>d.familyId===familyId);const draft={familyId,revision:prior?.revision||null,value:{subject:'Your puppy payment',body,replyToId,paymentRequestId:payment._id}};return sendEmailDraft(familyId,draft,`00000000-0000-4000-8000-${String(100+sequence).padStart(12,'0')}`,async input=>ok(await action(input)))}

test('live-shaped application journey formats requests, validates public checkout and confirms signed ledger exactly once without touching real providers',async()=>{
 const deposit=await create('deposit');assert.equal(deposit.testOnly,false);assert.match(sessions.get(deposit.checkoutSessionId).success_url,/\/pay\//)
 let data=await ok(await receipt(deposit.publicToken));assert.equal(data.state,'ready');assert.equal(sent.length,0);assert.equal(reads.length,0)
 const page=renderToStaticMarkup(React.createElement(Customer,{token:deposit.publicToken,initial:data,error:'',canceled:false,testOnly:false}));assert.doesNotMatch(page,/TEST|fictional|test checkout|inbox\/|fixture@example/);assert.match(page,/\$1,200.00/);assert.match(page,/\/api\/payment\//)
 assert.equal((await checkout.GET(new Request(origin+'/checkout'),{params:Promise.resolve({token:deposit.publicToken})})).headers.get('location'),sessions.get(deposit.checkoutSessionId).url)
 await sendRequest(deposit,'Welcome! Your note stays exactly as written.');assert.equal(sent.length,1);assert.match(sent[0].html,/fluffytail-email-logo-transparent.png/);assert.match(sent[0].html,/>View deposit request<\/a>/);assert.doesNotMatch(sent[0].html,/TEST|fictional/);assert.ok(sent[0].body.includes(deposit.checkoutUrl));assert.equal(store.documents.get('puppy').status,'available')
 sessions.get(deposit.checkoutSessionId).payment_status='paid';sessions.get(deposit.checkoutSessionId).status='complete';data=await ok(await receipt(deposit.publicToken));assert.equal(data.state,'pending');assert.equal(data.paidCents,0);assert.equal(data.checkoutUrl,null);assert.equal(await liveConfirmationSnapshot(deposit.checkoutSessionId),null)
 await ok(await signed(deposit));await ok(await signed(deposit));assert.equal(sent.length,2);assert.equal(sent[1].inReplyTo,sent[0].messageId);assert.match(sent[1].html,/Your deposit is confirmed/);assert.match(sent[1].body,/Total paid: \$400.00/);assert.equal(store.documents.get('puppy').status,'reserved');assert.equal(store.documents.get(liveConfirmationId(deposit.checkoutSessionId)).delivery,'unconfirmed')
 const final=await create('balance',2);assert.equal(final.amountCents,120000);await sendRequest(final);assert.match(sent[2].html,/>View final payment request<\/a>/)
 await ok(await signed(final));await ok(await signed(final));assert.equal(sent.length,4);assert.match(sent[3].html,/Paid in full/);assert.match(sent[3].body,/Remaining balance: \$0.00/);assert.equal(store.documents.get('puppy').status,'reserved')
 data=await ok(await receipt(final.publicToken));assert.equal(data.paidCents,160000);assert.equal(data.remainingCents,0);assert.equal(data.state,'confirmed');assert.equal(data.checkoutUrl,null);assert.equal([...store.documents.values()].filter(d=>d._type==='paymentRecord').length,2)
 assert.equal((await action({type:'payment',familyId,puppyId:'puppy',kind:'balance',requestId:'00000000-0000-4000-8000-000000000009'})).status,409)
})

test('existing live Girl-2-shaped short links remain read-only and historical paid records never backfill a confirmation',async()=>{
 const p=await create('deposit'),raw=store.documents.get(p._id),s=sessions.get(p.checkoutSessionId);delete raw.publicToken;raw.checkoutUrl=origin+'/pay/'+s.metadata.token;delete s.metadata.customerPaymentToken
 const before=JSON.stringify([...store.documents.values()]);let data=await ok(await receipt(s.metadata.token));assert.equal(data.state,'ready');assert.equal(JSON.stringify([...store.documents.values()]),before);assert.equal(sent.length,0);assert.equal(reads.length,0)
 // This fixture models a payment recorded by the previous release, without the new opt-in receipt marker.
 s.payment_status='paid';store.documents.set('historical',{_id:'historical',_type:'paymentRecord',stripeCheckoutSessionId:s.id,paymentStatus:'paid',paymentType:'deposit',amountPaid:400,quotedTotalCents:160000,quotedDepositCents:40000,puppyId:'puppy',puppySlug:'fixture-puppy',customerEmail:'fixture@example.test'})
 await ok(await signed(p));assert.equal(sent.length,0);assert.equal(store.documents.get('historical').paymentConfirmationVersion,undefined);assert.equal(store.documents.get('puppy').status,'available');data=await ok(await receipt(s.metadata.token));assert.equal(data.paidCents,40000);assert.equal(data.confirmation,'not-scheduled')
})

test('bad signature, test event, wrong amounts and changed family scope cannot settle or send',async()=>{
 const p=await create('deposit');assert.equal((await signed(p,{valid:false})).status,400);assert.equal((await signed(p,{live:false})).status,400)
 const s=sessions.get(p.checkoutSessionId);s.amount_total=1;assert.equal((await signed(p)).status,500);s.amount_total=40000;s.metadata.staffFamilyId='another';assert.equal((await signed(p)).status,500);s.metadata.staffFamilyId=familyId
 store.documents.get(workspaceId(familyId)).profile.email='changed@example.test';assert.equal((await signed(p)).status,500);assert.equal((await ok(await receipt(p.publicToken))).checkoutUrl,null)
 assert.equal(sent.length,0);assert.equal([...store.documents.values()].filter(d=>d._type==='paymentRecord').length,0);assert.equal(store.documents.get('puppy').status,'available')
})

test('failed and uncertain confirmation attempts persist, do not overwrite drafts and are never automatically retried',async()=>{
 for(const result of ['rejected','uncertain']){
  const p=await create('deposit');outcome=result;store.documents.get(workspaceId(familyId)).drafts.Email='Unfinished draft';await ok(await signed(p));await ok(await signed(p));await ok(await action({type:'refresh',familyId}));assert.equal(sent.length,1)
  const saved=store.documents.get(liveConfirmationId(p.checkoutSessionId));assert.equal(saved.state,result==='rejected'?'failed':'uncertain');assert.equal(store.documents.get(workspaceId(familyId)).drafts.Email,'Unfinished draft')
  if(result==='rejected'){outcome='accepted';await ok(await action({type:'dispatch',reviewId:saved.reviewId,confirmed:true}));assert.equal(sent.length,2);assert.equal(store.documents.get(saved._id).delivery,'unconfirmed')}
  // Each scenario uses a fresh isolated store, never an operational record reset.
  if(result==='rejected'){const p2=store.documents.get('puppy');p2.status='available';for(const [key,d] of store.documents)if(['paymentRecord','staffPaymentRequest','depositLink','staffOutgoingEmail','staffMailGuard'].includes(d._type))store.documents.delete(key);sessions.clear();sent=[]}
 }
})

test('public views reject missing/mixed configuration, hide private details and never create ledger, mail or mailbox reads',async()=>{
 const p=await create('deposit');assert.equal((await receipt('invalid')).status,404)
 for(const [key,value] of [['STRIPE_SECRET_KEY','sk_test_wrong'],['FLUFFYTAIL_PAYMENT_TEST_WORKSPACE','1'],['NEXT_PUBLIC_SANITY_PROJECT_ID','gu1xkpsg'],['NEXT_PUBLIC_SITE_URL','https://other.example']]){const original=process.env[key];process.env[key]=value;assert.equal((await receipt(p.publicToken)).status,404);if(original===undefined)delete process.env[key];else process.env[key]=original}
 const response=await receipt(p.publicToken);assert.match(response.headers.get('cache-control'),/no-store/);const text=await response.text();assert.doesNotMatch(text,/fixture@example|inquiry-|customerEmail|staffFamily|metadata|attachment/);assert.equal(sent.length,0);assert.equal(reads.length,0)
})

test('concurrent duplicate signed webhooks claim one ledger, one reservation and one SMTP submission',async()=>{
 const p=await create('deposit');const results=await Promise.all([signed(p),signed(p)]);for(const result of results)await ok(result)
 assert.equal([...store.documents.values()].filter(d=>d._type==='paymentRecord').length,1);assert.equal(sent.length,1);assert.equal(store.documents.get(liveConfirmationId(p.checkoutSessionId)).attempts.length,1)
})

test('expired and asynchronous unpaid sessions have no confirmation; only signed asynchronous paid success settles',async()=>{
 const p=await create('deposit');await ok(await signed(p,{paid:false}));assert.equal((await ok(await receipt(p.publicToken))).state,'pending');assert.equal(sent.length,0)
 await ok(await signed(p,{paid:false,type:'checkout.session.async_payment_failed'}));assert.equal((await ok(await receipt(p.publicToken))).state,'failed');assert.equal(sent.length,0)
 await ok(await signed(p,{type:'checkout.session.async_payment_succeeded'}));assert.equal((await ok(await receipt(p.publicToken))).state,'confirmed');assert.equal(sent.length,1)
 await ok(await signed(p,{type:'checkout.session.expired'}));assert.equal(store.documents.get('puppy').status,'reserved');assert.equal(sent.length,1)
})

test('a rejected branded request preserves editable draft and thread headers; public return performs no writes or sends',async()=>{
 const p=await create('deposit'),incomingId='private.staffIncomingEmail.'+'f'.repeat(64)
 store.documents.set(incomingId,{_id:incomingId,_type:'staffIncomingEmail',workspace:'live-v1',id:incomingId,familyId,from:'fixture@example.test',to:'jeanne@fluffytailshihtzu.com',subject:'Hello',body:'Reply to me',messageId:'<fixture-parent@example.test>',references:['<fixture-first@example.test>'],direction:'in',time:new Date().toISOString(),source:'pair'})
 outcome='rejected';const note='An unfinished personal message.\n'+p.checkoutUrl;assert.equal((await sendRequest(p,note,incomingId)).state,'failed')
 const draft=[...store.documents.values()].find(d=>d._type==='staffEmailDraft');assert.equal(draft.value.body,note);assert.equal(draft.value.paymentRequestId,p._id);assert.match(sent[0].html,/>View payment details<\/a>/);assert.equal(sent[0].inReplyTo,'<fixture-parent@example.test>');assert.deepEqual(sent[0].references,['<fixture-first@example.test>','<fixture-parent@example.test>'])
 const before=JSON.stringify([...store.documents.values()]);const success=(await import('../app/payment-success/page.tsx')).default
 await assert.rejects(success({searchParams:Promise.resolve({session_id:p.checkoutSessionId})}),error=>error.digest?.includes('/pay/'+p.publicToken))
 assert.equal(JSON.stringify([...store.documents.values()]),before);assert.equal(sent.length,1)
})

test('legacy direct Stripe balance links gain the approved public page without changing their issued records or pickup status',async()=>{
 const deposit=await create('deposit');await ok(await signed(deposit));const balance=await create('balance',2),raw=store.documents.get(balance._id),s=sessions.get(balance.checkoutSessionId)
 delete raw.publicToken;raw.checkoutUrl=s.url;delete s.metadata.customerPaymentToken;const before=JSON.stringify(raw)
 const data=await ok(await receipt(s.id));assert.equal(data.state,'ready');assert.equal(JSON.stringify(raw),before)
 store.documents.get('puppy').status='sold';await ok(await signed(balance));assert.equal(store.documents.get('puppy').status,'sold');assert.match(sent.at(-1).html,/Paid in full/);assert.equal(sent.at(-1).paymentEmail.url,origin+'/pay/'+s.id)
})

test('saved confirmation snapshots freeze their note, greeting and thread through later staff edits',async()=>{
 const p=await create('deposit');await ok(await action({type:'confirmation-message',familyId,message:'A personal thank you.',base:''}));outcome='rejected';await ok(await signed(p))
 const saved=structuredClone(store.documents.get(liveConfirmationId(p.checkoutSessionId))),family=store.documents.get(workspaceId(familyId));family.profile.name='Changed name';family.profile.paymentConfirmationMessage='New note for future payments'
 outcome='accepted';await ok(await action({type:'dispatch',reviewId:saved.reviewId,confirmed:true}));const retried=store.documents.get(saved._id);assert.equal(retried.html,saved.html);assert.equal(retried.body,saved.body);assert.equal(retried.inReplyTo,saved.inReplyTo);assert.equal(retried.state,'accepted')
})

test('a deposit verified by an earlier live release permits its true remaining balance without rewriting history or backfilling mail',async()=>{
 const p=await create('deposit'),s=sessions.get(p.checkoutSessionId);s.payment_status='paid';s.status='complete';store.documents.get('puppy').status='reserved'
 const ledger={_id:'earlier-live-ledger',_type:'paymentRecord',stripeCheckoutSessionId:s.id,paymentStatus:'paid',paymentType:'deposit',amountPaid:400,quotedTotalCents:160000,quotedDepositCents:40000,puppyId:'puppy',puppySlug:'fixture-puppy',staffFamilyId:familyId,customerEmail:'fixture@example.test'};store.documents.set(ledger._id,structuredClone(ledger))
 const balance=await create('balance',2);assert.equal(balance.amountCents,120000);assert.equal(balance.paidCents,40000);assert.deepEqual(store.documents.get(ledger._id),ledger);assert.equal(store.documents.get(p._id).webhookVerifiedAt,undefined);assert.equal(sent.length,0)
})
