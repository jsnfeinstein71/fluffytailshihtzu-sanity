'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {emptyEmail,sameEmail,type EmailDraft,type EmailValue,type MailAction,type MailData,type MailResult,type TransportAction} from './email-model'
import {sendEmailDraft} from './send-draft'
type Entry={value:EmailValue;base:EmailValue;revision:string|null;conflict?:EmailDraft}
export function useEmailWorkspace(ready:boolean){
  const [data,setData]=useState<MailData|null>(null)
  const [entries,setEntries]=useState<Record<string,Entry>>({})
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const flight=useRef<Promise<unknown>|null>(null)
  const sending=useRef(false)
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
    if(background&&(flight.current||sending.current))return null
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
  async function payment(familyId:string,puppyId:string,kind:'deposit'|'balance'){
    const key=`payment:${familyId}:${puppyId}:${kind}`
    requestIds.current[key]||=crypto.randomUUID()
    const result=await request({type:'payment',familyId,puppyId,kind,requestId:requestIds.current[key]})
    if(result?.preparedPaymentId){edit(familyId,{paymentRequestId:result.preparedPaymentId});delete requestIds.current[key]}
  }
  return {checkout:(familyId:string,paymentRequestId:string)=>request({type:'checkout',familyId,paymentRequestId}),verifyPayment:(familyId:string,paymentRequestId:string)=>request({type:'verify',familyId,paymentRequestId}),data,entries,error,busy:busy||!!sendingFamily,sendingFamily,sendNotice,noticeFamily,send,refresh:useCallback((familyId:string)=>request({type:'refresh',familyId},undefined,true),[request]),load:()=>request(),edit,save,resolve,startReply,review,payment,dispatch:(reviewId:string,scenario?:'accepted'|'rejected'|'uncertain')=>{return request({type:'dispatch',reviewId,...(scenario?{scenario}:{}),...(data?.live?{confirmed:true}:{})})},sync:(familyId?:string)=>request({type:'sync',...(familyId?{familyId}:{})}),reconcile:()=>request({type:'reconcile'}),resolveAttempt:(outgoingId:string,attemptKey:string,decision:'accepted'|'not-accepted',evidence:string)=>request({type:'resolve',outgoingId,attemptKey,decision,evidence,acknowledged:true}),dirty:Object.values(entries).some(e=>!sameEmail(e.value,e.base)),empty:emptyEmail()}
}
export type EmailWorkspace=ReturnType<typeof useEmailWorkspace>
