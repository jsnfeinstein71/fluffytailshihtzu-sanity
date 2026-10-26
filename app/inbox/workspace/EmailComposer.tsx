'use client'

import {useState} from 'react'
import Link from 'next/link'
import {families,money,puppies,type Family} from './model'
import {jeanneEmail,mailMessages,paymentPreviewPath,sameEmail,type EmailReview} from './email-model'
import type {EmailWorkspace} from './useEmailWorkspace'

export function EmailOutbox({reviews}:{reviews:EmailReview[]}){
  return <section className="ops-email-outbox" aria-label="Held email reviews"><h3>Held email reviews</h3><p>Saved review copies. Nothing has been sent. Draft edits need a new review.</p>{reviews.length?reviews.map((review,index)=><details key={review._id} open={index===0}><summary>{review.subject} · Held · {new Date(review.createdAt).toLocaleString()}</summary><dl><dt>From / Reply-To</dt><dd>{review.from}</dd><dt>To</dt><dd>{review.to}</dd><dt>Conversation</dt><dd>{review.inReplyTo?'Reply to incoming email':'New email'}</dd></dl><pre>{review.body}</pre><button className="ops-button" disabled>Send email — disabled</button><p className="ops-draft-note">Customer delivery has not been activated.</p></details>):<p>No review copies yet. Save an email, then choose Review email.</p>}</section>
}

