import './register-typescript.mjs'
import assert from 'node:assert/strict'
import {test,beforeEach} from 'node:test'
import {workspaceStoreFixture} from './workspace-store-fixture.mjs'
import {createPairAdapter} from '../lib/mail/pair-adapter.mjs'
import {Readable} from 'node:stream'
const {GET,POST}=await import('../app/inbox/workspace/api/email/route.ts')
const {POST:statePost}=await import('../app/inbox/workspace/api/state/route.ts')
const {outgoingId,mailGuardId,mailCursorId}=await import('../sanity/lib/email-workflow.ts')
const {emailDraftId}=await import('../sanity/lib/workspace-email.ts')
const {families,puppies}=await import('../app/inbox/workspace/model.ts')
const {ownerTestSubject,ownerTestBody}=await import('../sanity/lib/mail-provider.ts')
const origin='http://localhost:3100',url=origin+'/inbox/workspace/api/email'
const authorization=`Basic ${Buffer.from('fixture-operator:fixture-only-password').toString('base64')}`
const rid='00000000-0000-4000-8000-000000000020'
let store
const request=(body,headers={})=>new Request(url,{method:'POST',headers:{authorization,origin,'content-type':'application/json',...headers},body:JSON.stringify(body)})
const send=(body,headers)=>POST(request(body,headers))
const load=async()=>{const response=await GET(new Request(url,{headers:{authorization}}));assert.equal(response.status,200);return response.json()}
beforeEach(async()=>{
  Object.assign(process.env,{INBOX_BASIC_AUTH_USER:'fixture-operator',INBOX_BASIC_AUTH_PASS:'fixture-only-password',VERCEL_ENV:'preview',NEXT_PUBLIC_SANITY_PROJECT_ID:'gu1xkpsg',NEXT_PUBLIC_SANITY_DATASET:'synthetic',FLUFFYTAIL_WRITE_FREEZE:'0',FLUFFYTAIL_MAIL_MODE:'fictional'})
  delete globalThis.fixtureMailProvider
  for(const key of ['FLUFFYTAIL_MAIL_OWNER_TEST_APPROVAL','FLUFFYTAIL_MAIL_OWNER_TEST_STARTED_AT','FLUFFYTAIL_PAIR_MAIL_PASSWORD','FLUFFYTAIL_PAIR_SEND_ENABLED','FLUFFYTAIL_PAIR_READ_ENABLED'])delete process.env[key]
  store=workspaceStoreFixture();globalThis.fixtureOperatorClient=store
  assert.equal((await statePost(new Request(origin+'/inbox/workspace/api/state',{method:'POST',headers:{authorization,origin,'content-type':'application/json'},body:'{"type":"initialize"}'}))).status,200)
})
async function prepare(familyId='avery',requestId=rid,extra={}){
  const current=(await load()).drafts.find(d=>d.familyId===familyId)
  const value={subject:'Next steps for your puppy',body:'Hello, here are the details we discussed. Jeanne',replyToId:familyId==='avery'?'a1':null,paymentRequestId:null,...extra}
  const saved=await send({type:'save',familyId,revision:current.revision,value});assert.equal(saved.status,200,await saved.clone().text())
  const draft=(await saved.json()).drafts.find(d=>d.familyId===familyId)
  const response=await send({type:'review',familyId,revision:draft.revision,requestId});assert.equal(response.status,200,await response.clone().text())
  const data=await response.json();return data.reviews.find(r=>r.requestId===requestId)
}
const dispatch=(review,scenario='accepted')=>send({type:'dispatch',reviewId:review._id,scenario})
const fakeProvider=(overrides={})=>({capabilities:{provider:'fictional',canDispatch:true,canSync:true},send:async()=>({outcome:'accepted',code:'FAKE_ACCEPTED'}),sync:async()=>({validity:'fixture',lastUid:0,messages:[]}),...overrides})

