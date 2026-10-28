import 'server-only'
import {confirmationMessage,renderPaymentEmail,type PaymentEmail} from '@/lib/mail/payment-email'
import {jeanneEmail,type OutgoingEmail} from '@/app/inbox/workspace/email-model'
import {getStripe} from './stripe'
import {findLiveLedger,ledgerMatches,livePaymentContext,livePaymentUrl,liveConfirmationId} from './live-payment'
import {privateRecordId} from './private-records'

export async function liveConfirmationSnapshot(sessionId:string){
 const context=await livePaymentContext(await getStripe().checkout.sessions.retrieve(sessionId)),{client,request,family,session}=context
 const ledger=await findLiveLedger(sessionId)
 // Only newly verified live records opt into automatic email. No historical
 // backfill, GET request, browser return or test event can create a receipt.
 if(session.payment_status!=='paid'||!ledger||!ledgerMatches(ledger,context)||ledger.paymentConfirmationVersion!==1||!ledger.webhookVerifiedAt||!ledger.stripeEventId||!Number.isSafeInteger(ledger.totalPaidCents)||!request.webhookVerifiedAt)return null
 const complete=ledger.totalPaidCents===request.totalCents
 const existing=await client.getDocument<OutgoingEmail>(liveConfirmationId(sessionId))
 const parent=await client.fetch<OutgoingEmail|null>('*[_type == "staffOutgoingEmail" && workspace == "live-v1" && familyId == $familyId && paymentRequestId == $paymentRequestId && !defined(paymentConfirmationSessionId) && state == "accepted"] | order(createdAt desc)[0]',{familyId:family.familyKey,paymentRequestId:request._id},{cache:'no-store'})
 const paymentEmail:PaymentEmail={version:existing?.paymentEmail?.version||2,kind:complete?'paid-confirmation':'deposit-confirmation',name:existing?.paymentEmail?.name??ledger.customerName??'',message:existing?.paymentEmail?.message??(family.profile.paymentConfirmationMessage||confirmationMessage),puppyName:request.puppyName,amountCents:request.amountCents,totalCents:request.totalCents,paidCents:ledger.totalPaidCents!,depositCents:request.depositCents,url:livePaymentUrl(request),testOnly:false}
 const formatted=renderPaymentEmail(paymentEmail)
 return {_id:liveConfirmationId(sessionId),_type:'staffOutgoingEmail' as const,workspace:'live-v1' as const,reviewId:privateRecordId('staffEmailReview','live-v1:payment-confirmation:'+sessionId),familyId:family.familyKey,from:jeanneEmail,replyTo:jeanneEmail,to:ledger.customerEmail!,subject:existing?.subject||`FluffyTail ${complete?'paid-in-full':'deposit'} confirmation — ${request.puppyName}`,body:formatted.text,html:formatted.html,paymentEmail,messageId:`<${liveConfirmationId(sessionId).split('.').at(-1)}@fluffytailshihtzu.com>`,inReplyTo:existing?existing.inReplyTo:(parent?.messageId||null),references:existing?.references??(parent?[...new Set([...parent.references,parent.messageId])].slice(-10):[]),paymentRequestId:request._id,draftRevision:'payment-confirmation:'+sessionId,paymentConfirmationSessionId:sessionId}
}
