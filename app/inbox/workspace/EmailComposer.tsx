'use client'

import {useState} from 'react'
import Link from 'next/link'
import {money,puppies as fixturePuppies,type Family} from './model'
import {jeanneEmail,paymentPreviewPath,sameEmail,type EmailReview,type OutgoingState} from './email-model'
import type {EmailWorkspace} from './useEmailWorkspace'

export function EmailOutbox({reviews}:{reviews:EmailReview[]}){
  return <section className="ops-email-outbox" aria-label="Held email reviews"><h3>Held email reviews</h3><p>Saved review copies. Reviewing never submits email. Check outgoing records for submission status; draft edits need a new review.</p>{reviews.length?reviews.map((review,index)=><details key={review._id} open={index===0}><summary>{review.subject} · Review copy · {new Date(review.createdAt).toLocaleString()}</summary><dl><dt>From / Reply-To</dt><dd>{review.from}</dd><dt>To</dt><dd>{review.to}</dd><dt>Conversation</dt><dd>{review.inReplyTo?'Reply to incoming email':'New email'}</dd></dl><pre>{review.body}</pre><p className="ops-draft-note">Review copy only. Submission history and controls are in Outgoing email records below.</p></details>):<p>No review copies yet. Save an email, then choose Review email.</p>}</section>
}

