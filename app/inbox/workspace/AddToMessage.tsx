'use client'
import {useRef,useState,useLayoutEffect} from 'react'
import {money,paymentSummary,type Family,type Channel} from './model'
import type {PaymentRequest} from './email-model'
import type {EmailWorkspace} from './useEmailWorkspace'

export default function AddToMessage({family,email,channel,onPayment}:{family:Family;email:EmailWorkspace;channel:Channel;onPayment:(request:PaymentRequest,channel:Channel,familyId:string)=>void}){
 const photos=useRef<HTMLInputElement>(null),documents=useRef<HTMLInputElement>(null)
 const callback=useRef(onPayment);useLayoutEffect(()=>{callback.current=onPayment},[onPayment])
 const [library,setLibrary]=useState(false)
 const balance=paymentSummary(family,email.data?.inventory||[]),puppy=email.data?.inventory?.find(p=>p.id===family.puppyId)
 const kind=balance&&balance.paidCents>0?'balance':'deposit'
 const eligible=!!balance&&balance.remainingCents>0&&!family.historicalBalanceNeedsReview&&!!puppy&&(kind==='deposit'?['Available','Hold'].includes(puppy.status)&&balance.paidCents===0:!!family.puppyId)
 const files=(email.data?.attachmentLibrary||[]).filter(f=>f.familyId===family.id)
 async function choose(value:string){
  if(value==='payment'){const id=family.id,target=channel;const request=await email.createPaymentLink(id,family.puppyId!,kind);if(request)callback.current(request,target,id)}
  else if(value==='photos')photos.current?.click()
  else if(value==='documents')documents.current?.click()
  else if(value==='saved')setLibrary(v=>!v)
 }
 if(channel==='Text'&&!eligible)return null
 return <><label className="ops-add-message"><span className="ops-sr">Add to message</span><select aria-label="Add to message" value="" disabled={email.busy||!family.id} onChange={e=>void choose(e.target.value)}><option value="">{email.fileBusy?'Uploading…':email.paymentBusy?'Preparing payment…':'Add to message…'}</option>{eligible?<option value="payment">{kind==='deposit'?`Deposit request · ${money(balance!.depositCents)}`:`Final-payment request · ${money(balance!.remainingCents)}`}</option>:null}{channel==='Email'?<><option value="photos">Photos…</option><option value="documents">Documents (PDF or TXT)…</option>{files.length?<option value="saved">Saved family files…</option>:null}</>:null}</select></label>
  {channel==='Email'?<><input ref={photos} type="file" className="ops-file-input" aria-label="Choose photos" multiple accept="image/jpeg,image/png,image/webp" onChange={e=>{void email.uploadFiles(family.id,Array.from(e.target.files||[]));e.target.value=''}}/><input ref={documents} type="file" className="ops-file-input" aria-label="Choose documents" multiple accept="application/pdf,text/plain,.pdf,.txt" onChange={e=>{void email.uploadFiles(family.id,Array.from(e.target.files||[]));e.target.value=''}}/>{library?<section className="ops-saved-files" aria-label="Saved family files"><p>Private family files · up to five files per email, 2.5 MB each, 7.5 MB total.</p>{files.map(file=><button type="button" className="ops-button secondary" key={file.id} disabled={email.busy||(email.entries[family.id]?.value.attachmentIds||[]).includes(file.id)} onClick={()=>void email.attachExisting(family.id,file)}>{file.filename} · {Math.ceil(file.size/1000)} KB</button>)}<button type="button" className="ops-button secondary" onClick={()=>setLibrary(false)}>Close files</button></section>:null}</>:null}
 </>
}
