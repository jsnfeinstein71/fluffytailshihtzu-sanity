import {samePaymentEmail} from '@/lib/mail/payment-email'
import {approvedTestCustomer,testCustomerContacts} from '@/lib/test-customer'
import {testConfirmationSnapshot} from './test-payment-confirmation'
import {liveWorkspaceEnabled,workspaceNamespace} from '@/lib/workspace-mode'
import 'server-only'
import {randomUUID} from 'node:crypto'
import {getOperatorClient} from '@/sanity/lib/operator-client'
import {privateRecordId} from './private-records'
import {getMailCapabilities,getMailProvider,ownerTestConfigured,ownerTestBody,ownerTestSubject,type Cursor,type ReplyEnvelope} from './mail-provider'
import {EmailWorkflowError,loadMailbox,validateSavedEmailReview} from './workspace-email'
import {requireWorkspace,validFamilyKey,workspaceId} from './workspace'
import {refreshWorkspaceSms} from './workspace-sms'
import {jeanneEmail,type EmailReview,type IncomingEmail,type MailData,type OutgoingEmail,type OutgoingState,type TransportAction} from '@/app/inbox/workspace/email-model'

const outgoingQuery='*[_type == "staffOutgoingEmail" && workspace == $workspace] | order(createdAt desc)[0...100]'
const incomingQuery='*[_type == "staffIncomingEmail" && workspace == $workspace] | order(importedAt asc)[0...100]'
export const outgoingId=(review:Pick<EmailReview,'familyId'|'draftRevision'>)=>privateRecordId('staffOutgoingEmail',`${workspaceNamespace()}:${review.familyId}:${review.draftRevision}`)
export const mailGuardId=(familyId:string)=>privateRecordId('staffMailGuard',`${workspaceNamespace()}:${familyId}`)
export const mailCursorId=privateRecordId('staffMailCursor','review-v1:INBOX')
type Guard={_id:string;_rev:string;activeId:string|null}
type SavedCursor=Cursor&{_id:string;_rev:string;source:string;syncToken:string|null;leaseUntil:number;lastCheckedAt?:number}
const conflict=(error:unknown)=>(error as {statusCode?:number})?.statusCode===409
const stale=(record:OutgoingEmail)=>record.state==='sending'&&Date.now()-Date.parse(record.attempts.at(-1)?.startedAt||'')>120000
const validMessageId=(id:unknown):id is string=>typeof id==='string'&&/^<[^<>\s\x00-\x1f]{1,250}>$/.test(id)

export async function loadEmailWorkflow():Promise<MailData>{
  requireWorkspace()
  const client=getOperatorClient()
  const [base,outgoing,incoming]=await Promise.all([loadMailbox(),client.fetch<OutgoingEmail[]>(outgoingQuery,{workspace:workspaceNamespace()},{cache:'no-store'}),client.fetch<IncomingEmail[]>(incomingQuery,{workspace:workspaceNamespace()},{cache:'no-store'})])
  return {...base,outgoing,messages:[...base.messages,...incoming],capabilities:getMailCapabilities()}
}

