import 'server-only'
import type Stripe from 'stripe'
import {getOperatorClient} from './operator-client'
import {getStripe} from './stripe'
import {privateRecordId} from './private-records'
import {requirePaymentTestConfiguration} from '@/lib/payment-test-mode'
import type {SavedFamily} from '@/app/inbox/workspace/persistence'
import type {PaymentRequest} from '@/app/inbox/workspace/email-model'
import {workspaceId} from './workspace'
import {workspacePaymentId} from './workspace-email'

type TestPuppy={_id:string;_rev:string;_type:string;status:string;litter:{_ref:string};paymentTestScenario?:string;testReservationSessionId?:string}
export async function testPaymentContext(session:Stripe.Checkout.Session){
 requirePaymentTestConfiguration()
 const meta=session.metadata,client=getOperatorClient()
 if(session.livemode!==false||!session.id.startsWith('cs_test_')||session.currency!=='usd'||meta?.staffTestOnly!=='1'||meta.pricingVersion!=='1'||!['deposit','manual-payment'].includes(meta.paymentType))throw new Error('This is not a scoped test checkout.')
 const request=await client.getDocument<PaymentRequest>(meta.staffPaymentRequestId)
 const family=await client.getDocument<SavedFamily>(workspaceId(meta.staffFamilyId))
 const puppy=await client.getDocument<TestPuppy>(meta.puppyId)
 if(!request||request._type!=='staffPaymentRequest'||!request.testOnly||request.workspace!=='review-v1'||request._id!==workspacePaymentId(request.requestId)||request.checkoutSessionId!==session.id||request.familyId!==meta.staffFamilyId||request.puppyId!==meta.puppyId||request.amountCents!==session.amount_total||String(request.amountCents)!==meta.chargedAmountCents||String(request.totalCents)!==meta.totalPriceCents||String(request.depositCents)!==meta.depositCents||request.kind!==(meta.paymentType==='deposit'?'deposit':'balance')||!family||family.workspace!=='review-v1'||!family.profile.paymentTestScenario||family.profile.puppyId!==puppy?._id||!family.profile.email.endsWith('@example.test')||family.profile.email!==meta.customerEmail||!puppy?.paymentTestScenario||puppy.litter?._ref!==meta.litterId||session.client_reference_id!==puppy._id)throw new Error('The test checkout does not match its saved family, puppy and quote.')
 return {client,request,family,puppy}
}
export async function applyTestPayment(event:Stripe.Event){
 requirePaymentTestConfiguration()
 if(event.livemode!==false)throw new Error('Live events are forbidden in the test workspace.')
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))return {ignored:true}
 const session=event.data.object as Stripe.Checkout.Session
 if(session.payment_status!=='paid')return {ignored:true}
 const {client,request,family,puppy}=await testPaymentContext(session)
 const id=privateRecordId('testPaymentCheckout','review-v1:'+session.id)
 const prior=await client.getDocument<{amountPaid:number;staffFamilyId:string;puppyId:string}>(id)
 if(prior){if(prior.amountPaid!==request.amountCents/100||prior.staffFamilyId!==family.familyKey||prior.puppyId!==puppy._id)throw new Error('A test payment identity conflicts.');return {duplicate:true}}
 const paid=await client.fetch<{amountPaid:number}[]>('*[_type == "paymentRecord" && workspace == "review-v1" && testOnly == true && staffFamilyId == $familyId && puppyId == $puppyId && paymentStatus == "paid"]{amountPaid}',{familyId:family.familyKey,puppyId:puppy._id},{cache:'no-store'})
 const paidCents=paid.reduce((sum,p)=>sum+Math.round(p.amountPaid*100),0)
 if(request.kind==='deposit'?(paidCents!==0||request.amountCents!==request.depositCents||!['available','hold'].includes(puppy.status)):(paidCents<request.depositCents||request.amountCents!==request.totalCents-paidCents))throw new Error('This test payment needs reconciliation; its balance changed.')
 const now=new Date().toISOString(),totalPaid=paidCents+request.amountCents
 const tx=client.transaction().createIfNotExists({_id:id,_type:'paymentRecord',workspace:'review-v1',testOnly:true,paymentStatus:'paid',paymentType:request.kind==='deposit'?'deposit':'manual-payment',amountPaid:request.amountCents/100,quotedTotalCents:request.totalCents,quotedDepositCents:request.depositCents,stripeCheckoutSessionId:session.id,stripePaymentIntentId:typeof session.payment_intent==='string'?session.payment_intent:'',stripeEventId:event.id,webhookVerifiedAt:now,staffFamilyId:family.familyKey,staffPaymentRequestId:request._id,puppyId:puppy._id,litterId:puppy.litter._ref,puppySlug:session.metadata!.puppySlug,puppyName:request.puppyName,customerName:family.profile.name,customerEmail:family.profile.email,createdAt:now})
 tx.patch(request._id,p=>p.ifRevisionId((request as PaymentRequest&{_rev:string})._rev).set({paymentVerification:'test-paid',paymentVerifiedAt:now,webhookVerifiedAt:now,stripeEventId:event.id}))
 tx.patch(family._id,{set:{'profile.stage':totalPaid===request.totalCents?'Paid in full — TEST':'Deposit paid — TEST reservation','profile.next':totalPaid===request.totalCents?'Test complete: $0 remaining':'Request the $1,200 final payment'}})
 if(request.kind==='deposit'){
  tx.patch(puppy._id,p=>p.ifRevisionId(puppy._rev).set({status:'reserved',testReservationSessionId:session.id,testReservationVerifiedAt:now}))
  const link=await client.fetch<{_id:string}|null>('*[_type == "depositLink" && token == $paymentToken][0]{_id}',{paymentToken:session.metadata!.token||''},{cache:'no-store'})
  if(link)tx.patch(link._id,{set:{active:false}})
 }
 try{await tx.commit({visibility:'sync'})}catch(error){if((error as {statusCode?:number}).statusCode===409&&await client.getDocument(id))return {duplicate:true};throw error}
 return {recorded:true}
}
export async function readTestPaymentReceipt(sessionId:string){
 requirePaymentTestConfiguration()
 if(!/^cs_test_[A-Za-z0-9]+$/.test(sessionId))throw new Error('Choose a valid test checkout.')
 const session=await getStripe().checkout.sessions.retrieve(sessionId)
 const {client,request,family,puppy}=await testPaymentContext(session)
 const records=await client.fetch<{amountPaid:number;paymentType:string;createdAt:string;stripeEventId:string;webhookVerifiedAt:string}[]>('*[_type == "paymentRecord" && workspace == "review-v1" && testOnly == true && staffFamilyId == $familyId && puppyId == $puppyId && paymentStatus == "paid"] | order(createdAt asc){amountPaid,paymentType,createdAt,stripeEventId,webhookVerifiedAt}',{familyId:family.familyKey,puppyId:puppy._id},{cache:'no-store'})
 const paidCents=records.reduce((sum,p)=>sum+Math.round(p.amountPaid*100),0)
 return {familyId:family.familyKey,familyName:family.profile.name,puppyName:request.puppyName,providerPaid:session.payment_status==='paid',webhookVerified:!!request.webhookVerifiedAt,paidCents,remainingCents:request.totalCents-paidCents,totalCents:request.totalCents,status:puppy.status,records}
}
