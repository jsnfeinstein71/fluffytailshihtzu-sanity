import './register-typescript.mjs'
import {test,beforeEach} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import Stripe from 'stripe'
import {workspaceStoreFixture} from './workspace-store-fixture.mjs'
const route=await import('../app/inbox/workspace/api/litter-reservations/route.ts'),hook=await import('../app/api/stripe/test-webhook/route.ts'),email=await import('../app/inbox/workspace/api/email/route.ts'),customer=await import('../app/api/test-payment/[token]/route.ts')
const core=await import('../sanity/lib/litter-reservations.ts'),{workspaceId}=await import('../sanity/lib/workspace.ts')
const origin='https://litter-reservations.example.test',secret='whsec_litter_fixture_only',authorization='Basic '+Buffer.from('staff:fixture').toString('base64')
let db,sessions,intents,seq
const familyId=n=>'inquiry-'+String(n).repeat(64)
const req=(body,auth=true)=>new Request(origin+'/inbox/workspace/api/litter-reservations',{method:'POST',headers:{origin,'content-type':'application/json',...(auth?{authorization}:{})},body:JSON.stringify(body)})
async function action(body){const r=await route.POST(req(body));assert.equal(r.status,200,await r.clone().text());return await r.json()}
async function offer(n=1,litterId='fictional-autumn'){const result=await action({type:'offer',familyId:familyId(n),litterId,position:1,preferences:'Female preferred; timing flexible.',requestId:randomUUID(),confirmed:true});return result.paymentRequest}
function event(sessionId,type='checkout.session.completed',paid=true){const s=sessions.get(sessionId);if(paid){s.payment_status='paid';s.status='complete'}return {id:'evt_'+randomUUID(),object:'event',type,livemode:false,data:{object:structuredClone(s)}}}
async function deliver(e,valid=true){const payload=JSON.stringify(e),signature=valid?globalThis.fixtureStripe.webhooks.generateTestHeaderString({payload,secret}):'invalid';const r=await hook.POST(new Request(origin+'/api/stripe/test-webhook',{method:'POST',headers:{'stripe-signature':signature},body:payload}));assert.equal(r.status,valid?200:400,await r.clone().text());return r.json()}
beforeEach(()=>{
 Object.assign(process.env,{INQUIRY_FORM_SECRET:'fixture-litter-inquiry-secret-at-least-32-characters',VERCEL_ENV:'preview',NEXT_PUBLIC_SANITY_PROJECT_ID:'gu1xkpsg',NEXT_PUBLIC_SANITY_DATASET:'synthetic',STAFF_PASSKEY_MODE:'off',FLUFFYTAIL_LITTER_RESERVATIONS_ENABLED:'1',FLUFFYTAIL_PAYMENT_TEST_WORKSPACE:'1',FLUFFYTAIL_STRIPE_TEST_ENABLED:'1',FLUFFYTAIL_STRIPE_TEST_SECRET_KEY:'sk_test_litter_fixture',FLUFFYTAIL_STRIPE_TEST_WEBHOOK_SECRET:secret,FLUFFYTAIL_PAYMENT_TEST_ORIGIN:origin,FLUFFYTAIL_WRITE_FREEZE:'0',INBOX_BASIC_AUTH_USER:'staff',INBOX_BASIC_AUTH_PASS:'fixture'})
 delete process.env.FLUFFYTAIL_TEST_CUSTOMER_COMMUNICATIONS;delete globalThis.fixtureTestContacts
 db=workspaceStoreFixture();globalThis.fixtureOperatorClient=db;sessions=new Map();intents=new Map();seq=0
 for(const id of ['fictional-autumn','fictional-spring'])db.documents.set(id,{_id:id,_rev:'litter-v1',_type:'litter',title:id+' — TEST',status:'planned',price:1900,deposit:350,isVisible:true,litterReservationTest:true})
 for(const n of [1,2,3,4,5]){const id=familyId(n);db.documents.set(workspaceId(id),{_id:workspaceId(id),_rev:'family-'+n,_type:'staffFamily',workspace:'review-v1',schemaVersion:1,familyKey:id,profile:{id,name:'Fictional Family '+n,email:'family'+n+'@example.test',phone:'',source:'inquiry',preference:'Email',smsConsent:false,paymentTestScenario:'litter-reservations-20261028',initials:'FF',location:'Test home',stage:'Litter inquiry',next:'Discuss',messages:[],records:[],unread:false},drafts:{Email:'',Text:''},notes:[],checks:[]})}
 db.documents.set('fictional-puppy',{_id:'fictional-puppy',_rev:'puppy-v1',_type:'puppy',name:'Practice Willow — TEST',slug:{current:'practice-willow-litter'},status:'available',litter:{_ref:'fictional-spring'},paymentTestScenario:'litter-reservations-20261028',isVisible:true})
 globalThis.fixtureStripe={webhooks:new Stripe('sk_test_fixture').webhooks,paymentIntents:{retrieve:async id=>structuredClone(intents.get(id))},checkout:{sessions:{create:async(data,opts)=>{const same=[...sessions.values()].find(s=>s.idempotency===opts?.idempotencyKey);if(same)return structuredClone(same);const s={...structuredClone(data),id:'cs_test_litter'+(++seq),livemode:false,currency:'usd',amount_total:data.line_items[0].price_data.unit_amount,url:'https://checkout.stripe.com/c/pay/cs_test_litter'+seq,status:'open',payment_status:'unpaid',idempotency:opts?.idempotencyKey};sessions.set(s.id,s);return structuredClone(s)},retrieve:async id=>structuredClone(sessions.get(id)),expire:async id=>{const s=sessions.get(id);s.status='expired';return structuredClone(s)}}}}
})
test('staff handler denies anonymous access, public status is four safe entries and configured quote is used',async()=>{
 assert.equal((await route.POST(req({},false))).status,401)
 const p=await offer();assert.equal(p.amountCents,35000);assert.equal(p.totalCents,190000)
 const pub=await core.publicLitterPlaces('fictional-autumn');assert.equal(pub.length,4);assert.equal(pub[0].status,'Pending deposit');assert.deepEqual(Object.keys(pub[0]),['position','status']);assert(!JSON.stringify(pub).includes('private.'))
 const r=await customer.GET(new Request(origin+'/api/test-payment/'+p.publicToken),{params:Promise.resolve({token:p.publicToken})});assert.equal(r.status,200);const receipt=await r.json();assert.equal(receipt.litterReservation,true);assert.equal(receipt.reserved,false);assert(!JSON.stringify(receipt).includes(familyId(1)))
 const {paymentRequestEmail,renderPaymentEmail}=await import('../lib/mail/payment-email.ts');const branded=renderPaymentEmail(paymentRequestEmail(p,'Fictional Family','Jeanne’s unchanged personal note.'));assert.match(branded.html,/selection position/);assert.match(branded.text,/transferable to a future litter/);assert(!branded.html.includes('Your puppy is reserved.'));assert.match(branded.text,/unchanged personal note/)
})
test('competing next-place offers serialize and an active request prevents another family claim',async()=>{
 const results=await Promise.all([route.POST(req({type:'offer',familyId:familyId(1),litterId:'fictional-autumn',position:1,preferences:'',requestId:randomUUID(),confirmed:true})),route.POST(req({type:'offer',familyId:familyId(2),litterId:'fictional-autumn',position:1,preferences:'',requestId:randomUUID(),confirmed:true}))]);assert.equal(results.filter(r=>r.status===200).length,1);assert.equal(results.filter(r=>r.status===409).length,1);assert.equal(sessions.size,1)
})
test('retryable decline and processing retain their hold, terminal expiry releases and duplicate events do not double book',async()=>{
 const p=await offer(),s=sessions.get(p.checkoutSessionId);s.payment_intent='pi_pending';intents.set('pi_pending',{livemode:false,status:'requires_payment_method'})
 await deliver(event(s.id,'checkout.session.async_payment_failed',false));assert.equal((await core.publicLitterPlaces('fictional-autumn'))[0].status,'Pending deposit')
 s.status='expired';intents.get('pi_pending').status='processing';await deliver(event(s.id,'checkout.session.expired',false));assert.equal((await core.publicLitterPlaces('fictional-autumn'))[0].status,'Pending deposit')
 intents.get('pi_pending').status='canceled';await deliver(event(s.id,'checkout.session.expired',false));assert.equal((await core.publicLitterPlaces('fictional-autumn'))[0].status,'Available')
 await deliver(event(s.id,'checkout.session.expired',false));assert.equal((await core.publicLitterPlaces('fictional-autumn'))[0].status,'Available')
})
test('verified payment reserves only its selection place, duplicate/stale failure preserves one original payment',async()=>{
 const p=await offer(),s=sessions.get(p.checkoutSessionId);await deliver(event(s.id),false);assert.equal((await core.publicLitterPlaces('fictional-autumn'))[0].status,'Pending deposit')
 const e=event(s.id);await deliver(e);await deliver(e);await deliver(event(s.id,'checkout.session.async_payment_failed',false));assert.equal((await core.publicLitterPlaces('fictional-autumn'))[0].status,'Reserved');assert.equal([...db.documents.values()].filter(d=>d._type==='paymentRecord').length,1);assert.equal(db.documents.get('fictional-puppy').status,'available')
})
test('a late paid deposit records money for review without taking another family’s occupied position',async()=>{
 const p=await offer(),s=sessions.get(p.checkoutSessionId);s.status='expired';await deliver(event(s.id,'checkout.session.expired',false));const other=await offer(2);await deliver(event(other.checkoutSessionId));await deliver(event(s.id,'checkout.session.async_payment_succeeded'))
 const r=db.documents.get(p.litterReservationId),board=await core.loadLitterReservations();assert.equal(r.state,'reconciliation');assert.equal(board.boards[0].places[0].reservationId,other.litterReservationId);assert.equal([...db.documents.values()].filter(d=>d._type==='paymentRecord').length,2)
})
test('transfer confirms the next destination place, retains existing picks and applies one original deposit to a selected puppy and final balance',async()=>{
 const occupied=await offer(2,'fictional-spring');await deliver(event(occupied.checkoutSessionId))
 const p=await offer();await deliver(event(p.checkoutSessionId));const before=[...db.documents.values()].find(d=>d._type==='paymentRecord'&&d.staffFamilyId===familyId(1));const transferId=randomUUID()
 await action({type:'transfer',id:p.litterReservationId,litterId:'fictional-spring',position:2,requestId:transferId,note:'Suitable puppy not available in first litter.',confirmed:true});await action({type:'transfer',id:p.litterReservationId,litterId:'fictional-spring',position:2,requestId:transferId,note:'',confirmed:true})
 assert.equal((await core.publicLitterPlaces('fictional-autumn'))[0].status,'Available');const spring=db.documents.get('fictional-spring');spring.status='current';spring.price=2100;spring._rev='born-v2'
 const assignId=randomUUID();await action({type:'assign',id:p.litterReservationId,puppyId:'fictional-puppy',requestId:assignId,confirmed:true});await action({type:'assign',id:p.litterReservationId,puppyId:'fictional-puppy',requestId:assignId,confirmed:true})
 assert.equal(db.documents.get('fictional-puppy').status,'reserved');assert.equal(db.documents.get(before._id).amountPaid,350);assert.equal(db.documents.get(before._id).litterId,'fictional-autumn');assert.equal(db.documents.get(before._id).puppyId,'fictional-puppy');assert.equal([...db.documents.values()].filter(d=>d._type==='litterCreditApplication').length,1)
 const body={type:'payment',familyId:familyId(1),puppyId:'fictional-puppy',kind:'balance',requestId:randomUUID()};const prepared=await email.POST(new Request(origin+'/inbox/workspace/api/email',{method:'POST',headers:{authorization,origin,'content-type':'application/json'},body:JSON.stringify(body)}));assert.equal(prepared.status,200,await prepared.clone().text());const payment=await prepared.json();const final=payment.paymentRequests.find(p=>p._id===payment.preparedPaymentId);assert.equal(final.amountCents,175000);assert.equal(final.paidCents,35000)
 const checkout=await email.POST(new Request(origin+'/inbox/workspace/api/email',{method:'POST',headers:{authorization,origin,'content-type':'application/json'},body:JSON.stringify({type:'checkout',familyId:familyId(1),paymentRequestId:final._id})}));assert.equal(checkout.status,200,await checkout.clone().text());const latest=(await checkout.json()).paymentRequests.find(p=>p._id===final._id);await deliver(event(latest.checkoutSessionId));const receipt=await customer.GET(new Request(origin+'/api/test-payment/'+latest.publicToken),{params:Promise.resolve({token:latest.publicToken})});assert.equal(receipt.status,200,await receipt.clone().text());const settled=await receipt.json();assert.equal(settled.paidCents,210000);assert.equal(settled.remainingCents,0);assert.equal([...db.documents.values()].filter(d=>d._type==='paymentRecord'&&d.staffFamilyId===familyId(1)).length,2)
 const again=await email.POST(new Request(origin+'/inbox/workspace/api/email',{method:'POST',headers:{authorization,origin,'content-type':'application/json'},body:JSON.stringify({...body,requestId:randomUUID()})}));assert.equal(again.status,409)
})
test('third in one litter becomes first in an empty future litter without renumbering confirmed positions',async()=>{
 let chosen
 for(const n of [1,2,3]){const result=await action({type:'offer',familyId:familyId(n),litterId:'fictional-autumn',position:n,preferences:'',requestId:randomUUID(),confirmed:true});await deliver(event(result.paymentRequest.checkoutSessionId));if(n===3)chosen=result.paymentRequest}
 await action({type:'transfer',id:chosen.litterReservationId,litterId:'fictional-spring',position:1,requestId:randomUUID(),note:'Suitable puppy unavailable.',confirmed:true});const source=await core.publicLitterPlaces('fictional-autumn');assert.equal(source[0].status,'Reserved');assert.equal(source[1].status,'Reserved');assert.equal(source[2].status,'Available');assert.equal(db.documents.get(chosen.litterReservationId).position,1)
})
test('free litter inquiry carries its identity into a saved family and conversation without creating a hold',async()=>{
 const {validateInquiry}=await import('../lib/inquiry.ts'),{acceptInquiry}=await import('../sanity/lib/inquiry-service.ts')
 await acceptInquiry(validateInquiry({name:'Fictional Interest Family',email:'interest@example.test',phone:'',preferredContactMethod:'Email',smsConsent:false,interest:'waitlist',litterId:'fictional-autumn',message:'We are interested but have not reserved anything.'}),'fixture-test-address')
 const f=[...db.documents.values()].find(d=>d._type==='staffFamily'&&d.profile.email==='interest@example.test');assert(f);assert.equal(f.profile.litterId,'fictional-autumn');assert.equal(f.profile.litterTitle,'fictional-autumn — TEST');assert.equal(f.profile.messages.length,1);assert.equal(f.profile.paymentTestScenario,'litter-reservations-20261028');assert.equal([...db.documents.values()].filter(d=>d._type==='litterReservation').length,0)
})
test('production and wrong-storage configuration fail closed without touching saved records',async()=>{
 process.env.NEXT_PUBLIC_SANITY_PROJECT_ID='3glz6dkx';assert.equal((await route.POST(req({type:'offer'}))).status,503);assert.equal(sessions.size,0);process.env.VERCEL_ENV='production';assert.equal((await route.POST(req({type:'offer'}))).status,503)
})


