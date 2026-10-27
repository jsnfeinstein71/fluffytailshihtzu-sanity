import {NextResponse} from 'next/server'
import {customerTestPayment} from '@/sanity/lib/customer-test-payment'
import {requirePaymentTestConfiguration} from '@/lib/payment-test-mode'
export const dynamic='force-dynamic'
export async function GET(_req:Request,{params}:{params:Promise<{token:string}>}){
 const {token}=await params
 try{const receipt=await customerTestPayment(token);return NextResponse.redirect(receipt.checkoutUrl||new URL('/pay/'+token,requirePaymentTestConfiguration()),{status:303,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}})}catch{return NextResponse.json({error:'This payment link is unavailable. Please email Jeanne for a current link.'},{status:404,headers:{'Cache-Control':'no-store'}})}
}
