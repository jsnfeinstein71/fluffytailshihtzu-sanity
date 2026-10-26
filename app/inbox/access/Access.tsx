'use client'
import {useEffect,useState} from 'react'
export default function Access(){
 const [token,setToken]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[username,setUsername]=useState(''),[password,setPassword]=useState('')
 useEffect(()=>{const value=window.location.hash.slice(1);if(value)setToken(value);window.history.replaceState(null,'','/inbox/access')},[])
 async function open(){setBusy(true);setError('');try{const response=await fetch('/inbox/access/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(token?{token}:{username,password}),signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw new Error(data.error);window.location.replace('/inbox/workspace')}catch(error){setError(error instanceof Error?error.message:'Access could not be confirmed.');setBusy(false)}}
 return <><form className="ops-email-compose" onSubmit={event=>{event.preventDefault();void open()}}>{!token?<><label htmlFor="staff-user">Username</label><input id="staff-user" autoComplete="username" value={username} onChange={event=>setUsername(event.target.value)} required/><label htmlFor="staff-password">Password</label><input id="staff-password" type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} required/></>:null}<button className="ops-button" disabled={busy||(!token&&(!username||!password))} type="submit">{busy?'Opening…':'Open staff workspace'}</button></form>{error?<p role="alert">{error}</p>:null}</>
}
