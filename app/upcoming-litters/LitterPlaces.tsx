'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {pickLabels,litterDepositTerms} from '@/lib/litter-reservations'
export default function LitterPlaces({litterId,title}:{litterId:string;title:string}){
 const [places,setPlaces]=useState<{position:number;status:string}[]|null>(null),[error,setError]=useState('')
 useEffect(()=>{let stopped=false;const controller=new AbortController();async function update(){try{const r=await fetch('/api/litter-places?litter='+encodeURIComponent(litterId),{cache:'no-store',signal:controller.signal});const data=await r.json();if(!r.ok)throw new Error(data.error);if(!stopped){setPlaces(data.places);setError('')}}catch{if(!stopped)setError('Please ask Jeanne to confirm current positions.')}}void update();const timer=setInterval(update,15000);return()=>{stopped=true;controller.abort();clearInterval(timer)}},[litterId])
 const full=places?.every(p=>p.status!=='Available')
 return <section className="litter-places" aria-label={`Reservation positions for ${title}`}><h3>Reserve your place in this litter</h3><ol>{pickLabels.map((label,index)=><li key={label}><strong>{label}</strong><span>{places?.[index]?.status||(error?'Please ask Jeanne':'Checking…')}</span></li>)}</ol>{error?<p role="status">{error}</p>:null}<p>A free inquiry or interest-list entry does not secure a selection position. Jeanne approves your reservation before requesting its deposit. A verified deposit secures your selection position, not a particular puppy.</p><p>Four is the reservation limit, not a guaranteed litter size. Litter size, sex, and color are not guaranteed.</p><p>{litterDepositTerms}</p><Link className="brand-button" href={'/puppy-inquiry?interest=waitlist&litterId='+encodeURIComponent(litterId)}>{full?'Ask about the waiting list':'Ask Jeanne about reserving a place'} <span aria-hidden="true">→</span></Link></section>
}