test('late credit can be explicitly placed after closing the same family’s newer unpaid offer',async()=>{
 const old=await offer(),s=sessions.get(old.checkoutSessionId);s.status='expired';await deliver(event(s.id,'checkout.session.expired',false))
 const newer=await offer();await deliver(event(s.id,'checkout.session.async_payment_succeeded'))
 const transfer={type:'transfer',confirmed:true,id:old.litterReservationId,litterId:'fictional-spring',position:1,requestId:randomUUID(),note:'Place verified late deposit after review.'}
 assert.equal((await route.POST(req(transfer))).status,409)
 await action({type:'close',id:newer.litterReservationId});await action(transfer)
 const anchor=db.documents.get(core.litterRecordId('litterFamily',familyId(1)));assert.equal(anchor.reservationId,old.litterReservationId)
 assert.equal(db.documents.get(old.litterReservationId).state,'reserved');assert.equal([...db.documents.values()].filter(d=>d._type==='paymentRecord').length,1)
})


test('unknown checkout-creation outcome keeps its hold and recovers the original idempotent session',async()=>{
 const create=globalThis.fixtureStripe.checkout.sessions.create;let uncertain=true
 globalThis.fixtureStripe.checkout.sessions.create=async(...args)=>{const result=await create(...args);if(uncertain){uncertain=false;throw new Error('Provider response lost after creation.')}return result}
 const body={type:'offer',confirmed:true,familyId:familyId(1),litterId:'fictional-autumn',position:1,preferences:'',requestId:randomUUID()}
 assert.equal((await route.POST(req(body))).status,503);assert.equal(sessions.size,1);assert.equal((await core.publicLitterPlaces('fictional-autumn'))[0].status,'Pending deposit')
 const recovered=await action(body);assert.equal(sessions.size,1);assert.equal(recovered.paymentRequest.checkoutSessionId,[...sessions.keys()][0]);assert.equal([...db.documents.values()].filter(d=>d._type==='litterReservation').length,1)
})


