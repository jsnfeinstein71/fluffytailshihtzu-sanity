'use client'

import {useCallback,useEffect,useRef,useState} from 'react'
import {draftKey,type Channel} from './model'
import type {SavedFamily,WorkspaceMutation,WorkspaceResult} from './persistence'

type Conflict = {familyId:string;channel:Channel;saved:string}
const endpoint='/inbox/workspace/api/state'
class WorkspaceResponseError extends Error {}
const requestUrl=()=>new URL(endpoint,window.location.origin).href
export function useSavedWorkspace() {
  const [records,setRecords]=useState<SavedFamily[]|null>(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [conflicts,setConflicts]=useState<Record<string,Conflict>>({})
  const bases=useRef<Record<string,string>>({})
  const inFlight=useRef(false)

  const accept=useCallback((data:WorkspaceResult,action?:WorkspaceMutation)=>{
    const changed:Record<string,Conflict>={}
    for(const family of data.families)for(const channel of ['Email','Text'] as const){
      const key=draftKey(family.familyKey,channel)
      const saved=family.drafts[channel]
      if(!(key in bases.current))bases.current[key]=saved
      if(action?.type==='draft'&&action.familyId===family.familyKey&&action.channel===channel)bases.current[key]=action.body
      else if(bases.current[key]!==saved)changed[key]={familyId:family.familyKey,channel,saved}
    }
    setConflicts(previous=>{
      const next={...previous,...changed}
      if(action?.type==='draft')delete next[draftKey(action.familyId,action.channel)]
      return next
    })
    setRecords(data.families)
  },[])

  const load=useCallback(async(signal?:AbortSignal)=>{
    setLoading(true);setError('')
    try{
      const response=await fetch(requestUrl(),{cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)})
      const data=await response.json() as WorkspaceResult
      if(!response.ok)throw new WorkspaceResponseError(data.error||'The saved workspace could not be loaded.')
      if(!Array.isArray(data.families))throw new WorkspaceResponseError('The saved workspace returned an unexpected response.')
      accept(data)
    }catch(error){if(!signal?.aborted)setError(error instanceof WorkspaceResponseError?error.message:'The saved workspace could not be reached. Your unsaved entries are kept. Retry the connection.')}
    finally{if(!signal?.aborted)setLoading(false)}
  },[accept])
  useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort()},[load])

  async function mutate(action:WorkspaceMutation) {
    if(inFlight.current)return false
    inFlight.current=true;setBusy(true);setError('')
    try{
      const response=await fetch(requestUrl(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action),signal:AbortSignal.timeout(15000)})
      const data=await response.json() as WorkspaceResult
      if(!response.ok){
        if(data.conflict){setConflicts(previous=>({...previous,[draftKey(data.conflict!.familyId,data.conflict!.channel)]:data.conflict!}));return false}
        throw new WorkspaceResponseError(data.error||'The save could not be confirmed. Your entries are kept; review before retrying.')
      }
      if(!Array.isArray(data.families))throw new WorkspaceResponseError('The save could not be confirmed. Your entries are kept; review before retrying.')
      accept(data,action)
      return true
    }catch(error){setError(error instanceof WorkspaceResponseError?error.message:'The save could not be confirmed. Your entries are kept; reconnect and review before retrying.');return false}
    finally{inFlight.current=false;setBusy(false)}
  }
  function resolve(familyId:string,channel:Channel) {
    const key=draftKey(familyId,channel)
    const conflict=conflicts[key]
    if(!conflict)return undefined
    bases.current[key]=conflict.saved
    setConflicts(previous=>{const next={...previous};delete next[key];return next})
    setError('')
    return conflict.saved
  }
  return {records,loading,busy,error,conflicts,load,mutate,resolve,base:(familyId:string,channel:Channel)=>bases.current[draftKey(familyId,channel)]||'',ready:!!records?.length}
}
