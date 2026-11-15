'use client'
import {useEffect,useRef,useState} from 'react'
import type {FamilyReview} from '@/sanity/lib/family-lifecycle'
export default function FamilyActions({familyId,archived,busy,preserve,onChanged}:{familyId:string;archived:boolean;busy:boolean;preserve:()=>Promise<boolean>;onChanged:(action:string)=>Promise<void>}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement|null>(null)
 const [review,setReview]=useState<FamilyReview|null>(null),[mode,setMode]=useState(''),[name,setName]=useState(''),[error,setError]=useState(''),[working,setWorking]=useState(false)
 useEffect(()=>{if(mode)dialog.current?.showModal();else dialog.current?.close()},[mode])
 function close(){setMode('');setError('');trigger.current?.focus()}
 async function load(){const response=await fetch(`/inbox/workspace/api/family?family=${encodeURIComponent(familyId)}`,{cache:'no-store'}),data=await response.json();if(!response.ok)throw new Error(data.error);setReview(data.review);return data.review as FamilyReview}
 async function open(action:string,button:HTMLButtonElement){
  trigger.current=button;setWorking(true);setError('')
  try{if(!await preserve())throw new Error('Your unfinished message or note could not be saved. It is kept here. Resolve the save error before continuing.');await load();setName('');setMode(action)}catch(e){setError(e instanceof Error?e.message:'The family could not be reviewed. Retry.')}finally{setWorking(false)}
 }
 async function act(action:string){
  if(!review)return
  setWorking(true);setError('')
  try{
   const response=await fetch('/inbox/workspace/api/family',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,familyId,token:review.token,name})}),data=await response.json()
   if(!response.ok){await load();throw new Error(data.error)}
   if(action==='mark-test'){await load();setName('');return}
   close();await onChanged(action)
  }catch(e){setError(e instanceof Error?e.message:'The action could not be confirmed. Refresh and review before retrying.')}finally{setWorking(false)}
 }
 return <div className="ops-family-actions"><details><summary>Details menu</summary><button className="ops-button secondary" disabled={busy||working} onClick={e=>void open(archived?'restore':'archive',e.currentTarget)}>{archived?'Restore family':'Archive family'}</button><details><summary>More family actions</summary><button className="ops-button secondary" disabled={busy||working} onClick={e=>void open('delete',e.currentTarget)}>Delete family…</button></details></details>
 {!mode&&error?<p role="alert">{error}</p>:null}
 <dialog className="ops-family-dialog" ref={dialog} aria-labelledby="family-action-title" onCancel={e=>{e.preventDefault();if(!working)close()}} onClose={()=>{if(mode)setMode('')}}>
 <h2 id="family-action-title">{mode==='delete'?'Delete family':mode==='restore'?'Restore family':'Archive family'}</h2><p><strong>{review?.name}</strong></p>
 {mode==='delete'?<><p>Permanent deletion cannot be undone. This would remove:</p>{review?.test?<p>Marked as a test family. Protected history still cannot be deleted.</p>:review?.duplicate?<p>This contact matches another saved family. Only the selected family and its own eligible records would be removed.</p>:null}<ul>{review?.removals.map(item=><li key={item}>{item}</li>)}</ul><p>Original inquiries stay in the original Inbox. They will not recreate this family automatically.</p>{review?.blocked.length?<><h3>Deletion is blocked</h3>{review.blocked.map(item=><p key={item}>{item}</p>)}<button className="ops-button secondary" disabled={working} onClick={()=>{setMode('archive');setName('');setError('')}}>Archive instead</button>{!review.test?<details><summary>This is a fictional test family</summary><p>Mark only a record you know is fictional. This never overrides payment, agreement, reservation or shared-record protection.</p><label>Type {review.name} to mark it as a test<input value={name} onChange={e=>setName(e.target.value)} autoComplete="off"/></label><button className="ops-button secondary" disabled={working||name!==review.name} onClick={()=>void act('mark-test')}>Mark as test family</button></details>:null}</>:<><label>Type {review?.name} to confirm deletion<input value={name} onChange={e=>setName(e.target.value)} autoComplete="off"/></label><button className="ops-button" disabled={working||name!==review?.name} onClick={()=>void act('delete')}>{working?'Deleting…':'Permanently delete this family'}</button></>}</>:<><p>{mode==='restore'?'Return this family to the active list. Its saved history and drafts stay unchanged.':'Remove this family from the active list. Messages, notes, files, drafts, payments and all commitments stay unchanged. Find it in Archived and restore it at any time. A genuinely new incoming email or text will also restore it.'}</p>{mode==='archive'?review?.warnings.map(item=><p className="ops-notice" key={item}>{item}</p>):null}<button className="ops-button" disabled={working} onClick={()=>void act(mode)}>{working?'Saving…':mode==='restore'?'Restore family':'Confirm archive'}</button></>}
 {error?<p role="alert">{error}</p>:null}<button className="ops-button secondary" disabled={working} onClick={close}>Cancel</button>
 </dialog></div>
}
