import './register-typescript.mjs'
import assert from 'node:assert/strict'
import {test,beforeEach} from 'node:test'
import {workspaceStoreFixture} from './workspace-store-fixture.mjs'
const {GET,POST}=await import('../app/inbox/workspace/api/state/route.ts')
const {workspaceId}=await import('../sanity/lib/workspace.ts')
const {families}=await import('../app/inbox/workspace/model.ts')
const authorization=`Basic ${Buffer.from('fixture-operator:fixture-only-password').toString('base64')}`
const url='http://localhost:3100/inbox/workspace/api/state'
const send=(data,extra={})=>POST(new Request(url,{method:'POST',headers:{authorization,origin:'http://localhost:3100','content-type':'application/json',...extra},body:JSON.stringify(data)}))
const load=()=>GET(new Request(url,{headers:{authorization}}))
const noteId='00000000-0000-4000-8000-000000000001'
let store
beforeEach(()=>{
  process.env.INBOX_BASIC_AUTH_USER='fixture-operator';process.env.INBOX_BASIC_AUTH_PASS='fixture-only-password'
  process.env.VERCEL_ENV='preview';process.env.NEXT_PUBLIC_SANITY_PROJECT_ID='gu1xkpsg';process.env.NEXT_PUBLIC_SANITY_DATASET='synthetic';process.env.FLUFFYTAIL_WRITE_FREEZE='0'
  store=workspaceStoreFixture();globalThis.fixtureOperatorClient=store
})

test('reads never initialize records; explicit initialization is private, idempotent, and leaves historical data untouched',async()=>{
  store.documents.set('historic-payment',{_id:'historic-payment',_type:'paymentRecord',amountPaid:300,paymentStatus:'paid'})
  const original=structuredClone(store.documents.get('historic-payment'))
  const empty=await load();assert.equal(empty.status,200);assert.deepEqual((await empty.json()).families,[])
  assert.equal(store.documents.size,1)
  assert.equal((await send({type:'initialize'})).status,200)
  assert.equal((await send({type:'initialize'})).status,200)
  assert.equal(store.documents.size,5)
  const response=await load();assert.match(response.headers.get('cache-control'),/private.*no-store/)
  const saved=(await response.json()).families
  assert.equal(saved.length,4)
  for(const record of saved){assert.match(record._id,/^private\.staffFamily\.[a-f0-9]{64}$/);assert.equal(record.profile.name,families.find(f=>f.id===record.familyKey).name)}
  assert.deepEqual(store.documents.get('historic-payment'),original)
})

test('anonymous, cross-origin, frozen and production/wrong-dataset requests cannot write or read private records',async()=>{
  assert.equal((await GET(new Request(url))).status,401)
  assert.equal((await send({type:'initialize'},{origin:'https://other.example'})).status,403)
  assert.equal((await send({type:'initialize'},{'sec-fetch-site':'cross-site'})).status,403)
  process.env.FLUFFYTAIL_WRITE_FREEZE='1';assert.equal((await send({type:'initialize'})).status,503)
  process.env.FLUFFYTAIL_WRITE_FREEZE='0';process.env.VERCEL_ENV='production'
  assert.equal((await load()).status,503);assert.equal((await send({type:'initialize'})).status,503)
  process.env.VERCEL_ENV='preview';process.env.NEXT_PUBLIC_SANITY_PROJECT_ID='3glz6dkx'
  assert.equal((await send({type:'initialize'})).status,503)
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID='gu1xkpsg';process.env.NEXT_PUBLIC_SANITY_DATASET='production'
  assert.equal((await send({type:'initialize'})).status,503)
  assert.equal(store.documents.size,0)
})

test('invalid types, injected document IDs/financial fields, oversized bodies and invalid UTF8 fail without effects',async()=>{
  for(const [data,status] of [[{type:'initialize',paymentStatus:'paid'},400],[{type:'draft',familyId:'private.payment.any',channel:'Email',body:'x',base:''},404],[{type:'check',familyId:'avery',item:'New medical schedule',checked:true},400],[{type:'note',familyId:'avery',body:'x',requestId:'unsafe.id'},400],[{type:'draft',familyId:'avery',channel:'Email',body:'x'.repeat(10001),base:''},400]])assert.equal((await send(data)).status,status)
  assert.equal((await send({type:'initialize'},{'content-type':'text/plain'})).status,415)
  assert.equal((await POST(new Request(url,{method:'POST',headers:{authorization,'content-type':'application/json'},body:'x'.repeat(150001)}))).status,413)
  assert.equal((await POST(new Request(url,{method:'POST',headers:{authorization,'content-type':'application/json'},body:new Uint8Array([0xff])}))).status,400)
  assert.equal(store.documents.size,0)
})

