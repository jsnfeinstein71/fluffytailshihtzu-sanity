'use client'
import {useState} from 'react'
import {money,type Family} from './model'
import type {PaymentRequest} from './email-model'
import type {EmailWorkspace} from './useEmailWorkspace'
export default function TestPayments({family,email,onInsert}:{family:Family;email:EmailWorkspace;onInsert?:(request:PaymentRequest,channel:'Email'|'Text')=>void}){
 const [choice,setKind]=useState<'deposit'|'balance'>('deposit'),[copied,setCopied]=useState('')
 const puppy=email.data?.inventory?.find(p=>p.id===family.puppyId)
 const paid=family.records.reduce((sum,p)=>sum+Math.round(p.amountPaid*100),0),total=(puppy?.price||0)*100,deposit=(puppy?.deposit||0)*100
 const kind=paid>=deposit&&deposit>0?'balance':choice
 const eligible=!!puppy&&(kind==='deposit'?puppy.status==='Available'&&paid===0:paid>=deposit&&paid<total)
 const requests=(email.data?.paymentRequests||[]).filter(r=>r.familyId===family.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))
 async function copy(id:string,url:string){try{await navigator.clipboard.writeText(url);setCopied(id)}catch{setCopied('Select the link below and copy it.')}}
 return <section className="ops-email-options ops-test-payments" aria-label="Test payments"><h3>Deposit & final payment</h3><p>TEST — no real charges or inventory changes. Only the fictional puppy’s test reservation can change.</p>
 <dl><dt>Puppy</dt><dd>{puppy?.name||'Associate a test puppy first'}</dd><dt>Total price</dt><dd>{money(total)}</dd><dt>Webhook-verified paid</dt><dd>{money(paid)}</dd><dt>Remaining</dt><dd>{money(Math.max(0,total-paid))}</dd><dt>Test reservation</dt><dd>{puppy?.status||'Not associated'}</dd></dl>
 <label htmlFor="test-payment-kind">Request</label><select id="test-payment-kind" value={kind} onChange={e=>setKind(e.target.value as 'deposit'|'balance')}><option value="deposit" disabled={paid>0}>$400 deposit</option><option value="balance">$1,200 final payment</option></select>
 <button className="ops-button" disabled={email.busy||!eligible} onClick={()=>void email.createPaymentLink(family.id,family.puppyId!,kind)}>{email.paymentBusy?'Creating test link…':`Request ${money(kind==='deposit'?deposit:Math.max(0,total-paid))} ${kind==='deposit'?'deposit':'final payment'}`}</button>
 {!eligible?<p role="status">{paid>=total&&total>0?'Paid in full. No further payment can be requested.':kind==='deposit'&&paid>0?'The deposit is already paid. Choose final payment.':kind==='balance'?'Pay the deposit and wait for its signed webhook before requesting the final payment.':'An available test puppy must be associated with this family.'}</p>:null}
 {email.error?<p role="alert" className="ops-error">{email.error}</p>:null}
 {requests.map(request=><article className="ops-test-payment-request" key={request._id}><h4>{request.kind==='deposit'?'Deposit':'Final payment'} · {money(request.amountCents)}</h4><p>{request.webhookVerifiedAt?'Paid — signed Stripe test webhook verified':request.paymentVerification==='test-paid'?'Stripe reports paid; waiting for the signed webhook':request.kind==='deposit'?'Not paid; no reservation is confirmed':'This final payment is not paid.'}</p>{request.checkoutUrl&&!request.webhookVerifiedAt?<><a className="ops-button secondary" href={request.checkoutUrl}>Open test checkout</a><button className="ops-button secondary" onClick={()=>void copy(request._id,request.checkoutUrl!)}>Copy payment link</button>{onInsert?<><button className="ops-button secondary" onClick={()=>onInsert(request,'Email')}>Insert link in email</button><button className="ops-button secondary" onClick={()=>onInsert(request,'Text')}>Insert link in text</button></>:null}<input aria-label={`${request.kind} test payment link`} readOnly value={request.checkoutUrl}/></>:null}{copied===request._id?<p role="status">Payment link copied. Nothing was sent.</p>:copied==='Select the link below and copy it.'?<p role="status">Select the payment link and copy it. Nothing was sent.</p>:null}</article>)}
 <h4>Verified payment history</h4>{family.records.length?family.records.map((record,index)=><p key={index}>{record.paymentType==='deposit'?'Deposit':'Final payment'} · {money(Math.round(record.amountPaid*100))} · Signed webhook verified</p>):<p>No verified test payments yet.</p>}
 </section>
}