const states:Record<OutgoingState,string>={prepared:'Prepared · not submitted',sending:'Submission in progress · do not retry',accepted:'SMTP accepted · delivery unconfirmed',failed:'Not accepted · draft retained',uncertain:'Uncertain outcome · review required · no retry'}
export function EmailDelivery({familyId,email}:{familyId:string;email:EmailWorkspace}){
  const [scenario,setScenario]=useState<'accepted'|'rejected'|'uncertain'>('accepted')
  const [reviews,setReviews]=useState<Record<string,{decision:'accepted'|'not-accepted';evidence:string;acknowledged:boolean}>>({})
  const records=(email.data?.outgoing||[]).filter(o=>o.familyId===familyId)
  const capability=email.data?.capabilities
  const ownerTrialUsed=capability?.provider==='pair'&&(email.data?.outgoing||[]).some(o=>o.source==='pair'&&o.attempts.length>0)
  const blocked=records.some(o=>o.state==='sending'||o.state==='uncertain')
  return <section className="ops-email-outbox" aria-label="Outgoing email records"><h3>Outgoing email records</h3><p>{capability?.provider==='fictional'?'Fictional provider only. No real email is sent or mailbox accessed.':capability?.provider==='pair'?'Owner-only Pair trial. Only the exact approved test message to Jeanne is eligible; customer sending is blocked.':'Real sending and mailbox access are disabled. Saved outgoing records remain available.'} SMTP acceptance does not confirm delivery, payment, or a reservation.</p>
    {capability?.provider==='fictional'?<label className="ops-provider-scenario">Fictional provider result <select value={scenario} onChange={event=>setScenario(event.target.value as typeof scenario)}><option value="accepted">SMTP acceptance</option><option value="rejected">Explicit rejection</option><option value="uncertain">Acceptance with lost acknowledgement</option></select></label>:null}
    {records.length?records.map(record=>{
      const draft=email.entries[familyId]
      const current=draft?.revision===record.draftRevision&&sameEmail(draft.value,draft.base)
      const review=reviews[record._id]||{decision:'accepted' as const,evidence:'',acknowledged:false}
      const editReview=(patch:Partial<typeof review>)=>setReviews(previous=>({...previous,[record._id]:{...review,...patch}}))
      return <details key={record._id} open={record===records[0]}><summary>{record.subject} · {states[record.state]}</summary><p className="ops-draft-note">{record.source==='fictional'?'Fictional transport':'No confirmed real delivery'}{record.replyReceivedAt?' · Reply synchronized':''}</p><dl><dt>To</dt><dd>{record.to}</dd><dt>From / Reply-To</dt><dd>{record.from}</dd><dt>Delivery</dt><dd>Unconfirmed</dd><dt>Attempts</dt><dd>{record.attempts.length}</dd></dl><pre>{record.body}</pre>
        {record.attempts.map(attempt=><p key={attempt._key}>Attempt {attempt.number}: {states[attempt.state]}{attempt.code?` · ${attempt.code}`:''}</p>)}
        {['prepared','failed'].includes(record.state)?<><p className="ops-draft-note">{current?'The saved email and any payment quote are checked again before submission.':'Earlier draft version. Save and review the current email before another attempt.'}</p><button className="ops-button" disabled={email.busy||!capability?.canDispatch||blocked||!current||ownerTrialUsed} onClick={()=>void email.dispatch(record.reviewId,capability?.provider==='fictional'?scenario:undefined)}>{capability?.provider==='pair'?'Submit approved owner-only test':record.state==='failed'?'Retry with fictional provider':'Submit with fictional provider'}</button></>:null}
        {record.state==='uncertain'||record.state==='sending'?<p className="ops-error">Do not resend this email or create another send for this family until its uncertain attempt has been reviewed. A fixed Message-ID alone cannot prevent duplicate SMTP delivery.</p>:null}
        {record.state==='uncertain'?<section className="ops-draft-conflict"><strong>Record a checked SMTP outcome</strong><p>Inspect the provider records first. A missing reply or an empty Sent folder does not prove non-acceptance. Saving this review never sends an email.</p><label>Checked outcome <select value={review.decision} onChange={event=>editReview({decision:event.target.value as typeof review.decision,acknowledged:false})}><option value="accepted">Provider confirmed acceptance</option><option value="not-accepted">Provider confirmed no acceptance</option></select></label><label htmlFor={`evidence-${record._id}`}>Provider evidence / review note</label><textarea id={`evidence-${record._id}`} value={review.evidence} maxLength={2000} onChange={event=>editReview({evidence:event.target.value,acknowledged:false})}/><label><input type="checkbox" checked={review.acknowledged} onChange={event=>editReview({acknowledged:event.target.checked})}/> I checked the provider evidence and confirm the selected SMTP outcome.</label><button className="ops-button secondary" disabled={email.busy||!review.acknowledged||review.evidence.trim().length<20} onClick={()=>void email.resolveAttempt(record._id,record.attempts.at(-1)!._key,review.decision,review.evidence)}>Save reviewed SMTP outcome</button></section>:null}
        {record.resolutions?.map(resolution=><p className="ops-draft-note" key={resolution.attemptKey}>Staff review · {resolution.decision} · {resolution.operator} · {new Date(resolution.at).toLocaleString()}: {resolution.evidence}. Original attempt history is retained; delivery remains unconfirmed.</p>)}
      </details>
    }):<p>Save an email and choose Review email to create its persistent outgoing record.</p>}
    <div className="ops-compose-actions"><button className="ops-button secondary" disabled={email.busy||!capability?.canSync} onClick={()=>void email.sync()}>{capability?.provider==='pair'?'Synchronize approved owner-only reply':'Synchronize fictional replies'}</button><button className="ops-button secondary" disabled={email.busy} onClick={()=>void email.reconcile()}>Check interrupted attempts</button></div>
    {email.data?.syncNotice?<p role="status" className="ops-notice">{email.data.syncNotice}</p>:null}
    <p className="ops-draft-note">Synchronization imports replies only into their verified family thread. Unknown or ambiguous references are skipped. An interrupted submission becomes uncertain after two minutes; it is never retried automatically.</p>
  </section>
}

export function SyncedEmails({familyId,email,onReply}:{familyId:string;email:EmailWorkspace;onReply:(messageId:string)=>void}){
  const messages=(email.data?.messages||[]).filter(m=>m.familyId===familyId&&m.id.startsWith('private.staffIncomingEmail.'))
  const outgoing=(email.data?.outgoing||[]).filter(o=>o.familyId===familyId&&o.attempts.length)
  const events=[...messages.map(message=>({id:message.id,time:message.time,node:<article className="ops-message in" key={message.id}><small>Synchronized incoming email · {message.from} · {new Date(message.time).toLocaleString()}</small><p><strong>{message.subject}</strong>{'\n'}{message.body}</p><button className="ops-button secondary" disabled={!message.messageId} onClick={()=>onReply(message.id)}>Reply to synchronized email</button></article>})),...outgoing.map(message=>({id:message._id,time:message.acceptedAt||message.attempts.at(-1)!.startedAt,node:<article className="ops-message out" key={message._id}><small>{message.source==='fictional'?'Fictional transport':'Jeanne’s email'} · {states[message.state]}</small><p><strong>{message.subject}</strong>{'\n'}{message.body}</p></article>}))].sort((a,b)=>Date.parse(a.time)-Date.parse(b.time))
  return <>{events.map(event=>event.node)}</>
}

