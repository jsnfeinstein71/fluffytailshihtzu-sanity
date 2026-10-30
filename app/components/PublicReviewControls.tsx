'use client'
import {useEffect,useState,useTransition} from 'react'
import {usePathname,useRouter} from 'next/navigation'
import Link from 'next/link'
import {isReviewScenario,reviewLabels,reviewScenarios,type ReviewScenario} from '@/lib/public-review'

export default function PublicReviewControls({appliedScenario}:{appliedScenario:ReviewScenario}){
 const router=useRouter(),path=usePathname()||'/'
 const [displayedScenario,setDisplayedScenario]=useState(appliedScenario)
 const [selected,setSelected]=useState(appliedScenario),[phase,setPhase]=useState<'idle'|'saving'|'rendering'>('idle'),[error,setError]=useState(''),[retry,setRetry]=useState<ReviewScenario>(appliedScenario),[pending,startTransition]=useTransition()
 const busy=phase!=='idle'
 useEffect(()=>{setDisplayedScenario(appliedScenario)},[appliedScenario])
 // A client navigation can reuse the root layout. Use the committed page's
 // scenario as well as the server bar prop so its label follows the actual cards.
 useEffect(()=>{function rendered(event:Event){const scenario=(event as CustomEvent<unknown>).detail;if(isReviewScenario(scenario))setDisplayedScenario(scenario)}window.addEventListener('fluffytail-review-rendered',rendered);return()=>window.removeEventListener('fluffytail-review-rendered',rendered)},[])
 useEffect(()=>{if(!busy)setSelected(displayedScenario);if(phase==='rendering'&&displayedScenario===selected&&!pending){setPhase('idle');window.dispatchEvent(new Event('fluffytail-review-applied'))}},[displayedScenario,selected,phase,pending,busy])
 useEffect(()=>{if(!busy)return;const timer=setTimeout(()=>{setError('The page did not finish updating. Please retry the scenario.');setSelected(displayedScenario);setPhase('idle');window.dispatchEvent(new Event('fluffytail-review-applied'))},20000);return()=>clearTimeout(timer)},[busy,displayedScenario])
 async function apply(scenario:ReviewScenario){
  if(busy)return
  setSelected(scenario);setRetry(scenario);setPhase('saving');setError('');window.dispatchEvent(new Event('fluffytail-review-changing'))
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000)
  try{
   const response=await fetch('/review/availability',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario}),signal:controller.signal})
   const data=await response.json();if(!response.ok||data.scenario!==scenario)throw Error()
   setPhase('rendering');startTransition(()=>{if(path.startsWith('/puppies/')||path==='/puppy-inquiry')router.replace('/available-puppies',{scroll:false});else router.refresh()})
  }catch{setError('The scenario could not be applied. Your displayed scenario is unchanged.');setSelected(displayedScenario);setPhase('idle');window.dispatchEvent(new Event('fluffytail-review-applied'))}
  finally{clearTimeout(timeout)}
 }
 const educational=['/the-breed','/puppy-resources','/pricing','/contact'].includes(path)
 return <>
  <p role="status" aria-live="polite" aria-atomic="true">{busy?`Applying: ${reviewLabels[selected]}…`:`Active scenario: ${reviewLabels[displayedScenario]}`}</p>
  <p>{displayedScenario==='live'?'Published public inventory, read-only.':'Fictional records only — no real records changed.'}</p>
  <div className="public-review-selector"><label htmlFor="review-scenario">Availability scenario </label><select id="review-scenario" value={selected} disabled={busy} aria-describedby="review-scope" onChange={e=>void apply(e.target.value as ReviewScenario)}>{reviewScenarios.map(s=><option key={s} value={s}>{reviewLabels[s]}</option>)}</select></div>
  {error?<p role="alert">{error} <button className="text-link" type="button" disabled={busy} onClick={()=>void apply(retry)}>Retry scenario</button></p>:null}
  <p id="review-scope">{educational?'The educational text stays the same. Scenarios affect its inventory illustration or pricing; use the pages below to inspect availability.':path.startsWith('/puppies/')||path==='/puppy-inquiry'?'Switching scenarios returns to the puppy list so a real puppy or litter is never given a fictional identity.':'Selection applies immediately to this page. Invitations, puppy labels and litter positions refresh together; automatic refresh keeps this scenario.'}</p>
  <nav aria-label="Scenario review pages"><Link href="/">Homepage</Link><Link href="/available-puppies">Puppy list</Link><Link href="/upcoming-litters">Upcoming litters</Link></nav>
 </>
}
