import {confirmationMessage,renderPaymentEmail,type PaymentEmail} from '@/lib/mail/payment-email'
import type {OutgoingEmail} from '@/app/inbox/workspace/email-model'
import 'server-only'
import {approvedTestCustomer,testCustomerContacts} from '@/lib/test-customer'
import {requirePaymentTestConfiguration} from '@/lib/payment-test-mode'
import {getOperatorClient} from './operator-client'
import {getStripe} from './stripe'
import {privateRecordId} from './private-records'
import {testPaymentContext} from './test-payment-webhook'
import {jeanneEmail} from '@/app/inbox/workspace/email-model'

export const confirmationId=(sessionId:string)=>privateRecordId('staffOutgoingEmail','review-v1:payment-confirmation:'+sessionId)
export async function testConfirmationSnapshot(sessionId:string){
 if(!testCustomerContacts())return null
 const session=await getStripe().checkout.sessions.retrieve(sessionId),{request,family,puppy}=await testPaymentContext(session)
 if(!approvedTestCustomer(family.profile)||!request.publicToken||!request.webhookVerifiedAt)return null
 const ledger=await getOperatorClient().getDocument<{_id:string;totalPaidCents:number;amountPaid:number}>(privateRecordId('testPaymentCheckout','review-v1:'+sessionId))
 if(!ledger||!Number.isSafeInteger(ledger.totalPaidCents))throw new Error('A verified payment snapshot is required for confirmation.')
 const amount=(cents:number)=>'$'+(cents/100).toFixed(2),remaining=request.totalCents-ledger.totalPaidCents,complete=remaining===0
 const legacy={_id:confirmationId(sessionId),_type:'staffOutgoingEmail' as const,workspace:'review-v1' as const,reviewId:privateRecordId('staffEmailReview','review-v1:payment-confirmation:'+sessionId),familyId:family.familyKey,from:jeanneEmail,replyTo:jeanneEmail,to:family.profile.email,subject:`FluffyTail TEST payment confirmation — ${request.puppyName}`,body:`Hello,\n\nThank you. We have confirmed your ${amount(request.amountCents)} ${request.kind==='deposit'?'deposit':'final payment'} for ${request.puppyName}. This is an owner-operated Stripe sandbox test; no real money was charged.\n\nTotal puppy price: ${amount(request.totalCents)}\nThis payment: ${amount(request.amountCents)}\nTotal paid: ${amount(ledger.totalPaidCents)}\nRemaining balance: ${amount(remaining)}\n\n${complete?'Paid in full. Pickup timing and location will be coordinated with Jeanne.':'Your fictional puppy is reserved. The non-refundable deposit is applied toward the total price. Jeanne will coordinate the remaining balance and pickup with you.'}\n\nView your payment confirmation: ${requirePaymentTestConfiguration()}/pay/${request.publicToken}\n\nPlease reply with any questions.\nJeanne\nFluffyTail Shih Tzu`,messageId:`<${confirmationId(sessionId).split('.').at(-1)}@fluffytailshihtzu.com>`,inReplyTo:null,references:[],paymentRequestId:request._id,draftRevision:'payment-confirmation:'+sessionId,paymentConfirmationSessionId:sessionId}
 const existing=await getOperatorClient().getDocument<OutgoingEmail>(confirmationId(sessionId))
 // Already-prepared/sent plaintext snapshots are historical records, not a migration.
 if(existing&&!existing.paymentEmail)return legacy
 const version=existing?.paymentEmail?.version||3
 const paymentEmail:PaymentEmail={version,...(version===3?{reserved:existing?.paymentEmail?.reserved??(puppy.status==='reserved')}:{}) ,kind:complete?'paid-confirmation':'deposit-confirmation',name:existing?.paymentEmail?.name??family.profile.name,message:existing?.paymentEmail?.message??(family.profile.paymentConfirmationMessage||confirmationMessage),puppyName:request.puppyName,amountCents:request.amountCents,totalCents:request.totalCents,paidCents:ledger.totalPaidCents,depositCents:request.depositCents,url:`${requirePaymentTestConfiguration()}/pay/${request.publicToken}`,testOnly:true}
 const formatted=renderPaymentEmail(paymentEmail)
 return {...legacy,paymentEmail,html:formatted.html,body:formatted.text}

}