export default function EmailComposer({family,email}:{family:Family;email:EmailWorkspace}){
  const entry=email.entries[family.id]
  const [paymentChoice,setPaymentChoice]=useState<Record<string,string>>({})
  const [paymentKind,setPaymentKind]=useState<Record<string,'deposit'|'balance'>>({})
  if(!entry)return <div role="status"><p>Email drafts are loading. Editing will open after the saved connection is ready.</p>{email.error?<p className="ops-error" role="alert">{email.error}</p>:null}<button className="ops-button secondary" disabled={email.busy} onClick={()=>void email.load()}>Retry email connection</button></div>
  const value=entry.value
  const dirty=!sameEmail(value,entry.base)
  const puppies=family.source==='inquiry'?(email.data?.inventory||[]):fixturePuppies
  const selectedPuppy=family.puppyId||paymentChoice[family.id]||''
  const kind=paymentKind[family.id]||'deposit'
  const puppy=puppies.find(p=>p.id===selectedPuppy)
  const paid=family.records.filter(r=>r.paymentStatus==='paid').reduce((sum,r)=>sum+Math.round(r.amountPaid*100),0)
  const eligible=!!puppy&&(kind==='deposit'?puppy.status==='Available'&&paid===0:family.puppyId===puppy.id&&paid<puppy.price*100)
  const requests=email.data?.paymentRequests.filter(p=>p.familyId===family.id)||[]
  const attached=requests.find(p=>p._id===value.paymentRequestId)
  const replies=(email.data?.messages||[]).filter(m=>m.familyId===family.id&&m.direction==='in'&&m.messageId)
  return <div className="ops-email-compose">
    {email.data?.capabilities?.ownerTestRecipient?<p className="ops-notice">Owner-only trial: the actual recipient is Jeanne’s mailbox below. No customer address is used. Only the exact approved test message can be submitted.</p>:null}
    <dl className="ops-email-addresses"><dt>From / Reply-To</dt><dd>{jeanneEmail}</dd><dt>To</dt><dd>{email.data?.capabilities?.ownerTestRecipient||family.email}</dd></dl>
    <label htmlFor="email-conversation">Conversation</label><select id="email-conversation" value={value.replyToId||''} disabled={email.busy} onChange={event=>event.target.value?email.startReply(family.id,event.target.value):email.edit(family.id,{replyToId:null})}><option value="">New email</option>{replies.map(m=><option value={m.id} key={m.id}>Reply: {m.subject}</option>)}</select>
    <label htmlFor="email-subject">Subject</label><input id="email-subject" value={value.subject} maxLength={160} onChange={event=>email.edit(family.id,{subject:event.target.value})}/>
    <label htmlFor="email-body">Email message to {family.name}</label><textarea id="email-body" value={value.body} maxLength={10000} rows={6} onChange={event=>email.edit(family.id,{body:event.target.value})}/>
    <details className="ops-email-payment"><summary>Include payment details</summary><p>Prepare a staff test request, then explicitly create its Stripe test checkout when configured. Neither action reserves a puppy or confirms payment.</p>
      <label htmlFor="email-payment-puppy">Puppy</label><select id="email-payment-puppy" value={selectedPuppy} disabled={!!family.puppyId||email.busy} onChange={event=>setPaymentChoice(previous=>({...previous,[family.id]:event.target.value}))}><option value="">Choose a puppy</option>{puppies.filter(p=>!family.puppyId||p.id===family.puppyId).map(p=><option value={p.id} key={p.id}>{p.name} · {p.status}</option>)}</select>
      <label htmlFor="email-payment-kind">Payment request</label><select id="email-payment-kind" value={kind} onChange={event=>setPaymentKind(previous=>({...previous,[family.id]:event.target.value as 'deposit'|'balance'}))}><option value="deposit">Deposit</option><option value="balance">Remaining balance</option></select>
      {puppy?<p>{kind==='deposit'?`Deposit: ${money(puppy.deposit*100)}`:`Remaining balance: ${money(puppy.price*100-paid)}`}. {eligible?'Confirm the family and puppy before preparing.':kind==='deposit'?'A new deposit requires an available puppy with no confirmed payment.':'A balance requires a confirmed family–puppy association and an amount remaining.'}</p>:null}
      <button className="ops-button secondary" disabled={email.busy||!eligible} onClick={()=>void email.payment(family.id,selectedPuppy,kind)}>Prepare test payment link</button>
      <label htmlFor="email-payment-attachment">Attach prepared request</label><select id="email-payment-attachment" value={value.paymentRequestId||''} onChange={event=>email.edit(family.id,{paymentRequestId:event.target.value||null})}><option value="">No payment request</option>{requests.map(p=><option value={p._id} key={p._id}>{p.puppyName} {p.kind} · {money(p.amountCents)} · {new Date(p.expiresAt)<=new Date()?'Expired':'Test only'}</option>)}</select>
    </details>
    {attached?<div className="ops-email-attachment"><p>Attached: {attached.puppyName} {attached.kind} · {money(attached.amountCents)} · <Link href={paymentPreviewPath(attached.requestId)} target="_blank" rel="noopener noreferrer">Open staff test link ↗</Link>. Expires {new Date(attached.expiresAt).toLocaleString()}. A review appends the exact amount and link to the message.</p>{family.source==='inquiry'?<><button className="ops-button secondary" disabled={email.busy||!email.data?.testCheckoutEnabled||!!attached.checkoutSessionId} onClick={()=>void email.checkout(family.id,attached._id)}>Create Stripe test checkout</button>{attached.checkoutUrl?<><p><a href={attached.checkoutUrl} target="_blank" rel="noopener noreferrer">Open Stripe test payment link ↗</a></p><button className="ops-button secondary" disabled={email.busy} onClick={()=>void email.verifyPayment(family.id,attached._id)}>Verify test payment with Stripe</button></>:null}<p>Payment verification: {attached.paymentVerification==='test-paid'?'Stripe verified paid in test mode':attached.paymentVerification==='test-unpaid'?'Stripe verified unpaid in test mode':'Not verified'}. Email delivery and reservation status are separate.</p></>:null}</div>:null}
    <div className="ops-draft-save"><span role="status">{dirty?'Unsaved email changes':entry.revision?'Email draft saved':'No saved email draft yet'}</span><button className="ops-button secondary" disabled={email.busy||!!entry.conflict||(!dirty&&!!entry.revision)} onClick={()=>void email.save(family.id)}>{email.busy?'Working…':'Save email draft'}</button></div>
    {entry.conflict?<section className="ops-draft-conflict" role="alert"><strong>This email changed in another tab.</strong><p>Your entries are kept above. Saved subject: {entry.conflict.value.subject}</p><pre>{entry.conflict.value.body||'(Empty saved message)'}</pre><p>Saved reply: {entry.conflict.value.replyToId||'New email'} · Payment request: {entry.conflict.value.paymentRequestId?'Attached':'None'}</p><div><button className="ops-button secondary" onClick={()=>email.resolve(family.id,true)}>Use saved email</button><button className="ops-button secondary" onClick={()=>email.resolve(family.id,false)}>Keep my email</button></div></section>:null}
    {email.error?<p className="ops-error" role="alert">{email.error}</p>:null}
    <div className="ops-compose-actions"><button className="ops-button secondary" disabled={email.busy} onClick={()=>void email.load()}>Refresh email records</button><button className="ops-button" disabled={email.busy||dirty||!entry.revision||!!entry.conflict||!value.subject.trim()||!value.body.trim()} onClick={()=>void email.review(family.id)}>Review email →</button></div>
    <p className="ops-draft-note">{email.data?.capabilities?.provider==='pair'?'Owner-only trial: review first, then explicitly submit the single approved test below. Customer sending remains blocked.':'Save before reviewing. These are fictional conversations. Real sending and mailbox access are disabled; fictional transport results appear below.'}</p>
    <EmailOutbox reviews={(email.data?.reviews||[]).filter(r=>r.familyId===family.id)}/>
    <EmailDelivery familyId={family.id} email={email}/>
  </div>
}
