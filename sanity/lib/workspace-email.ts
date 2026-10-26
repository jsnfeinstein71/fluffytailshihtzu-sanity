import 'server-only'
import {getOperatorClient} from '@/sanity/lib/operator-client'
import {privateRecordId} from './private-records'
import {families,puppies} from '@/app/inbox/workspace/model'
import {emptyEmail,jeanneEmail,mailMessages,paymentPreviewPath,sameEmail,type EmailDraft,type EmailReview,type EmailValue,type MailAction,type MailData,type PaymentRequest} from '@/app/inbox/workspace/email-model'
import type {SavedFamily} from '@/app/inbox/workspace/persistence'
import {getBalance,getPricing} from '@/lib/pricing'
import {listWorkspaceFamilies,requireSyntheticWorkspace,workspaceId,WorkspaceError} from './workspace'

type DraftDocument={_id:string;_rev:string;_type:'staffEmailDraft';workspace:'review-v1';familyId:string;value:EmailValue;updatedAt:string}
export class EmailWorkflowError extends Error{
  constructor(message:string,public status=400,public conflict?:EmailDraft){super(message)}
}
export const emailDraftId=(familyId:string)=>privateRecordId('staffEmailDraft',`review-v1:${familyId}`)
export const emailReviewId=(requestId:string)=>privateRecordId('staffEmailReview',`review-v1:${requestId}`)
export const workspacePaymentId=(requestId:string)=>privateRecordId('staffPaymentRequest',`review-v1:${requestId}`)
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const draftQuery='*[_type == "staffEmailDraft" && workspace == "review-v1" && familyId in $familyIds][0...4]'
const paymentQuery='*[_type == "staffPaymentRequest" && workspace == "review-v1" && familyId in $familyIds] | order(createdAt desc)[0...100]'
const reviewQuery='*[_type == "staffEmailReview" && workspace == "review-v1" && familyId in $familyIds] | order(createdAt desc)[0...100]'