test('saved drafts survive reload and a fresh store process, are isolated per family/channel, and do not send anything',async()=>{
  await send({type:'initialize'})
  await send({type:'draft',familyId:'avery',channel:'Email',body:'Avery email',base:''})
  await send({type:'draft',familyId:'morgan',channel:'Email',body:'Morgan email',base:''})
  await send({type:'draft',familyId:'morgan',channel:'Text',body:'Morgan text',base:''})
  globalThis.fixtureOperatorClient=workspaceStoreFixture([...store.documents.values()])
  const records=(await (await load()).json()).families
  assert.equal(records.find(f=>f.familyKey==='avery').drafts.Email,'Avery email')
  assert.equal(records.find(f=>f.familyKey==='avery').drafts.Text,'')
  assert.equal(records.find(f=>f.familyKey==='morgan').drafts.Email,'Morgan email')
  assert.equal(records.find(f=>f.familyKey==='morgan').drafts.Text,'Morgan text')
  assert.equal(store.documents.size,4)
})

test('same-channel conflicts return the saved text without overwriting it; retry after lost acknowledgement is idempotent',async()=>{
  await send({type:'initialize'})
  const action={type:'draft',familyId:'avery',channel:'Email',body:'First tab',base:''}
  assert.equal((await send(action)).status,200)
  assert.equal((await send(action)).status,200)
  const conflict=await send({...action,body:'Second tab'})
  assert.equal(conflict.status,409);assert.equal((await conflict.json()).conflict.saved,'First tab')
  assert.equal(store.documents.get(workspaceId('avery')).drafts.Email,'First tab')
  assert.equal((await send({...action,body:'Reviewed replacement',base:'First tab'})).status,200)
})

test('revision races on other fields merge safely; unexpected failures are not blindly retried',async()=>{
  await send({type:'initialize'})
  store.beforeNextPatch((docs,id)=>{const record=docs.get(id);record._rev='other-tab';record.drafts.Text='Keep other channel'})
  assert.equal((await send({type:'draft',familyId:'morgan',channel:'Email',body:'Save this email',base:''})).status,200)
  assert.equal(store.documents.get(workspaceId('morgan')).drafts.Text,'Keep other channel')
  store.failNext(new Error('Unknown network outcome'))
  const response=await send({type:'draft',familyId:'morgan',channel:'Email',body:'New text',base:'Save this email'})
  assert.equal(response.status,503)
  assert.equal(store.documents.get(workspaceId('morgan')).drafts.Email,'Save this email')
})

test('malformed stored records fail closed without automatic repair or destructive replacement',async()=>{
  await send({type:'initialize'})
  const record=store.documents.get(workspaceId('avery'))
  record.drafts.Email={unsafe:'corrupt field'}
  const original=structuredClone(record)
  assert.equal((await load()).status,503)
  assert.equal((await send({type:'draft',familyId:'avery',channel:'Email',body:'Do not replace corruption',base:''})).status,503)
  assert.deepEqual(store.documents.get(workspaceId('avery')),original)
})

test('note requests deduplicate across retries and concurrent notes/checklists preserve unrelated fields',async()=>{
  await send({type:'initialize'})
  const action={type:'note',familyId:'avery',body:'Confirm pickup.',requestId:noteId}
  assert.equal((await send(action)).status,200);assert.equal((await send(action)).status,200)
  assert.equal((await send({...action,body:'Different body'})).status,409)
  store.beforeNextPatch((docs,id)=>{const record=docs.get(id);record._rev='race';record.notes.push({_key:'other',text:'Other note',createdAt:'2026-10-26T15:00:00.000Z'})})
  assert.equal((await send({...action,body:'Second note',requestId:'00000000-0000-4000-8000-000000000002'})).status,200)
  await send({type:'check',familyId:'avery',item:'CKC registration papers',checked:true})
  await send({type:'check',familyId:'avery',item:'CKC registration papers',checked:true})
  const record=store.documents.get(workspaceId('avery'))
  assert.equal(record.notes.length,3);assert.deepEqual(record.checks,['CKC registration papers'])
  assert.equal('records' in record.profile,false)
  assert.equal('messages' in record.profile,false)
  assert.deepEqual(store.documents.get(workspaceId('morgan')).checks,['Vet check','Vaccination & deworming record'])
})