export async function ensureOutgoing(reviewId:string,origin:string){
  requireWorkspace()
  const client=getOperatorClient()
  if(!/^private\.staffEmailReview\.[a-f0-9]{64}$/.test(reviewId))throw new EmailWorkflowError('Choose a saved email review.')
  const snapshot=await client.getDocument<EmailReview>(reviewId)
  if(!snapshot||snapshot._type!=='staffEmailReview'||snapshot.workspace!==workspaceNamespace())throw new EmailWorkflowError('Saved email review was not found.',404)
  const id=outgoingId(snapshot)
  const existing=await client.getDocument<OutgoingEmail>(id)
  if(existing){
    if(existing.familyId!==snapshot.familyId||existing.draftRevision!==snapshot.draftRevision||existing.to!==snapshot.to||existing.subject!==snapshot.subject||existing.body!==snapshot.body||existing.html!==snapshot.html||!samePaymentEmail(existing.paymentEmail,snapshot.paymentEmail))throw new EmailWorkflowError('This email version conflicts with its saved outgoing record. Nothing was submitted.',409)
    return existing
  }
  const review=await validateSavedEmailReview(reviewId,origin)
  const record={_id:id,_type:'staffOutgoingEmail',workspace:workspaceNamespace(),reviewId,familyId:review.familyId,from:review.from,replyTo:review.replyTo,to:review.to,subject:review.subject,body:review.body,...(review.paymentEmail?{paymentEmail:review.paymentEmail,html:review.html}:{}),messageId:`<${id.split('.').at(-1)}@fluffytailshihtzu.com>`,inReplyTo:review.inReplyTo,references:review.references,paymentRequestId:review.paymentRequestId,draftRevision:review.draftRevision,createdAt:new Date().toISOString(),state:'prepared',attempts:[],source:'disabled',delivery:'unconfirmed'}
  await client.transaction().createIfNotExists(record).commit({visibility:'sync'})
  const stored=await client.getDocument<OutgoingEmail>(id)
  if(!stored||stored.draftRevision!==review.draftRevision||stored.to!==record.to||stored.body!==record.body||stored.html!==record.html)throw new EmailWorkflowError('Outgoing record could not be confirmed. Nothing was submitted.',409)
  return stored
}

async function acquireGuard(record:OutgoingEmail,ownerTest=false){
  const client=getOperatorClient(),id=mailGuardId(ownerTest?'owner-only-trial':record.familyId)
  await client.transaction().createIfNotExists({_id:id,_type:'staffMailGuard',workspace:workspaceNamespace(),familyId:record.familyId,activeId:null}).commit({visibility:'sync'})
  for(let retry=0;retry<3;retry++){
    const guard=await client.getDocument<Guard>(id)
    if(!guard)throw new EmailWorkflowError('The outgoing guard could not be confirmed.',503)
    if(guard.activeId===record._id)return
    if(ownerTest&&guard.activeId)throw new EmailWorkflowError('The single owner-only trial is already claimed. No second real email can be submitted.',409)
    if(guard.activeId){
      const active=await client.getDocument<OutgoingEmail>(guard.activeId)
      if(!active||!['accepted','failed'].includes(active.state))throw new EmailWorkflowError('This family has an in-progress or uncertain email. Review that attempt before preparing another send. No automatic retry is allowed.',409)
    }
    try{await client.patch(id).ifRevisionId(guard._rev).set({activeId:record._id}).commit({visibility:'sync'});return}catch(error){if(!conflict(error))throw error}
  }
  throw new EmailWorkflowError('Another staff tab is handling this family’s email. Refresh before continuing.',409)
}

async function finishAttempt(record:OutgoingEmail,state:OutgoingState,code:string){
  const client=getOperatorClient()
  const latest=await client.getDocument<OutgoingEmail>(record._id)
  if(!latest||latest.state!=='sending'||latest.attempts.at(-1)?._key!==record.attempts.at(-1)?._key)throw new EmailWorkflowError('This attempt needs review. Its outcome was not replaced.',409)
  const attempts=latest.attempts.map((attempt,index)=>index===latest.attempts.length-1?{...attempt,state,code,finishedAt:new Date().toISOString()}:attempt)
  await client.patch(latest._id).ifRevisionId(latest._rev).set({state,attempts,...(state==='accepted'?{acceptedAt:new Date().toISOString()}:{}),delivery:'unconfirmed'}).commit({visibility:'sync'})
}

export async function reconcileInterruptedAttempts(){
  requireWorkspace()
  const records=await getOperatorClient().fetch<OutgoingEmail[]>(outgoingQuery,{workspace:workspaceNamespace()},{cache:'no-store'})
  for(const record of records.filter(stale)){
    try{await finishAttempt(record,'uncertain','INTERRUPTED_ATTEMPT')}catch(error){if(!conflict(error))throw error}
  }
}

