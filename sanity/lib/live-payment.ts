import 'server-only'
import type Stripe from 'stripe'
import type {PaymentRequest} from '@/app/inbox/workspace/email-model'
import type {SavedFamily} from '@/app/inbox/workspace/persistence'
import {requireLivePaymentConfiguration} from '@/lib/live-payment-mode'
import {getOperatorClient} from './operator-client'
import {getStripe} from './stripe'
import {privateRecordId} from './private-records'
import {workspaceId} from './workspace'

type Puppy={_id:string;_rev:string;status:string;name:string;slug:{current:string};litter:{_ref:string};paymentTestScenario?:string;isVisible?:boolean}
export type LivePaymentRecord={_id:string;_type:'paymentRecord';stripeCheckoutSessionId:string;staffFamilyId?:string;staffPaymentRequestId?:string;puppyId:string;puppySlug:string;paymentStatus:string;paymentType:string;amountPaid:number;quotedTotalCents?:number;quotedDepositCents?:number;totalPaidCents?:number;customerName?:string;customerEmail?:string;customerPhone?:string;webhookVerifiedAt?:string;stripeEventId?:string;paymentConfirmationVersion?:number;testOnly?:boolean;workspace?:string}
const liveSession=/^cs_live_[A-Za-z0-9]+$/
const publicToken=/^[a-f0-9]{48}$/
export const liveLedgerId=(sessionId:string)=>privateRecordId('paymentCheckout',sessionId)
export const liveConfirmationId=(sessionId:string)=>privateRecordId('staffOutgoingEmail','live-v1:payment-confirmation:'+sessionId)
export function livePaymentUrl(request:PaymentRequest){
 const origin=requireLivePaymentConfiguration()
 if(request.publicToken&&publicToken.test(request.publicToken))return `${origin}/pay/${request.publicToken}`
 if(request.checkoutUrl){try{const url=new URL(request.checkoutUrl);if(url.origin===origin&&/^\/pay\/[a-f0-9]{48}$/.test(url.pathname)&&!url.search&&!url.hash&&!url.username&&!url.password)return url.href}catch{/* An old direct Stripe link uses its already-issued session capability below. */}}
 if(request.checkoutSessionId&&liveSession.test(request.checkoutSessionId))return `${origin}/pay/${request.checkoutSessionId}`
 throw new Error('This payment request needs a verified checkout before sending.')
}
export async function livePaymentContext(session:Stripe.Checkout.Session){
 requireLivePaymentConfiguration()
 const meta=session.metadata,client=getOperatorClient()
 if(session.livemode!==true||!liveSession.test(session.id)||session.currency!=='usd'||session.mode&&session.mode!=='payment'||!Number.isSafeInteger(session.amount_total)||!session.amount_total||meta?.staffTestOnly!=='0'||meta.pricingVersion!=='1'||!['deposit','manual-payment'].includes(meta.paymentType))throw new Error('This is not a scoped live checkout.')
 const [request,family,puppy]=await Promise.all([client.getDocument<PaymentRequest&{_rev:string}>(meta.staffPaymentRequestId),client.getDocument<SavedFamily>(workspaceId(meta.staffFamilyId)),client.getDocument<Puppy>(meta.puppyId)])
 if(!request||request._type!=='staffPaymentRequest'||request.workspace!=='live-v1'||request.testOnly!==false||request._id!==privateRecordId('staffPaymentRequest','live-v1:'+request.requestId)||request.checkoutSessionId!==session.id||request.familyId!==meta.staffFamilyId||request.puppyId!==meta.puppyId||request.amountCents!==session.amount_total||String(request.amountCents)!==meta.chargedAmountCents||String(request.totalCents)!==meta.totalPriceCents||String(request.depositCents)!==meta.depositCents||request.kind!==(meta.paymentType==='deposit'?'deposit':'balance')||!Number.isSafeInteger(request.totalCents)||!Number.isSafeInteger(request.depositCents)||request.depositCents<=0||request.totalCents<request.depositCents||request.amountCents>request.totalCents||!family||family._type!=='staffFamily'||family.workspace!=='live-v1'||family.familyKey!==request.familyId||family.profile.paymentTestScenario||!puppy||puppy.paymentTestScenario||puppy.litter?._ref!==meta.litterId||puppy.slug?.current!==meta.puppySlug||session.client_reference_id!==puppy._id||(request.publicToken&&meta.customerPaymentToken!==request.publicToken))throw new Error('Live checkout, family, puppy or quote did not match.')
 return {client,request,family,puppy,session}
}
export async function livePaidRecords(context:Awaited<ReturnType<typeof livePaymentContext>>){
 const {client,request,family,session}=context
 const all=await client.fetch<LivePaymentRecord[]>('*[_type == "paymentRecord" && puppySlug == $slug && paymentStatus == "paid"] | order(createdAt asc)',{slug:session.metadata!.puppySlug},{cache:'no-store'})
 const matching=all.filter(r=>r.testOnly!==true&&r.workspace!=='review-v1'&&(r.staffFamilyId?r.staffFamilyId===family.familyKey:r.customerEmail?.toLowerCase()===session.metadata!.customerEmail?.toLowerCase())&&(!r.puppyId||r.puppyId===request.puppyId))
 if(matching.some(r=>!Number.isFinite(r.amountPaid)||r.amountPaid<=0)||!Number.isSafeInteger(matching.reduce((sum,r)=>sum+Math.round(r.amountPaid*100),0)))throw new Error('The live paid amount needs reconciliation.')
 return {records:matching,foreign:all.length!==matching.length,paidCents:matching.reduce((sum,r)=>sum+Math.round(r.amountPaid*100),0)}
}
export async function findLiveLedger(sessionId:string){
 const client=getOperatorClient()
 return await client.fetch<LivePaymentRecord|null>('*[_type == "paymentRecord" && stripeCheckoutSessionId == $sessionId][0]',{sessionId},{cache:'no-store'})
}
export function ledgerMatches(record:LivePaymentRecord,context:Awaited<ReturnType<typeof livePaymentContext>>){
 const {request,family,session}=context
 return record.paymentStatus==='paid'&&record.testOnly!==true&&record.workspace!=='review-v1'&&record.stripeCheckoutSessionId===session.id&&Math.round(record.amountPaid*100)===request.amountCents&&record.puppyId===request.puppyId&&record.puppySlug===session.metadata!.puppySlug&&(!record.staffFamilyId||record.staffFamilyId===family.familyKey)&&(!record.staffPaymentRequestId||record.staffPaymentRequestId===request._id)&&record.customerEmail?.toLowerCase()===session.metadata!.customerEmail?.toLowerCase()&&record.quotedTotalCents===request.totalCents&&record.quotedDepositCents===request.depositCents
}
export async function applyLiveStaffPayment(event:Stripe.Event){
 requireLivePaymentConfiguration()
 if(event.livemode!==true)throw new Error('Test events cannot settle live payments.')
 const session=event.data.object as Stripe.Checkout.Session,context=await livePaymentContext(session),{client,request,family,puppy}=context
 const prior=await findLiveLedger(session.id)
 if(prior){if(!ledgerMatches(prior,context))throw new Error('An existing live payment needs reconciliation.');return {duplicate:true,confirmationEligible:prior.paymentConfirmationVersion===1&&!!prior.webhookVerifiedAt}}
 if(['checkout.session.expired','checkout.session.async_payment_failed'].includes(event.type)){
  if(request.webhookVerifiedAt||session.payment_status==='paid')return {ignored:true}
  const outcome=event.type==='checkout.session.expired'?'expired':'failed'
  if(request.checkoutOutcome===outcome)return {ignored:true}
  await client.patch(request._id).ifRevisionId(request._rev).set({checkoutOutcome:outcome,expiresAt:new Date().toISOString()}).commit({visibility:'sync'});return {updated:true}
 }
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)||session.payment_status!=='paid')return {ignored:true}
 if(family.profile.puppyId!==puppy._id||family.profile.email.toLowerCase()!==session.metadata!.customerEmail?.toLowerCase())throw new Error('The live buyer association needs reconciliation.')
 const {paidCents,foreign,records}=await livePaidRecords(context)
 if(foreign||records.some(r=>r.quotedTotalCents!==request.totalCents)|| (request.kind==='deposit'?(paidCents!==0||request.amountCents!==request.depositCents||!['available','hold'].includes(puppy.status)):(paidCents<request.depositCents||request.amountCents!==request.totalCents-paidCents)))throw new Error('The live balance changed; reconcile this payment before confirming it.')
 const now=new Date().toISOString(),totalPaidCents=paidCents+request.amountCents
 const record={_id:liveLedgerId(session.id),_type:'paymentRecord',workspace:'live-v1',testOnly:false,paymentConfirmationVersion:1,paymentStatus:'paid',paymentType:request.kind==='deposit'?'deposit':'manual-payment',amountPaid:request.amountCents/100,totalPaidCents,quotedTotalCents:request.totalCents,quotedDepositCents:request.depositCents,stripeCheckoutSessionId:session.id,stripePaymentIntentId:typeof session.payment_intent==='string'?session.payment_intent:'',stripeEventId:event.id,webhookVerifiedAt:now,staffFamilyId:family.familyKey,staffPaymentRequestId:request._id,puppyId:puppy._id,litterId:puppy.litter._ref,puppySlug:session.metadata!.puppySlug,puppyName:request.puppyName,customerName:family.profile.name,customerEmail:session.metadata!.customerEmail,customerPhone:session.metadata!.customerPhone||'',createdAt:now}
 const tx=client.transaction().createIfNotExists(record).patch(request._id,p=>p.ifRevisionId(request._rev).set({paymentVerification:'paid',paymentVerifiedAt:now,webhookVerifiedAt:now,stripeEventId:event.id})).patch(family._id,p=>p.ifRevisionId(family._rev).set({'profile.stage':totalPaidCents===request.totalCents?'Paid in full':'Deposit paid','profile.next':totalPaidCents===request.totalCents?'Coordinate pickup with Jeanne':'Coordinate the remaining balance and pickup'}))
 if(request.kind==='deposit'){
  tx.patch(puppy._id,p=>p.ifRevisionId(puppy._rev).set({status:'reserved'}))
  const link=await client.fetch<{_id:string}|null>('*[_type == "depositLink" && stripeCheckoutSessionId == $sessionId][0]{_id}',{sessionId:session.id},{cache:'no-store'})
  if(link)tx.patch(link._id,{set:{active:false}})
 }
 try{await tx.commit({visibility:'sync'})}catch(error){if((error as {statusCode?:number}).statusCode===409){const stored=await findLiveLedger(session.id);if(stored&&ledgerMatches(stored,context))return {duplicate:true,confirmationEligible:stored.paymentConfirmationVersion===1&&!!stored.webhookVerifiedAt}}throw error}
 return {recorded:true,confirmationEligible:true}
}
export async function liveContextForIdentifier(identifier:string){
 const origin=requireLivePaymentConfiguration()
 if(!publicToken.test(identifier)&&!liveSession.test(identifier))throw new Error('Payment link unavailable.')
 const matches=await getOperatorClient().fetch<PaymentRequest[]>('*[_type == "staffPaymentRequest" && workspace == "live-v1" && testOnly == false && (publicToken == $paymentToken || checkoutUrl == $paymentUrl || ($sessionId != null && checkoutSessionId == $sessionId))][0...2]',{paymentToken:identifier,paymentUrl:origin+'/pay/'+identifier,sessionId:liveSession.test(identifier)?identifier:null},{cache:'no-store'})
 if(matches.length!==1||!matches[0].checkoutSessionId)throw new Error('Payment link unavailable.')
 const context=await livePaymentContext(await getStripe().checkout.sessions.retrieve(matches[0].checkoutSessionId))
 if(context.request._id!==matches[0]._id||livePaymentUrl(context.request)!==origin+'/pay/'+identifier&&context.session.id!==identifier)throw new Error('Payment link identity did not match.')
 if(!context.request.publicToken&&publicToken.test(identifier)&&context.session.metadata!.token!==identifier)throw new Error('Legacy deposit token does not match its checkout.')
 return context
}