export default function EmailComposer({family,email}:{family:Family;email:EmailWorkspace}){
  const entry=email.entries[family.id]
  const [paymentChoice,setPaymentChoice]=useState<Record<string,string>>({})
  const [paymentKind,setPaymentKind]=useState<Record<string,'deposit'|'balance'>>({})
  if(!entry)return <div role="status"><p>Email drafts are loading. Editing will open after the saved connection is ready.</p>{email.error?<p className="ops-error" role="alert">{email.error}</p>:null}<button className="ops-button secondary" disabled={email.busy} onClick={()=>void email.load()}>Retry email connection</button></div>
  const value=entry.value
  const dirty=!sameEmail(value,entry.base)
  const selectedPuppy=family.puppyId||paymentChoice[family.id]||''
  const kind=paymentKind[family.id]||'deposit'
  const puppy=puppies.find(p=>p.id===selectedPuppy)
  const paid=families.find(f=>f.id===family.id)!.records.filter(r=>r.paymentStatus==='paid').reduce((sum,r)=>sum+Math.round(r.amountPaid*100),0)
  const eligible=!!puppy&&(kind==='deposit'?puppy.status==='Available'&&paid===0:family.puppyId===puppy.id&&paid<puppy.price*100)
  const requests=email.data?.paymentRequests.filter(p=>p.familyId===family.id)||[]
  const attached=requests.find(p=>p._id===value.paymentRequestId)
  const replies=mailMessages.filter(m=>m.familyId===family.id&&m.direction==='in')
  return <div className="ops-email-compose">
    <dl className="ops-email-addresses"><dt>From / Reply-To</dt><dd>{jeanneEmail}</dd><dt>To</dt><dd>{family.email}</dd></dl>
    <label htmlFor="email-conversation">Conversation</label><select id="email-conversation" value={value.replyToId||''} disabled={email.busy} onChange={event=>event.target.value?email.startReply(family.id,event.target.value):email.edit(family.id,{replyToId:null})}><option value="">New email</option>{replies.map(m=><option value={m.id} key={m.id}>Reply: {m.subject}</option>)}</select>
    <label htmlFor="email-subject">Subject</label><input id="email-subject" value={value.subject} maxLength={160} onChange={event=>email.edit(family.id,{subject:event.target.value})}/>
    <label htmlFor="email-body">Email message to {family.name}</label><textarea id="email-body" value={value.body} maxLength={10000} rows={6} onChange={event=>email.edit(family.id,{body:event.target.value})}/>
    <details className="ops-email-payment"><summary>Include payment details</summary><p>Prepare a staff-only test link. This does not create a checkout, reserve a puppy, or record a payment.</p>
      <label htmlFor="email-payment-puppy">Puppy</label><select id="email-payment-puppy" value={selectedPuppy} disabled={!!family.puppyId||email.busy} onChange={event=>setPaymentChoice(previous=>({...previous,[family.id]:event.target.value}))}><option value="">Choose a puppy</option>{puppies.filter(p=>!family.puppyId||p.id===family.puppyId).map(p=><option value={p.id} key={p.id}>{p.name} · {p.status}</option>)}</select>
      <label htmlFor="email-payment-kind">Payment request</label><select id="email-payment-kind" value={kind} onChange={event=>setPaymentKind(previous=>({...previous,[family.id]:event.target.value as 'deposit'|'balance'}))}><option value="deposit">Deposit</option><option value="balance">Remaining balance</option></select>
      {puppy?<p>{kind==='deposit'?`Deposit: ${money(puppy.deposit*100)}`:`Remaining balance: ${money(puppy.price*100-paid)}`}. {eligible?'Confirm the family and puppy before preparing.':kind==='deposit'?'A new deposit requires an available puppy with no confirmed payment.':'A balance requires a confirmed family–puppy association and an amount remaining.'}</p>:null}
      <button className="ops-button secondary" disabled={email.busy||!eligible} onClick={()=>void email.payment(family.id,selectedPuppy,kind)}>Prepare test payment link</button>
      <label htmlFor="email-payment-attachment">Attach prepared request</label><select id="email-payment-attachment" value={value.paymentRequestId||''} onChange={event=>email.edit(family.id,{paymentRequestId:event.target.value||null})}><option value="">No payment request</option>{requests.map(p=><option value={p._id} key={p._id}>{p.puppyName} {p.kind} · {money(p.amountCents)} · {new Date(p.expiresAt)<=new Date()?'Expired':'Test only'}</option>)}</select>
    </details>
    {attached?<p className="ops-email-attachment">Attached: {attached.puppyName} {attached.kind} · {money(attached.amountCents)} · <Link href={paymentPreviewPath(attached.requestId)} target="_blank" rel="noopener noreferrer">Open staff test link ↗</Link>. Expires {new Date(attached.expiresAt).toLocaleString()}. A review appends the exact amount and link to the message.</p>:null}
    <div className="ops-draft-save"><span role="status">{dirty?'Unsaved email changes':entry.revision?'Email draft saved':'No saved email draft yet'}</span><button className="ops-button secondary" disabled={email.busy||!!entry.conflict||(!dirty&&!!entry.revision)} onClick={()=>void email.save(family.id)}>{email.busy?'Working…':'Save email draft'}</button></div>
    {entry.conflict?<section className="ops-draft-conflict" role="alert"><strong>This email changed in another tab.</strong><p>Your entries are kept above. Saved subject: {entry.conflict.value.subject}</p><pre>{entry.conflict.value.body||'(Empty saved message)'}</pre><p>Saved reply: {entry.conflict.value.replyToId||'New email'} · Payment request: {entry.conflict.value.paymentRequestId?'Attached':'None'}</p><div><button className="ops-button secondary" onClick={()=>email.resolve(family.id,true)}>Use saved email</button><button className="ops-button secondary" onClick={()=>email.resolve(family.id,false)}>Keep my email</button></div></section>:null}
    {email.error?<p className="ops-error" role="alert">{email.error}</p>:null}
    <div className="ops-compose-actions"><button className="ops-button secondary" disabled={email.busy} onClick={()=>void email.load()}>Refresh email records</button><button className="ops-button" disabled={email.busy||dirty||!entry.revision||!!entry.conflict||!value.subject.trim()||!value.body.trim()} onClick={()=>void email.review(family.id)}>Review email →</button></div>
    <p className="ops-draft-note">Save before reviewing. Review copies are held below; sending is disabled. These are fictional conversations, separate from Jeanne’s live mailbox.</p>
    <EmailOutbox reviews={(email.data?.reviews||[]).filter(r=>r.familyId===family.id)}/>
  </div>
}