async function dispatch(reviewId:string,scenario:string|undefined,origin:string){
  const provider=getMailProvider()
  if(!provider.capabilities.canDispatch)throw new EmailWorkflowError('Real sending is disabled. Saved outgoing records and drafts are kept. Use the fictional provider for operational tests.',403)
  if(scenario!==undefined&&(provider.capabilities.provider!=='fictional'||!['accepted','rejected','uncertain'].includes(scenario)))throw new EmailWorkflowError('Choose a supported fictional provider result.')
  const confirmations=await getOperatorClient().fetch<OutgoingEmail[]>('*[_type == \"staffOutgoingEmail\" && workspace == $workspace && reviewId == $reviewId && defined(paymentConfirmationSessionId)][0...2]',{workspace:workspaceNamespace(),reviewId},{cache:'no-store'});if(confirmations.length){if(confirmations.length!==1)throw new EmailWorkflowError('Confirmation identity needs review.',409);await dispatchTestConfirmation(confirmations[0]);return}
  let record=await ensureOutgoing(reviewId,origin)
  if(stale(record)){await finishAttempt(record,'uncertain','INTERRUPTED_ATTEMPT');return}
  if(['accepted','sending','uncertain'].includes(record.state))return
  await validateSavedEmailReview(reviewId,origin)
  if(provider.capabilities.provider==='pair'&&ownerTestConfigured()){
    if(record.to!==jeanneEmail||record.subject!==ownerTestSubject||record.body!==ownerTestBody||record.inReplyTo||record.paymentRequestId||record.attempts.length)throw new EmailWorkflowError('The owner-only trial permits one initial message with the exact approved recipient/text and no payment link. No real submission was made.',403)
    const prior=await getOperatorClient().fetch<OutgoingEmail[]>('*[_type == "staffOutgoingEmail" && workspace == $workspace && source == "pair" && count(attempts) > 0][0...1]',{workspace:workspaceNamespace()},{cache:'no-store'})
    if(prior.length)throw new EmailWorkflowError('The single owner-only trial attempt has already been claimed. Review its outcome before authorizing any further real send.',409)
    const baseline=await getOperatorClient().getDocument<SavedCursor>(privateRecordId('staffMailCursor','review-v1:owner-only-trial:INBOX'))
    if(!baseline?.validity)throw new EmailWorkflowError('Initialize the approved future-only reply watermark before the single owner-only send. No existing message will be imported.',409)
  }
  if(testCustomerContacts()){const family=await getOperatorClient().getDocument<import('@/app/inbox/workspace/persistence').SavedFamily>(workspaceId(record.familyId));if(!family||!approvedTestCustomer(family.profile)||record.to!==testCustomerContacts()!.email)throw new EmailWorkflowError('Only the approved test family can receive messages.',403)}
  if(liveWorkspaceEnabled()||testCustomerContacts())await initializeFamilyMailbox(record.familyId)
  await acquireGuard(record,provider.capabilities.provider==='pair'&&ownerTestConfigured())
  record=(await getOperatorClient().getDocument<OutgoingEmail>(record._id))!
  if(!['prepared','failed'].includes(record.state))return
  if(record.attempts.length>=10)throw new EmailWorkflowError('This email has reached its attempt limit. Review its history before proceeding.',409)
  const attempt={_key:randomUUID(),number:record.attempts.length+1,startedAt:new Date().toISOString(),state:'sending' as const}
  const attempts=[...record.attempts,attempt]
  // A durable CAS claim must succeed before any provider submission. A lost
  // acknowledgement leaves a blocked claim, never an implicit second send.
  try{await getOperatorClient().patch(record._id).ifRevisionId(record._rev).set({state:'sending',attempts,source:provider.capabilities.provider}).commit({visibility:'sync'})}catch(error){if(conflict(error))return;throw error}
  const claimed={...record,state:'sending' as const,attempts,source:provider.capabilities.provider}
  let result
  try{result=await provider.send(claimed,scenario)}catch{result={outcome:'uncertain',code:'PROVIDER_OUTCOME_UNCERTAIN'}}
  const state:OutgoingState=result.outcome==='accepted'?'accepted':result.outcome==='rejected'?'failed':'uncertain'
  await finishAttempt(claimed,state,result.code)
  // Draft and payment/reservation records are deliberately not changed.
}

