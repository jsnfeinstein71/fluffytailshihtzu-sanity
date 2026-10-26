import {getStripe} from './stripe'
import {getPaymentContext,paymentMetadata,PaymentError} from './payment-context'
export async function createBalanceCheckout(context:Awaited<ReturnType<typeof getPaymentContext>>,customer:{customerName:string;customerEmail:string;customerPhone:string},base:string,idempotencyKey:string,scope:Record<string,string>){
 const {puppy,pricing,balance}=context
 if(balance.remainingCents<=0)throw new PaymentError('There is no balance remaining.',409)
 const session=await getStripe().checkout.sessions.create({mode:'payment',client_reference_id:puppy._id,success_url:`${base}/payment-success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${base}/puppies/${encodeURIComponent(puppy.slug)}`,customer_email:customer.customerEmail||undefined,expires_at:Math.floor(Date.now()/1000)+3600,metadata:{...paymentMetadata(context),...scope,...customer,paymentType:'manual-payment',chargedAmountCents:String(balance.remainingCents),remainingBalanceCents:'0'},line_items:[{quantity:1,price_data:{currency:'usd',unit_amount:balance.remainingCents,product_data:{name:`${puppy.name} remaining balance`,description:`Payment toward the ${pricing.totalCents/100} total puppy price.`}}}]},{idempotencyKey})
 if(!session.url)throw new PaymentError('Checkout URL is unavailable.',503)
 return {sessionId:session.id,url:session.url}
}