test('synthetic litter capability cannot be used through the live customer payment endpoint',async()=>{
 const p=await offer(),before=JSON.stringify([...db.documents]);const live=await import('../app/api/payment/[token]/route.ts');const response=await live.GET(new Request(origin+'/api/payment/'+p.publicToken),{params:Promise.resolve({token:p.publicToken})});assert.equal(response.status,404);assert.equal(JSON.stringify([...db.documents]),before)
})

test('an interrupted final-link preparation can finish the original request; reopening it does not create another checkout',async()=>{
 const p=await offer();await deliver(event(p.checkoutSessionId))
 const reserved=await core.loadLitterReservations();assert.equal(reserved.reservations[0].state,'reserved')
 const {listWorkspaceFamilies}=await import('../sanity/lib/workspace.ts');const family=(await listWorkspaceFamilies()).find(f=>f.familyKey===familyId(1));assert.equal(family.profile.stage,'Litter place reserved');assert.match(family.profile.next,/Await puppy selection/)
 await action({type:'transfer',confirmed:true,id:p.litterReservationId,litterId:'fictional-spring',position:1,requestId:randomUUID(),note:''})
 const transferred=db.documents.get(p.litterReservationId).history.find(h=>h.action==='transferred');assert.equal(transferred.fromLitterTitle,'fictional-autumn — TEST');assert.equal(transferred.toLitterTitle,'fictional-spring — TEST');assert.equal(transferred.depositCreditCents,35000)
 const storedHistory=db.documents.get(p.litterReservationId).history,legacy=storedHistory.find(h=>h.action==='transferred');delete legacy.fromLitterTitle;delete legacy.toLitterTitle;db.documents.get('fictional-autumn').status='archived';const historical=(await core.loadLitterReservations()).reservations.find(r=>r._id===p.litterReservationId).history.find(h=>h.action==='transferred');assert.equal(historical.fromLitterTitle,'fictional-autumn — TEST');assert.equal(historical.toLitterTitle,'fictional-spring — TEST');assert.equal(legacy.fromLitterTitle,undefined)
 db.documents.get('fictional-spring').status='current'
 await action({type:'assign',confirmed:true,id:p.litterReservationId,puppyId:'fictional-puppy',requestId:randomUUID()})
 const post=body=>email.POST(new Request(origin+'/inbox/workspace/api/email',{method:'POST',headers:{authorization,origin,'content-type':'application/json'},body:JSON.stringify(body)}))
 const prepared=await post({type:'payment',familyId:familyId(1),puppyId:'fictional-puppy',kind:'balance',requestId:randomUUID()}),data=await prepared.json(),id=data.preparedPaymentId
 const body={type:'checkout',familyId:familyId(1),paymentRequestId:id},create=globalThis.fixtureStripe.checkout.sessions.create
 globalThis.fixtureStripe.checkout.sessions.create=async()=>{throw Error('Temporary provider interruption')}
 assert.equal((await post(body)).status,503);assert(!db.documents.get(id).checkoutUrl)
 globalThis.fixtureStripe.checkout.sessions.create=async()=>{throw Object.assign(new Error('Claimable sandbox request rate limit exceeded. Private provider details omitted.'),{type:'StripeRateLimitError',code:'rate_limit'})};const limited=await post(body);assert.equal(limited.status,429);assert.match((await limited.json()).error,/owner must claim the existing sandbox/);assert(!db.documents.get(id).checkoutUrl)
 globalThis.fixtureStripe.checkout.sessions.create=create
 const recovered=await post(body);assert.equal(recovered.status,200,await recovered.clone().text());const final=(await recovered.json()).paymentRequests.find(p=>p._id===id);assert(final.checkoutUrl);assert.equal([...db.documents.values()].filter(d=>d._type==='staffPaymentRequest'&&d.kind==='balance').length,1)
 const count=sessions.size;globalThis.fixtureStripe.checkout.sessions.create=async()=>{throw Error('Must reuse the saved checkout')}
 assert.equal((await post(body)).status,200);assert.equal(sessions.size,count);assert.equal([...db.documents.values()].filter(d=>d._type==='paymentRecord').length,1)
})
