'use client'

import {useCallback,useEffect,useRef,useState} from 'react'
import {emptyEmail,mailMessages,sameEmail,type EmailDraft,type EmailValue,type MailAction,type MailData,type MailResult} from './email-model'

type Entry={value:EmailValue;base:EmailValue;revision:string|null;conflict?:EmailDraft}
export function useEmailWorkspace(ready:boolean){
  const [data,setData]=useState<MailData|null>(null)
  const [entries,setEntries]=useState<Record<string,Entry>>({})
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const lock=useRef(false)
  const requestIds=useRef<Record<string,string>>({})
  const merge=useCallback((result:MailData)=>{
    setData(result)
    setEntries(previous=>{
      const next={...previous}
      for(const draft of result.drafts){
        const local=previous[draft.familyId]
        if(!local||sameEmail(local.value,local.base)||sameEmail(local.value,draft.value))next[draft.familyId]={value:draft.value,base:draft.value,revision:draft.revision}
        else if(sameEmail(local.base,draft.value))next[draft.familyId]={...local,revision:draft.revision}
        else next[draft.familyId]={...local,conflict:draft}
      }
      return next
    })
  },[])
  const request=useCallback(async(action?:MailAction):Promise<MailResult|null>=>{
    if(lock.current)return null
    lock.current=true;setBusy(true);setError('')
    try{
      const response=await fetch(new URL('/inbox/workspace/api/email',window.location.origin),{method:action?'POST':'GET',headers:action?{'Content-Type':'application/json'}:undefined,body:action?JSON.stringify(action):undefined,cache:'no-store',signal:AbortSignal.timeout(15000)})
      const result:MailResult=await response.json()
      if(!response.ok){
        if(action?.type==='payment'&&response.status===409)delete requestIds.current[`payment:${action.familyId}:${action.puppyId}:${action.kind}`]
        if(result.conflict)setEntries(previous=>{const entry=previous[result.conflict!.familyId];return entry?{...previous,[result.conflict!.familyId]:{...entry,conflict:result.conflict}}:previous})
        throw new Error(result.error||'The email action could not be confirmed. Your entries are kept.')
      }
      merge(result);return result
    }catch(cause){setError(cause instanceof Error&&!['TimeoutError','TypeError','SyntaxError'].includes(cause.name)?cause.message:'The email connection is unavailable or timed out. Your entries are kept. Reconnect and retry to confirm the saved result.');return null}
    finally{lock.current=false;setBusy(false)}
  },[merge])
  useEffect(()=>{if(ready)void request()},[ready,request])
  function edit(familyId:string,patch:Partial<EmailValue>){
    setEntries(previous=>{const entry=previous[familyId];return entry?{...previous,[familyId]:{...entry,value:{...entry.value,...patch}}}:previous})
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
    const parent=mailMessages.find(m=>m.id===messageId&&m.familyId===familyId&&m.direction==='in')
    if(parent)edit(familyId,{replyToId:parent.id,subject:/^re:/i.test(parent.subject)?parent.subject:`Re: ${parent.subject}`})
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
  return {data,entries,error,busy,load:()=>request(),edit,save,resolve,startReply,review,payment,dirty:Object.values(entries).some(e=>!sameEmail(e.value,e.base)),empty:emptyEmail()}
}
export type EmailWorkspace=ReturnType<typeof useEmailWorkspace>
