'use client'
import {paymentCopy} from '@/lib/public-copy'
import Image from 'next/image'
import {useEffect,useState} from 'react'
import type {customerLivePayment} from '@/sanity/lib/customer-live-payment'
import type {customerTestPayment} from '@/sanity/lib/customer-test-payment'
import {money} from '@/app/inbox/workspace/model'
type Receipt=Awaited<ReturnType<typeof customerTestPayment>>|Awaited<ReturnType<typeof customerLivePayment>>
export default function CustomerTestPayment({token,initial,error,canceled,testOnly=true}:{token:string;initial:Receipt|null;error:string;canceled:boolean;testOnly?:boolean}){
 const endpoint=testOnly?'/api/test-payment/':'/api/payment/'
 const [receipt,setReceipt]=useState(initial),[problem,setProblem]=useState(error)
 useEffect(()=>{
  if(!(testOnly?/^[a-f0-9]{48}$/:/^(?:[a-f0-9]{48}|cs_live_[A-Za-z0-9]+)$/).test(token))return
  let stopped=false,timer:ReturnType<typeof setTimeout>;const abort=new AbortController()
  async function update(){try{const response=await fetch(endpoint+token,{cache:'no-store',signal:abort.signal});const data=await response.json();if(!response.ok)throw new Error(data.error);if(!stopped){setReceipt(data);setProblem('')}}catch{if(!stopped)setProblem(paymentCopy.unconfirmed)}if(!stopped)timer=setTimeout(update,5000)}
  timer=setTimeout(update,3000);return()=>{stopped=true;abort.abort();clearTimeout(timer)}
 },[token,endpoint,testOnly])
 const paid=receipt?.state==='confirmed',complete=paid&&receipt.remainingCents===0,finalPayment=receipt?.kind==='balance'
 return <main className="ops-workspace ops-payment-preview"><section className="ops-panel ops-payment-detail"><p className="ops-eyebrow">{testOnly?'TEST — no real charges or inventory changes':'Payment with Jeanne'}</p><Image src="/brand/fluffytail-logo-color.svg" alt="FluffyTail Shih Tzu" width={80} height={80}/><p>FluffyTail Shih Tzu · Jeanne</p><h1>{complete?'Paid in full':paid?finalPayment?'Payment received':'Deposit received':receipt?.state==='pending'?'Confirming your payment':receipt?.state==='failed'?'This payment was not completed':receipt?.state==='expired'?'This payment link has expired':receipt?.state==='unavailable'?'This payment request needs Jeanne’s attention':'A payment request from Jeanne'}</h1>
 {receipt?<><h2>{receipt.puppyName}</h2><dl><dt>Total puppy price</dt><dd>{money(receipt.totalCents)}</dd><dt>{paid?'This payment received':'Amount requested'}</dt><dd>{money(receipt.amountCents)}</dd><dt>Total paid</dt><dd>{money(receipt.paidCents)}</dd><dt>Remaining balance</dt><dd>{money(receipt.remainingCents)}</dd>{!paid?<><dt>Balance after this payment</dt><dd>{money(Math.max(0,receipt.remainingCents-receipt.amountCents))}</dd></>:null}<dt>{testOnly?'Test puppy reservation':'Puppy reservation'}</dt><dd>{receipt.reserved?'Reserved':'reservationStatus' in receipt&&receipt.reservationStatus==='gone-home'?'Home with family':'reservationStatus' in receipt&&receipt.reservationStatus==='sold'?'Sold':'Awaiting a verified deposit'}</dd></dl>
 <p>The {money(receipt.depositCents)} deposit is non-refundable and is applied toward the total puppy price.</p>
 {paid?<><p>{complete?paymentCopy.paidInFull(receipt.puppyName):paymentCopy.verifiedDeposit(money(receipt.amountCents),receipt.puppyName,money(receipt.remainingCents))}</p>{receipt.reserved?<p>Your puppy is reserved.</p>:null}<p>{receipt.confirmation==='submitted'?paymentCopy.emailAccepted:receipt.confirmation==='uncertain'?'Your payment is confirmed. The email confirmation needs Jeanne’s attention; please contact her if it does not arrive.':receipt.confirmation==='pending'?'Your payment is confirmed. Your email confirmation is being prepared.':paymentCopy.emailNotSent}</p></>:receipt.state==='pending'?<p>{paymentCopy.processing}</p>:receipt.state==='failed'?<p>{paymentCopy.unconfirmed}</p>:receipt.state==='expired'||receipt.state==='unavailable'?<p>{paymentCopy.unavailable}</p>:<><p>{receipt.kind==='deposit'?paymentCopy.deposit(receipt.puppyName,money(receipt.depositCents),money(receipt.totalCents)):paymentCopy.balance(receipt.puppyName,money(receipt.paidCents+receipt.amountCents),money(Math.max(0,receipt.remainingCents-receipt.amountCents)))}</p>{canceled?<p>Checkout was canceled. This request has not been paid; you can return to checkout when ready.</p>:null}<p>{paymentCopy.unpaid}</p>{!problem?<a className="ops-button" href={endpoint+token+'/checkout'}>Continue to secure {testOnly?'test ':''}checkout · {money(receipt.amountCents)}</a>:null}{testOnly?<p>Use a Stripe test card only.</p>:null}</>}

 </>:null}{problem?<p role="alert">{problem}</p>:null}<p>{paymentCopy.help} <a href="mailto:jeanne@fluffytailshihtzu.com">Email Jeanne</a></p><p>{testOnly?'This is an owner-operated test. ':''}No customer account is needed.</p></section></main>
}