function checkedReply(message:ReplyEnvelope){
  if(!message||!Number.isSafeInteger(message.uid)||message.uid<1||typeof message.validity!=='string'||message.validity.length>100||!(message.messageId===null||validMessageId(message.messageId))||typeof message.from!=='string'||message.from.length>254||message.to!==jeanneEmail||typeof message.subject!=='string'||message.subject.length>160||/[\r\n\x00]/.test(message.subject)||typeof message.body!=='string'||message.body.length>60000||!Array.isArray(message.references)||message.references.length>20||message.references.some(id=>!validMessageId(id))||!(message.inReplyTo===null||validMessageId(message.inReplyTo)))throw new EmailWorkflowError('Reply synchronization returned an invalid message. The saved cursor is kept.',409)
}

async function syncReplies(familyId?:string,initializeOnly=false,background=false){
  const provider=getMailProvider()
  if(!provider.capabilities.canSync)throw new EmailWorkflowError('Real mailbox reads are disabled. No existing message list, body or header was read.',403)
  const client=getOperatorClient()
  if((liveWorkspaceEnabled()||testCustomerContacts())&&(!familyId||!/^inquiry-[a-f0-9]{64}$/.test(familyId)))throw new EmailWorkflowError('Choose a saved family conversation before synchronizing replies.')
  if(testCustomerContacts()){const family=await client.getDocument<import('@/app/inbox/workspace/persistence').SavedFamily>(workspaceId(familyId!));if(!family||!approvedTestCustomer(family.profile))throw new EmailWorkflowError('Only the approved test conversation can read matching replies.',403)}
  const cursorId=liveWorkspaceEnabled()||testCustomerContacts()?familyMailCursorId(familyId!):provider.capabilities.provider==='pair'?privateRecordId('staffMailCursor','review-v1:owner-only-trial:INBOX'):mailCursorId
  await client.transaction().createIfNotExists({_id:cursorId,_type:'staffMailCursor',workspace:workspaceNamespace(),validity:'',lastUid:0,source:provider.capabilities.provider,syncToken:null,leaseUntil:0}).commit({visibility:'sync'})
  const cursor=await client.getDocument<SavedCursor>(cursorId)
  if(background&&cursor&&(cursor.leaseUntil>Date.now()||Date.now()-(cursor.lastCheckedAt||0)<15000))return 'Automatic updates are active.'
  if(!cursor||cursor.leaseUntil>Date.now())throw new EmailWorkflowError('Reply synchronization is already running. Refresh its result before trying again.',409)
  if(cursor.validity&&cursor.source!==provider.capabilities.provider)throw new EmailWorkflowError('Reply provider changed. Review the saved cursor before switching providers.',409)
  if(initializeOnly&&cursor.validity)return 'Reply watermark already initialized.'
  const token=randomUUID()
  try{await client.patch(cursorId).ifRevisionId(cursor._rev).set({syncToken:token,leaseUntil:Date.now()+90000,lastCheckedAt:Date.now()}).commit({visibility:'sync'})}catch(error){if(conflict(error))throw new EmailWorkflowError('Another synchronization has claimed this mailbox. Refresh before continuing.',409);throw error}
  let imported=0,skipped=0
  try{
    const outgoing=await client.fetch<OutgoingEmail[]>((liveWorkspaceEnabled()||testCustomerContacts())?'*[_type == "staffOutgoingEmail" && workspace == $workspace && familyId == $familyId] | order(createdAt desc)[0...101]':outgoingQuery,{workspace:workspaceNamespace(),familyId:familyId||null},{cache:'no-store'})
    if((liveWorkspaceEnabled()||testCustomerContacts())&&outgoing.length>100)throw new EmailWorkflowError('This conversation has more than 100 outgoing versions. Review its reply scope before synchronizing.',409)
    const threads=outgoing.filter(o=>o.source===provider.capabilities.provider&&o.attempts.length>0&&(!(liveWorkspaceEnabled()||testCustomerContacts())||o.familyId===familyId))
    const batch=await provider.sync({cursor:{validity:cursor.validity,lastUid:cursor.lastUid},threads})
    if(typeof batch.validity!=='string'||!batch.validity||!Number.isSafeInteger(batch.lastUid)||batch.lastUid<cursor.lastUid||!Array.isArray(batch.messages)||batch.messages.length>100||(cursor.validity&&batch.validity!==cursor.validity))throw new EmailWorkflowError('The mailbox identity or cursor changed. No automatic reset or history import was performed.',409)
    for(const message of batch.messages){
      checkedReply(message)
      if(message.validity!==batch.validity||message.uid>batch.lastUid)throw new EmailWorkflowError('Reply cursor and message identity do not match.',409)
      const refs=[message.inReplyTo,...message.references].filter(Boolean)
      const candidates=liveWorkspaceEnabled()||testCustomerContacts()?await client.fetch<OutgoingEmail[]>('*[_type == "staffOutgoingEmail" && workspace == $workspace && messageId in $refs]',{workspace:workspaceNamespace(),refs},{cache:'no-store'}):threads
      const matches=candidates.filter(o=>refs.includes(o.messageId))
      if(!matches.length||new Set(matches.map(o=>o.familyId)).size!==1||matches.some(o=>o.to.toLowerCase()!==message.from.toLowerCase())){skipped++;continue}
      const parent=matches.find(o=>o.messageId===message.inReplyTo)||matches[0]
      const id=privateRecordId('staffIncomingEmail',`${workspaceNamespace()}:${jeanneEmail}:${message.messageId||`${message.validity}:${message.uid}`}`)
      const record:IncomingEmail={_id:id,_type:'staffIncomingEmail',workspace:workspaceNamespace(),id,familyId:parent.familyId,from:message.from,to:jeanneEmail,subject:message.subject,body:message.body,messageId:message.messageId||'',references:message.references,direction:'in',time:message.time,source:provider.capabilities.provider as 'fictional'|'pair',matchedOutgoingId:parent._id,uid:message.uid,validity:message.validity,importedAt:new Date().toISOString()}
      const before=await client.getDocument<IncomingEmail>(id)
      await client.transaction().createIfNotExists(record).commit({visibility:'sync'})
      const stored=await client.getDocument<IncomingEmail>(id)
      if(!stored||stored.familyId!==record.familyId||stored.from.toLowerCase()!==record.from.toLowerCase()||stored.body!==record.body||stored.messageId!==record.messageId||stored.to!==record.to||stored.subject!==record.subject||JSON.stringify(stored.references)!==JSON.stringify(record.references))throw new EmailWorkflowError('A reply identifier conflicts with a previously imported message. Its contents were not overwritten.',409)
      if(!before)imported++
      const current=await client.getDocument<OutgoingEmail>(parent._id)
      if(current&&!current.replyReceivedAt)try{await client.patch(current._id).ifRevisionId(current._rev).set({replyReceivedAt:new Date().toISOString()}).commit({visibility:'sync'})}catch(error){if(!conflict(error))throw error}
    }
    const latest=await client.getDocument<SavedCursor>(cursorId)
    if(!latest||latest.syncToken!==token)throw new EmailWorkflowError('Reply synchronization was interrupted. Its cursor was not advanced.',409)
    await client.patch(cursorId).ifRevisionId(latest._rev).set({validity:batch.validity,lastUid:batch.lastUid,source:provider.capabilities.provider,syncToken:null,leaseUntil:0}).commit({visibility:'sync'})
    return `${provider.capabilities.provider==='fictional'?'Fictional provider':'Pair'}: ${imported} new ${imported===1?'reply':'replies'} imported; ${skipped} unmatched or ambiguous messages skipped. Existing imports were kept without duplicates.`
  }catch(error){
    const latest=await client.getDocument<SavedCursor>(cursorId)
    if(latest?.syncToken===token)try{await client.patch(cursorId).ifRevisionId(latest._rev).set({syncToken:null,leaseUntil:0}).commit({visibility:'sync'})}catch{/* Lease expires without advancing the cursor. */}
    throw error
  }
}

