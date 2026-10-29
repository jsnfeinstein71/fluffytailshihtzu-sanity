import 'server-only'
import {litterReservationsEnabled} from '@/lib/litter-reservations'
import {customerLitterPayment} from './litter-reservations'
import {requirePaymentTestConfiguration} from '@/lib/payment-test-mode'
import {approvedTestCustomer} from '@/lib/test-customer'
import {getOperatorClient} from './operator-client'
import {getStripe} from './stripe'
import {readTestPaymentReceipt,testPaymentContext} from './test-payment-webhook'
import {confirmationId} from './test-payment-confirmation'
import type {PaymentRequest,OutgoingEmail} from '@/app/inbox/workspace/email-model'

export async function customerTestPayment(token:string){
 requirePaymentTestConfiguration()
 if(!/^[a-f0-9]{48}$/.test(token))throw new Error('This payment link is unavailable. Ask Jeanne for a current link.')
 const client=getOperatorClient(),requests=await client.fetch<PaymentRequest[]>('*[_type == "staffPaymentRequest" && workspace == "review-v1" && testOnly == true && publicToken == $paymentToken][0...2]',{paymentToken:token},{cache:'no-store'})
 if(requests.length!==1||!requests[0].checkoutSessionId)throw new Error('This payment link is unavailable. Ask Jeanne for a current link.')
 const request=requests[0];if(request.litterReservationId)return await customerLitterPayment(request)
 const session=await getStripe().checkout.sessions.retrieve(request.checkoutSessionId!)
 const {family}=await testPaymentContext(session)
 if((!approvedTestCustomer(family.profile)&&!(litterReservationsEnabled()&&family.profile.paymentTestScenario==='litter-reservations-20261028'&&family.profile.email.endsWith('@example.test')))||session.metadata?.customerPaymentToken!==token)throw new Error('This payment link is unavailable. Ask Jeanne for a current link.')
 const receipt=await readTestPaymentReceipt(session.id)
 const confirmation=await client.getDocument<OutgoingEmail>(confirmationId(session.id))
 const state=request.webhookVerifiedAt?'confirmed':receipt.providerPaid?'pending':request.checkoutOutcome==='failed'?'failed':session.status==='expired'||Date.parse(request.expiresAt)<=Date.now()?'expired':session.status==='complete'?'pending':'ready'
 const checkout=new URL(request.stripeCheckoutUrl||'https://invalid.example')
 if(checkout.protocol!=='https:'||checkout.hostname!=='checkout.stripe.com'||!checkout.pathname.includes(session.id))throw new Error('This payment link needs to be replaced. Contact Jeanne before paying.')
 // Explicit public projection: never expose contacts, family IDs, conversation,
 // internal provider IDs or staff navigation through this capability.
 return {puppyName:receipt.puppyName,kind:request.kind,amountCents:request.amountCents,totalCents:request.totalCents,depositCents:request.depositCents,paidCents:receipt.paidCents,remainingCents:Math.max(0,receipt.remainingCents),reserved:receipt.status==='reserved',state,checkoutUrl:state==='ready'?checkout.href:null,confirmation:confirmation?.state==='accepted'?'submitted':confirmation?.state==='uncertain'?'uncertain':confirmation?.state==='failed'?'failed':'pending'}
}
