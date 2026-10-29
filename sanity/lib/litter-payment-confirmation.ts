import 'server-only'
import type {OutgoingEmail} from '@/app/inbox/workspace/email-model'
import {jeanneEmail} from '@/app/inbox/workspace/email-model'
import {renderPaymentEmail,type PaymentEmail} from '@/lib/mail/payment-email'
import {litterReservationMode} from '@/lib/litter-reservations'
import {getOperatorClient} from './operator-client'
import {litterPaymentContext,litterRecordId} from './litter-reservations'
import {liveConfirmationId} from './live-payment'
import {privateRecordId} from './private-records'

export async function litterConfirmationSnapshot(sessionId:string){
 if(litterReservationMode()!=='live')return null
 const {s,r,p,f}=await litterPaymentContext(sessionId),client=getOperatorClient()
 const ledger=await client.getDocument<{amountPaid:number;staffFamilyId:string;staffPaymentRequestId:string;stripeCheckoutSessionId:string;paymentConfirmationVersion:number;webhookVerifiedAt:string;stripeEventId:string}>(litterRecordId('litterPayment',sessionId))
 if(s.payment_status!=='paid'||r.state==='reconciliation'||!p.webhookVerifiedAt||!ledger||ledger.paymentConfirmationVersion!==2||!ledger.webhookVerifiedAt||!ledger.stripeEventId||ledger.stripeCheckoutSessionId!==s.id||ledger.staffFamilyId!==f.familyKey||ledger.staffPaymentRequestId!==p._id||Math.round(ledger.amountPaid*100)!==p.amountCents)return null
 const id=liveConfirmationId(sessionId),existing=await client.getDocument<OutgoingEmail>(id)
 const parent=await client.fetch<OutgoingEmail|null>('*[_type=="staffOutgoingEmail" && workspace=="live-v1" && familyId==$familyId && paymentRequestId==$paymentRequestId && !defined(paymentConfirmationSessionId) && state=="accepted"] | order(createdAt desc)[0]',{familyId:f.familyKey,paymentRequestId:p._id},{cache:'no-store'})
 const paymentEmail:PaymentEmail=existing?.paymentEmail||{version:5,kind:'deposit-confirmation',name:f.profile.name,message:f.profile.paymentConfirmationMessage||'Thank you. Your litter deposit payment has been confirmed. Please reply with any questions.',puppyName:p.puppyName,litterTitle:p.puppyName,selectionPosition:p.selectionPosition,amountCents:p.amountCents,totalCents:p.totalCents,paidCents:p.amountCents,depositCents:p.depositCents,url:p.checkoutUrl!,testOnly:false,reserved:false}
 const rendered=renderPaymentEmail(paymentEmail)
 return {_id:id,_type:'staffOutgoingEmail' as const,workspace:'live-v1' as const,reviewId:privateRecordId('staffEmailReview','live-v1:payment-confirmation:'+sessionId),familyId:f.familyKey,from:jeanneEmail,replyTo:jeanneEmail,to:s.customer_email!,subject:existing?.subject||`FluffyTail litter deposit confirmation — ${p.puppyName}`,body:rendered.text,html:rendered.html,paymentEmail,messageId:`<${id.split('.').at(-1)}@fluffytailshihtzu.com>`,inReplyTo:existing?existing.inReplyTo:parent?.messageId||null,references:existing?.references??(parent?[...new Set([...parent.references,parent.messageId])].slice(-10):[]),paymentRequestId:p._id,draftRevision:'payment-confirmation:'+sessionId,paymentConfirmationSessionId:sessionId}
}
