'use client'
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react'
import {emptyEmail,sameEmail,type EmailDraft,type EmailValue,type MailAction,type MailData,type MailResult,type TransportAction} from './email-model'
import {attachmentLimits,type EmailAttachment} from '@/lib/mail/attachment-model'
import {sendEmailDraft} from './send-draft'
type Entry={value:EmailValue;base:EmailValue;revision:string|null;conflict?:EmailDraft}
export function useEmailWorkspace(ready:boolean){
  const [data,setData]=useState<MailData|null>(null)
  const [entries,setEntries]=useState<Record<string,Entry>>({})
  const entriesLatest=useRef(entries);useLayoutEffect(()=>{entriesLatest.current=entries},[entries])
  const uploading=useRef(false)
  const [fileBusy,setFileBusy]=useState(false)
  const uploadIds=useRef<Record<string,string>>({})
  const autoAttempt=useRef<Record<string,string>>({})
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const flight=useRef<Promise<unknown>|null>(null)
  const sending=useRef(false)
  const paymentFlow=useRef(false)
  const [paymentBusy,setPaymentBusy]=useState(false)
  const [sendingFamily,setSendingFamily]=useState('')
  const [sendNotice,setSendNotice]=useState('')
  const [noticeFamily,setNoticeFamily]=useState('')
  const explicitThread=useRef<Record<string,boolean>>({})
  const requestIds=useRef<Record<string,string>>({})
  const merge=useCallback((result:MailData,action?:MailAction|TransportAction,clearFrom?:EmailValue)=>{
    setData(result)
    setEntries(previous=>{
      const next={...previous}
      for(const draft of result.drafts){
        const local=previous[draft.familyId]
        if(action?.type==='save'&&action.familyId===draft.familyId){
          next[draft.familyId]={value:local?(clearFrom&&sameEmail(local.value,clearFrom)?draft.value:local.value):draft.value,base:draft.value,revision:draft.revision};continue
        }
        if(!local||sameEmail(local.value,local.base)||sameEmail(local.value,draft.value))next[draft.familyId]={value:draft.value,base:draft.value,revision:draft.revision}
        else if(sameEmail(local.base,draft.value))next[draft.familyId]={...local,revision:draft.revision}
        else next[draft.familyId]={...local,conflict:draft}
      }
      return next
    })
  },[])
  const request=useCallback(async(action?:MailAction|TransportAction,clearFrom?:EmailValue,background=false):Promise<MailResult|null>=>{
    if(background&&(flight.current||sending.current||paymentFlow.current||uploading.current))return null
    while(flight.current)await flight.current
    let release!:()=>void
    flight.current=new Promise<void>(resolve=>{release=resolve})
    if(!background){setBusy(true);setError('')}
    try{
      const response=await fetch(new URL('/inbox/workspace/api/email',window.location.origin),{method:action?'POST':'GET',headers:action?{'Content-Type':'application/json'}:undefined,body:action?JSON.stringify(action):undefined,cache:'no-store',signal:AbortSignal.timeout(65000)})
      const result:MailResult=await response.json()
      if(!response.ok){
        if(action?.type==='payment'&&response.status===409)delete requestIds.current[`payment:${action.familyId}:${action.puppyId}:${action.kind}`]
        if(result.conflict)setEntries(previous=>{const entry=previous[result.conflict!.familyId];return entry?{...previous,[result.conflict!.familyId]:{...entry,conflict:result.conflict}}:previous})
        throw new Error(result.error||'The email action could not be confirmed. Your entries are kept.')
      }
      if(background)setError('')
      merge(result,action,clearFrom);return result
    }catch(cause){setError(cause instanceof Error&&!['TimeoutError','TypeError','SyntaxError'].includes(cause.name)?cause.message:'The email connection is unavailable or timed out. Your entries are kept. Reconnect and retry to confirm the saved result.');return null}
    finally{flight.current=null;release();if(!background)setBusy(false)}
  },[merge])
  useEffect(()=>{if(ready)void request()},[ready,request])
  useEffect(()=>{
    if(!ready||busy||sendingFamily||fileBusy||paymentBusy)return
    const item=Object.entries(entries).find(([id,entry])=>!entry.conflict&&!sameEmail(entry.value,entry.base)&&autoAttempt.current[id]!==JSON.stringify([entry.revision,entry.value]))
    if(!item)return
    const [familyId,entry]=item,timer=setTimeout(()=>{autoAttempt.current[familyId]=JSON.stringify([entry.revision,entry.value]);void request({type:'save',familyId,revision:entry.revision,value:entry.value})},900)
    return()=>clearTimeout(timer)
  },[ready,busy,sendingFamily,fileBusy,paymentBusy,entries,request])
  function edit(familyId:string,patch:Partial<EmailValue>){
    if(noticeFamily===familyId)setSendNotice('')
    if('replyToId' in patch||'subject' in patch)explicitThread.current[familyId]=true
    const parent=data?.messages.filter(m=>m.familyId===familyId&&m.direction==='in'&&m.messageId).sort((a,b)=>Date.parse(b.time)-Date.parse(a.time))[0]
    setEntries(previous=>{
      const entry=previous[familyId];if(!entry)return previous
      const thread=patch.body&&!entry.value.body&&!explicitThread.current[familyId]&&parent?{replyToId:parent.id,subject:/^re:/i.test(parent.subject)?parent.subject:`Re: ${parent.subject}`}:{}
      return {...previous,[familyId]:{...entry,value:{...entry.value,...thread,...patch}}}
    })
  }
  async function save(familyId:string){
    const entry=entries[familyId];if(!entry||entry.conflict)return
    const result=await request({type:'save',familyId,revision:entry.revision,value:entry.value})
    if(result){const saved=result.drafts.find(d=>d.familyId===familyId);if(saved)setEntries(previous=>{
      const latest=previous[familyId];if(!latest)return previous
      return {...previous,[familyId]:{value:latest.value,base:saved.value,revision:saved.revision}}
    })}
  }
  function resolve(familyId:string,useSaved:boolean){setEntries(previous=>{
    const entry=previous[familyId];const saved=entry?.conflict;if(!saved)return previous
    return {...previous,[familyId]:{value:useSaved?saved.value:entry.value,base:saved.value,revision:saved.revision}}
  });setError('')}
  function startReply(familyId:string,messageId:string){
    const parent=data?.messages.find(m=>m.id===messageId&&m.familyId===familyId&&m.direction==='in'&&m.messageId)
    if(parent)edit(familyId,{replyToId:parent.id,subject:/^re:/i.test(parent.subject)?parent.subject:`Re: ${parent.subject}`})
  }
  async function send(familyId:string){
    const entry=entries[familyId];if(!entry||entry.conflict||sending.current)return
    sending.current=true;setNoticeFamily(familyId);setSendingFamily(familyId);setSendNotice('Saving and sending…')
    const key=`send:${familyId}:${entry.revision}:${JSON.stringify(entry.value)}`
    requestIds.current[key]||=crypto.randomUUID()
    try{
      const result=await sendEmailDraft(familyId,{familyId,revision:entry.revision,value:{...entry.value}},requestIds.current[key],request)
      setSendNotice(result?.state==='accepted'?`Sent · accepted by ${data?.capabilities?.provider==='fictional'?'fictional provider':'Pair'}; delivery unconfirmed.${result.cleared?'':' Your draft is kept.'}`:result?.state==='failed'?'Email was not accepted. Your draft is kept.':result?'Sending outcome needs review. Your draft is kept; do not resend.':'Send could not be confirmed. Your draft is kept; refresh the conversation before retrying.')
    }finally{sending.current=false;setSendingFamily('')}
  }
  async function review(familyId:string){
    const entry=entries[familyId];if(!entry?.revision||entry.conflict||!sameEmail(entry.value,entry.base))return
    const key=`review:${familyId}:${entry.revision}`
    requestIds.current[key]||=crypto.randomUUID()
    await request({type:'review',familyId,revision:entry.revision,requestId:requestIds.current[key]})
  }
  async function createPaymentLink(familyId:string,puppyId:string,kind:'deposit'|'balance'){
    if(paymentFlow.current)return
    paymentFlow.current=true;setPaymentBusy(true)
    const key=`link:${familyId}:${puppyId}:${kind}`;requestIds.current[key]||=crypto.randomUUID()
    try{
      const existing=data?.paymentRequests.find(p=>p.familyId===familyId&&p.puppyId===puppyId&&p.kind===kind&&!p.webhookVerifiedAt&&!p.checkoutOutcome&&Date.parse(p.expiresAt)>Date.now())
      const preparedId=existing?._id||(await request({type:'payment',familyId,puppyId,kind,requestId:requestIds.current[key]}))?.preparedPaymentId
      if(preparedId){const result=await request({type:'checkout',familyId,paymentRequestId:preparedId});if(result){delete requestIds.current[key];return result.paymentRequests.find(p=>p._id===preparedId)}}
    }finally{paymentFlow.current=false;setPaymentBusy(false)}
  }
  async function payment(familyId:string,puppyId:string,kind:'deposit'|'balance'){
    const key=`payment:${familyId}:${puppyId}:${kind}`
    requestIds.current[key]||=crypto.randomUUID()
    const result=await request({type:'payment',familyId,puppyId,kind,requestId:requestIds.current[key]})
    if(result?.preparedPaymentId){edit(familyId,{paymentRequestId:result.preparedPaymentId});delete requestIds.current[key]}
  }
  async function saveEdited(familyId:string,patch:Partial<EmailValue>){
    const entry=entriesLatest.current[familyId];if(!entry||entry.conflict)return null
    const value={...entry.value,...patch};edit(familyId,patch)
    return await request({type:'save',familyId,revision:entry.revision,value},value)
  }
  async function attachExisting(familyId:string,file:EmailAttachment){
    const entry=entriesLatest.current[familyId];if(!entry||file.familyId!==familyId)return
    const ids=[...new Set([...(entry.value.attachmentIds||[]),file.id])]
    const selected=ids.map(id=>id===file.id?file:data?.attachmentLibrary?.find(a=>a.id===id))
    if(ids.length>attachmentLimits.count||selected.reduce((sum,item)=>sum+(item?.size||0),0)>attachmentLimits.totalBytes){setError('Use up to five attachments, 7.5 MB combined.');return}
    await saveEdited(familyId,{attachmentIds:ids})
  }
  async function uploadFiles(familyId:string,files:File[]){
    if(uploading.current||!files.length)return
    const entry=entriesLatest.current[familyId],current=entry?.value.attachmentIds||[]
    if(!entry||entry.conflict)return
    const total=(data?.attachmentLibrary||[]).filter(f=>current.includes(f.id)).reduce((n,f)=>n+f.size,0)+files.reduce((n,f)=>n+f.size,0)
    if(current.length+files.length>attachmentLimits.count||total>attachmentLimits.totalBytes||files.some(f=>f.size>attachmentLimits.fileBytes)){setError('Use up to five JPG, PNG, WebP, PDF or TXT files, 2.5 MB each and 7.5 MB combined.');return}
    uploading.current=true;setFileBusy(true);setError('')
    try{for(const file of files){
      const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let start=0;start<bytes.length;start+=8192)binary+=String.fromCharCode(...bytes.subarray(start,start+8192))
      const key=JSON.stringify([familyId,file.name,file.size,file.lastModified]);uploadIds.current[key]||=crypto.randomUUID()
      const type=file.type||(/\.pdf$/i.test(file.name)?'application/pdf':/\.txt$/i.test(file.name)?'text/plain':'')
      const response=await fetch('/inbox/workspace/api/files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({familyId,uploadId:uploadIds.current[key],filename:file.name,contentType:type,contentBase64:btoa(binary)}),signal:AbortSignal.timeout(60000)}),result=await response.json()
      if(!response.ok)throw new Error(result.error||'File upload could not be confirmed. Your draft is kept.')
      const attachment=result.attachment as EmailAttachment
      setData(previous=>previous?{...previous,attachmentLibrary:[attachment,...(previous.attachmentLibrary||[]).filter(f=>f.id!==attachment.id)]}:previous)
      const latest=entriesLatest.current[familyId]
      if(latest){const ids=[...new Set([...(latest.value.attachmentIds||[]),attachment.id])];const saved=await saveEdited(familyId,{attachmentIds:ids});if(!saved)throw new Error('The file is stored privately, but the draft could not be saved. Your edits are kept; select the file from Saved family files if needed.')}
    }}catch(cause){await request();setError(cause instanceof Error?cause.message:'The upload could not be confirmed. Your draft is kept.')}
    finally{uploading.current=false;setFileBusy(false)}
  }
  return {entriesLatest,fileBusy,uploadFiles,attachExisting,saveEdited,saveConfirmationMessage:(familyId:string,message:string,base:string)=>request({type:'confirmation-message',familyId,message,base}),checkout:(familyId:string,paymentRequestId:string)=>request({type:'checkout',familyId,paymentRequestId}),verifyPayment:(familyId:string,paymentRequestId:string)=>request({type:'verify',familyId,paymentRequestId}),data,entries,error,paymentBusy,createPaymentLink,busy:busy||!!sendingFamily||paymentBusy||fileBusy,sendingFamily,sendNotice,noticeFamily,send,refresh:useCallback((familyId:string)=>request({type:'refresh',familyId},undefined,true),[request]),load:()=>request(),edit,save,resolve,startReply,review,payment,dispatch:(reviewId:string,scenario?:'accepted'|'rejected'|'uncertain')=>{return request({type:'dispatch',reviewId,...(scenario?{scenario}:{}),...(data?.live||data?.paymentTesting?{confirmed:true}:{})})},sync:(familyId?:string)=>request({type:'sync',...(familyId?{familyId}:{})}),reconcile:()=>request({type:'reconcile'}),resolveAttempt:(outgoingId:string,attemptKey:string,decision:'accepted'|'not-accepted',evidence:string)=>request({type:'resolve',outgoingId,attemptKey,decision,evidence,acknowledged:true}),dirty:Object.values(entries).some(e=>!sameEmail(e.value,e.base)),empty:emptyEmail()}
}
export type EmailWorkspace=ReturnType<typeof useEmailWorkspace>
