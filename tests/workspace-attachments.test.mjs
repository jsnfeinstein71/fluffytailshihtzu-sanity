import './register-typescript.mjs'
import {test,beforeEach} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import nodemailer from 'nodemailer'
import {workspaceStoreFixture} from './workspace-store-fixture.mjs'
import {createPairAdapter} from '../lib/mail/pair-adapter.mjs'
const files=await import('../app/inbox/workspace/api/files/route.ts'),email=await import('../app/inbox/workspace/api/email/route.ts')
const {workspaceId}=await import('../sanity/lib/workspace.ts'),{sendEmailDraft}=await import('../app/inbox/workspace/send-draft.ts'),{readAttachment}=await import('../sanity/lib/workspace-attachments.ts')
const origin='https://attachments.example.test',familyId='inquiry-'+'c'.repeat(64),otherId='inquiry-'+'d'.repeat(64),recipient='owner@example.test',phone='+15555550123',account='jeanne@fluffytailshihtzu.com',auth='Basic '+Buffer.from('staff:offline-password').toString('base64')
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE9sAAAAASUVORK5CYII=','base64'),pdf=Buffer.from('%PDF-1.4\nFictional attachment fixture only\n%%EOF')
let store,submitted,outcome,mime,payload
function req(path,body,authenticated=true){return new Request(origin+path,{method:body?'POST':'GET',headers:{...(authenticated?{authorization:auth}:{}),origin,'content-type':'application/json'},body:body?JSON.stringify(body):undefined})}
async function ok(response){assert.equal(response.status,200,await response.clone().text());return response.json()}
const action=body=>email.POST(req('/inbox/workspace/api/email',body))
async function upload(filename='test-puppy.png',bytes=png,type='image/png',id=familyId,uploadId=randomUUID()){return await files.POST(req('/inbox/workspace/api/files',{familyId:id,uploadId,filename,contentType:type,contentBase64:bytes.toString('base64')}))}
beforeEach(()=>{
 Object.assign(process.env,{VERCEL_ENV:'preview',NEXT_PUBLIC_SANITY_PROJECT_ID:'gu1xkpsg',NEXT_PUBLIC_SANITY_DATASET:'synthetic',FLUFFYTAIL_PAYMENT_TEST_WORKSPACE:'1',FLUFFYTAIL_WRITE_FREEZE:'0',INBOX_BASIC_AUTH_USER:'staff',INBOX_BASIC_AUTH_PASS:'offline-password'})
 globalThis.fixtureTestContacts={email:recipient,phone};submitted=[];outcome='accepted';mime='';payload=null
 store=workspaceStoreFixture([familyId,otherId].map((id,index)=>({_id:workspaceId(id),_rev:'family-'+index,_type:'staffFamily',workspace:'review-v1',schemaVersion:1,familyKey:id,profile:{id,source:'inquiry',name:'Fictional Attachment Family '+index,initials:'FA',email:index?'other@example.test':recipient,phone,paymentTestScenario:'customer-20261027',stage:'Paid in full',preference:'Email',records:[],messages:[]},drafts:{Email:'',Text:''},checks:[],notes:[]})))
 globalThis.fixtureOperatorClient=store
 const adapter=createPairAdapter({password:'offline-only',sendEnabled:true,recipientAllowlist:[recipient],smtpFactory:()=>({async sendMail(value){payload=value;const result=await nodemailer.createTransport({streamTransport:true,buffer:true,newline:'unix'}).sendMail(value);mime=result.message.toString();submitted.push(value);if(outcome==='uncertain')throw Object.assign(new Error('lost fixture acknowledgment'),{command:'DATA'});if(outcome==='rejected')throw Object.assign(new Error('fixture rejection'),{command:'DATA',responseCode:550});return {accepted:[recipient],rejected:[],response:'250 fixture accepted'}},close(){}})})
 globalThis.fixtureMailProvider={capabilities:{provider:'pair',canDispatch:true,canSync:true,approvedTestEmail:recipient},send:message=>adapter.send(message),sync:async()=>({validity:'fixture-only',lastUid:0,messages:[],initialized:true})}
})
test('private upload/download and draft reload use actual handlers; library excludes file bytes and enforces family ownership',async()=>{
 const id=randomUUID(),file=(await ok(await upload('test-puppy.png',png,'image/png',familyId,id))).attachment
 assert.match(file.id,/^private\.staffAttachment\./);assert.equal(file.size,png.length);assert.equal(file.contentBase64,undefined)
 assert.equal((await ok(await upload('test-puppy.png',png,'image/png',familyId,id))).attachment.id,file.id);assert.equal([...store.documents.values()].filter(d=>d._type==='staffAttachment').length,1)
 assert.equal((await files.GET(req('/inbox/workspace/api/files?id='+file.id,undefined,false))).status,401)
 const download=await files.GET(req('/inbox/workspace/api/files?id='+file.id));assert.equal(download.status,200);assert.equal(download.headers.get('cache-control'),'private, no-store');assert.equal(download.headers.get('x-content-type-options'),'nosniff');assert.equal(download.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await download.arrayBuffer()),png)
 const value={subject:'Your puppy photo',body:'My exact unfinished message.',replyToId:null,paymentRequestId:null,attachmentIds:[file.id]}
 await ok(await action({type:'save',familyId,revision:null,value}));let loaded=await ok(await email.GET(req('/inbox/workspace/api/email')));assert.deepEqual(loaded.drafts.find(d=>d.familyId===familyId).value,value);assert.equal(loaded.attachmentLibrary[0].contentBase64,undefined)
 assert.equal((await action({type:'save',familyId:otherId,revision:null,value})).status,409)
 const draft=loaded.drafts.find(d=>d.familyId===familyId);await ok(await action({type:'save',familyId,revision:draft.revision,value:{...value,attachmentIds:[]}}));assert.deepEqual((await readAttachment(file.id,familyId)).bytes,png);assert.equal(submitted.length,0)
})
test('actual handler-to-Pair MIME contains unchanged photo/PDF bytes, sender and identity; send clears only its draft and retains private history',async()=>{
 const photo=(await ok(await upload())).attachment,document=(await ok(await upload('fictional-pickup.pdf',pdf,'application/pdf'))).attachment
 const draft={familyId,revision:null,value:{subject:'Your puppy files',body:'Jeanne’s editable note.',replyToId:null,paymentRequestId:null,attachmentIds:[photo.id,document.id]}}
 const result=await sendEmailDraft(familyId,draft,randomUUID(),async body=>ok(await action(body)));assert.equal(result.state,'accepted');assert.equal(submitted.length,1);assert.equal(payload.from,account);assert.equal(payload.replyTo,account);assert.equal(payload.to,recipient);assert.deepEqual(payload.attachments.map(a=>a.content),[png,pdf]);assert.deepEqual(payload.attachments.map(a=>a.contentType),['image/png','application/pdf']);assert.equal(payload.disableFileAccess,true);assert.equal(payload.disableUrlAccess,true);assert.match(mime,/multipart\/mixed/);assert.match(mime,/Content-Type: image\/png/);assert.match(mime,/Content-Type: application\/pdf/);assert.match(mime,/Content-Disposition: attachment;/)
 const loaded=await ok(await email.GET(req('/inbox/workspace/api/email'))),outgoing=loaded.outgoing.find(o=>o.familyId===familyId);assert.equal(outgoing.delivery,'unconfirmed');assert.deepEqual(outgoing.attachments.map(a=>a.sha256),[photo.sha256,document.sha256]);assert.equal(outgoing.attachmentParts,undefined);assert.deepEqual(loaded.drafts.find(d=>d.familyId===familyId).value.attachmentIds,[]);assert.equal(loaded.attachmentLibrary.length,2)
 await ok(await action({type:'dispatch',reviewId:outgoing.reviewId,confirmed:true}));assert.equal(submitted.length,1)
})
test('rejected and uncertain attachment submissions preserve draft and files; uncertain outcomes never retry',async()=>{
 for(const response of ['rejected','uncertain']){
  outcome=response;const file=(await ok(await upload('note.txt',Buffer.from('FICTIONAL pickup information only'),'text/plain'))).attachment
  const existing=(await ok(await email.GET(req('/inbox/workspace/api/email')))).drafts.find(d=>d.familyId===familyId)
  const value={subject:'File test '+response,body:'Keep this draft.',replyToId:null,paymentRequestId:null,attachmentIds:[file.id]}
  const result=await sendEmailDraft(familyId,{...existing,value},randomUUID(),async body=>ok(await action(body)));assert.equal(result.state,response==='rejected'?'failed':'uncertain');const loaded=await ok(await email.GET(req('/inbox/workspace/api/email')));assert.deepEqual(loaded.drafts.find(d=>d.familyId===familyId).value,value);assert.deepEqual((await readAttachment(file.id,familyId)).bytes,Buffer.from('FICTIONAL pickup information only'))
  if(response==='uncertain'){const outgoing=loaded.outgoing.find(o=>o.state==='uncertain'),count=submitted.length;await ok(await action({type:'dispatch',reviewId:outgoing.reviewId,confirmed:true}));assert.equal(submitted.length,count)}
 }
})
test('file type, size, request origin, count, changed bytes and tampered snapshots fail before SMTP',async()=>{
 assert.equal((await upload('bad.html',Buffer.from('<html>'), 'text/html')).status,400);assert.equal((await upload('disguised.pdf',png,'application/pdf')).status,400);assert.equal((await upload('too-big.txt',Buffer.alloc(2_500_001,65),'text/plain')).status,400)
 const cross=new Request(origin+'/inbox/workspace/api/files',{method:'POST',headers:{authorization:auth,origin:'https://other.example.test','content-type':'application/json'},body:'{}'});assert.equal((await files.POST(cross)).status,403)
 const file=(await ok(await upload())).attachment;const value={subject:'Photo',body:'Keep this.',replyToId:null,paymentRequestId:null,attachmentIds:[file.id]};const saved=await ok(await action({type:'save',familyId,revision:null,value}));const reviewed=await ok(await action({type:'review',familyId,revision:saved.drafts.find(d=>d.familyId===familyId).revision,requestId:randomUUID()}));store.documents.get(file.id).contentBase64=pdf.toString('base64')
 assert.equal((await action({type:'dispatch',reviewId:reviewed.reviewId,confirmed:true})).status,409);assert.equal(submitted.length,0);assert.deepEqual((await ok(await email.GET(req('/inbox/workspace/api/email')))).drafts.find(d=>d.familyId===familyId).value,value)
 assert.equal((await action({type:'save',familyId,revision:saved.drafts.find(d=>d.familyId===familyId).revision,value:{...value,attachmentIds:Array(6).fill(file.id)}})).status,400)
})


test('combined-size limits and forged attachment metadata are rejected without settling payments or attempting SMTP',async()=>{
 const large=Buffer.alloc(2_500_000,65),ids=[]
 for(let index=0;index<4;index++)ids.push((await ok(await upload(`large-${index}.txt`,large,'text/plain'))).attachment.id)
 const value={subject:'Files',body:'No send.',replyToId:null,paymentRequestId:null,attachmentIds:ids}
 assert.equal((await action({type:'save',familyId,revision:null,value})).status,400)
 assert.equal((await files.GET(req('/inbox/workspace/api/files?id=private.staffAttachment.'+'0'.repeat(64)))).status,404)
 const saved=await ok(await action({type:'save',familyId,revision:null,value:{...value,attachmentIds:[ids[0]]}})),version=saved.drafts.find(d=>d.familyId===familyId)
 const review=await ok(await action({type:'review',familyId,revision:version.revision,requestId:randomUUID()}));store.documents.get(review.reviewId).attachments[0].filename='forged.pdf'
 assert.equal((await action({type:'dispatch',reviewId:review.reviewId,confirmed:true})).status,409);assert.equal(submitted.length,0);assert.equal([...store.documents.values()].filter(d=>d._type==='paymentRecord').length,0)
})
