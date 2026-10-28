import {NextRequest,NextResponse} from 'next/server'
import {requireOperator} from '@/lib/operator-auth'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'
import {getPaymentContext,paymentBaseUrl,paymentFailure} from '@/sanity/lib/payment-context'
import {createDepositCheckout} from '@/sanity/lib/deposit-checkout'
export const runtime='nodejs'
export async function POST(req:NextRequest){
 const denied = await requireOperator(req);if(denied)return denied
 const frozen=operationalWriteFreeze();if(frozen)return frozen
 try{const body=await req.json();const context=await getPaymentContext(String(body.puppySlug||'').trim());return NextResponse.json(await createDepositCheckout(context,body,paymentBaseUrl(req)),{headers:{'Cache-Control':'no-store'}})}catch(error){return paymentFailure(error)}
}
