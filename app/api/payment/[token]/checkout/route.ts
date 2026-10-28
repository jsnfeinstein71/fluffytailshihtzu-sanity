import {paymentCopy} from '@/lib/public-copy'
import {NextResponse} from 'next/server'
import {customerLivePayment} from '@/sanity/lib/customer-live-payment'
import {requireLivePaymentConfiguration} from '@/lib/live-payment-mode'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(_req:Request,{params}:{params:Promise<{token:string}>}){
 const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}
 const {token}=await params
 try{const receipt=await customerLivePayment(token);return NextResponse.redirect(receipt.checkoutUrl||new URL('/pay/'+encodeURIComponent(token),requireLivePaymentConfiguration()),{status:303,headers})}catch{return NextResponse.json({error:paymentCopy.unavailable},{status:404,headers})}
}
