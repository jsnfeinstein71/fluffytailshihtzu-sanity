import {paymentCopy} from '@/lib/public-copy'
import {NextResponse} from 'next/server'
import {customerLivePayment} from '@/sanity/lib/customer-live-payment'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(_req:Request,{params}:{params:Promise<{token:string}>}){
 const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}
 try{return NextResponse.json(await customerLivePayment((await params).token),{headers})}catch{return NextResponse.json({error:paymentCopy.unavailable},{status:404,headers})}
}
