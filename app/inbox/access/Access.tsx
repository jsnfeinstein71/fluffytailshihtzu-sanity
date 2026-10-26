'use client'
import {useEffect,useState} from 'react'
export default function Access(){
 const [token,setToken]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 useEffect(()=>{const value=window.location.hash.slice(1);if(value)setToken(value);window.history.replaceState(null,'','/inbox/access')},[])
 async function open(){setBusy(true);setError('');try{const response=await fetch('/inbox/access/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw new Error(data.error);window.location.replace('/inbox/workspace')}catch(error){setError(error instanceof Error?error.message:'Access could not be confirmed.');setBusy(false)}}
 return <><button className="ops-button" disabled={busy||!token} onClick={()=>void open()}>{busy?'Opening…':'Open staff workspace'}</button>{error?<p role="alert">{error}</p>:null}{!token?<p>A fresh private owner link is needed to open this Preview.</p>:null}</>
}
