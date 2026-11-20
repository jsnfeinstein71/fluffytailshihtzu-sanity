import './register-typescript.mjs'
import assert from 'node:assert/strict'
import {test,beforeEach} from 'node:test'
import nodemailer from 'nodemailer'
import {workspaceStoreFixture} from './workspace-store-fixture.mjs'
const {POST}=await import('../app/inbox/workspace/api/email/route.ts')
const {POST:statePost}=await import('../app/inbox/workspace/api/state/route.ts')
const {createFeedbackInvitation,manageFeedback}=await import('../sanity/lib/feedback.ts')
const {emailDraftId}=await import('../sanity/lib/workspace-email.ts')
const {feedbackEmailPatch}=await import('../lib/mail/feedback-email.ts')
const {emptyEmail}=await import('../app/inbox/workspace/email-model.ts')
const {getMailProvider}=await import('../sanity/lib/mail-provider.ts')
const auth='Basic '+Buffer.from('fixture-operator:fixture-only-password').toString('base64'),origin='http://localhost:3100'
const req=(path,body)=>new Request(origin+path,{method:'POST',headers:{authorization:auth,origin,'content-type':'application/json'},body:JSON.stringify(body)})
const send=body=>POST(req('/inbox/workspace/api/email',body))
let store
beforeEach(async()=>{
 Object.assign(process.env,{INBOX_BASIC_AUTH_USER:'fixture-operator',INBOX_BASIC_AUTH_PASS:'fixture-only-password',VERCEL_ENV:'preview',NEXT_PUBLIC_SANITY_PROJECT_ID:'gu1xkpsg',NEXT_PUBLIC_SANITY_DATASET:'synthetic',FLUFFYTAIL_WRITE_FREEZE:'0',FLUFFYTAIL_FEEDBACK_ENABLED:'1',FLUFFYTAIL_FEEDBACK_PREVIEW:'0',FEEDBACK_INVITATION_SECRET:'fictional-secret-for-offline-feedback-tests-only-long-enough',FEEDBACK_PUBLIC_ORIGIN:'https://feedback.example.test',FLUFFYTAIL_MAIL_MODE:'fictional'})
 store=workspaceStoreFixture();globalThis.fixtureOperatorClient=store
 assert.equal((await statePost(req('/inbox/workspace/api/state',{type:'initialize'}))).status,200)
})
test('feedback email routes persist invitation identity, branded alternatives and draft after stale-invite rejection',async()=>{
 const created=await createFeedbackInvitation('avery','10000000-0000-4000-8000-000000000001')
 const original=emptyEmail('A personal note kept through every step.'),value={...original,...feedbackEmailPatch(original,created.invitation.id)}
 const saved=await send({type:'save',familyId:'avery',revision:null,value});assert.equal(saved.status,200,await saved.clone().text());const draft=(await saved.json()).drafts.find(d=>d.familyId==='avery')
 const reviewed=await send({type:'review',familyId:'avery',revision:draft.revision,requestId:'10000000-0000-4000-8000-000000000002'});assert.equal(reviewed.status,200,await reviewed.clone().text());const result=await reviewed.json(),outgoing=result.outgoing.find(o=>o.feedbackInvitationId===created.invitation.id)
 assert.ok(outgoing);assert.match(outgoing.html,/Share your feedback<\/a>/);assert.ok(outgoing.body.includes(created.link));assert.equal(outgoing.state,'prepared')
 await manageFeedback({action:'revoke',invitationId:created.invitation.id},'Fixture owner')
 const rejected=await send({type:'dispatch',reviewId:result.reviewId,confirmed:true});assert.equal(rejected.status,409);assert.match((await rejected.json()).error,/used, expired or revoked/)
 assert.equal([...store.documents.values()].filter(d=>d._type==='fixtureMailReceipt').length,0)
 assert.equal(store.documents.get(emailDraftId('avery')).value.body,value.body)
 const edited=await send({type:'save',familyId:'avery',revision:draft.revision,value:{...value,body:value.body+'\nMore personal text.'}});assert.equal(edited.status,200,'Inactive invitation must not prevent preserving edits')
})
test('another family cannot attach an invitation and feedback Preview rejects dispatch even with fictional transport configured',async()=>{
 const created=await createFeedbackInvitation('avery','10000000-0000-4000-8000-000000000003'),base=emptyEmail('A personal note.'),value={...base,...feedbackEmailPatch(base,created.invitation.id)}
 assert.equal((await send({type:'save',familyId:'morgan',revision:null,value})).status,409)
 const save=await send({type:'save',familyId:'avery',revision:null,value});const draft=(await save.json()).drafts.find(d=>d.familyId==='avery')
 const review=await send({type:'review',familyId:'avery',revision:draft.revision,requestId:'10000000-0000-4000-8000-000000000004'});assert.equal(review.status,200);const result=await review.json()
 process.env.FLUFFYTAIL_FEEDBACK_PREVIEW='1'
 assert.equal((await send({type:'dispatch',reviewId:result.reviewId,confirmed:true})).status,403)
 assert.equal([...store.documents.values()].filter(d=>d._type==='fixtureMailReceipt').length,0)
})
test('pasting a raw invitation link cannot bypass family ownership or revocation checks',async()=>{
 const created=await createFeedbackInvitation('avery','10000000-0000-4000-8000-000000000005'),value=emptyEmail('Personal note.\n'+created.link)
 const save=await send({type:'save',familyId:'morgan',revision:null,value});assert.equal(save.status,200)
 const draft=(await save.json()).drafts.find(d=>d.familyId==='morgan')
 const review=await send({type:'review',familyId:'morgan',revision:draft.revision,requestId:'10000000-0000-4000-8000-000000000006'});assert.equal(review.status,409);assert.match((await review.json()).error,/different family/)
 assert.equal(store.documents.get(emailDraftId('morgan')).value.body,value.body)
})
test('feedback save, review and dispatch accepts once through the fictional provider with multipart content and truthful delivery status',async()=>{
 const created=await createFeedbackInvitation('avery','10000000-0000-4000-8000-000000000007')
 const original={...emptyEmail('Avery, I enjoyed the update about your puppy.'),replyToId:'a1'},value={...original,...feedbackEmailPatch(original,created.invitation.id)}
 const saved=await send({type:'save',familyId:'avery',revision:null,value});assert.equal(saved.status,200,await saved.clone().text())
 const draft=(await saved.json()).drafts.find(d=>d.familyId==='avery')
 const reviewed=await send({type:'review',familyId:'avery',revision:draft.revision,requestId:'10000000-0000-4000-8000-000000000008'});assert.equal(reviewed.status,200,await reviewed.clone().text())
 const review=await reviewed.json(),prepared=review.outgoing.find(o=>o.feedbackInvitationId===created.invitation.id)
 const fictional=getMailProvider();let calls=0,submitted,mime
 globalThis.fixtureMailProvider={...fictional,async send(message,scenario){
  calls++;submitted=message
  // A stream transport assembles the actual alternatives locally; it has no
  // network delivery. The real fictional provider records its isolated receipt.
  mime=(await nodemailer.createTransport({streamTransport:true,buffer:true}).sendMail({from:message.from,to:message.to,replyTo:message.replyTo,subject:message.subject,text:message.body,html:message.html,messageId:message.messageId,inReplyTo:message.inReplyTo,references:message.references})).message.toString()
  return fictional.send(message,scenario)
 }}
 try{
  const dispatched=await send({type:'dispatch',reviewId:review.reviewId,confirmed:true});assert.equal(dispatched.status,200,await dispatched.clone().text())
  const accepted=(await dispatched.json()).outgoing.find(o=>o._id===prepared._id)
  assert.equal(calls,1);assert.equal(accepted.state,'accepted');assert.equal(accepted.source,'fictional');assert.equal(accepted.delivery,'unconfirmed');assert.equal(accepted.attempts.length,1);assert.equal(accepted.attempts[0].state,'accepted');assert.equal(accepted.feedbackInvitationId,created.invitation.id)
  assert.equal(submitted.html,prepared.html);assert.equal(submitted.body,prepared.body);assert.ok(submitted.body.includes(original.body));assert.ok(submitted.body.includes(created.link));assert.match(submitted.html,/Share your feedback<\/a>/);assert.ok(submitted.inReplyTo);assert.ok(submitted.references.includes(submitted.inReplyTo));assert.equal(submitted.messageId,prepared.messageId)
  assert.match(mime,/multipart\/alternative/);assert.match(mime,/Content-Type: text\/plain/);assert.match(mime,/Content-Type: text\/html/)
  const duplicate=await send({type:'dispatch',reviewId:review.reviewId,confirmed:true});assert.equal(duplicate.status,200,await duplicate.clone().text())
  const unchanged=(await duplicate.json()).outgoing.find(o=>o._id===prepared._id)
  assert.equal(calls,1);assert.equal(unchanged.attempts.length,1);assert.equal(unchanged.messageId,prepared.messageId);assert.equal(unchanged.delivery,'unconfirmed')
  assert.equal([...store.documents.values()].filter(d=>d._type==='fixtureMailReceipt').length,1)
  assert.equal(store.documents.get(emailDraftId('avery')).value.body,value.body)
  assert.equal(store.documents.get(created.invitation.id).usedAt,undefined,'Provider acceptance is not feedback submission')
 }finally{delete globalThis.fixtureMailProvider}
})
