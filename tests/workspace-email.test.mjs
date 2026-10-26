import './register-typescript.mjs'
import assert from 'node:assert/strict'
import {test,beforeEach} from 'node:test'
import {workspaceStoreFixture} from './workspace-store-fixture.mjs'
const {GET,POST}=await import('../app/inbox/workspace/api/email/route.ts')
const {POST:statePost}=await import('../app/inbox/workspace/api/state/route.ts')
const {emailDraftId,workspacePaymentId,emailReviewId,getPaymentPreview}=await import('../sanity/lib/workspace-email.ts')
const {workspaceId}=await import('../sanity/lib/workspace.ts')
const {families,puppies}=await import('../app/inbox/workspace/model.ts')
const authorization=`Basic ${Buffer.from('fixture-operator:fixture-only-password').toString('base64')}`
const origin='http://localhost:3100'
const url=origin+'/inbox/workspace/api/email'
const request=(body,extra={})=>new Request(url,{method:'POST',headers:{authorization,origin,'content-type':'application/json',...extra},body:JSON.stringify(body)})
const send=(body,extra)=>POST(request(body,extra))
const load=()=>GET(new Request(url,{headers:{authorization}}))
const rid='00000000-0000-4000-8000-000000000010'
const pid='00000000-0000-4000-8000-000000000011'
const value=(extra={})=>({subject:'Question about Maple',body:'Hello, here are the details we discussed.',replyToId:null,paymentRequestId:null,...extra})
let store
beforeEach(async()=>{
  Object.assign(process.env,{INBOX_BASIC_AUTH_USER:'fixture-operator',INBOX_BASIC_AUTH_PASS:'fixture-only-password',VERCEL_ENV:'preview',NEXT_PUBLIC_SANITY_PROJECT_ID:'gu1xkpsg',NEXT_PUBLIC_SANITY_DATASET:'synthetic',FLUFFYTAIL_WRITE_FREEZE:'0'})
  store=workspaceStoreFixture();globalThis.fixtureOperatorClient=store
  assert.equal((await statePost(new Request(origin+'/inbox/workspace/api/state',{method:'POST',headers:{authorization,origin,'content-type':'application/json'},body:JSON.stringify({type:'initialize'})}))).status,200)
})
const save=async(familyId,email,revision=null)=>{
  const response=await send({type:'save',familyId,revision,value:email})
  assert.equal(response.status,200,await response.clone().text())
  return (await response.json()).drafts.find(d=>d.familyId===familyId)
}

