import {requireLivePaymentConfiguration} from '@/lib/live-payment-mode'
import {findLiveLedger,ledgerMatches,livePaymentContext,livePaymentUrl} from './live-payment'
import {checkedAttachments,listAttachments} from './workspace-attachments'
import {sameAttachments} from '@/lib/mail/attachment-model'
import {paymentRequestEmail,renderPaymentEmail,samePaymentEmail} from '@/lib/mail/payment-email'
import {randomBytes} from 'node:crypto'
import {approvedTestCustomer} from '@/lib/test-customer'
import {createBalanceCheckout} from './balance-checkout'
import {paymentTestWorkspaceEnabled,requirePaymentTestConfiguration} from '@/lib/payment-test-mode'
import {liveWorkspaceEnabled,workspaceNamespace} from '@/lib/workspace-mode'
import 'server-only'
import {litterReservationsEnabled} from '@/lib/litter-reservations'
import {customerLitterPayment,reconcileLitterHold} from './litter-reservations'
import {getOperatorClient} from '@/sanity/lib/operator-client'
import {privateRecordId} from './private-records'
import {families,puppies} from '@/app/inbox/workspace/model'
import {emptyEmail,jeanneEmail,mailMessages,paymentPreviewPath,sameEmail,type EmailDraft,type EmailReview,type EmailValue,type MailAction,type MailData,type PaymentRequest,type IncomingEmail} from '@/app/inbox/workspace/email-model'
import type {SavedFamily} from '@/app/inbox/workspace/persistence'
import {getBalance,getPricing} from '@/lib/pricing'
import {listWorkspaceFamilies,requireWorkspace,workspaceId,WorkspaceError,validFamilyKey} from './workspace'
import {getPaymentContext} from './payment-context'
import {createDepositCheckout} from './deposit-checkout'
import {getStripe} from './stripe'
import {emailRecipient} from './mail-provider'

type DraftDocument={_id:string;_rev:string;_type:'staffEmailDraft';workspace:'review-v1'|'live-v1';familyId:string;value:EmailValue;updatedAt:string}
export class EmailWorkflowError extends Error{
  constructor(message:string,public status=400,public conflict?:EmailDraft){super(message)}
}
export const emailDraftId=(familyId:string)=>privateRecordId('staffEmailDraft',`${workspaceNamespace()}:${familyId}`)
export const emailReviewId=(requestId:string)=>privateRecordId('staffEmailReview',`${workspaceNamespace()}:${requestId}`)
export const workspacePaymentId=(requestId:string)=>privateRecordId('staffPaymentRequest',`${workspaceNamespace()}:${requestId}`)
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const draftQuery='*[_type == "staffEmailDraft" && workspace == $workspace && familyId in $familyIds][0...500]'
const paymentQuery='*[_type == "staffPaymentRequest" && workspace == $workspace && familyId in $familyIds] | order(createdAt desc)[0...100]'
const reviewQuery='*[_type == "staffEmailReview" && workspace == $workspace && familyId in $familyIds] | order(createdAt desc)[0...100]'

