import type {EmailValue,PaymentRequest} from './email-model'
import {money} from './model'

export function paymentSnippet(request:PaymentRequest){
 return request.litterReservationId?`${request.puppyName}: selection position ${request.selectionPosition}. ${money(request.amountCents)} deposit. A verified deposit secures a selection position, not a puppy. Non-refundable; transferable to a future litter when a suitable puppy is unavailable; credited toward the selected puppy’s price. Secure ${request.testOnly?'TEST ':''}payment link: ${request.checkoutUrl}`:`${request.puppyName}: ${money(request.amountCents)} ${request.kind==='deposit'?'deposit':'final payment'} toward the ${money(request.totalCents)} total. ${request.kind==='deposit'?'The deposit is non-refundable and applied to the total. ':''}Secure ${request.testOnly?'TEST ':''}payment link: ${request.checkoutUrl}`
}
export function paymentEmailPatch(value:EmailValue,request:PaymentRequest,requests:PaymentRequest[]):Partial<EmailValue>{
 let body=value.body
 // Change only known payment addresses; Jeanne's own prose and other links stay.
 for(const prior of requests)if(prior._id!==request._id&&prior.checkoutUrl)body=body.replaceAll(prior.checkoutUrl,request.checkoutUrl||'')
 const defaults=['Here is the deposit request for your approved litter selection position.','I’m happy to share your puppy’s deposit request.','Here is the final payment request for your puppy.'].map(s=>s+' Please reply if you have any questions.')
 if(!body.trim()||defaults.includes(body))body=`${request.kind==='deposit'?request.litterReservationId?'Here is the deposit request for your approved litter selection position.':'I’m happy to share your puppy’s deposit request.':'Here is the final payment request for your puppy.'} Please reply if you have any questions.`
 return {subject:`FluffyTail ${request.kind==='deposit'?'deposit':'final payment'} request — ${request.puppyName}`,body,paymentRequestId:request._id,paymentLinkPurpose:'request'}
}
export function paymentTextBody(current:string,request:PaymentRequest,requests:PaymentRequest[]){
 const snippet=paymentSnippet(request)
 let body=current
 for(const prior of requests)if(prior._id!==request._id&&prior.checkoutUrl){
  body=body.replaceAll(paymentSnippet(prior),snippet).replaceAll(prior.checkoutUrl,request.checkoutUrl!)
 }
 return body.includes(request.checkoutUrl!)?body:body.trim()?body+'\n\n'+snippet:`Hi! Jeanne at FluffyTail here. ${snippet} Reply with any questions.`
}

export const paymentRequestPaid=(request:PaymentRequest)=>request.verifiedPaid===true||!!request.webhookVerifiedAt
export function paymentConfirmationPatch(value:EmailValue,request:PaymentRequest):Partial<EmailValue>{
 const automatic=/^FluffyTail (deposit|final payment) request — /.test(value.subject)
 const defaults=['Here is the deposit request for your approved litter selection position.','I’m happy to share your puppy’s deposit request.','Here is the final payment request for your puppy.'].map(s=>s+' Please reply if you have any questions.')
 return {paymentLinkPurpose:'confirmation',...(automatic?{subject:`FluffyTail payment confirmation — ${request.puppyName}`}:{ }),...(defaults.includes(value.body)?{body:'Thank you. Your payment has been confirmed. Please reply if you have any questions.'}:{})}
}
