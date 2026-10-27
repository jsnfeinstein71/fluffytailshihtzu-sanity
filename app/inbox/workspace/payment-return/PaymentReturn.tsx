'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {money} from '../model'
type Receipt={familyId:string;familyName:string;puppyName:string;providerPaid:boolean;webhookVerified:boolean;paidCents:number;remainingCents:number;status:string}
export default function PaymentReturn({sessionId}:{sessionId:string}){
 const [receipt,setReceipt]=useState<Receipt|null>(null),[error,setError]=useState('')
 useEffect(()=>{
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>,attempts=0
  async function load(){try{
   const response=await fetch('/inbox/workspace/api/payment-receipt?session_id='+encodeURIComponent(sessionId),{cache:'no-store',signal:controller.signal});const data=await response.json()
   if(!response.ok)throw new Error(data.error);setReceipt(data);setError('')
   if(!data.webhookVerified&&++attempts<45)timer=setTimeout(load,2000)
  }catch(cause){if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'The receipt is unavailable. Return to the workspace; do not pay again.')}}
  void load();return()=>{controller.abort();clearTimeout(timer)}
 },[sessionId])
 return <main className="ops-workspace ops-payment-preview"><section className="ops-panel ops-payment-detail"><p className="ops-eyebrow">TEST — no real charges or inventory changes</p><h1>{receipt?.webhookVerified?'Test payment verified':'Confirming your test payment'}</h1><p>{receipt?.webhookVerified?'The signed Stripe test webhook has recorded this payment.':receipt?.providerPaid?'Stripe reports paid. Waiting for the signed webhook; do not pay again.':'Checking Stripe and the private test ledger. This page never marks a payment paid.'}</p>{receipt?<><h2>{receipt.puppyName}</h2><p>{receipt.familyName}</p><dl><dt>Webhook-verified paid</dt><dd>{money(receipt.paidCents)}</dd><dt>Remaining</dt><dd>{money(receipt.remainingCents)}</dd><dt>Fictional puppy status</dt><dd>{receipt.status}</dd></dl></>:null}{error?<p role="alert" className="ops-error">{error}</p>:null}<Link className="ops-button" href={'/inbox/workspace'+(receipt?'?family='+encodeURIComponent(receipt.familyId):'')}>Return to family workspace</Link></section></main>
}