export async function performTransportAction(input:unknown,origin:string){
  requireWorkspace()
  if(!input||typeof input!=='object'||Array.isArray(input))throw new EmailWorkflowError('Choose a valid email action.')
  const action=input as TransportAction
  const fields=action.type==='dispatch'?['type','reviewId','scenario','confirmed']:action.type==='resolve'?['type','outgoingId','attemptKey','decision','evidence','acknowledged']:['sync','refresh'].includes(action.type)?['type','familyId']:['type']
  if(!['dispatch','sync','refresh','reconcile','resolve'].includes(action.type)||Object.keys(action).some(key=>!fields.includes(key)))throw new EmailWorkflowError('Choose a valid email action.')
  if(action.type==='dispatch'){
    if(typeof action.reviewId!=='string'||!/^private\.staffEmailReview\.[a-f0-9]{64}$/.test(action.reviewId))throw new EmailWorkflowError('Choose a saved review.')
    if((liveWorkspaceEnabled()||testCustomerContacts())&&action.confirmed!==true)throw new EmailWorkflowError('Confirm this saved email before sending it.',400)
    await dispatch(action.reviewId,action.scenario,origin)
  }else if(action.type==='resolve'){
    if(typeof action.outgoingId!=='string'||!/^private\.staffOutgoingEmail\.[a-f0-9]{64}$/.test(action.outgoingId)||typeof action.attemptKey!=='string'||action.acknowledged!==true||!['accepted','not-accepted'].includes(action.decision)||typeof action.evidence!=='string'||action.evidence.trim().length<20||action.evidence.length>2000)throw new EmailWorkflowError('Record the checked provider evidence and explicitly confirm the SMTP outcome before resolving this attempt.')
    const client=getOperatorClient(),record=await client.getDocument<OutgoingEmail>(action.outgoingId)
    if(!record||record._type!=='staffOutgoingEmail'||record.workspace!==workspaceNamespace()||record.state!=='uncertain'||record.attempts.at(-1)?._key!==action.attemptKey)throw new EmailWorkflowError('This uncertain attempt changed. Refresh and review its current history first.',409)
    const resolution={attemptKey:action.attemptKey,decision:action.decision,evidence:action.evidence.trim(),operator:process.env.INBOX_BASIC_AUTH_USER||'staff',at:new Date().toISOString()}
    // Preserve the original uncertain attempt. A separately attributed review
    // changes eligibility, never causes a provider call or confirms delivery.
    await client.patch(record._id).ifRevisionId(record._rev).set({state:action.decision==='accepted'?'accepted':'failed',resolutions:[...(record.resolutions||[]),resolution],delivery:'unconfirmed'}).commit({visibility:'sync'})
  }else if(action.type==='refresh'){
    if(!validFamilyKey(action.familyId))throw new EmailWorkflowError('Choose a saved family conversation.')
    await reconcileInterruptedAttempts()
    if(testCustomerContacts())await sendPreparedTestConfirmations(action.familyId)
    let syncNotice=''
    if(getMailCapabilities().canSync){
      const cursor=await getOperatorClient().getDocument<SavedCursor>(liveWorkspaceEnabled()||testCustomerContacts()?familyMailCursorId(action.familyId):mailCursorId)
      // Opening a conversation never starts a historical mailbox import. Only
      // threads with an existing future-only watermark are eligible.
      if(cursor?.validity)try{await syncReplies(action.familyId,false,true)}catch(error){syncNotice=error instanceof Error?error.message:'Automatic email updates are unavailable. Use Refresh to retry.'}
    }
    try{await refreshWorkspaceSms(action.familyId)}catch{syncNotice+=' Text delivery updates are temporarily unavailable; saved messages are still shown.'}
    return {syncNotice}
  }else if(action.type==='sync')return {syncNotice:await syncReplies(action.familyId)}
  else await reconcileInterruptedAttempts()
  return {}
}