function asDraft(record:DraftDocument):EmailDraft{return {familyId:record.familyId,revision:record._rev,value:record.value,updatedAt:record.updatedAt}}
function validValue(input:unknown):EmailValue{
  if(!input||typeof input!=='object'||Array.isArray(input))throw new EmailWorkflowError('Enter a valid email draft.')
  const value=input as Record<string,unknown>
  if(Object.keys(value).some(key=>!['subject','body','replyToId','paymentRequestId','attachmentIds'].includes(key))||typeof value.subject!=='string'||value.subject.length>160||Array.from(value.subject).some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)||typeof value.body!=='string'||value.body.length>10000||!(value.replyToId===null||typeof value.replyToId==='string'&&value.replyToId.length<=100)||!(value.paymentRequestId===null||typeof value.paymentRequestId==='string'&&/^private\.staffPaymentRequest\.[a-f0-9]{64}$/.test(value.paymentRequestId)))throw new EmailWorkflowError('Use a subject up to 160 characters, plain message text up to 10,000 characters, and an existing payment request.')
  if(value.attachmentIds!==undefined&&(!Array.isArray(value.attachmentIds)||value.attachmentIds.length>5||new Set(value.attachmentIds).size!==value.attachmentIds.length||value.attachmentIds.some(id=>typeof id!=='string'||!/^private\.staffAttachment\.[a-f0-9]{64}$/.test(id))))throw new EmailWorkflowError('Choose up to five saved family files.')
  return {...(value.attachmentIds?{attachmentIds:value.attachmentIds as string[]}:{}),subject:value.subject,body:value.body,replyToId:value.replyToId,paymentRequestId:value.paymentRequestId}
}
function validate(input:unknown):MailAction{
  if(!input||typeof input!=='object'||Array.isArray(input))throw new EmailWorkflowError('Invalid email action.')
  const data=input as Record<string,unknown>
  // No configuration or forged client request can enable customer delivery in this phase.
  if(data.type==='send'||data.type==='deliver')throw new EmailWorkflowError('Customer sending is disabled. Emails can be saved and reviewed, but nothing can be sent from this workspace.',403)
  const fields:Record<string,string[]>={'confirmation-message':['type','familyId','message','base'],checkout:['type','familyId','paymentRequestId'],verify:['type','familyId','paymentRequestId'],save:['type','familyId','revision','value'],review:['type','familyId','revision','requestId'],payment:['type','familyId','puppyId','kind','requestId']}
  if(typeof data.type!=='string'||!fields[data.type]||Object.keys(data).some(key=>!fields[data.type as string].includes(key)))throw new EmailWorkflowError('Invalid email action.')
  if(!validFamilyKey(data.familyId))throw new EmailWorkflowError('Choose a known family.',404)
  if(data.type==='confirmation-message'){
    if(typeof data.message!=='string'||data.message.length>4000||typeof data.base!=='string'||data.base.length>4000)throw new EmailWorkflowError('Use a confirmation message up to 4,000 characters.')
    return {type:'confirmation-message',familyId:data.familyId,message:data.message,base:data.base}
  }
  if(data.type==='checkout'||data.type==='verify'){
    if(typeof data.paymentRequestId!=='string'||!/^private\.staffPaymentRequest\.[a-f0-9]{64}$/.test(data.paymentRequestId))throw new EmailWorkflowError('Choose a saved payment request.')
    return {type:data.type,familyId:data.familyId,paymentRequestId:data.paymentRequestId}
  }
  if(data.type==='save'){
    if(!(data.revision===null||typeof data.revision==='string'&&data.revision.length<=100))throw new EmailWorkflowError('A saved draft version is required.')
    return {type:'save',familyId:data.familyId,revision:data.revision,value:validValue(data.value)}
  }
  if(typeof data.requestId!=='string'||!uuid.test(data.requestId))throw new EmailWorkflowError('A valid request ID is required.')
  if(data.type==='review'){
    if(typeof data.revision!=='string'||!data.revision||data.revision.length>100)throw new EmailWorkflowError('Save the email before reviewing it.')
    return {type:'review',familyId:data.familyId,revision:data.revision,requestId:data.requestId}
  }
  if(typeof data.puppyId!=='string'||!/^[-a-zA-Z0-9_]{1,128}$/.test(data.puppyId)||(data.kind!=='deposit'&&data.kind!=='balance'))throw new EmailWorkflowError('Choose a puppy and deposit or balance request.')
  return {type:'payment',familyId:data.familyId,puppyId:data.puppyId,kind:data.kind,requestId:data.requestId}
}
async function familyRecord(id:string){
  const record=await getOperatorClient().getDocument<SavedFamily>(workspaceId(id))
  if(!record||record._type!=='staffFamily'||record.workspace!==workspaceNamespace()||record.familyKey!==id)throw new EmailWorkflowError('Start the saved family workspace before composing email.',409)
  if(typeof record.profile.email!=='string'||!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(record.profile.email))throw new EmailWorkflowError('This family needs a valid email address before an email can be prepared.',409)
  if(!liveWorkspaceEnabled()&&!record.profile.email.toLowerCase().endsWith('@example.test')&&!approvedTestCustomer(record.profile))throw new EmailWorkflowError('This review accepts fictional family addresses only. Live correspondence must stay outside the synthetic Preview.',409)
  if(paymentTestWorkspaceEnabled()&&!record.profile.paymentTestScenario)throw new EmailWorkflowError('Choose a prepared fictional payment-test family.',409)
  return record
}
async function checkReply(family:SavedFamily,value:EmailValue){
  if(!value.replyToId)return null
  let parent=mailMessages.find(m=>m.id===value.replyToId&&m.familyId===family.familyKey&&m.direction==='in')
  if(!parent&&/^private\.staffIncomingEmail\.[a-f0-9]{64}$/.test(value.replyToId)){
    const imported=await getOperatorClient().getDocument<IncomingEmail>(value.replyToId)
    if(imported?._type==='staffIncomingEmail'&&imported.workspace===workspaceNamespace()&&imported.familyId===family.familyKey)parent=imported
  }
  const expectedFrom=parent?.id.startsWith('private.staffIncomingEmail.')?emailRecipient(family.profile.email):family.profile.email
  if(!parent||parent.from.toLowerCase()!==expectedFrom.toLowerCase()||parent.to!==jeanneEmail)throw new EmailWorkflowError('That email does not belong to this family’s incoming conversation.',409)
  if(!parent.messageId)throw new EmailWorkflowError('This incoming email has no usable Message-ID. Start a new email instead of guessing its reply headers.',409)
  return parent
}
async function quote(family:SavedFamily,puppyId:string,kind:'deposit'|'balance'){
  if(family.profile.source==='inquiry'){
    if(family.profile.puppyId&&family.profile.puppyId!==puppyId)throw new EmailWorkflowError('This puppy does not match the saved family association.',409)
    const matches=await getOperatorClient().fetch<{slug:string}[]>('*[_type == "puppy" && _id == $id && !(_id in path("drafts.**"))][0...2]{"slug":slug.current}',{id:puppyId},{cache:'no-store'})
    if(matches.length!==1||!matches[0].slug)throw new EmailWorkflowError('Choose a unique published puppy.',409)
    const context=await getPaymentContext(matches[0].slug)
    if(kind==='balance'){
      if(family.profile.puppyId!==puppyId)throw new EmailWorkflowError('Associate the family with this puppy before requesting its balance.',409)
      const paid=await getOperatorClient().fetch<{customerEmail?:string;customerPhone?:string;quotedTotalCents?:number;quotedDepositCents?:number}[]>('*[_type == "paymentRecord" && puppySlug == $slug && paymentStatus == "paid"]{customerEmail,customerPhone,quotedTotalCents,quotedDepositCents}',{slug:context.puppy.slug},{cache:'no-store'})
      if(!paid.length||paid.some(r=>r.customerEmail?.toLowerCase()!==family.profile.email.toLowerCase()&&(!family.profile.phone||r.customerPhone!==family.profile.phone)))throw new EmailWorkflowError('The paid records do not establish this family’s balance. Review the existing Inbox before creating a request.',409)
      const totals=[...new Set(paid.map(p=>p.quotedTotalCents))];if(liveWorkspaceEnabled()&&(totals.length!==1||!Number.isSafeInteger(totals[0])))throw new EmailWorkflowError('This historical payment has no verified agreed-price snapshot. Review it in the existing Inbox before requesting a balance.',409)
      const total=liveWorkspaceEnabled()?totals[0]!:context.pricing.totalCents,balance=getBalance(total,context.records)
      if(balance.remainingCents<=0)throw new EmailWorkflowError('This puppy is paid in full. No further balance can be requested.',409)
      return {puppyName:context.puppy.name,amountCents:balance.remainingCents,totalCents:total,depositCents:paid[0].quotedDepositCents||context.pricing.depositCents,paidCents:balance.paidCents}
    }
    if(!['available','hold'].includes(context.puppy.status)||!['current','active'].includes(context.puppy.litterStatus)||context.puppy.isVisible===false||context.puppy.litterVisible===false||context.balance.paidCents!==0)throw new EmailWorkflowError('This puppy is not eligible for a new deposit.',409)
    return {puppyName:context.puppy.name,amountCents:context.pricing.depositCents,totalCents:context.pricing.totalCents,depositCents:context.pricing.depositCents,paidCents:context.balance.paidCents}
  }
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
  if(!request||request._type!=='staffPaymentRequest'||request.workspace!==workspaceNamespace()||request.familyId!==family.familyKey||request._id!==workspacePaymentId(request.requestId)||request.testOnly===liveWorkspaceEnabled())throw new EmailWorkflowError('That payment request does not belong to this family.',409)
  if(!requireCurrent)return request
  if(request.litterReservationId){const current=await customerLitterPayment(request);if(current.state!=='ready')throw new EmailWorkflowError('This litter deposit request is no longer payable. Refresh its reservation before sending.',409);return request}
  if(!Number.isFinite(Date.parse(request.expiresAt))||Date.parse(request.expiresAt)<=Date.now())throw new EmailWorkflowError('This payment request has expired. Prepare a fresh request before reviewing the email.',409)
  const current=await quote(family,request.puppyId,request.kind)
  if(Object.entries(current).some(([key,value])=>request[key as keyof PaymentRequest]!==value))throw new EmailWorkflowError('The puppy’s price or confirmed balance has changed. Review the payment details and prepare a fresh request.',409)
  return request
}
export async function loadMailbox():Promise<MailData>{
  requireWorkspace()
  const saved=await listWorkspaceFamilies()
  const familyIds=saved.map(f=>f.familyKey)
  const client=getOperatorClient()
  const [records,paymentRequests,reviews]=await Promise.all([
    client.fetch<DraftDocument[]>(draftQuery,{familyIds,workspace:workspaceNamespace()},{cache:'no-store'}),client.fetch<PaymentRequest[]>(paymentQuery,{familyIds,workspace:workspaceNamespace()},{cache:'no-store'}),client.fetch<EmailReview[]>(reviewQuery,{familyIds,workspace:workspaceNamespace()},{cache:'no-store'}),
  ])
  const drafts=saved.map(f=>{
    const record=records.find(d=>d._id===emailDraftId(f.familyKey)&&d.familyId===f.familyKey)
    if(record){validValue(record.value);return asDraft(record)}
    return {familyId:f.familyKey,revision:null,value:emptyEmail(f.drafts.Email||'')}
  })
  const inventory=await client.fetch<{id:string;name:string;sex:string;color:string;litter:string;status:string;price:number;deposit:number;slug:string;paymentTestScenario?:string}[]>('*[_type == "puppy" && !(_id in path("drafts.**")) && !(_id in path("versions.**"))][0...200]{"id":_id,name,sex,color,paymentTestScenario,"litter":litter->title,status,"price":coalesce(overridePrice,litter->price),"deposit":litter->deposit,"slug":slug.current}',{},{cache:'no-store'})
  const presentedPayments=liveWorkspaceEnabled()?paymentRequests.map(p=>{try{return {...p,checkoutUrl:livePaymentUrl(p)}}catch{return p}}):paymentRequests
  return {litterReservationsEnabled:litterReservationsEnabled(),attachmentLibrary:await listAttachments(familyIds),paymentTesting:paymentTestWorkspaceEnabled(),families:saved,drafts,messages:liveWorkspaceEnabled()?[]:mailMessages,paymentRequests:presentedPayments,reviews,sendingEnabled:false,inventory:inventory.filter(p=>!paymentTestWorkspaceEnabled()||p.paymentTestScenario).map(p=>({...p,status:typeof p.status==='string'?p.status.charAt(0).toUpperCase()+p.status.slice(1):'Unknown'})),testCheckoutEnabled:liveWorkspaceEnabled()||process.env.FLUFFYTAIL_STRIPE_TEST_ENABLED==='1',live:liveWorkspaceEnabled()}
}
export async function prepareEmailAction(input:unknown,origin:string){
  requireWorkspace()
  const action=validate(input)
  const family=await familyRecord(action.familyId)
  const client=getOperatorClient()
  if(action.type==='confirmation-message'){
    if(!paymentTestWorkspaceEnabled()&&!liveWorkspaceEnabled())throw new EmailWorkflowError('Confirmation editing is unavailable.',403)
    if((family.profile.paymentConfirmationMessage||'')!==action.base)throw new EmailWorkflowError('This confirmation message changed in another tab. Reload the saved message before replacing it.',409)
    try{await client.patch(family._id).ifRevisionId(family._rev).set({'profile.paymentConfirmationMessage':action.message}).commit({visibility:'sync'})}catch(error){if((error as {statusCode?:number}).statusCode===409)throw new EmailWorkflowError('The family changed in another tab. Your message is kept; refresh and save again.',409);throw error}
    return {}
  }
  if(action.type==='checkout'||action.type==='verify')return await paymentTransport(action,family,origin)
  if(action.type==='payment'){
    if(paymentTestWorkspaceEnabled()||liveWorkspaceEnabled()){
      if(liveWorkspaceEnabled())requireLivePaymentConfiguration();else requirePaymentTestConfiguration()
      // An expired app link does not prove an earlier provider attempt failed.
      // Do not issue a second charge while the first is paid or processing.
      const unsettled=await client.fetch<PaymentRequest[]>('*[_type == "staffPaymentRequest" && workspace == $workspace && testOnly == $testOnly && familyId == $familyId && puppyId == $puppyId && defined(checkoutSessionId) && !defined(webhookVerifiedAt)][0...21]',{workspace:workspaceNamespace(),testOnly:!liveWorkspaceEnabled(),familyId:family.familyKey,puppyId:action.puppyId},{cache:'no-store'})
      if(unsettled.length>20)throw new EmailWorkflowError('Earlier checkouts need review before requesting another payment.',409)
      for(const prior of unsettled){
        const session=await getStripe().checkout.sessions.retrieve(prior.checkoutSessionId!)
        // Earlier live releases recorded verified payments without stamping the
        // request. Honor that ledger without rewriting it or backfilling mail.
        if(liveWorkspaceEnabled()&&session.payment_status==='paid'){
          const context=await livePaymentContext(session),ledger=await findLiveLedger(session.id)
          if(ledger&&ledgerMatches(ledger,context))continue
        }
        if(session.livemode!==liveWorkspaceEnabled()||session.payment_status==='paid'||session.status==='complete'&&prior.checkoutOutcome!=='failed')throw new EmailWorkflowError('An earlier Stripe payment is awaiting confirmation. Do not request or pay again; review that payment first.',409)
      }
    }
    const details=await quote(family,action.puppyId,action.kind)
    if(paymentTestWorkspaceEnabled()||liveWorkspaceEnabled()){
      const pending=await client.fetch<PaymentRequest[]>('*[_type == "staffPaymentRequest" && workspace == $workspace && testOnly == $testOnly && familyId == $familyId && puppyId == $puppyId && kind == $kind && expiresAt > $now] | order(createdAt desc)[0...1]',{workspace:workspaceNamespace(),testOnly:!liveWorkspaceEnabled(),familyId:family.familyKey,puppyId:action.puppyId,kind:action.kind,now:new Date().toISOString()},{cache:'no-store'})
      if(pending[0]&&Object.entries(details).every(([key,value])=>pending[0][key as keyof PaymentRequest]===value)){
        const prior=pending[0],session=prior.checkoutSessionId?await getStripe().checkout.sessions.retrieve(prior.checkoutSessionId):null
        if(session?.status!=='expired')return {preparedPaymentId:prior._id}
        await client.patch(prior._id).set({expiresAt:new Date().toISOString()}).commit({visibility:'sync'})
        const link=await client.fetch<{_id:string}|null>('*[_type == "depositLink" && stripeCheckoutSessionId == $sessionId][0]{_id}',{sessionId:session.id},{cache:'no-store'})
        if(link)await client.patch(link._id).set({active:false,expiresAt:new Date().toISOString()}).commit({visibility:'sync'})
      }
    }
    const record:PaymentRequest={_id:workspacePaymentId(action.requestId),_type:'staffPaymentRequest',...(liveWorkspaceEnabled()||approvedTestCustomer(family.profile)||litterReservationsEnabled()&&family.profile.paymentTestScenario?{publicToken:randomBytes(24).toString('hex')}:{}),workspace:workspaceNamespace(),familyId:action.familyId,requestId:action.requestId,puppyId:action.puppyId,kind:action.kind,...details,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),testOnly:!liveWorkspaceEnabled()}
    await client.transaction().createIfNotExists(record).commit({visibility:'sync'})
    const stored=await checkedPayment(record._id,family)
    if(stored.puppyId!==record.puppyId||stored.kind!==record.kind)throw new EmailWorkflowError('That request ID already belongs to a different payment request.',409)
    return {preparedPaymentId:record._id}
  }
  const id=emailDraftId(action.familyId)
  const current=await client.getDocument<DraftDocument>(id)
  if(action.type==='save'){
    await checkedAttachments(action.value.attachmentIds,family.familyKey)
    await checkReply(family,action.value)
    if(action.value.paymentRequestId)await checkedPayment(action.value.paymentRequestId,family,false)
    if(current&&sameEmail(current.value,action.value))return {}
    if((current?._rev||null)!==action.revision)throw new EmailWorkflowError('This email changed in another tab. Compare the saved copy before replacing it.',409,current?asDraft(current):{familyId:action.familyId,revision:null,value:emptyEmail(family.drafts.Email)})
    const updatedAt=new Date().toISOString()
    if(!current){
      await client.transaction().createIfNotExists({_id:id,_type:'staffEmailDraft',workspace:workspaceNamespace(),familyId:action.familyId,value:action.value,updatedAt}).commit({visibility:'sync'})
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
  if(!value.subject.trim()||!value.body.trim()&&!value.attachmentIds?.length)throw new EmailWorkflowError('Enter a subject and a message or attachment before sending.')
  const parent=await checkReply(family,value)
  const payment=value.paymentRequestId?await checkedPayment(value.paymentRequestId,family):null
  if(liveWorkspaceEnabled()&&payment&&!payment.checkoutUrl)throw new EmailWorkflowError('Create and verify the payment checkout link before reviewing this email.',409)
  const testUrl=payment?(payment.checkoutUrl||new URL(paymentPreviewPath(payment.requestId),origin).href):null
  const body=payment&&!payment.publicToken?`${value.body}\n\n${liveWorkspaceEnabled()?'PAYMENT REQUEST — a link is not confirmation of payment.':'TEST PAYMENT REQUEST — no payment can be made using this link.'}\n${payment.puppyName} ${payment.kind}: $${(payment.amountCents/100).toFixed(2)}\n${testUrl}`:value.body
  const attachments=await checkedAttachments(value.attachmentIds,family.familyKey)
  const presentation=payment&&liveWorkspaceEnabled()&&!payment.litterReservationId?{...payment,checkoutUrl:livePaymentUrl((await livePaymentContext(await getStripe().checkout.sessions.retrieve(payment.checkoutSessionId!))).request)}:payment
  const paymentEmail=(paymentTestWorkspaceEnabled()||liveWorkspaceEnabled())&&presentation?paymentRequestEmail(presentation,family.profile.name,value.body):null
  if(liveWorkspaceEnabled()&&payment&&!paymentEmail)throw new EmailWorkflowError('This payment link needs review before sending.',409)
  const formatted=paymentEmail?renderPaymentEmail(paymentEmail):null
  const record:EmailReview={_id:emailReviewId(action.requestId),_type:'staffEmailReview',workspace:workspaceNamespace(),requestId:action.requestId,familyId:family.familyKey,draftRevision:current._rev,from:jeanneEmail,replyTo:jeanneEmail,to:emailRecipient(family.profile.email),subject:value.subject,body:formatted?.text||body,...(attachments.length?{attachments}:{}),...(paymentEmail&&formatted?{paymentEmail,html:formatted.html}:{}),inReplyTo:parent?.messageId||null,references:parent?[...new Set([...parent.references,parent.messageId])].slice(-10):[],paymentRequestId:payment?._id||null,createdAt:new Date().toISOString(),status:'held',testOnly:!liveWorkspaceEnabled()}
  await client.transaction().createIfNotExists(record).commit({visibility:'sync'})
  const stored=await client.getDocument<EmailReview>(record._id)
  if(!stored||stored.familyId!==record.familyId||stored.draftRevision!==record.draftRevision||stored.to!==record.to||stored.body!==record.body||stored.subject!==record.subject||!sameAttachments(stored.attachments,record.attachments)||stored.html!==record.html||!samePaymentEmail(stored.paymentEmail,record.paymentEmail))throw new EmailWorkflowError('This review request ID belongs to another saved email. Prepare a new review.',409)
  return {reviewId:record._id}
}
export async function getPaymentPreview(requestId:string){
  requireWorkspace()
  if(!uuid.test(requestId))throw new WorkspaceError('Payment request was not found.',404)
  const record=await getOperatorClient().getDocument<PaymentRequest>(workspacePaymentId(requestId))
  if(!record)throw new WorkspaceError('Payment request was not found.',404)
  const family=await familyRecord(record.familyId)
  const request=await checkedPayment(record._id,family)
  return {request,familyName:family.profile.name}
}

export async function validateSavedEmailReview(id:string,origin:string){
  requireWorkspace()
  if(!/^private\.staffEmailReview\.[a-f0-9]{64}$/.test(id))throw new EmailWorkflowError('Choose a saved email review.',400)
  const review=await getOperatorClient().getDocument<EmailReview>(id)
  if(!review||review._type!=='staffEmailReview'||review.workspace!==workspaceNamespace()||review._id!==emailReviewId(review.requestId))throw new EmailWorkflowError('Saved email review was not found.',404)
  const family=await familyRecord(review.familyId)
  const draft=await getOperatorClient().getDocument<DraftDocument>(emailDraftId(review.familyId))
  if(!draft||draft._rev!==review.draftRevision)throw new EmailWorkflowError('This review is an earlier draft version. Save and review the current email before preparing another outgoing message.',409)
  const value=validValue(draft.value)
  const parent=await checkReply(family,value)
  const payment=value.paymentRequestId?await checkedPayment(value.paymentRequestId,family):null
  const body=payment&&!payment.publicToken?`${value.body}\n\n${liveWorkspaceEnabled()?'PAYMENT REQUEST — a link is not confirmation of payment.':'TEST PAYMENT REQUEST — no payment can be made using this link.'}\n${payment.puppyName} ${payment.kind}: $${(payment.amountCents/100).toFixed(2)}\n${payment.checkoutUrl||new URL(paymentPreviewPath(payment.requestId),origin).href}`:value.body
  const attachments=await checkedAttachments(value.attachmentIds,family.familyKey)
  if(!sameAttachments(review.attachments,attachments))throw new EmailWorkflowError('The attachment snapshot changed. Prepare the current message again.',409)
  const presentation=review.paymentEmail&&payment&&liveWorkspaceEnabled()&&!payment.litterReservationId?{...payment,checkoutUrl:livePaymentUrl((await livePaymentContext(await getStripe().checkout.sessions.retrieve(payment.checkoutSessionId!))).request)}:payment
  const currentTemplate=review.paymentEmail&&presentation?paymentRequestEmail(presentation,family.profile.name,value.body):null
  const paymentEmail=currentTemplate?{...currentTemplate,version:review.paymentEmail!.version}:null
  const formatted=paymentEmail?renderPaymentEmail(paymentEmail):null
  if(review.html!==formatted?.html||!samePaymentEmail(review.paymentEmail,paymentEmail||undefined))throw new EmailWorkflowError('The formatted payment email changed. Prepare a fresh review.',409)
  if(review.from!==jeanneEmail||review.replyTo!==jeanneEmail||review.to!==emailRecipient(family.profile.email)||review.subject!==value.subject||review.body!==(formatted?.text||body)||review.inReplyTo!==(parent?.messageId||null)||JSON.stringify(review.references)!==JSON.stringify(parent?[...new Set([...parent.references,parent.messageId])].slice(-10):[])||review.paymentRequestId!==(payment?._id||null))throw new EmailWorkflowError('The saved review no longer matches this family, draft or payment context. Prepare a fresh review.',409)
  return review
}

async function paymentTransport(action:{type:'checkout'|'verify';familyId:string;paymentRequestId:string},family:SavedFamily,origin:string){
  requireWorkspace()
  if(liveWorkspaceEnabled()&&origin!==requireLivePaymentConfiguration())throw new EmailWorkflowError('Open payments on the real FluffyTail website.',409)
  if(paymentTestWorkspaceEnabled()){const canonical=requirePaymentTestConfiguration();if(origin!==canonical)throw new EmailWorkflowError('Open payment testing from its stable entry address.',409)}
  if(!paymentTestWorkspaceEnabled()&&(liveWorkspaceEnabled()?!/^(?:sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY||''):(process.env.FLUFFYTAIL_STRIPE_TEST_ENABLED!=='1'||! /^(?:sk|rk|rkcs)_test_/.test(process.env.STRIPE_SECRET_KEY||''))))throw new EmailWorkflowError('Stripe test checkout is not configured. No live payment can be created.',503)
  if(family.profile.source!=='inquiry')throw new EmailWorkflowError('Connect a saved inquiry family before using Stripe test checkout.',409)
  const request=await checkedPayment(action.paymentRequestId,family,action.type==='checkout')
 if(request.litterReservationId){await reconcileLitterHold(request.litterReservationId);return {}}
  const client=getOperatorClient()
  if(action.type==='checkout'){
    if(request.checkoutSessionId){
      const session=await getStripe().checkout.sessions.retrieve(request.checkoutSessionId)
      verifySession(session,request,family)
      if(session.status==='expired')throw new EmailWorkflowError('This checkout has expired. Its payment history is kept; review it before preparing a new request.',409)
      if(!request.checkoutUrl&&request.publicToken)await client.patch(request._id).set({checkoutUrl:`${origin}/pay/${request.publicToken}`}).commit({visibility:'sync'})
      // Inserting or reopening a prepared request must not create Checkout again.
      return {}
    }
    const matches=await client.fetch<{slug:string}[]>('*[_type == "puppy" && _id == $id][0...2]{"slug":slug.current}',{id:request.puppyId},{cache:'no-store'})
    if(matches.length!==1)throw new EmailWorkflowError('Puppy context needs review.',409)
    const context=await getPaymentContext(matches[0].slug),customer={customerName:family.profile.name,customerEmail:family.profile.email,customerPhone:family.profile.phone},scope={staffFamilyId:family.familyKey,staffPaymentRequestId:request._id,staffTestOnly:liveWorkspaceEnabled()?'0':'1',...(request.publicToken?{customerPaymentToken:request.publicToken}:{})}
    if(request.kind==='balance'){context.pricing={...context.pricing,totalCents:request.totalCents,depositCents:request.depositCents,remainingCents:request.totalCents-request.depositCents};context.balance=getBalance(request.totalCents,context.records)}
    const result=request.kind==='deposit'?await createDepositCheckout(context,customer,origin,scope):await createBalanceCheckout(context,customer,origin,request._id,scope)
    if(!result.sessionId?.startsWith(liveWorkspaceEnabled()?'cs_live_':'cs_test_'))throw new EmailWorkflowError('A Stripe test checkout could not be confirmed.',503)
    const session=await getStripe().checkout.sessions.retrieve(result.sessionId)
    verifySession(session,request,family)
    await client.patch(request._id).set({checkoutSessionId:session.id,checkoutUrl:request.publicToken?`${origin}/pay/${request.publicToken}`:'shortUrl' in result?result.shortUrl:result.url,...(request.publicToken?{stripeCheckoutUrl:session.url}:{}),paymentVerification:'unverified'}).commit({visibility:'sync'})
    return {}
  }
  if(!request.checkoutSessionId?.startsWith(liveWorkspaceEnabled()?'cs_live_':'cs_test_'))throw new EmailWorkflowError('Create a test checkout first.',409)
  const session=await getStripe().checkout.sessions.retrieve(request.checkoutSessionId)
  verifySession(session,request,family)
  const confirmed=session.payment_status==='paid'
  await client.patch(request._id).set({paymentVerification:liveWorkspaceEnabled()?(confirmed?'paid':'unpaid'):(confirmed?'test-paid':'test-unpaid'),paymentVerifiedAt:new Date().toISOString()}).commit({visibility:'sync'})
  // Test verification is a separate audit field, never a production ledger entry or reservation transition.
  return {}
}
function verifySession(session:Awaited<ReturnType<ReturnType<typeof getStripe>['checkout']['sessions']['retrieve']>>,request:PaymentRequest,family:SavedFamily){
 if(session.livemode!==liveWorkspaceEnabled()||!session.id.startsWith(liveWorkspaceEnabled()?'cs_live_':'cs_test_')||session.currency!=='usd'||session.amount_total!==request.amountCents||session.metadata?.staffTestOnly!==(liveWorkspaceEnabled()?'0':'1')||session.metadata.staffFamilyId!==family.familyKey||session.metadata.staffPaymentRequestId!==request._id||session.metadata.puppyId!==request.puppyId||session.metadata.customerEmail!==family.profile.email)throw new EmailWorkflowError('Stripe test mode, amount or family association did not match. Review the provider record.',409)
}
