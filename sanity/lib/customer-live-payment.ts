import {requireLivePaymentConfiguration} from '@/lib/live-payment-mode'
import {litterRequestForIdentifier,customerLitterPayment} from './litter-reservations'
import 'server-only'
import type {OutgoingEmail} from '@/app/inbox/workspace/email-model'
import {findLiveLedger,ledgerMatches,liveContextForIdentifier,livePaidRecords,liveConfirmationId} from './live-payment'
import {getPaymentContext} from './payment-context'

export async function customerLivePayment(identifier:string){
 requireLivePaymentConfiguration()
 const litter=await litterRequestForIdentifier(identifier);if(litter)return await customerLitterPayment(litter)
 const context=await liveContextForIdentifier(identifier),{client,request,session,puppy,family}=context
 const [{records,paidCents,foreign},ledger,confirmation]=await Promise.all([livePaidRecords(context),findLiveLedger(session.id),client.getDocument<OutgoingEmail>(liveConfirmationId(session.id))])
 if(ledger&&!ledgerMatches(ledger,context))throw new Error('This payment needs reconciliation. Please contact Jeanne.')
 const confirmed=!!ledger&&session.payment_status==='paid',providerPaid=session.payment_status==='paid'
 const state=confirmed?'confirmed':providerPaid||session.status==='complete'&&request.checkoutOutcome!=='failed'?'pending':request.checkoutOutcome==='failed'?'failed':session.status==='expired'||!Number.isFinite(Date.parse(request.expiresAt))||Date.parse(request.expiresAt)<=Date.now()?'expired':'ready'
 let eligible=family.profile.puppyId===puppy._id&&family.profile.email.toLowerCase()===session.metadata!.customerEmail?.toLowerCase()&&!foreign&&paidCents===request.paidCents&&request.totalCents-paidCents>=request.amountCents
 if(state==='ready'&&request.kind==='deposit'){
  const current=await getPaymentContext(session.metadata!.puppySlug)
  eligible=eligible&&paidCents===0&&['available','hold'].includes(puppy.status)&&['current','active'].includes(current.puppy.litterStatus)&&current.puppy.isVisible!==false&&current.puppy.litterVisible!==false&&current.pricing.totalCents===request.totalCents&&current.pricing.depositCents===request.depositCents
 }else if(state==='ready')eligible=eligible&&paidCents>=request.depositCents&&request.amountCents===request.totalCents-paidCents&&records.every(r=>r.quotedTotalCents===request.totalCents)
 let checkoutUrl:string|null=null
 if(state==='ready'&&eligible){
  const url=new URL(session.url||request.stripeCheckoutUrl||request.checkoutUrl||'https://invalid.example')
  if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||url.username||url.password||!url.pathname.includes(session.id))throw new Error('The checkout link could not be verified.')
  checkoutUrl=url.href
 }
 // Public capability projection deliberately omits contacts, family/record IDs,
 // session metadata, attachments and staff navigation. Viewing is read-only.
 return {testOnly:false,puppyName:request.puppyName,kind:request.kind,amountCents:request.amountCents,totalCents:request.totalCents,depositCents:request.depositCents,paidCents,remainingCents:Math.max(0,request.totalCents-paidCents),reserved:puppy.status==='reserved',reservationStatus:puppy.status,state:state==='ready'&&!eligible?'unavailable':state,checkoutUrl,confirmation:ledger&&ledger.paymentConfirmationVersion!==1?'not-scheduled':confirmation?.state==='accepted'?'submitted':confirmation?.state==='uncertain'?'uncertain':confirmation?.state==='failed'?'failed':'pending'}
}
