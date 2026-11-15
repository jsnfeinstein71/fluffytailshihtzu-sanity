import './register-typescript.mjs'
import assert from 'node:assert/strict'
import {beforeEach,test} from 'node:test'
import {workspaceStoreFixture} from './workspace-store-fixture.mjs'
import twilio from 'twilio'
const {workspaceId,projectInquiryFamily,listWorkspaceFamilies}=await import('../sanity/lib/workspace.ts')
const {reviewFamily,manageFamily,persistInbound,commitFamilyRecords}=await import('../sanity/lib/family-lifecycle.ts')
const api=await import('../app/inbox/workspace/api/family/route.ts')
const state=await import('../app/inbox/workspace/api/state/route.ts')
const {POST:inboundSms}=await import('../app/api/fluffytail/sms/inbound/route.ts')
const {refreshArchivedReplies,familyMailCursorId}=await import('../sanity/lib/email-workflow.ts')
const id='inquiry-'+'1'.repeat(64),other='inquiry-'+'2'.repeat(64),origin='http://localhost:3100'
const auth='Basic '+Buffer.from('fixture-operator:fixture-only-password').toString('base64')
const req=(data,extra={})=>new Request(origin+'/inbox/workspace/api/family'+(data?'':'?family='+id),{method:data?'POST':'GET',headers:{authorization:auth,origin,'content-type':'application/json',...extra},body:data?JSON.stringify(data):undefined})
let store
const family=(key=id)=>({_id:workspaceId(key),_rev:'seed-'+key,_type:'staffFamily',schemaVersion:1,workspace:'review-v1',familyKey:key,profile:{id:key,name:'Fictional Lifecycle Family',initials:'FL',email:key===id?'lifecycle@example.test':'other@example.test',phone:'',preference:'Email',smsConsent:false,stage:'New inquiry',next:'Review',records:[],messages:[]},drafts:{Email:'',Text:''},notes:[],checks:[]})
const owned=(type,key='a',extra={})=>({_id:'private.'+type+'.'+key.repeat(64),_rev:'seed-'+key,_type:type,workspace:'review-v1',familyId:id,...extra})
const archive=async()=>manageFamily({action:'archive',familyId:id,token:(await reviewFamily(id)).token})
const remove=async(review)=>manageFamily({action:'delete',familyId:id,token:review.token,name:review.name})
beforeEach(()=>{
 Object.assign(process.env,{VERCEL_ENV:'preview',NEXT_PUBLIC_SANITY_PROJECT_ID:'gu1xkpsg',NEXT_PUBLIC_SANITY_DATASET:'synthetic',INBOX_BASIC_AUTH_USER:'fixture-operator',INBOX_BASIC_AUTH_PASS:'fixture-only-password',FLUFFYTAIL_WRITE_FREEZE:'0'})
 delete globalThis.fixtureTestContacts;delete process.env.FLUFFYTAIL_PAYMENT_TEST_WORKSPACE;delete process.env.FLUFFYTAIL_WORKSPACE_LIVE
 store=workspaceStoreFixture([family(),family(other)]);globalThis.fixtureOperatorClient=store
 globalThis.fixtureMailProvider={capabilities:{provider:'fictional',canSync:false,canDispatch:false}}
})
test('archive and restore preserve all draft, note, file and commitment contents; stale archive notices fail',async()=>{
 const f=store.documents.get(workspaceId(id));f.drafts.Text='Unfinished exact text';f.notes=[{_key:'note',text:'Keep this note',createdAt:'2026-11-01T00:00:00Z'}];f.profile.puppyId='puppy-preserve'
 const payment=owned('staffPaymentRequest','a',{paymentVerification:'unpaid'});store.documents.set(payment._id,payment)
 const before=structuredClone(f),review=await reviewFamily(id)
 assert.equal(review.warnings.length,2);assert.ok(review.blocked.length)
 assert.equal((await api.POST(req({action:'archive',familyId:id,token:review.token}))).status,200)
 const archived=store.documents.get(f._id);assert.ok(archived.archivedAt)
 for(const k of ['profile','drafts','notes','checks'])assert.deepEqual(archived[k],before[k])
 assert.deepEqual(store.documents.get(payment._id),payment)
 assert.equal((await api.POST(req({action:'archive',familyId:id,token:review.token}))).status,409)
 await manageFamily({action:'restore',familyId:id});assert.equal(store.documents.get(f._id).archivedAt,null)
})
test('only new genuine inbound messages restore; imports, duplicates and status updates do not',async()=>{
 const old=owned('smsMessage','b',{direction:'inbound',body:'Old reply'})
 await persistInbound(old,'2026-01-01T00:00:00Z',true);await archive()
 const archived=store.documents.get(workspaceId(id)).archivedAt
 assert.equal(await persistInbound(old,new Date(Date.now()+1000).toISOString(),true),false)
 const imported=owned('staffIncomingEmail','c',{body:'Historical import'})
 await persistInbound(imported,new Date(Date.now()+1000).toISOString(),false)
 await persistInbound(owned('smsMessage','d'),new Date(Date.parse(archived)-1000).toISOString(),true)
 await store.patch(old._id).set({delivery:'delivered'}).commit()
 assert.equal(store.documents.get(workspaceId(id)).archivedAt,archived)
 const fresh=owned('staffIncomingEmail','e',{body:'A genuine new reply'})
 const results=await Promise.all([persistInbound(fresh,new Date(Date.now()+1000).toISOString(),true),persistInbound(fresh,new Date(Date.now()+1000).toISOString(),true)])
 assert.deepEqual(results.sort(),[false,true]);assert.equal(store.documents.get(workspaceId(id)).archivedAt,null)
 await archive();await persistInbound(fresh,new Date(Date.now()+1000).toISOString(),true)
 assert.ok(store.documents.get(workspaceId(id)).archivedAt)
})
test('archived Pair threads are checked automatically through their existing future-only cursor',async()=>{
 globalThis.fixtureTestContacts={email:'lifecycle@example.test',phone:''};store.documents.get(workspaceId(id)).profile.paymentTestScenario='customer-20261027'
 await archive()
 const cursor={_id:familyMailCursorId(id),_rev:'cursor',_type:'staffMailCursor',workspace:'review-v1',familyId:id,validity:'mailbox',lastUid:10,lastCheckedAt:0,leaseUntil:0,source:'pair'}
 store.documents.set(cursor._id,cursor)
 const outgoing=owned('staffOutgoingEmail','f',{source:'pair',attempts:[{startedAt:'2026-11-01T00:00:00Z'}],messageId:'<lifecycle-owner@example.test>',to:'lifecycle@example.test'})
 store.documents.set(outgoing._id,outgoing)
 let reads=0
 globalThis.fixtureMailProvider={capabilities:{provider:'pair',canSync:true,canDispatch:false},sync:async input=>{reads++;assert.equal(input.cursor.lastUid,10);return {validity:'mailbox',lastUid:11,messages:[{validity:'mailbox',uid:11,messageId:'<fresh-lifecycle@example.test>',from:'lifecycle@example.test',to:'jeanne@fluffytailshihtzu.com',subject:'New reply',body:'Fictional provider only',inReplyTo:outgoing.messageId,references:[outgoing.messageId],time:new Date(Date.now()+1000).toISOString()}]}}}
 await refreshArchivedReplies();assert.equal(reads,1);assert.equal(store.documents.get(workspaceId(id)).archivedAt,null)
 await refreshArchivedReplies();assert.equal(reads,1)
})
test('server blocks financial, agreement and reservation history even for explicitly marked tests',async()=>{
 for(const type of ['paymentRecord','staffPaymentRequest','agreement','purchaseContract','litterReservation','litterFamily','litterCreditApplication']){
  const record=owned(type,'a');store.documents.set(record._id,record)
  await manageFamily({action:'mark-test',familyId:id,name:'Fictional Lifecycle Family'})
  const review=await reviewFamily(id);assert.ok(review.blocked.some(b=>/must be preserved/.test(b)))
  await assert.rejects(remove(review),/must be preserved/);assert.deepEqual(store.documents.get(record._id),record)
  store.documents.delete(record._id)
 }
})
test('test names do not confer deletion permission; explicit marking does, while preserving other families',async()=>{
 const f=store.documents.get(workspaceId(id));f.profile.messages=[{id:'one',body:'Fictional inquiry',direction:'in',channel:'Email',time:'2026-11-01T00:00:00Z'}]
 assert.ok((await reviewFamily(id)).blocked.length)
 await assert.rejects(manageFamily({action:'mark-test',familyId:id,name:'wrong'}),/name/)
 await manageFamily({action:'mark-test',familyId:id,name:f.profile.name})
 const file=owned('staffAttachment','b',{filename:'fictional.png',kind:'photo',contentType:'image/png'});store.documents.set(file._id,file)
 const email=owned('staffEmailDraft','c',{value:{body:'Unsent personal message',subject:'Keep until deletion',attachmentIds:[file._id]}});store.documents.set(email._id,email)
 const original=structuredClone(store.documents.get(workspaceId(other)))
 const review=await reviewFamily(id);assert.deepEqual(review.blocked,[]);assert.ok(review.removals.includes('1 private files'))
 await assert.rejects(manageFamily({action:'delete',familyId:id,token:review.token,name:'wrong'}),/name/)
 await remove(review)
 assert.equal(store.documents.has(file._id),false);assert.equal(store.documents.has(email._id),false)
 assert.deepEqual(store.documents.get(workspaceId(other)),original)
 const marker=store.documents.get(workspaceId(id));assert.equal(marker._type,'staffFamilyDeleted');assert.equal(marker.profile,undefined);assert.equal((await listWorkspaceFamilies()).length,1)
 await assert.rejects(commitFamilyRecords(id,tx=>tx.create(owned('staffAttachment','d'))),/no longer available/)
 assert.equal(store.documents.has(owned('staffAttachment','d')._id),false)
})
test('shared attachment references and unknown linked records block deletion with specific explanations',async()=>{
 await manageFamily({action:'mark-test',familyId:id,name:'Fictional Lifecycle Family'})
 const file=owned('staffAttachment','a',{kind:'photo',contentType:'image/png'});store.documents.set(file._id,file)
 const shared=owned('staffEmailDraft','b',{familyId:other,value:{attachmentIds:[file._id]}});store.documents.set(shared._id,shared)
 assert.ok((await reviewFamily(id)).blocked.some(b=>/Another record/.test(b)))
 store.documents.delete(shared._id);const unknown=owned('unknownBusinessRecord','c');store.documents.set(unknown._id,unknown)
 assert.ok((await reviewFamily(id)).blocked.some(b=>/cannot be safely removed/.test(b)))
})
test('exact contact duplicates are eligible but sent or uncertain messages remain protected',async()=>{
 const f=store.documents.get(workspaceId(id)),second=store.documents.get(workspaceId(other));second.profile.email=f.profile.email;second.profile.phone=f.profile.phone
 f.notes=[{_key:'n',text:'Duplicate record',createdAt:'2026-11-01T00:00:00Z'}]
 let review=await reviewFamily(id);assert.equal(review.duplicate,true);assert.deepEqual(review.blocked,[])
 const outgoing=owned('staffOutgoingEmail','d',{state:'uncertain',attempts:[{}]});store.documents.set(outgoing._id,outgoing)
 review=await reviewFamily(id);assert.ok(review.blocked.some(b=>/sent email history/.test(b)));await assert.rejects(remove(review))
})
test('new inbound or draft changes invalidate a deletion review without removing either',async()=>{
 const review=await reviewFamily(id)
 await persistInbound(owned('smsMessage','b',{body:'Arrived after review'}),new Date().toISOString(),true)
 await assert.rejects(remove(review));assert.ok(store.documents.get(workspaceId(id)));assert.ok(store.documents.has(owned('smsMessage','b')._id))
})
test('deletion lock prevents concurrent new records and preserves them if they win first',async()=>{
 const review=await reviewFamily(id)
 store.beforeNextPatch(async()=>{await commitFamilyRecords(id,tx=>tx.create(owned('staffAttachment','e')))})
 await assert.rejects(remove(review));assert.ok(store.documents.has(owned('staffAttachment','e')._id));assert.ok(store.documents.get(workspaceId(id)).profile)
 const f=store.documents.get(workspaceId(id));f.deletionUntil=new Date(Date.now()+60000).toISOString();f.deletionToken='other-delete'
 await assert.rejects(commitFamilyRecords(id,tx=>tx.create(owned('staffAttachment','f'))),/being checked/)
 assert.equal(store.documents.has(owned('staffAttachment','f')._id),false)
})
test('a failed final deletion transaction removes nothing and releases its temporary lock',async()=>{
 const review=await reviewFamily(id),patch=store.patch
 store.patch=key=>{
  const p=patch(key),commit=p.commit
  p.commit=async()=>{const result=await commit();if(result?.deletionToken)store.failNext(new Error('Interrupted final transaction'));return result}
  return p
 }
 await assert.rejects(remove(review),/Interrupted/)
 const current=store.documents.get(workspaceId(id));assert.equal(current._type,'staffFamily');assert.equal(current.deletionUntil,null)
 assert.equal(store.documents.size,2)
})
test('saved paperwork is protected even for an explicit test family',async()=>{
 const doc=owned('staffAttachment','b',{kind:'document',contentType:'application/pdf',filename:'purchase-paperwork.pdf'});store.documents.set(doc._id,doc)
 await manageFamily({action:'mark-test',familyId:id,name:'Fictional Lifecycle Family'})
 const review=await reviewFamily(id);assert.ok(review.blocked.some(b=>/paperwork/.test(b)));await assert.rejects(remove(review));assert.deepEqual(store.documents.get(doc._id),doc)
})
test('the signed live SMS handler restores one matched archived family once; duplicate callbacks leave a later archive intact',async()=>{
 Object.assign(process.env,{VERCEL_ENV:'production',NEXT_PUBLIC_SANITY_PROJECT_ID:'3glz6dkx',NEXT_PUBLIC_SANITY_DATASET:'production',FLUFFYTAIL_STAFF_WORKSPACE_ENABLED:'1',TWILIO_AUTH_TOKEN:'offline-signature-only'})
 const f={...family(),_id:workspaceId(id),workspace:'live-v1',archivedAt:'2026-01-01T00:00:00Z'};f.profile.phone='+12025550139';store.documents.clear();store.documents.set(f._id,f)
 const url='https://www.fluffytailshihtzu.com/api/fluffytail/sms/inbound',data={MessageSid:'SM'+'9'.repeat(32),From:f.profile.phone,To:'+12025550100',Body:'A new fictional inbound text',NumMedia:'0'}
 const signature=twilio.getExpectedTwilioSignature('offline-signature-only',url,data)
 const send=()=>inboundSms(new Request(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','x-twilio-signature':signature},body:new URLSearchParams(data).toString()}))
 assert.equal((await send()).status,200);assert.equal(store.documents.get(f._id).archivedAt,null)
 await store.patch(f._id).set({archivedAt:new Date().toISOString()}).commit()
 assert.equal((await send()).status,200);assert.ok(store.documents.get(f._id).archivedAt)
 assert.equal([...store.documents.values()].filter(d=>d._type==='smsMessage').length,1)
})
test('original inquiry reprojection cannot recreate a deleted family or change unrelated records',async()=>{
 const inquiry={_id:'private.inquiry.'+'b'.repeat(64),source:'fluffytail-native',name:'Brand new fictional delete scenario',email:'fresh-delete@example.test',message:'Disposable test inquiry',preferredContactMethod:'Email',submittedAt:new Date().toISOString()}
 store.documents.set(inquiry._id,inquiry);await projectInquiryFamily(inquiry)
 const f=[...store.documents.values()].find(d=>d._type==='staffFamily'&&d.profile.email===inquiry.email)
 await manageFamily({action:'mark-test',familyId:f.familyKey,name:f.profile.name})
 const review=await reviewFamily(f.familyKey);await manageFamily({action:'delete',familyId:f.familyKey,token:review.token,name:f.profile.name})
 await projectInquiryFamily(inquiry);assert.equal(store.documents.get(f._id)._type,'staffFamilyDeleted');assert.deepEqual(store.documents.get(inquiry._id),inquiry)
})
test('family handlers enforce authentication, origin, write freeze and strict action inputs',async()=>{
 assert.equal((await api.GET(req(undefined,{authorization:''}))).status,401)
 assert.equal((await api.POST(req({action:'restore',familyId:id},{origin:'https://other.example'}))).status,403)
 process.env.FLUFFYTAIL_WRITE_FREEZE='1';assert.equal((await api.POST(req({action:'restore',familyId:id}))).status,503);process.env.FLUFFYTAIL_WRITE_FREEZE='0'
 assert.equal((await api.POST(req({action:'restore',familyId:id,forged:true}))).status,400)
 const response=await api.GET(req());assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/private, no-store/)
 const f=store.documents.get(workspaceId(id));f.deletionUntil=new Date(Date.now()+60000).toISOString()
 assert.equal((await state.POST(new Request(origin+'/inbox/workspace/api/state',{method:'POST',headers:{authorization:auth,origin,'content-type':'application/json'},body:JSON.stringify({type:'draft',familyId:id,channel:'Text',body:'Keep unsaved',base:''})}))).status,409)
})
