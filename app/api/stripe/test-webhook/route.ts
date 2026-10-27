import {NextResponse} from 'next/server'
import {getStripe} from '@/sanity/lib/stripe'
import {requirePaymentTestConfiguration} from '@/lib/payment-test-mode'
import {applyTestPayment} from '@/sanity/lib/test-payment-webhook'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'
export const runtime='nodejs'
export async function POST(req:Request){
 const headers={'Cache-Control':'no-store'}
 try{requirePaymentTestConfiguration()}catch{return NextResponse.json({error:'Isolated test callbacks are not configured.'},{status:503,headers})}
 const frozen=operationalWriteFreeze();if(frozen)return frozen
 const signature=req.headers.get('stripe-signature')
 if(!signature)return NextResponse.json({error:'Missing signature.'},{status:400,headers})
 let event
 try{event=getStripe().webhooks.constructEvent(await req.text(),signature,process.env.FLUFFYTAIL_STRIPE_TEST_WEBHOOK_SECRET!)}catch{return NextResponse.json({error:'Invalid test signature.'},{status:400,headers})}
 if(event.livemode!==false)return NextResponse.json({error:'Live events are forbidden.'},{status:400,headers})
 try{return NextResponse.json({received:true,...await applyTestPayment(event)},{headers})}catch{return NextResponse.json({error:'Test payment requires reconciliation; retry is safe.'},{status:500,headers})}
}
