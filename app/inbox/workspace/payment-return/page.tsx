import {notFound} from 'next/navigation'
import {paymentTestWorkspaceEnabled} from '@/lib/payment-test-mode'
import PaymentReturn from './PaymentReturn'
import '../workspace.css'
export const dynamic='force-dynamic'
export const metadata={title:'Stripe test payment return',robots:{index:false,follow:false}}
export default async function Page({searchParams}:{searchParams:Promise<{session_id?:string}>}){
 const {session_id}=await searchParams
 if(!paymentTestWorkspaceEnabled()||!session_id?.startsWith('cs_test_'))notFound()
 return <PaymentReturn sessionId={session_id}/>
}
