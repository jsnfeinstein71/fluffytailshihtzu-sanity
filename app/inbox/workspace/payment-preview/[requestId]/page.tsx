import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {getPaymentPreview} from '@/sanity/lib/workspace-email'
import {money} from '../../model'
import '../../workspace.css'

export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Test payment request',robots:{index:false,follow:false}}
export default async function PaymentPreview({params}:{params:Promise<{requestId:string}>}){
  let result
  try{result=await getPaymentPreview((await params).requestId)}catch{notFound()}
  const {request,familyName}=result
  return <main className="ops-workspace ops-payment-preview"><section className="ops-panel ops-payment-detail"><p className="ops-eyebrow">FLUFFYTAIL · STAFF REVIEW</p><h1>Test payment request</h1><p>This link cannot collect money. Customer sending and live checkout creation are disabled.</p><h2>{request.puppyName} · {request.kind}</h2><dl><dt>Fictional family</dt><dd>{familyName}</dd><dt>Puppy price</dt><dd>{money(request.totalCents)}</dd><dt>Confirmed paid</dt><dd>{money(request.paidCents)}</dd><dt>Requested {request.kind}</dt><dd>{money(request.amountCents)}</dd></dl><p>Preparing a request does not reserve a puppy or confirm payment.</p><Link href="/inbox/workspace" className="ops-button secondary">Return to staff workspace</Link></section></main>
}
