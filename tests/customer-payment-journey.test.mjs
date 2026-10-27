import './register-typescript.mjs'
import {test,beforeEach} from 'node:test'
import assert from 'node:assert/strict'
import Stripe from 'stripe'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {workspaceStoreFixture} from './workspace-store-fixture.mjs'
const email=await import('../app/inbox/workspace/api/email/route.ts'),state=await import('../app/inbox/workspace/api/state/route.ts'),sms=await import('../app/inbox/workspace/api/sms/route.ts'),webhook=await import('../app/api/stripe/test-webhook/route.ts')
const customer=await import('../app/api/test-payment/[token]/route.ts'),checkout=await import('../app/api/test-payment/[token]/checkout/route.ts'),Customer=(await import('../app/pay/CustomerTestPayment.tsx')).default
const {workspaceId}=await import('../sanity/lib/workspace.ts'),{sendEmailDraft,sendTextDraft}=await import('../app/inbox/workspace/send-draft.ts')
const origin='https://payments.example.test',familyId='inquiry-'+'e'.repeat(64),auth='Basic '+Buffer.from('staff:offline-password').toString('base64'),secret='whsec_customer_fixture_only',contacts={email:'customer@example.test',phone:'+15555550123'},business='+15555550124'
let store,sessions,mailSent,mailOutcome,smsSent,incoming,reads,sequence
function request(path,body){return new Request(origin+path,{method:body?'POST':'GET',headers:{authorization:auth,origin,'content-type':'application/json'},body:body?JSON.stringify(body):undefined})}
async function ok(response){assert.equal(response.status,200,await response.clone().text());return response.json()}
const action=body=>email.POST(request('/inbox/workspace/api/email',body)),mutate=async body=>(await state.POST(request('/inbox/workspace/api/state',body))).status===200
const publicReceipt=token=>customer.GET(new Request(origin+'/api/test-payment/'+token),{params:Promise.resolve({token})})
beforeEach(()=>{
 Object.assign(process.env,{VERCEL_ENV:'preview',NEXT_PUBLIC_SANITY_PROJECT_ID:'gu1xkpsg',NEXT_PUBLIC_SANITY_DATASET:'synthetic',FLUFFYTAIL_PAYMENT_TEST_WORKSPACE:'1',FLUFFYTAIL_STRIPE_TEST_ENABLED:'1',FLUFFYTAIL_STRIPE_TEST_SECRET_KEY:'sk_test_offline_only',FLUFFYTAIL_STRIPE_TEST_WEBHOOK_SECRET:secret,FLUFFYTAIL_PAYMENT_TEST_ORIGIN:origin,INBOX_BASIC_AUTH_USER:'staff',INBOX_BASIC_AUTH_PASS:'offline-password',FLUFFYTAIL_WRITE_FREEZE:'0',FLUFFYTAIL_TEST_CUSTOMER_COMMUNICATIONS:'1',FLUFFYTAIL_TEST_CUSTOMER_EMAIL:contacts.email,FLUFFYTAIL_TEST_CUSTOMER_PHONE:contacts.phone,FLUFFYTAIL_TEST_SMS_ENABLED:'1',FLUFFYTAIL_TEST_TWILIO_FROM_NUMBER:business})
 globalThis.fixtureTestContacts=contacts;sequence=0;sessions=new Map();mailSent=[];smsSent=[];incoming=[];reads=[];mailOutcome='accepted'
 store=workspaceStoreFixture([{_id:'test-litter',_type:'litter',title:'TEST litter',status:'current',isVisible:true,price:1600,deposit:400},{_id:'test-puppy',_rev:'puppy-initial',_type:'puppy',name:'Test Daisy',status:'available',isVisible:true,paymentTestScenario:'customer-20261027',slug:{current:'test-daisy'},litter:{_ref:'test-litter'}},{_id:'test-inquiry',_type:'puppyInquiry',source:'fluffytail-native',name:'TEST Customer',email:contacts.email,phone:contacts.phone,smsConsent:false,preferredContactMethod:'Email',submittedAt:new Date().toISOString()},{_id:workspaceId(familyId),_rev:'family-initial',_type:'staffFamily',workspace:'review-v1',schemaVersion:1,familyKey:familyId,profile:{id:familyId,source:'inquiry',inquiryId:'test-inquiry',name:'TEST Customer',initials:'TC',...contacts,preference:'Email',smsConsent:false,stage:'Ready',next:'Test only',paymentTestScenario:'customer-20261027',puppyId:'test-puppy',puppySlug:'test-daisy',messages:[],records:[]},drafts:{Email:'',Text:''},notes:[],checks:[]}]);globalThis.fixtureOperatorClient=store
 globalThis.fixtureStripe={webhooks:new Stripe('sk_test_fixture').webhooks,checkout:{sessions:{create:async data=>{const session={...data,id:'cs_test_customer'+(++sequence),url:'https://checkout.stripe.com/c/pay/cs_test_customer'+sequence,livemode:false,currency:'usd',amount_total:data.line_items[0].price_data.unit_amount,payment_status:'unpaid',status:'open'};sessions.set(session.id,session);return session},retrieve:async id=>structuredClone(sessions.get(id))}}}
 globalThis.fixtureMailProvider={capabilities:{provider:'pair',canDispatch:true,canSync:true,approvedTestEmail:contacts.email},send:async message=>{assert.equal(message.to,contacts.email);mailSent.push(structuredClone(message));return {outcome:mailOutcome,code:'FIXTURE_'+mailOutcome}},sync:async ({cursor,threads})=>{reads.push({cursor,threads});return {validity:'fixture-mailbox',lastUid:1,messages:[]}}}
 const messages=sid=>({fetch:async()=>({sid,from:business,to:contacts.phone,status:'delivered'})});messages.create=async value=>{smsSent.push(value);return {sid:'SM'+'a'.repeat(32),status:'queued'}};messages.list=async scope=>{assert.equal(scope.from,contacts.phone);assert.equal(scope.to,business);assert.ok(scope.dateSentAfter instanceof Date);return incoming};globalThis.fixtureTwilio={messages}
})
async function create(kind,number=1){const data=await ok(await action({type:'payment',familyId,puppyId:'test-puppy',kind,requestId:`00000000-0000-4000-8000-${String(number).padStart(12,'0')}`}));await ok(await action({type:'checkout',familyId,paymentRequestId:data.preparedPaymentId}));return (await ok(await email.GET(request('/inbox/workspace/api/email')))).paymentRequests.find(p=>p._id===data.preparedPaymentId)}
async function settle(payment,paid=true,type='checkout.session.completed'){const session=sessions.get(payment.checkoutSessionId);session.payment_status=paid?'paid':'unpaid';session.status='complete';const payload=JSON.stringify({id:'evt_fixture'+sequence,type,livemode:false,data:{object:session}});return webhook.POST(new Request(origin+'/api/stripe/test-webhook',{method:'POST',headers:{'stripe-signature':globalThis.fixtureStripe.webhooks.generateTestHeaderString({payload,secret})},body:payload}))}

