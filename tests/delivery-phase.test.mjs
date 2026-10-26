import './register-typescript.mjs'
import {test,beforeEach} from 'node:test'
import assert from 'node:assert/strict'
import {workspaceStoreFixture} from './workspace-store-fixture.mjs'
const state=await import('../app/inbox/workspace/api/state/route.ts')
const email=await import('../app/inbox/workspace/api/email/route.ts')
const mint=await import('../app/inbox/workspace/api/access/route.ts')
const redeem=await import('../app/inbox/access/api/route.ts')
const {requireOperator}=await import('../lib/operator-auth.ts')
const {workspaceId}=await import('../sanity/lib/workspace.ts')
const origin='https://preview.example.test'
const authorization='Basic '+Buffer.from('operator:fixture-password').toString('base64')
const inquiryId='private.inquiry.'+'a'.repeat(64),familyId='inquiry-'+'a'.repeat(64)
let store,sessions,created
const req=(path,body,extra={})=>new Request(origin+path,{method:body?'POST':'GET',headers:{authorization,origin,'content-type':'application/json',...extra},body:body?JSON.stringify(body):undefined})
const send=body=>email.POST(req('/inbox/workspace/api/email',body))
async function json(response){assert.equal(response.status,200,await response.clone().text());return response.json()}
beforeEach(()=>{
 Object.assign(process.env,{VERCEL_ENV:'preview',NEXT_PUBLIC_SANITY_PROJECT_ID:'gu1xkpsg',NEXT_PUBLIC_SANITY_DATASET:'synthetic',INBOX_BASIC_AUTH_USER:'operator',INBOX_BASIC_AUTH_PASS:'fixture-password',FLUFFYTAIL_WRITE_FREEZE:'0',FLUFFYTAIL_MAIL_MODE:'fictional',FLUFFYTAIL_STRIPE_TEST_ENABLED:'1',STRIPE_SECRET_KEY:'sk_test_offline_fixture'})
 store=workspaceStoreFixture([{_id:inquiryId,_type:'puppyInquiry',source:'fluffytail-native',submittedAt:'2026-10-26T20:00:00Z',name:'Synthetic Family',email:'synthetic@example.test',phone:'',preferredContactMethod:'Email',smsConsent:false,message:'Please tell us about Preview Puppy.',puppyId:'preview-puppy'},{_id:'preview-litter',_type:'litter',title:'Test litter',price:1600,deposit:400,status:'current',isVisible:true},{_id:'preview-puppy',_rev:'puppy-rev',_type:'puppy',name:'Preview Puppy',slug:{current:'preview-puppy'},status:'available',isVisible:true,litter:{_ref:'preview-litter'}}]);globalThis.fixtureOperatorClient=store;delete globalThis.fixtureMailProvider;sessions=new Map();created=0
 globalThis.fixtureStripe={checkout:{sessions:{create:async(body,options)=>{created++;assert.ok(options.idempotencyKey);const session={id:'cs_test_delivery',livemode:false,currency:'usd',amount_total:body.line_items[0].price_data.unit_amount,metadata:body.metadata,payment_status:'unpaid',url:'https://checkout.stripe.com/c/pay/cs_test_delivery'};sessions.set(session.id,session);return session},retrieve:async id=>structuredClone(sessions.get(id))}}}
})
async function connect(){return json(await state.POST(req('/inbox/workspace/api/state',{type:'sync-inquiries'})))}
async function payment(){await connect();return (await json(await send({type:'payment',familyId,puppyId:'preview-puppy',kind:'deposit',requestId:'00000000-0000-4000-8000-000000000401'}))).preparedPaymentId}
test('submitted inquiry projects once into persistent family/conversation; repeated refresh preserves staff edits and never reserves',async()=>{
 const first=await connect();assert.equal(first.families.length,1);const f=first.families[0];assert.equal(f.familyKey,familyId);assert.equal(f.profile.messages[0].id,inquiryId);assert.equal(f.profile.puppyId,undefined);assert.equal(f.profile.interestPuppyId,'preview-puppy')
 await json(await state.POST(req('/inbox/workspace/api/state',{type:'note',familyId,body:'Keep this note',requestId:'00000000-0000-4000-8000-000000000402'})))
 const mail=await json(await email.GET(req('/inbox/workspace/api/email')));assert.equal(mail.drafts.length,1)
 await json(await send({type:'save',familyId,revision:null,value:{subject:'Your inquiry',body:'Hello, we can discuss the next step. Jeanne',replyToId:null,paymentRequestId:null}}))
 await connect();assert.equal(store.documents.get(workspaceId(familyId)).notes[0].text,'Keep this note');assert.equal(store.documents.get('preview-puppy').status,'available');assert.equal([...store.documents.values()].filter(d=>d._type==='staffFamily').length,1)
 const restored=workspaceStoreFixture([...store.documents.values()]);globalThis.fixtureOperatorClient=restored;const reload=await json(await email.GET(req('/inbox/workspace/api/email')));assert.equal(reload.drafts[0].value.body,'Hello, we can discuss the next step. Jeanne');assert.equal(reload.drafts[0].value.replyToId,null)
})
test('inquiry identities do not merge by shared email; non-private and real identities are not imported into synthetic workspace',async()=>{
 const original=store.documents.get(inquiryId);for(const [id,address] of [['private.inquiry.'+'b'.repeat(64),original.email],['legacy-inquiry','real@example.com'],['private.inquiry.'+'c'.repeat(64),'real@example.com']])store.documents.set(id,{...original,_id:id,email:address})
 const result=await connect();assert.equal(result.families.length,2);assert.notEqual(result.families[0].familyKey,result.families[1].familyKey)
})
test('actual handlers create idempotent test checkout, attach stable request, verify provider status independently and never mutate ledger/inventory',async()=>{
 const id=await payment();const action={type:'checkout',familyId,paymentRequestId:id};await json(await send(action));await json(await send(action));assert.equal(created,1)
 let record=store.documents.get(id);assert.equal(record.checkoutSessionId,'cs_test_delivery');assert.equal(record.paymentVerification,'unverified');assert.equal(record.amountCents,40000)
 const draft={subject:'Details for your puppy',body:'Here is the test deposit request we discussed.',replyToId:null,paymentRequestId:id}
 const saved=await json(await send({type:'save',familyId,revision:null,value:draft}));const reviewed=await json(await send({type:'review',familyId,revision:saved.drafts[0].revision,requestId:'00000000-0000-4000-8000-000000000403'}));assert.match(reviewed.reviews[0].body,/\/pay\//)
 await json(await send({type:'verify',familyId,paymentRequestId:id}));assert.equal(store.documents.get(id).paymentVerification,'test-unpaid')
 sessions.get('cs_test_delivery').payment_status='paid';await json(await send({type:'verify',familyId,paymentRequestId:id}));record=store.documents.get(id);assert.equal(record.paymentVerification,'test-paid');assert.equal(store.documents.get('preview-puppy').status,'available');assert.equal([...store.documents.values()].filter(d=>d._type==='paymentRecord').length,0);assert.equal(reviewed.outgoing[0].state,'prepared')
})
test('test checkout rejects live credentials, mismatched provider associations, another family, stale quotes and unconfirmed balance',async()=>{
 const id=await payment(),action={type:'checkout',familyId,paymentRequestId:id}
 process.env.STRIPE_SECRET_KEY='sk_live_never_used';assert.equal((await send(action)).status,503);assert.equal(created,0);process.env.STRIPE_SECRET_KEY='sk_test_fixture'
 await json(await send(action));sessions.get('cs_test_delivery').livemode=true;assert.equal((await send({type:'verify',familyId,paymentRequestId:id})).status,409);assert.equal(store.documents.get(id).paymentVerification,'unverified');sessions.get('cs_test_delivery').livemode=false;sessions.get('cs_test_delivery').metadata.staffFamilyId='wrong';assert.equal((await send({type:'verify',familyId,paymentRequestId:id})).status,409)
 assert.equal((await send({...action,familyId:'inquiry-'+'e'.repeat(64)})).status,409)
 store.documents.get('preview-litter').deposit=500;assert.equal((await send(action)).status,409)
 assert.equal((await send({type:'payment',familyId,puppyId:'preview-puppy',kind:'balance',requestId:'00000000-0000-4000-8000-000000000404'})).status,409)
})
test('one-time owner access grants are revision claimed, host scoped and cannot access existing Inbox or Production',async()=>{
 const link=await json(await mint.POST(req('/inbox/workspace/api/access',{}))),token=new URL(link.url).hash.slice(1)
 const request=()=>req('/inbox/access/api',{token},{authorization:''})
 const results=await Promise.all([redeem.POST(request()),redeem.POST(request())]);assert.deepEqual(results.map(r=>r.status).sort(),[200,401]);const cookie=results.find(r=>r.status===200).headers.get('set-cookie').split(';')[0];assert.match(results.find(r=>r.status===200).headers.get('set-cookie'),/HttpOnly/)
 assert.equal(requireOperator(new Request(origin+'/inbox/workspace/api/state',{headers:{cookie}})),null)
 assert.equal(requireOperator(new Request(origin+'/inbox',{headers:{cookie}})).status,401)
 assert.equal(requireOperator(new Request('https://other.example.test/inbox/workspace',{headers:{cookie}})).status,401)
 assert.equal((await redeem.POST(req('/inbox/access/api',{token},{origin:'https://evil.test'}))).status,403)
 process.env.VERCEL_ENV='production';assert.equal(requireOperator(new Request(origin+'/inbox/workspace',{headers:{cookie}})).status,401);assert.equal((await redeem.POST(request())).status,404)
})