test('application compose→review→persistent outgoing→SMTP acceptance→reply sync→reply draft works without financial changes',async()=>{
  const inventory=structuredClone({families,puppies})
  const review=await prepare()
  assert.equal(store.documents.get(outgoingId(review)).state,'prepared')
  const response=await dispatch(review);assert.equal(response.status,200,await response.clone().text())
  const outgoing=(await response.json()).outgoing[0]
  assert.equal(outgoing.state,'accepted');assert.equal(outgoing.delivery,'unconfirmed');assert.equal(outgoing.attempts.length,1)
  assert.equal(store.documents.get(emailDraftId('avery')).value.body,review.body)
  assert.equal((await send({type:'sync'})).status,200)
  const data=await load(),reply=data.messages.find(m=>m.id.startsWith('private.staffIncomingEmail.'))
  assert.equal(reply.familyId,'avery');assert.equal(reply.from,'avery@example.test');assert.deepEqual(reply.references,[outgoing.messageId])
  assert.ok(data.outgoing[0].replyReceivedAt);assert.equal(data.outgoing[0].delivery,'unconfirmed')
  const current=data.drafts.find(d=>d.familyId==='avery')
  const saved=await send({type:'save',familyId:'avery',revision:current.revision,value:{...current.value,replyToId:reply.id,subject:'Re: Next steps for your puppy',body:'Thank you for replying. Jeanne'}})
  assert.equal(saved.status,200)
  const draft=(await saved.json()).drafts.find(d=>d.familyId==='avery')
  const replyReview=await send({type:'review',familyId:'avery',revision:draft.revision,requestId:'00000000-0000-4000-8000-000000000021'});assert.equal(replyReview.status,200)
  const replyData=await replyReview.json(),outgoingReply=replyData.outgoing[0]
  assert.equal(outgoingReply.inReplyTo,reply.messageId)
  assert.equal((await send({type:'dispatch',reviewId:outgoingReply.reviewId,scenario:'accepted'})).status,200)
  assert.equal((await send({type:'sync'})).status,200)
  assert.equal((await load()).messages.filter(m=>m.id.startsWith('private.staffIncomingEmail.')&&m.familyId==='avery').length,2)
  assert.deepEqual({families,puppies},inventory)
})

test('repeated/concurrent application dispatch and lost HTTP acknowledgement submit one persistent attempt only',async()=>{
  const review=await prepare();let calls=0,release
  globalThis.fixtureMailProvider=fakeProvider({send:async()=>{calls++;await new Promise(resolve=>{release=resolve});return {outcome:'accepted',code:'FAKE_ACCEPTED'}}})
  const first=dispatch(review)
  while(!release)await new Promise(resolve=>setImmediate(resolve))
  const second=await dispatch(review);assert.equal(second.status,200)
  release();assert.equal((await first).status,200)
  assert.equal((await dispatch(review)).status,200);assert.equal(calls,1)
  assert.equal(store.documents.get(outgoingId(review)).attempts.length,1)
})

test('two separate review requests for the same saved version share one outgoing record and cannot send twice',async()=>{
  const first=await prepare(),second=await prepare('avery','00000000-0000-4000-8000-000000000026')
  assert.notEqual(first._id,second._id);assert.equal(first.draftRevision,second.draftRevision)
  assert.equal(outgoingId(first),outgoingId(second))
  let calls=0
  globalThis.fixtureMailProvider=fakeProvider({send:async()=>{calls++;return {outcome:'accepted',code:'FAKE_ACCEPTED'}}})
  await dispatch(first);await dispatch(second)
  assert.equal(calls,1);assert.equal((await load()).outgoing.length,1)
})

