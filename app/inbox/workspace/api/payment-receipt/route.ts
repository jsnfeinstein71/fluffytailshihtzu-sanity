import {NextResponse} from 'next/server'
import {requireOperator} from '@/lib/operator-auth'
import {readTestPaymentReceipt} from '@/sanity/lib/test-payment-webhook'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(req:Request){
 const denied=requireOperator(req);if(denied)return denied
 const headers={'Cache-Control':'private, no-store'}
 try{return NextResponse.json(await readTestPaymentReceipt(new URL(req.url).searchParams.get('session_id')||''),{headers})}catch{return NextResponse.json({error:'The test receipt is unavailable. Return to the workspace before trying another payment.'},{status:409,headers})}
}
