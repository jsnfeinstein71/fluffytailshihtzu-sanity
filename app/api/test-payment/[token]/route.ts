import {NextResponse} from 'next/server'
import {customerTestPayment} from '@/sanity/lib/customer-test-payment'
export const dynamic='force-dynamic'
export async function GET(_req:Request,{params}:{params:Promise<{token:string}>}){
 try{return NextResponse.json(await customerTestPayment((await params).token),{headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}})}catch{return NextResponse.json({error:'This payment link is unavailable. Contact Jeanne for help before paying.'},{status:404,headers:{'Cache-Control':'no-store'}})}
}