test('unapproved Pair mode remains disabled; scoped trial configuration alone cannot submit arbitrary messages or read mail',async()=>{
  process.env.FLUFFYTAIL_MAIL_MODE='pair-owner-test'
  assert.equal((await load()).capabilities.provider,'disabled')
  process.env.FLUFFYTAIL_MAIL_OWNER_TEST_APPROVAL='FT-OWNER-EMAIL-001'
  let data=await load();assert.equal(data.capabilities.provider,'pair');assert.equal(data.capabilities.canDispatch,false);assert.equal(data.capabilities.canSync,false)
  const review=await prepare('jordan')
  assert.equal(review.to,'jeanne@fluffytailshihtzu.com')
  assert.equal((await send({type:'dispatch',reviewId:review._id})).status,403)
  assert.equal((await send({type:'sync'})).status,403)
  // Fake secret/permission here tests only the pre-provider exact-text barrier.
  process.env.FLUFFYTAIL_PAIR_MAIL_PASSWORD='offline-fake-only';process.env.FLUFFYTAIL_PAIR_SEND_ENABLED='1';process.env.FLUFFYTAIL_MAIL_OWNER_TEST_STARTED_AT=new Date().toISOString()
  assert.equal((await send({type:'dispatch',reviewId:review._id})).status,403)
  assert.equal(store.documents.get(outgoingId(review)).attempts.length,0)
})

test('the owner-only activation window expires closed without a provider call',async()=>{
  Object.assign(process.env,{FLUFFYTAIL_MAIL_MODE:'pair-owner-test',FLUFFYTAIL_MAIL_OWNER_TEST_APPROVAL:'FT-OWNER-EMAIL-001',FLUFFYTAIL_PAIR_MAIL_PASSWORD:'offline-fake-only',FLUFFYTAIL_PAIR_SEND_ENABLED:'1',FLUFFYTAIL_PAIR_READ_ENABLED:'1',FLUFFYTAIL_MAIL_OWNER_TEST_STARTED_AT:'2000-01-01T00:00:00Z'})
  const capability=(await load()).capabilities
  assert.equal(capability.canDispatch,false);assert.equal(capability.canSync,false)
  assert.equal((await send({type:'sync'})).status,403)
})

test('the hosted handlers drive the actual Pair adapter against fictional SMTP/IMAP servers for one owner-only send and reply',async()=>{
  process.env.FLUFFYTAIL_MAIL_MODE='pair-owner-test';process.env.FLUFFYTAIL_MAIL_OWNER_TEST_APPROVAL='FT-OWNER-EMAIL-001'
  let submissions=0,submitted
  const adapter=createPairAdapter({password:'offline-fake-only',sendEnabled:true,readEnabled:true,recipientAllowlist:['jeanne@fluffytailshihtzu.com'],smtpFactory:()=>({sendMail:async payload=>{submissions++;submitted=payload;return {accepted:['jeanne@fluffytailshihtzu.com'],rejected:[],response:'250 fictional queue'}},close(){}}),imapFactory:()=>({on(){},async connect(){},async mailboxOpen(){return {readOnly:true,uidValidity:99n,uidNext:9}},async search(){return submitted?[9]:[]},async fetchOne(){return {envelope:{from:[{address:'jeanne@fluffytailshihtzu.com'}],to:[{address:'jeanne@fluffytailshihtzu.com'}],messageId:'<owner-reply@example.test>',inReplyTo:submitted.messageId,subject:'Re: '+ownerTestSubject},headers:Buffer.from('References: '+submitted.messageId),bodyStructure:{type:'text/plain',part:'1'},internalDate:new Date().toISOString()}},async download(){return {meta:{charset:'utf-8'},content:Readable.from([Buffer.from('Owner reply received.')])}},async logout(){},close(){}})})
  globalThis.fixtureMailProvider={capabilities:{provider:'pair',canDispatch:true,canSync:true,ownerTestRecipient:'jeanne@fluffytailshihtzu.com'},send:payload=>adapter.send(payload),sync:input=>adapter.sync(input)}
  const review=await prepare('jordan',rid,{subject:ownerTestSubject,body:ownerTestBody})
  assert.equal((await send({type:'dispatch',reviewId:review._id})).status,409)
  assert.equal(submissions,0)
  // Establish the future-only watermark before the one approved test message.
  assert.equal((await send({type:'sync'})).status,200)
  assert.equal((await send({type:'dispatch',reviewId:review._id})).status,200)
  assert.equal(submissions,1);assert.equal(submitted.to,'jeanne@fluffytailshihtzu.com');assert.equal(submitted.text,ownerTestBody)
  assert.equal((await send({type:'sync'})).status,200)
  const data=await load(),reply=data.messages.find(m=>m.messageId==='<owner-reply@example.test>')
  assert.equal(reply.familyId,'jordan');assert.equal(reply.body,'Owner reply received.');assert.equal(data.outgoing[0].delivery,'unconfirmed')
  const duplicate=await prepare('morgan','00000000-0000-4000-8000-000000000027',{subject:ownerTestSubject,body:ownerTestBody})
  assert.equal((await send({type:'dispatch',reviewId:duplicate._id})).status,409);assert.equal(submissions,1)
})