test('mail reads are private/read-only; saved legacy bodies load without an implicit migration',async()=>{
  store.documents.get(workspaceId('avery')).drafts.Email='Keep the older saved text'
  const before=store.documents.size
  const response=await load();assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/private.*no-store/)
  const data=await response.json();assert.equal(data.sendingEnabled,false);assert.equal(data.drafts.find(d=>d.familyId==='avery').value.body,'Keep the older saved text');assert.equal(store.documents.size,before)
})
test('compose and reply drafts survive reload, retain the subject/context, and refuse stale overwrite',async()=>{
  const first=await save('avery',value({replyToId:'a1'}))
  assert.ok(first.revision)
  assert.equal((await save('avery',value({replyToId:'a1'}))).revision,first.revision)
  const second=await save('avery',value({body:'Another tab revised this.',replyToId:'a1'}),first.revision)
  const conflict=await send({type:'save',familyId:'avery',revision:first.revision,value:value({body:'Do not discard my version.',replyToId:'a1'})})
  assert.equal(conflict.status,409);assert.equal((await conflict.json()).conflict.revision,second.revision)
  assert.equal(store.documents.get(emailDraftId('avery')).value.body,'Another tab revised this.')
  globalThis.fixtureOperatorClient=workspaceStoreFixture([...store.documents.values()])
  const reloaded=(await (await load()).json()).drafts.find(d=>d.familyId==='avery');assert.equal(reloaded.value.replyToId,'a1');assert.equal(reloaded.value.subject,'Question about Maple')
})
test('review snapshots enforce Jeanne sender/Reply-To, canonical recipient and correct reply headers without a send',async()=>{
  const draft=await save('avery',value({replyToId:'a1'}))
  const action={type:'review',familyId:'avery',revision:draft.revision,requestId:rid}
  assert.equal((await send(action)).status,200);assert.equal((await send(action)).status,200)
  const outbox=store.documents.get(emailReviewId(rid))
  assert.equal(outbox.from,'jeanne@fluffytailshihtzu.com');assert.equal(outbox.replyTo,outbox.from);assert.equal(outbox.to,'avery@example.test');assert.equal(outbox.inReplyTo,'<review-v1.a1@fluffytailshihtzu.example.test>');assert.deepEqual(outbox.references,[outbox.inReplyTo]);assert.equal(outbox.status,'held');assert.equal(outbox.testOnly,true)
  assert.equal([...store.documents.values()].filter(d=>d._type==='staffEmailReview').length,1)
  assert.equal((await send({...action,familyId:'jordan'})).status,409)
})
test('forged sender, recipient, headers, other-family replies and live addresses are rejected',async()=>{
  for(const email of [value({subject:'Hello\r\nBcc: victim@example.test'}),value({from:'other@example.test'}),value({replyToId:'j1'})])assert.equal((await send({type:'save',familyId:'avery',revision:null,value:email})).status,email.replyToId==='j1'?409:400)
  assert.equal((await send({type:'save',familyId:'avery',revision:null,value:value(),to:'different@example.test'})).status,400)
  store.documents.get(workspaceId('avery')).profile.email='real-address@fluffytailshihtzu.com'
  assert.equal((await send({type:'save',familyId:'avery',revision:null,value:value()})).status,409)
})
test('all direct customer-send requests remain blocked without provider or record changes',async()=>{
  const before=structuredClone([...store.documents.values()])
  for(const type of ['send','deliver'])assert.equal((await send({type,familyId:'avery',requestId:rid})).status,403)
  assert.deepEqual([...store.documents.values()],before)
})
test('balance email uses only server amounts and binds a test link to the correct family/puppy',async()=>{
  const before=structuredClone(families)
  const response=await send({type:'payment',familyId:'morgan',puppyId:'pippin',kind:'balance',requestId:pid});assert.equal(response.status,200)
  const id=(await response.json()).preparedPaymentId
  const payment=store.documents.get(id);assert.equal(payment.amountCents,120000);assert.equal(payment.paidCents,40000);assert.equal(payment.totalCents,160000)
  const draft=await save('morgan',value({paymentRequestId:id}))
  const review=await send({type:'review',familyId:'morgan',revision:draft.revision,requestId:rid});assert.equal(review.status,200)
  const held=store.documents.get(emailReviewId(rid));assert.match(held.body,/TEST PAYMENT REQUEST/);assert.match(held.body,/1200\.00/);assert.match(held.body,/http:\/\/localhost:3100\/inbox\/workspace\/payment-preview\//);assert.doesNotMatch(held.body,/checkout\.stripe\.com/)
  assert.equal((await send({type:'save',familyId:'avery',revision:null,value:value({paymentRequestId:id})})).status,409)
  assert.deepEqual(families,before)
})
test('deposit eligibility, missing associations, client amount overrides and changed/expired quotes fail closed',async()=>{
  assert.equal((await send({type:'payment',familyId:'avery',puppyId:'maple',kind:'deposit',requestId:pid})).status,409)
  assert.equal((await send({type:'payment',familyId:'riley',puppyId:'clover',kind:'balance',requestId:pid})).status,409)
  assert.equal((await send({type:'payment',familyId:'riley',puppyId:'clover',kind:'deposit',requestId:pid,amountCents:1})).status,400)
  assert.equal((await send({type:'payment',familyId:'riley',puppyId:'clover',kind:'deposit',requestId:pid})).status,200)
  const payment=store.documents.get(workspacePaymentId(pid));assert.equal(payment.amountCents,40000)
  payment.expiresAt='2000-01-01T00:00:00.000Z'
  const draft=await save('riley',value({paymentRequestId:payment._id}))
  assert.equal((await send({type:'review',familyId:'riley',revision:draft.revision,requestId:rid})).status,409)
  assert.equal(store.documents.get(emailDraftId('riley')).value.body,value().body)
})
test('operator auth, CSRF, freeze and production/dataset barriers cover both email reads and writes',async()=>{
  assert.equal((await GET(new Request(url))).status,401)
  assert.equal((await send({type:'send'},{origin:'https://untrusted.example'})).status,403)
  process.env.FLUFFYTAIL_WRITE_FREEZE='1';assert.equal((await send({type:'save',familyId:'avery',revision:null,value:value()})).status,503)
  process.env.FLUFFYTAIL_WRITE_FREEZE='0';process.env.VERCEL_ENV='production';assert.equal((await load()).status,503)
  process.env.VERCEL_ENV='preview';process.env.NEXT_PUBLIC_SANITY_PROJECT_ID='3glz6dkx';assert.equal((await send({type:'save',familyId:'avery',revision:null,value:value()})).status,503)
})

test('a changed price invalidates both the test link and email review without rewriting its historical quote',async()=>{
  await send({type:'payment',familyId:'morgan',puppyId:'pippin',kind:'balance',requestId:pid})
  const request=store.documents.get(workspacePaymentId(pid))
  const draft=await save('morgan',value({paymentRequestId:request._id}))
  const puppy=puppies.find(p=>p.id==='pippin'),original=puppy.price
  try{
    puppy.price=1700
    await assert.rejects(getPaymentPreview(pid),{status:409})
    assert.equal((await send({type:'review',familyId:'morgan',revision:draft.revision,requestId:rid})).status,409)
    assert.equal(request.totalCents,160000);assert.equal(request.amountCents,120000)
  }finally{puppy.price=original}
})

test('unknown, expired and production test-link requests fail closed; valid requests cannot collect money',async()=>{
  await assert.rejects(getPaymentPreview('unknown'),{status:404})
  await send({type:'payment',familyId:'morgan',puppyId:'pippin',kind:'balance',requestId:pid})
  const result=await getPaymentPreview(pid);assert.equal(result.familyName,'Morgan Lane');assert.equal(result.request.testOnly,true)
  store.documents.get(workspacePaymentId(pid)).expiresAt='2000-01-01T00:00:00Z'
  await assert.rejects(getPaymentPreview(pid),{status:409})
  process.env.VERCEL_ENV='production';await assert.rejects(getPaymentPreview(pid),{status:503})
})