function asDraft(record:DraftDocument):EmailDraft{return {familyId:record.familyId,revision:record._rev,value:record.value,updatedAt:record.updatedAt}}
function validValue(input:unknown):EmailValue{
  if(!input||typeof input!=='object'||Array.isArray(input))throw new EmailWorkflowError('Enter a valid email draft.')
  const value=input as Record<string,unknown>
  if(Object.keys(value).some(key=>!['subject','body','replyToId','paymentRequestId'].includes(key))||typeof value.subject!=='string'||value.subject.length>160||Array.from(value.subject).some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)||typeof value.body!=='string'||value.body.length>10000||!(value.replyToId===null||typeof value.replyToId==='string'&&value.replyToId.length<=100)||!(value.paymentRequestId===null||typeof value.paymentRequestId==='string'&&/^private\.staffPaymentRequest\.[a-f0-9]{64}$/.test(value.paymentRequestId)))throw new EmailWorkflowError('Use a subject up to 160 characters, plain message text up to 10,000 characters, and an existing payment request.')
  return {subject:value.subject,body:value.body,replyToId:value.replyToId,paymentRequestId:value.paymentRequestId}
}
function validate(input:unknown):MailAction{
  if(!input||typeof input!=='object'||Array.isArray(input))throw new EmailWorkflowError('Invalid email action.')
  const data=input as Record<string,unknown>
  // No configuration or forged client request can enable customer delivery in this phase.
  if(data.type==='send'||data.type==='deliver')throw new EmailWorkflowError('Customer sending is disabled. Emails can be saved and reviewed, but nothing can be sent from this workspace.',403)
  const fields:Record<string,string[]>={save:['type','familyId','revision','value'],review:['type','familyId','revision','requestId'],payment:['type','familyId','puppyId','kind','requestId']}
  if(typeof data.type!=='string'||!fields[data.type]||Object.keys(data).some(key=>!fields[data.type as string].includes(key)))throw new EmailWorkflowError('Invalid email action.')
  if(typeof data.familyId!=='string'||!families.some(f=>f.id===data.familyId))throw new EmailWorkflowError('Choose a known family.',404)
  if(data.type==='save'){
    if(!(data.revision===null||typeof data.revision==='string'&&data.revision.length<=100))throw new EmailWorkflowError('A saved draft version is required.')
    return {type:'save',familyId:data.familyId,revision:data.revision,value:validValue(data.value)}
  }
  if(typeof data.requestId!=='string'||!uuid.test(data.requestId))throw new EmailWorkflowError('A valid request ID is required.')
  if(data.type==='review'){
    if(typeof data.revision!=='string'||!data.revision||data.revision.length>100)throw new EmailWorkflowError('Save the email before reviewing it.')
    return {type:'review',familyId:data.familyId,revision:data.revision,requestId:data.requestId}
  }
  if(typeof data.puppyId!=='string'||!puppies.some(p=>p.id===data.puppyId)||(data.kind!=='deposit'&&data.kind!=='balance'))throw new EmailWorkflowError('Choose a puppy and deposit or balance request.')
  return {type:'payment',familyId:data.familyId,puppyId:data.puppyId,kind:data.kind,requestId:data.requestId}
}
async function familyRecord(id:string){
  const record=await getOperatorClient().getDocument<SavedFamily>(workspaceId(id))
  if(!record||record._type!=='staffFamily'||record.workspace!=='review-v1'||record.familyKey!==id)throw new EmailWorkflowError('Start the saved family workspace before composing email.',409)
  if(typeof record.profile.email!=='string'||!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(record.profile.email))throw new EmailWorkflowError('This family needs a valid email address before an email can be prepared.',409)
  if(!record.profile.email.toLowerCase().endsWith('@example.test'))throw new EmailWorkflowError('This review accepts fictional family addresses only. Live correspondence must stay outside the synthetic Preview.',409)
  return record
}
function checkReply(family:SavedFamily,value:EmailValue){
  if(!value.replyToId)return null
  const parent=mailMessages.find(m=>m.id===value.replyToId&&m.familyId===family.familyKey&&m.direction==='in')
  if(!parent||parent.from.toLowerCase()!==family.profile.email.toLowerCase()||parent.to!==jeanneEmail)throw new EmailWorkflowError('That email does not belong to this family’s incoming conversation.',409)
  return parent
}
function quote(family:SavedFamily,puppyId:string,kind:'deposit'|'balance'){
  const puppy=puppies.find(p=>p.id===puppyId)
  const fixture=families.find(f=>f.id===family.familyKey)!
  if(!puppy)throw new EmailWorkflowError('Puppy was not found.',404)
  if(family.profile.puppyId&&family.profile.puppyId!==puppy.id)throw new EmailWorkflowError('This puppy does not match the family’s payment context.',409)
  if(kind==='balance'&&family.profile.puppyId!==puppy.id)throw new EmailWorkflowError('Confirm a family and puppy association before requesting a balance.',409)
  const pricing=getPricing({litterPrice:puppy.price,litterDeposit:puppy.deposit})
  const balance=getBalance(pricing.totalCents,fixture.records)
  if(kind==='deposit'&&(puppy.status!=='Available'||balance.paidCents!==0))throw new EmailWorkflowError('A new deposit request needs an available puppy with no confirmed payment. Review the existing reservation first.',409)
  const amountCents=kind==='deposit'?pricing.depositCents:balance.remainingCents
  if(amountCents<=0||amountCents>balance.remainingCents)throw new EmailWorkflowError('There is no eligible amount remaining for this request.',409)
  return {puppyName:puppy.name,amountCents,totalCents:pricing.totalCents,depositCents:pricing.depositCents,paidCents:balance.paidCents}
}
async function checkedPayment(id:string,family:SavedFamily,requireCurrent=true){
  const request=await getOperatorClient().getDocument<PaymentRequest>(id)
  if(!request||request._type!=='staffPaymentRequest'||request.workspace!=='review-v1'||request.familyId!==family.familyKey||request._id!==workspacePaymentId(request.requestId)||request.testOnly!==true)throw new EmailWorkflowError('That payment request does not belong to this family.',409)
  if(!requireCurrent)return request
  if(!Number.isFinite(Date.parse(request.expiresAt))||Date.parse(request.expiresAt)<=Date.now())throw new EmailWorkflowError('This test payment request has expired. Prepare a fresh request before reviewing the email.',409)
  const current=quote(family,request.puppyId,request.kind)
  if(Object.entries(current).some(([key,value])=>request[key as keyof PaymentRequest]!==value))throw new EmailWorkflowError('The puppy’s price or confirmed balance has changed. Review the payment details and prepare a fresh request.',409)
  return request
}
export async function loadMailbox():Promise<MailData>{
  requireSyntheticWorkspace()
  const saved=await listWorkspaceFamilies()
  const familyIds=saved.map(f=>f.familyKey)
  const client=getOperatorClient()
  const [records,paymentRequests,reviews]=await Promise.all([
    client.fetch<DraftDocument[]>(draftQuery,{familyIds},{cache:'no-store'}),client.fetch<PaymentRequest[]>(paymentQuery,{familyIds},{cache:'no-store'}),client.fetch<EmailReview[]>(reviewQuery,{familyIds},{cache:'no-store'}),
  ])
  const drafts=saved.map(f=>{
    const record=records.find(d=>d._id===emailDraftId(f.familyKey)&&d.familyId===f.familyKey)
    if(record){validValue(record.value);return asDraft(record)}
    return {familyId:f.familyKey,revision:null,value:emptyEmail(f.drafts.Email||'')}
  })
  return {drafts,messages:mailMessages,paymentRequests,reviews,sendingEnabled:false}
}
export async function prepareEmailAction(input:unknown,origin:string){
  requireSyntheticWorkspace()
  const action=validate(input)
  const family=await familyRecord(action.familyId)
  const client=getOperatorClient()
  if(action.type==='payment'){
    const details=quote(family,action.puppyId,action.kind)
    const record:PaymentRequest={_id:workspacePaymentId(action.requestId),_type:'staffPaymentRequest',workspace:'review-v1',familyId:action.familyId,requestId:action.requestId,puppyId:action.puppyId,kind:action.kind,...details,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),testOnly:true}
    await client.transaction().createIfNotExists(record).commit({visibility:'sync'})
    const stored=await checkedPayment(record._id,family)
    if(stored.puppyId!==record.puppyId||stored.kind!==record.kind)throw new EmailWorkflowError('That request ID already belongs to a different payment request.',409)
    return {preparedPaymentId:record._id}
  }
  const id=emailDraftId(action.familyId)
  const current=await client.getDocument<DraftDocument>(id)
  if(action.type==='save'){
    checkReply(family,action.value)
    if(action.value.paymentRequestId)await checkedPayment(action.value.paymentRequestId,family,false)
    if(current&&sameEmail(current.value,action.value))return {}
    if((current?._rev||null)!==action.revision)throw new EmailWorkflowError('This email changed in another tab. Compare the saved copy before replacing it.',409,current?asDraft(current):{familyId:action.familyId,revision:null,value:emptyEmail(family.drafts.Email)})
    const updatedAt=new Date().toISOString()
    if(!current){
      await client.transaction().createIfNotExists({_id:id,_type:'staffEmailDraft',workspace:'review-v1',familyId:action.familyId,value:action.value,updatedAt}).commit({visibility:'sync'})
      const saved=await client.getDocument<DraftDocument>(id)
      if(!saved||!sameEmail(saved.value,action.value))throw new EmailWorkflowError('Another tab created a different draft. Your entries are kept.',409,saved?asDraft(saved):undefined)
    }else{
      try{await client.patch(id).ifRevisionId(current._rev).set({value:action.value,updatedAt}).commit({visibility:'sync'})}
      catch(error){if((error as {statusCode?:number})?.statusCode===409){const latest=await client.getDocument<DraftDocument>(id);throw new EmailWorkflowError('This email changed in another tab. Your entries are kept.',409,latest?asDraft(latest):undefined)}throw error}
    }
    return {}
  }
  if(!current||current._rev!==action.revision)throw new EmailWorkflowError('Save and refresh this email before preparing a review.',409)
  const value=validValue(current.value)
  if(!value.subject.trim()||!value.body.trim())throw new EmailWorkflowError('Enter a subject and message before preparing the review.')
  const parent=checkReply(family,value)
  const payment=value.paymentRequestId?await checkedPayment(value.paymentRequestId,family):null
  const testUrl=payment?new URL(paymentPreviewPath(payment.requestId),origin).href:null
  const body=payment?`${value.body}\n\nTEST PAYMENT REQUEST — no payment can be made using this link.\n${payment.puppyName} ${payment.kind}: $${(payment.amountCents/100).toFixed(2)}\n${testUrl}`:value.body
  const record:EmailReview={_id:emailReviewId(action.requestId),_type:'staffEmailReview',workspace:'review-v1',requestId:action.requestId,familyId:family.familyKey,draftRevision:current._rev,from:jeanneEmail,replyTo:jeanneEmail,to:family.profile.email,subject:value.subject,body,inReplyTo:parent?.messageId||null,references:parent?[...new Set([...parent.references,parent.messageId])].slice(-10):[],paymentRequestId:payment?._id||null,createdAt:new Date().toISOString(),status:'held',testOnly:true}
  await client.transaction().createIfNotExists(record).commit({visibility:'sync'})
  const stored=await client.getDocument<EmailReview>(record._id)
  if(!stored||stored.familyId!==record.familyId||stored.draftRevision!==record.draftRevision||stored.to!==record.to||stored.body!==record.body||stored.subject!==record.subject)throw new EmailWorkflowError('This review request ID belongs to another saved email. Prepare a new review.',409)
  return {reviewId:record._id}
}
export async function getPaymentPreview(requestId:string){
  requireSyntheticWorkspace()
  if(!uuid.test(requestId))throw new WorkspaceError('Payment request was not found.',404)
  const record=await getOperatorClient().getDocument<PaymentRequest>(workspacePaymentId(requestId))
  if(!record)throw new WorkspaceError('Payment request was not found.',404)
  const family=await familyRecord(record.familyId)
  const request=await checkedPayment(record._id,family)
  return {request,familyName:family.profile.name}
}