test('explicit rejection retains the draft and allows only an explicit retry; SMTP acceptance never means delivered',async()=>{
  const review=await prepare()
  assert.equal((await dispatch(review,'rejected')).status,200)
  let outgoing=store.documents.get(outgoingId(review));assert.equal(outgoing.state,'failed');assert.equal(outgoing.attempts.length,1)
  assert.equal((await load()).outgoing[0].state,'failed');assert.equal(store.documents.get(outgoingId(review)).attempts.length,1)
  assert.equal((await dispatch(review,'accepted')).status,200)
  outgoing=store.documents.get(outgoingId(review));assert.equal(outgoing.state,'accepted');assert.equal(outgoing.attempts.length,2);assert.equal(outgoing.delivery,'unconfirmed')
  assert.equal(store.documents.get(emailDraftId('avery')).value.body,review.body)
})

test('uncertain SMTP outcome stays blocked across reload/restart and a new review cannot bypass the family guard',async()=>{
  const review=await prepare()
  await dispatch(review,'uncertain')
  assert.equal(store.documents.get(outgoingId(review)).state,'uncertain')
  globalThis.fixtureOperatorClient=workspaceStoreFixture([...store.documents.values()])
  const before=(await load()).outgoing[0]
  assert.equal((await dispatch(review)).status,200);assert.equal((await load()).outgoing[0].attempts.length,before.attempts.length)
  const other=await prepare('avery','00000000-0000-4000-8000-000000000022',{body:'An edited draft must not bypass the uncertain send.'})
  assert.equal((await dispatch(other)).status,409)
  assert.equal((await load()).outgoing.find(o=>o.reviewId===other._id).attempts.length,0)
})

test('provider throws and persistence failure after acceptance never cause a blind resubmission',async()=>{
  const review=await prepare();let calls=0
  globalThis.fixtureMailProvider=fakeProvider({send:async()=>{calls++;throw new Error('Do not leak raw provider credentials or message')}})
  assert.equal((await dispatch(review)).status,200);assert.equal(store.documents.get(outgoingId(review)).state,'uncertain')
  assert.equal((await dispatch(review)).status,200);assert.equal(calls,1)
  const second=await prepare('morgan','00000000-0000-4000-8000-000000000023')
  globalThis.fixtureMailProvider=fakeProvider({send:async()=>{calls++;store.failNext(new Error('Lost result persistence'));return {outcome:'accepted',code:'FAKE_ACCEPTED'}}})
  assert.equal((await dispatch(second)).status,503)
  let pending=store.documents.get(outgoingId(second));assert.equal(pending.state,'sending')
  assert.equal((await dispatch(second)).status,200);assert.equal(calls,2)
  pending.attempts.at(-1).startedAt='2000-01-01T00:00:00Z'
  assert.equal((await send({type:'reconcile'})).status,200)
  assert.equal(store.documents.get(pending._id).state,'uncertain');assert.equal(calls,2)
})