test('public customer journey uses real handlers: editable request, provider submission, verified deposit and final confirmation, with no duplicate sends',async()=>{
 const deposit=await create('deposit');assert.match(deposit.publicToken,/^[a-f0-9]{48}$/);assert.equal(deposit.checkoutUrl,origin+'/pay/'+deposit.publicToken);assert.match(sessions.get(deposit.checkoutSessionId).success_url,/\/pay\//);assert.doesNotMatch(sessions.get(deposit.checkoutSessionId).success_url,/inbox/)
 let receipt=await ok(await publicReceipt(deposit.publicToken));assert.equal(receipt.state,'ready');assert.equal(receipt.paidCents,0);assert.equal(mailSent.length,0);assert.equal(reads.length,0)
 const html=renderToStaticMarkup(React.createElement(Customer,{token:deposit.publicToken,initial:receipt,error:'',canceled:false}));assert.match(html,/non-refundable/);assert.match(html,/Jeanne/);assert.match(html,/\$1,200.00/);assert.doesNotMatch(html,/\/inbox|signed webhook|customer@example.test|inquiry-/)
 assert.equal((await checkout.GET(new Request(origin+'/checkout'),{params:Promise.resolve({token:deposit.publicToken})})).status,303)
 const draft={familyId,revision:null,value:{subject:'Your puppy deposit',body:'My unfinished friendly message.\n\n'+deposit.checkoutUrl,replyToId:null,paymentRequestId:deposit._id}}
 const result=await sendEmailDraft(familyId,draft,'00000000-0000-4000-8000-000000000031',async body=>ok(await action(body)));assert.equal(result.state,'accepted');assert.equal(mailSent.length,1);assert.equal(mailSent[0].body,draft.value.body);assert.equal(mailSent[0].body.split(deposit.checkoutUrl).length,2);assert.equal(store.documents.get('test-puppy').status,'available')
 globalThis.fixtureMailProvider.sync=async ({cursor})=>({validity:'fixture-mailbox',lastUid:2,messages:cursor.lastUid<2?[{uid:2,validity:'fixture-mailbox',messageId:'<customer-reply@example.test>',from:contacts.email,to:'jeanne@fluffytailshihtzu.com',subject:'Re: Your puppy deposit',body:'I received your request, Jeanne.',inReplyTo:mailSent[0].messageId,references:[mailSent[0].messageId],time:new Date().toISOString()}]:[]});await ok(await action({type:'sync',familyId}));const replies=await ok(await action({type:'sync',familyId}));assert.equal(replies.messages.filter(m=>m.messageId==='<customer-reply@example.test>').length,1)
 await ok(await settle(deposit));assert.equal(mailSent.length,2);assert.match(mailSent[1].body,/Total paid: \$400.00/);assert.match(mailSent[1].body,/Remaining balance: \$1200.00/);assert.equal(mailSent[1].paymentConfirmationSessionId,deposit.checkoutSessionId)
 await ok(await settle(deposit));assert.equal(mailSent.length,2)
 receipt=await ok(await publicReceipt(deposit.publicToken));assert.equal(receipt.state,'confirmed');assert.equal(receipt.reserved,true);assert.equal(receipt.remainingCents,120000);assert.equal(receipt.confirmation,'submitted')
 const final=await create('balance',2);assert.equal(final.amountCents,120000);await ok(await settle(final));await ok(await settle(final));assert.equal(mailSent.length,3);assert.match(mailSent[2].body,/Paid in full/);assert.match(mailSent[2].body,/Remaining balance: \$0.00/)
 receipt=await ok(await publicReceipt(final.publicToken));assert.equal(receipt.paidCents,160000);assert.equal(receipt.remainingCents,0);assert.equal(store.documents.get('test-puppy').status,'reserved');assert.equal([...store.documents.values()].filter(d=>d._type==='paymentRecord').length,2)
 const old=await ok(await publicReceipt(deposit.publicToken));assert.equal(old.checkoutUrl,null);assert.equal(old.remainingCents,0);assert.equal((await checkout.GET(new Request(origin+'/checkout'),{params:Promise.resolve({token:deposit.publicToken})})).headers.get('location'),origin+'/pay/'+deposit.publicToken)
})

test('canceled, unpaid pending, expired and invalid links retain truthful balances; an expired checkout can be replaced',async()=>{
 const payment=await create('deposit');let receipt=await ok(await publicReceipt(payment.publicToken));assert.match(renderToStaticMarkup(React.createElement(Customer,{token:payment.publicToken,initial:receipt,error:'',canceled:true})),/Checkout was canceled/)
 sessions.get(payment.checkoutSessionId).status='expired';receipt=await ok(await publicReceipt(payment.publicToken));assert.equal(receipt.state,'expired');assert.equal(receipt.checkoutUrl,null)
 const replacement=await create('deposit',2);assert.notEqual(replacement._id,payment._id);assert.notEqual(replacement.checkoutSessionId,payment.checkoutSessionId)
 await ok(await settle(replacement,false));receipt=await ok(await publicReceipt(replacement.publicToken));assert.equal(receipt.state,'pending');assert.equal(receipt.paidCents,0);assert.equal(receipt.checkoutUrl,null);assert.equal(mailSent.length,0);assert.equal(store.documents.get('test-puppy').status,'available')
 assert.equal((await publicReceipt('bad-link')).status,404);process.env.VERCEL_ENV='production';assert.equal((await publicReceipt(payment.publicToken)).status,404)
})

test('uncertain confirmation remains for review and duplicate webhooks never retry it or change an unfinished draft',async()=>{
 const payment=await create('deposit');mailOutcome='uncertain';store.documents.get(workspaceId(familyId)).drafts.Email='Still writing this message'
 await ok(await settle(payment));await ok(await settle(payment));assert.equal(mailSent.length,1);const outgoing=[...store.documents.values()].find(d=>d.paymentConfirmationSessionId===payment.checkoutSessionId);assert.equal(outgoing.state,'uncertain');assert.equal(store.documents.get(workspaceId(familyId)).drafts.Email,'Still writing this message')
 const response=await ok(await action({type:'dispatch',reviewId:outgoing.reviewId,confirmed:true}));assert.equal(response.outgoing.find(o=>o._id===outgoing._id).state,'uncertain');assert.equal(mailSent.length,1);assert.equal((await ok(await publicReceipt(payment.publicToken))).confirmation,'uncertain')
})

test('test SMS requires recorded consent, uses only approved contacts, imports future scoped replies once, and honors STOP',async()=>{
 const body='TEST payment question from Jeanne'
 await mutate({type:'draft',familyId,channel:'Text',body,base:''});assert.equal((await sms.POST(request('/inbox/workspace/api/sms',{familyId,body,confirmed:true}))).status,403);assert.equal(smsSent.length,0)
 assert.equal(await mutate({type:'test-sms-consent',familyId,acknowledged:true}),true);assert.equal(store.documents.get('test-inquiry').smsConsent,true)
 const sent=await sendTextDraft(familyId,body,body,mutate,async input=>ok(await sms.POST(request('/inbox/workspace/api/sms',input))));assert.equal(sent.state,'accepted');assert.equal(smsSent.length,1);assert.equal(smsSent[0].to,contacts.phone);assert.equal(smsSent[0].from,business)
 incoming=[{sid:'SM'+'b'.repeat(32),from:contacts.phone,to:business,body:'Test reply received',dateSent:new Date(Date.now()+1000)},{sid:'SM'+'c'.repeat(32),from:'+15555550999',to:business,body:'Unrelated',dateSent:new Date(Date.now()+1000)},{sid:'SM'+'d'.repeat(32),from:contacts.phone,to:business,body:'Earlier history',dateSent:new Date(0)}]
 await ok(await action({type:'refresh',familyId}));await ok(await action({type:'refresh',familyId}));let data=await ok(await state.GET(request('/inbox/workspace/api/state')));assert.equal(data.families[0].profile.messages.filter(m=>m.kind==='sms'&&m.direction==='in').length,1);assert.equal(data.families[0].profile.messages.find(m=>m.kind==='sms'&&m.direction==='out').delivery,'delivered')
 incoming.push({sid:'SM'+'e'.repeat(32),from:contacts.phone,to:business,body:'STOP',dateSent:new Date(Date.now()+2000)});await ok(await action({type:'refresh',familyId}));await mutate({type:'draft',familyId,channel:'Text',body:'Another test',base:''});assert.equal((await sms.POST(request('/inbox/workspace/api/sms',{familyId,body:'Another test',confirmed:true}))).status,403);assert.equal(smsSent.length,1)
 data=await ok(await state.GET(request('/inbox/workspace/api/state')));assert.match(data.families[0].profile.smsBlockedReason,/opted out/)
})

test('transport cannot target another family or widen activation to arbitrary contacts',async()=>{
 store.documents.get(workspaceId(familyId)).profile.email='someone-else@example.test';store.documents.get(workspaceId(familyId)).drafts.Text='No send'
 assert.equal((await sms.POST(request('/inbox/workspace/api/sms',{familyId,body:'No send',confirmed:true}))).status,403)
 assert.equal(await mutate({type:'test-sms-consent',familyId,acknowledged:true}),false)
 const real=await import('../lib/test-customer.ts');assert.throws(()=>real.testCustomerContacts(),/approved test contact configuration/)
 assert.equal(mailSent.length,0);assert.equal(smsSent.length,0);assert.equal(reads.length,0)
})


test('a failed confirmation is retained, never retried by duplicate callbacks, and only an explicit staff retry submits it again',async()=>{
 const payment=await create('deposit');mailOutcome='rejected';await ok(await settle(payment));await ok(await settle(payment));assert.equal(mailSent.length,1)
 const outgoing=[...store.documents.values()].find(d=>d.paymentConfirmationSessionId===payment.checkoutSessionId);assert.equal(outgoing.state,'failed');mailOutcome='accepted'
 await Promise.all([action({type:'dispatch',reviewId:outgoing.reviewId,confirmed:true}),action({type:'dispatch',reviewId:outgoing.reviewId,confirmed:true})]);assert.equal(mailSent.length,2)
 const stored=store.documents.get(outgoing._id);assert.equal(stored.state,'accepted');assert.equal(stored.delivery,'unconfirmed');assert.equal(stored.attempts.length,2);assert.equal([...store.documents.values()].filter(d=>d._type==='paymentRecord').length,1)
})


test('Twilio opt-out rejection keeps the saved draft and explains START without retrying',async()=>{
 await mutate({type:'test-sms-consent',familyId,acknowledged:true});await mutate({type:'draft',familyId,channel:'Text',body:'Owner test text',base:''})
 globalThis.fixtureTwilio.messages.create=async()=>{throw Object.assign(new Error('Fixture opted out'),{status:400,code:21610})}
 const response=await sms.POST(request('/inbox/workspace/api/sms',{familyId,body:'Owner test text',confirmed:true}));assert.equal(response.status,403);assert.match((await response.json()).error,/START/);assert.equal(store.documents.get(workspaceId(familyId)).drafts.Text,'Owner test text');assert.equal([...store.documents.values()].find(d=>d._type==='smsMessage').status,'failed')
})


test('a signed delayed-payment failure releases only its unpaid test request, never creates a receipt, and allows a new request',async()=>{
 const payment=await create('deposit');await ok(await settle(payment,false,'checkout.session.async_payment_failed'));await ok(await settle(payment,false,'checkout.session.async_payment_failed'))
 const receipt=await ok(await publicReceipt(payment.publicToken));assert.equal(receipt.state,'failed');assert.equal(receipt.paidCents,0);assert.equal(receipt.checkoutUrl,null);assert.equal(mailSent.length,0);assert.equal(store.documents.get('test-puppy').status,'available')
 const next=await create('deposit',2);assert.notEqual(next.checkoutSessionId,payment.checkoutSessionId);assert.equal(next.amountCents,40000)
})


test('an earlier Stripe-paid payment awaiting its callback blocks replacement requests even after the saved link expires',async()=>{
 const payment=await create('deposit');sessions.get(payment.checkoutSessionId).payment_status='paid';sessions.get(payment.checkoutSessionId).status='complete'
 store.documents.get(payment._id).expiresAt=new Date(0).toISOString();for(const link of store.documents.values())if(link._type==='depositLink')link.expiresAt=new Date(0).toISOString()
 const response=await action({type:'payment',familyId,puppyId:'test-puppy',kind:'deposit',requestId:'00000000-0000-4000-8000-000000000099'});assert.equal(response.status,409);assert.match((await response.json()).error,/awaiting confirmation/);assert.equal(sessions.size,1);assert.equal(mailSent.length,0);assert.equal(store.documents.get('test-puppy').status,'available')
})
