'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {pickLabels} from '@/lib/litter-reservations'
import {formatCurrency} from '@/lib/inventory'
import {validPlaces,type Place} from '@/lib/public-availability'
export default function LitterPlaces({litterId,title,depositCents,showGuidance=false,initialPlaces}:{litterId:string;title:string;depositCents:number|null;showGuidance?:boolean;initialPlaces?:Place[]|null}){
 const [places,setPlaces]=useState<Place[]|null>(validPlaces(initialPlaces)?initialPlaces:null),[error,setError]=useState('')
 useEffect(()=>{let stopped=false,loading=false;const controller=new AbortController();async function update(){if(loading)return;loading=true;try{const r=await fetch('/api/litter-places?litter='+encodeURIComponent(litterId),{cache:'no-store',signal:controller.signal});const data=await r.json();if(!r.ok||!validPlaces(data.places))throw Error();if(!stopped){setPlaces(data.places);setError('')}}catch{if(!stopped){setPlaces(null);setError('Please ask Jeanne to confirm current positions.')}}finally{loading=false}}void update();const timer=setInterval(update,15000);return()=>{stopped=true;controller.abort();clearInterval(timer)}},[litterId])
 const available=!!places?.some(p=>p.status==='Available'),full=!!places&&!available
 return <section className="litter-places" aria-label={`Reservation positions for ${title}`}>
  <h3>{available?'Reserve your place in this litter':full?'Looking ahead to a future litter':'Ask about this litter'}</h3>
  {full?<p>The four selection positions below are currently occupied. Ask Jeanne about the waiting list or a future litter.</p>:available?<p>After you’ve talked with Jeanne, {depositCents!==null?`a ${formatCurrency(depositCents/100,depositCents%100!==0)} deposit`:'a deposit confirmed by Jeanne'} saves your place in the picking order and goes toward your puppy’s price. The four spots below show what’s available—first pick chooses first, followed by second, third, and fourth.</p>:<p>Please confirm the latest selection positions with Jeanne before making plans.</p>}
  <ol>{pickLabels.map((label,index)=><li key={label}><strong>{label}</strong><span>{places?.find(p=>p.position===index+1)?.status||(error?'Please ask Jeanne':'Checking…')}</span></li>)}</ol>
  {error?<p role="status">{error}</p>:null}
  {showGuidance?<><p>If the right puppy isn’t available, your deposit can follow you to a future litter. Jeanne will help you arrange the move and confirm your place in that litter’s picking order.</p><p>Every litter is different. We can’t promise a particular sex, color, or four puppies, but Jeanne will keep you updated along the way.</p></>:null}
  <Link className="brand-button" href={'/puppy-inquiry?interest=waitlist&litterId='+encodeURIComponent(litterId)}>{full?'Ask about the waiting list':available?'Ask Jeanne about this litter':'Ask Jeanne to confirm availability'} <span aria-hidden="true">→</span></Link>
 </section>
}