test('uncertain review requires explicit provider evidence, preserves the attempt and never itself sends or confirms delivery',async()=>{
  const review=await prepare();await dispatch(review,'uncertain')
  const pending=store.documents.get(outgoingId(review))
  const action={type:'resolve',outgoingId:pending._id,attemptKey:pending.attempts[0]._key,decision:'accepted',evidence:'Fictional provider receipt confirms SMTP acceptance.',acknowledged:true}
  assert.equal((await send({...action,acknowledged:false})).status,400)
  assert.equal((await send({...action,evidence:'Guess'})).status,400)
  assert.equal((await send(action)).status,200)
  const current=store.documents.get(pending._id)
  assert.equal(current.state,'accepted');assert.equal(current.attempts[0].state,'uncertain');assert.equal(current.attempts.length,1);assert.equal(current.resolutions[0].operator,'fixture-operator');assert.equal(current.delivery,'unconfirmed')
  assert.equal((await dispatch(review)).status,200);assert.equal(store.documents.get(pending._id).attempts.length,1)
})

test('unknown claim persistence result is kept blocked and never invokes the provider',async()=>{
  const review=await prepare();let calls=0
  globalThis.fixtureMailProvider=fakeProvider({send:async()=>{calls++;return {outcome:'accepted',code:'FAKE_ACCEPTED'}}})
  // Claim result lost after it is durable, before the handler knows it may submit.
  const original=store.patch
  store.patch=id=>{const patch=original(id),commit=patch.commit;patch.commit=async()=>{const result=await commit();if(id===outgoingId(review))throw new Error('Lost claim acknowledgement');return result};return patch}
  assert.equal((await dispatch(review)).status,503);assert.equal(calls,0)
  store.patch=original;assert.equal((await dispatch(review)).status,200);assert.equal(calls,0)
  assert.equal(store.documents.get(outgoingId(review)).state,'sending')
})

test('reply imports deduplicate across sync retries and preserve cursor on an import failure',async()=>{
  const review=await prepare();await dispatch(review)
  assert.equal((await send({type:'sync'})).status,200)
  const first=(await load()).messages.filter(m=>m.id.startsWith('private.staffIncomingEmail.'));assert.equal(first.length,1)
  const beforeCursor=structuredClone(store.documents.get(mailCursorId))
  assert.equal((await send({type:'sync'})).status,200)
  assert.equal((await load()).messages.filter(m=>m.id.startsWith('private.staffIncomingEmail.')).length,1)
  const outgoing=store.documents.get(outgoingId(review))
  globalThis.fixtureMailProvider=fakeProvider({sync:async()=>({validity:'fictional-v1',lastUid:2,messages:[{uid:2,validity:'fictional-v1',messageId:'<newreply@example.test>',from:outgoing.to,to:outgoing.from,subject:'Re: next steps',body:'Second fictional reply',inReplyTo:outgoing.messageId,references:[outgoing.messageId],time:new Date().toISOString()}]})})
  const transaction=store.transaction
  store.transaction=()=>{const tx=transaction(),create=tx.createIfNotExists;tx.createIfNotExists=doc=>{if(doc._type==='staffIncomingEmail')throw new Error('Import persistence unavailable');return create(doc)};return tx}
  assert.equal((await send({type:'sync'})).status,503);assert.equal(store.documents.get(mailCursorId).lastUid,beforeCursor.lastUid)
  store.transaction=transaction
  assert.equal((await send({type:'sync'})).status,200)
  assert.equal((await load()).messages.filter(m=>m.id.startsWith('private.staffIncomingEmail.')).length,2)
})

