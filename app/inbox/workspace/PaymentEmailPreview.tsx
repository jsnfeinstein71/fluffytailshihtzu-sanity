'use client'

import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {confirmationMessage,paymentEmailLabels,renderPaymentEmail,type PaymentEmail,type PaymentEmailKind} from '@/lib/mail/payment-email'
import type {EmailWorkspace} from './useEmailWorkspace'
import type {Family} from './model'

export function PaymentEmailPreview({email,example=false}:{email:PaymentEmail;example?:boolean}){
  const [open,setOpen]=useState(false)
  return <><button type="button" className="ops-button secondary" onClick={()=>setOpen(true)}>{example?'Preview template':'Preview formatted email'}</button>{open?createPortal(<PreviewDialog email={email} example={example} onClose={()=>setOpen(false)}/>,document.body):null}</>
}
function PreviewDialog({email,example,onClose}:{email:PaymentEmail;example:boolean;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null)
  const [mode,setMode]=useState('html')
  const [narrow,setNarrow]=useState(false)
  const formatted=renderPaymentEmail(email)
  let html=formatted.html
  if(mode==='images')html=html.replace(/<img\b[^>]*>/g,'')
  if(mode==='dark')html=html.replace('<style>','<style>.email-outer{background-color:#241F1B!important}')
  useEffect(()=>{const node=dialog.current;node?.showModal();return ()=>node?.close()},[])
  return <dialog ref={dialog} className="ops-email-preview-dialog" aria-labelledby="payment-email-preview-title" onCancel={onClose} onClose={onClose}>
    <header><div><h2 id="payment-email-preview-title">{paymentEmailLabels[email.kind].button.replace('View','Preview')}</h2><p>{example?'Template example — no payment is being confirmed or requested.':'Preview of your current message. Closing keeps your edits; previewing does not send or save.'}</p></div><button type="button" className="ops-button secondary" onClick={onClose} autoFocus>Close preview</button></header>
    <div className="ops-email-preview-controls"><label>Display <select value={mode} onChange={e=>setMode(e.target.value)}><option value="html">Formatted email</option><option value="dark">Dark background</option><option value="images">Images blocked</option><option value="text">Plain text</option></select></label><label><input type="checkbox" checked={narrow} onChange={e=>setNarrow(e.target.checked)}/> Mobile width</label><small>Email apps may render colors and spacing differently.</small></div>
    {mode==='text'?<pre>{formatted.text}</pre>:<iframe title="Formatted payment email" sandbox="" srcDoc={html} style={{width:narrow?'min(100%, 375px)':'100%'}}/>}
  </dialog>
}

// Optional personalization for future automatic receipts. Existing immutable
// confirmation records and any unsaved compose/reply draft remain untouched.
export function PaymentEmailTools({family,email}:{family:Family;email:EmailWorkspace}){
  const saved=email.data?.families?.find(f=>f.familyKey===family.id)?.profile.paymentConfirmationMessage||''
  const [edits,setEdits]=useState<Record<string,{message:string;base:string}>>({})
  const [kind,setKind]=useState<PaymentEmailKind>('paid-confirmation')
  const [notice,setNotice]=useState('')
  const local=edits[family.id],message=local?.message??saved
  const request=email.data?.paymentRequests.find(p=>p.familyId===family.id&&p.checkoutUrl&&(p.publicToken||!p.testOnly))
  const effectiveKind=request?.litterReservationId?(kind.endsWith('confirmation')?'deposit-confirmation':'deposit-request'):kind
  const deposit=effectiveKind.startsWith('deposit'),confirmed=effectiveKind.endsWith('confirmation')
  const preview:PaymentEmail|null=request?{version:request.litterReservationId?5:3,...(request.litterReservationId?{litterTitle:request.puppyName,selectionPosition:request.selectionPosition}:{}),reserved:!request.litterReservationId&&confirmed&&deposit,kind:effectiveKind,name:family.name,message:confirmed?(message||confirmationMessage):request.litterReservationId?'Here are the payment details for your approved litter selection position.':'Here are the payment details for your puppy. Please reply if you have any questions.',puppyName:request.puppyName,amountCents:deposit?request.depositCents:request.totalCents-request.depositCents,totalCents:request.totalCents,paidCents:confirmed?(deposit?request.depositCents:request.totalCents):(deposit?0:request.depositCents),depositCents:request.depositCents,url:request.checkoutUrl!,testOnly:request.testOnly}:null
  return <details className="ops-payment-email-tools"><summary>Payment email templates</summary><p>Payment requests use your composer message. Confirmations are sent once after a verified payment, with the note saved below.</p>
    <label htmlFor="confirmation-message">Personal note for future payment confirmations</label><textarea id="confirmation-message" rows={4} maxLength={4000} value={message} placeholder={confirmationMessage} onChange={e=>{setNotice('');setEdits(previous=>({...previous,[family.id]:{message:e.target.value,base:previous[family.id]?.base??saved}}))}}/>
    <button type="button" className="ops-button secondary" disabled={email.busy||!local||local.message===saved} onClick={async()=>{if(!local)return;const result=await email.saveConfirmationMessage(family.id,local.message,local.base);if(result){setNotice('Saved for future confirmations. Existing messages are unchanged.');setEdits(previous=>{const next={...previous};if(next[family.id]?.message===local.message)delete next[family.id];else if(next[family.id])next[family.id]={...next[family.id],base:local.message};return next})}}}>Save confirmation note</button>{notice?<p role="status">{notice}</p>:null}
    <label htmlFor="payment-email-template">Template example</label><select id="payment-email-template" value={effectiveKind} onChange={e=>setKind(e.target.value as PaymentEmailKind)}><option value="deposit-request">Deposit request</option>{!request?.litterReservationId?<option value="balance-request">Final-payment request</option>:null}<option value="deposit-confirmation">Deposit confirmation</option>{!request?.litterReservationId?<option value="paid-confirmation">Paid-in-full confirmation</option>:null}</select>
    {preview?<PaymentEmailPreview email={preview} example/>:<p>Prepare a payment link to preview templates with this puppy’s details.</p>}
  </details>
}