export function familyMailCursorId(familyId:string){return privateRecordId('staffMailCursor',`${workspaceNamespace()}:${familyId}:INBOX`)}
async function initializeFamilyMailbox(familyId:string){const cursor=await getOperatorClient().getDocument<SavedCursor>(familyMailCursorId(familyId));if(!cursor?.validity)await syncReplies(familyId,true)}

// Payment confirmations share the existing durable outbox and attempt controls.
// Only a verified test ledger creates this immutable message; no browser draft
// or unsigned checkout return can create, retarget or settle it.
export async function ensureTestPaymentConfirmation(sessionId:string){
 const snapshot=await testConfirmationSnapshot(sessionId);if(!snapshot)return
 const client=getOperatorClient()
 await client.transaction().createIfNotExists({...snapshot,createdAt:new Date().toISOString(),state:'prepared',attempts:[],source:'pair',delivery:'unconfirmed'}).commit({visibility:'sync'})
 const record=await client.getDocument<OutgoingEmail>(snapshot._id)
 if(record?.state==='prepared')try{await dispatchTestConfirmation(record)}catch{/* Durable preparation remains visible; staff refresh can retry an unclaimed preparation. */}
}
async function sendPreparedTestConfirmations(familyId:string){
 const records=await getOperatorClient().fetch<OutgoingEmail[]>('*[_type == "staffOutgoingEmail" && workspace == "review-v1" && familyId == $familyId && defined(paymentConfirmationSessionId) && state == "prepared"][0...5]',{familyId},{cache:'no-store'})
 for(const record of records)try{await dispatchTestConfirmation(record)}catch{/* No automatic retry of a failed, sending or uncertain attempt. */}
}
async function dispatchTestConfirmation(record:OutgoingEmail){
 const snapshot=await testConfirmationSnapshot(record.paymentConfirmationSessionId||'')
 if(!snapshot||Object.entries(snapshot).some(([key,value])=>key==='paymentEmail'&&'paymentEmail' in snapshot?!samePaymentEmail(record.paymentEmail,snapshot.paymentEmail):JSON.stringify(record[key as keyof OutgoingEmail])!==JSON.stringify(value)))throw new EmailWorkflowError('This payment confirmation needs review. No email was sent.',409)
 const provider=getMailProvider();if(provider.capabilities.provider!=='pair'||!provider.capabilities.canDispatch)throw new EmailWorkflowError('Pair test confirmations are unavailable.',503)
 if(!['prepared','failed'].includes(record.state))return
 await initializeFamilyMailbox(record.familyId)
 await acquireGuard(record)
 const client=getOperatorClient(),latest=await client.getDocument<OutgoingEmail>(record._id)
 if(!latest||!['prepared','failed'].includes(latest.state))return
 if(latest.attempts.length>=10)throw new EmailWorkflowError('Review the confirmation attempt limit.',409)
 const attempts=[...latest.attempts,{_key:randomUUID(),number:latest.attempts.length+1,startedAt:new Date().toISOString(),state:'sending' as const}]
 try{await client.patch(latest._id).ifRevisionId(latest._rev).set({state:'sending',attempts,source:'pair'}).commit({visibility:'sync'})}catch(error){if(conflict(error))return;throw error}
 let result;try{result=await provider.send({...latest,state:'sending',attempts,source:'pair'})}catch{result={outcome:'uncertain',code:'PROVIDER_OUTCOME_UNCERTAIN'}}
 await finishAttempt({...latest,attempts},result.outcome==='accepted'?'accepted':result.outcome==='rejected'?'failed':'uncertain',result.code)
}