test('unknown, wrong-sender and cross-family references are skipped rather than guessed into a conversation',async()=>{
  const a=await prepare(),b=await prepare('morgan','00000000-0000-4000-8000-000000000024');await dispatch(a);await dispatch(b)
  const one=store.documents.get(outgoingId(a)),two=store.documents.get(outgoingId(b))
  const message={uid:1,validity:'fixture',messageId:'<bad@example.test>',from:one.to,to:one.from,subject:'Re: next steps',body:'Do not import in the wrong family.',inReplyTo:one.messageId,references:[one.messageId],time:new Date().toISOString()}
  globalThis.fixtureMailProvider=fakeProvider({sync:async()=>({validity:'fixture',lastUid:3,messages:[{...message,from:'wrong@example.test'},{...message,uid:2,messageId:'<cross@example.test>',references:[one.messageId,two.messageId]},{...message,uid:3,messageId:'<unknown@example.test>',inReplyTo:'<unknown@elsewhere.test>',references:[]}]})})
  assert.equal((await send({type:'sync'})).status,200)
  assert.equal((await load()).messages.filter(m=>m.id.startsWith('private.staffIncomingEmail.')).length,0)
})

test('changed mailbox identity and conflicting Message-ID cannot overwrite imported content or reset the cursor',async()=>{
  const review=await prepare();await dispatch(review);await send({type:'sync'})
  const initial=await load(),reply=initial.messages.find(m=>m.id.startsWith('private.staffIncomingEmail.'))
  const cursor=structuredClone(store.documents.get(mailCursorId))
  globalThis.fixtureMailProvider=fakeProvider({sync:async()=>({validity:'new-mailbox',lastUid:10,messages:[]})})
  assert.equal((await send({type:'sync'})).status,409);assert.equal(store.documents.get(mailCursorId).validity,cursor.validity)
  const out=initial.outgoing[0]
  globalThis.fixtureMailProvider=fakeProvider({sync:async()=>({validity:cursor.validity,lastUid:2,messages:[{...reply,uid:2,validity:cursor.validity,messageId:reply.messageId,body:'Conflicting contents',inReplyTo:out.messageId,references:[out.messageId]}]})})
  assert.equal((await send({type:'sync'})).status,409)
  assert.equal(store.documents.get(reply.id).body,reply.body);assert.equal(store.documents.get(mailCursorId).lastUid,cursor.lastUid)
})

test('stale draft or expired payment quote blocks submission; accepted links do not confirm payment or reserve',async()=>{
  const payment=await send({type:'payment',familyId:'morgan',puppyId:'pippin',kind:'balance',requestId:'00000000-0000-4000-8000-000000000025'})
  const id=(await payment.json()).preparedPaymentId
  const review=await prepare('morgan',rid,{paymentRequestId:id})
  store.documents.get(id).expiresAt='2000-01-01T00:00:00Z'
  assert.equal((await dispatch(review)).status,409)
  assert.equal(store.documents.get(outgoingId(review)).attempts.length,0)
  store.documents.get(id).expiresAt=new Date(Date.now()+3600000).toISOString()
  const before=structuredClone({families,puppies})
  assert.equal((await dispatch(review)).status,200);assert.deepEqual({families,puppies},before)
  assert.equal(store.documents.get(id).amountCents,120000)
})

test('auth, same-origin, write-freeze, disabled mode and production guards precede any transport',async()=>{
  const review=await prepare();let calls=0
  assert.equal((await POST(request({type:'dispatch',reviewId:review._id},{authorization:''}))).status,401)
  assert.equal((await send({type:'sync'},{origin:'https://untrusted.example'})).status,403)
  process.env.FLUFFYTAIL_WRITE_FREEZE='1';assert.equal((await dispatch(review)).status,503)
  process.env.FLUFFYTAIL_WRITE_FREEZE='0';delete process.env.FLUFFYTAIL_MAIL_MODE
  assert.equal((await dispatch(review)).status,403);assert.equal((await send({type:'sync'})).status,403)
  globalThis.fixtureMailProvider=fakeProvider({send:async()=>{calls++;return {outcome:'accepted',code:'FAKE_ACCEPTED'}}})
  process.env.VERCEL_ENV='production';assert.equal((await dispatch(review)).status,503);assert.equal(calls,0)
  assert.equal(store.documents.get(mailGuardId('avery')),undefined)
})
