'use client'
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {availabilityCopy,unknownAvailability,validAvailability,type Availability} from '@/lib/public-availability'
const Context=createContext<Availability>(unknownAvailability)
export function AvailabilityScope({initial,children}:{initial:Availability;children:ReactNode}){
 const [failed,setFailed]=useState(false)
 const previous=useRef(initial),router=useRouter()
 useEffect(()=>{previous.current=initial;setFailed(false)},[initial])
 useEffect(()=>{
  let stopped=false,busy=false,paused=false,controller:AbortController|undefined
  function pause(){paused=true;controller?.abort();setFailed(false)}
  function resume(){paused=false}
  async function update(){if(busy||paused)return;busy=true;controller=new AbortController();try{const query=initial.reviewScenario?'?reviewScenario='+initial.reviewScenario:'';const r=await fetch('/api/availability'+query,{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error();const data=await r.json();if(!validAvailability(data.availability))throw Error();if(!stopped&&!paused&&data.availability.reviewScenario===initial.reviewScenario&&JSON.stringify(previous.current)!==JSON.stringify(data.availability)){previous.current=data.availability;router.refresh()}}catch{if(!stopped&&!paused&&!controller.signal.aborted)setFailed(true)}finally{busy=false}}
  window.addEventListener('fluffytail-review-changing',pause);window.addEventListener('fluffytail-review-applied',resume)
  const timer=setInterval(update,30000);return()=>{stopped=true;controller?.abort();clearInterval(timer);window.removeEventListener('fluffytail-review-changing',pause);window.removeEventListener('fluffytail-review-applied',resume)}
 },[router,initial.reviewScenario])
 // The server payload commits invitation context and card props together. A poll
 // never separately paints a newer invitation above older puppy/position labels.
 return <Context.Provider value={failed?unknownAvailability:initial}>{children}</Context.Provider>
}
export function AvailabilityActions({hero=false}:{hero?:boolean}){const a=availabilityCopy(useContext(Context));return <><Link className="brand-button" href={a.href}>{a.label} <span aria-hidden="true">→</span></Link>{a.href!=='/contact'?<Link className={hero?'hero-secondary':'text-link'} href="/contact">Ask Jeanne</Link>:null}</>}
export function AvailabilityInvitation(){const a=availabilityCopy(useContext(Context));return <><div><p className="eyebrow">Your next little companion</p><h2>{a.title}</h2><p>{a.body}</p></div><div className="ctaRow"><AvailabilityActions/></div></>}
export function AvailabilityNotice(){const a=availabilityCopy(useContext(Context));return <div className="section"><p className="lead">{a.brief}</p><div className="ctaRow"><AvailabilityActions/></div></div>}
export function UpcomingInvitation(){const a=useContext(Context);return <>{a.kind==='full'?<p>The selection positions in {a.upcomingLitters===1?'my upcoming litter':'my upcoming litters'} are occupied. Tell me about your timing and what you hope to find in a future litter.</p>:a.kind==='unknown'?<p>I cannot confirm the latest selection positions here right now. Please ask me before making plans.</p>:a.kind==='unannounced'?<p>No upcoming litter is announced here just yet. Tell me what you have in mind, and we can talk about plans and timing.</p>:<><p className="lead">Hoping for a puppy from an upcoming litter?</p><p>You don’t have to wait until the puppies arrive to talk with Jeanne. Tell her what you’re hoping for, and she’ll help you decide whether an upcoming litter could be a good fit.</p></>}</>}
