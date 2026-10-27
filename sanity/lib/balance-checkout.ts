import {paymentTestWorkspaceEnabled,requirePaymentTestConfiguration} from '@/lib/payment-test-mode'
import {getStripe} from './stripe'
import {getPaymentContext,paymentMetadata,PaymentError} from './payment-context'
export async function createBalanceCheckout(context:Awaited<ReturnType<typeof getPaymentContext>>,customer:{customerName:string;customerEmail:string;customerPhone:string},base:string,idempotencyKey:string,scope:Record<string,string>){
 if(paymentTestWorkspaceEnabled()&&scope.staffTestOnly!=='1')throw new PaymentError('Use the isolated family workspace to request this test payment.',403)
 const {puppy,pricing,balance}=context
 if(balance.remainingCents<=0)throw new PaymentError('There is no balance remaining.',409)
 const session=await getStripe().checkout.sessions.create({mode:'payment',client_reference_id:puppy._id,success_url:paymentTestWorkspaceEnabled()?`${requirePaymentTestConfiguration()}/inbox/workspace/payment-return?session_id={CHECKOUT_SESSION_ID}`:`${base}/payment-success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:paymentTestWorkspaceEnabled()?`${requirePaymentTestConfiguration()}/inbox/workspace?family=${scope.staffFamilyId}`:`${base}/puppies/${encodeURIComponent(puppy.slug)}`,customer_email:customer.customerEmail||undefined,expires_at:Math.floor(Date.now()/1000)+3600,metadata:{...paymentMetadata(context),...scope,...customer,paymentType:'manual-payment',chargedAmountCents:String(balance.remainingCents),remainingBalanceCents:'0'},line_items:[{quantity:1,price_data:{currency:'usd',unit_amount:balance.remainingCents,product_data:{name:`${puppy.name} remaining balance`,description:`Payment toward the ${pricing.totalCents/100} total puppy price.`}}}]},{idempotencyKey})
 if(!session.url)throw new PaymentError('Checkout URL is unavailable.',503)
 return {sessionId:session.id,url:session.url}
}
