'use client'
import {useEffect,useState} from 'react'
import type {PublicKeyCredentialCreationOptionsJSON} from '@simplewebauthn/browser'
import {ownerKey,ownerNames,type OwnerKey} from '@/lib/staff-access-shared'
import {accessAction,checkLocalPasskey,finishLocalRegistration,accessError} from '../security/client'
import RecoveryCodes from '../security/RecoveryCodes'
type Ready={options:PublicKeyCredentialCreationOptionsJSON;ownerKey:OwnerKey;owner:string;expiresAt:number}
type Context={ready:boolean;ownerKey:OwnerKey|null;owner?:string;signedInAs:{key:OwnerKey;name:string}|null}
export default function Enrollment(){
  const [owner,setOwner]=useState<OwnerKey>('jeanne'),[invitation,setInvitation]=useState(''),[label,setLabel]=useState('My phone'),[context,setContext]=useState<Context|null>(null),[ready,setReady]=useState<Ready|null>(null),[local,setLocal]=useState<boolean|null>(null),[codes,setCodes]=useState<string[]>([]),[savedOwner,setSavedOwner]=useState<OwnerKey|null>(null),[code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  useEffect(()=>{
    let active=true;const hint=new URLSearchParams(window.location.search).get('owner')
    if(ownerKey(hint))setOwner(hint)
    void checkLocalPasskey().then(value=>{if(active)setLocal(value)}).catch(()=>{if(active)setLocal(false)})
    void accessAction('enrollment-context',ownerKey(hint)?{owner:hint}:{}).then(data=>{if(!active)return;setContext(data);if(data.ready&&ownerKey(data.ownerKey))setOwner(data.ownerKey)}).catch(e=>{if(active)setError(accessError(e,'register'))})
    return()=>{active=false}
  },[])
  async function run(task:()=>Promise<void>){setBusy(true);setError('');try{await task()}catch(e){setError(accessError(e,'register'))}finally{setBusy(false)}}
  async function prepare(){
    const checked=await accessAction('enrollment-context',{owner,invitation:invitation.trim()||undefined})
    setContext(checked)
    if(!checked.ready)throw new Error('Enter your private owner invitation before creating a passkey.')
    const result=await accessAction('register-options',{intent:'enroll',owner:checked.ownerKey})
    setReady(result);setInvitation('')
  }
  // Prepare options before the tap: native creation is the first awaited
  // operation inside this gesture, including on Safari.
  async function create(){
    if(!ready)return
    if(ready.expiresAt<=Date.now()){setReady(null);throw new Error('The creation step expired. Check your invitation again; nothing was reset.')}
    const result=await finishLocalRegistration(ready.options,label)
    if(result.ownerKey!==ready.ownerKey)throw new Error('The saved owner did not match this enrollment. Stop here and ask for help; no credentials were reset.')
    setSavedOwner(result.ownerKey);setCodes(result.codes||[]);setReady(null)
  }
  const signin='/inbox/unlock?owner='+(savedOwner||owner)
  return <div className="staff-access-form">
    {context?.signedInAs?<p role="status">This browser is currently signed in as <strong>{context.signedInAs.name}</strong>. This setup is for <strong>{ownerNames[owner]}</strong>; it does not remove the other owner’s access.</p>:null}
    {!savedOwner?<><p className="staff-flow-label">CREATE A NEW PASSKEY · {ownerNames[owner]}</p><form onSubmit={e=>{e.preventDefault();void run(prepare)}}><label htmlFor="enroll-owner">Owner</label><select id="enroll-owner" value={owner} disabled={busy||!!ready||context?.ready} onChange={e=>{setOwner(e.target.value as OwnerKey);setReady(null)}}><option value="jeanne">Jeanne</option><option value="jason">Jason / DjinX</option></select>{!context?.ready?<><label htmlFor="enroll-invitation">Private owner invitation</label><input id="enroll-invitation" type="password" autoComplete="off" value={invitation} onChange={e=>setInvitation(e.target.value)} maxLength={43} required/></>:<p className="staff-confirmed">Invitation verified for {context.owner}. It is still unused until creation finishes.</p>}<label htmlFor="enroll-label">Name this device</label><input id="enroll-label" value={label} onChange={e=>setLabel(e.target.value)} maxLength={60} required/>{!ready?<button disabled={busy} type="submit">{busy?'Checking invitation…':'Check my invitation'}</button>:null}</form>
      {ready?<section aria-label="Ready to create your passkey"><h2>Create {ready.owner}’s passkey here</h2><p>Use {ready.owner}’s own phone. Choose its local password manager and approve Face ID, fingerprint, or the device passcode. Do not scan a QR code with someone else’s phone or choose an NFC security key.</p><button className="staff-primary" disabled={busy||local!==true} onClick={()=>void run(create)}>{busy?'Creating…':'Create my passkey on this device'}</button><button className="staff-text" disabled={busy} onClick={()=>setReady(null)}>Check invitation again</button></section>:null}
      {local===false?<p className="staff-error" role="alert">This browser is not offering a local passkey authenticator. On iPhone, open this link directly in Safari. See the settings help below before trying creation; do not use another person’s QR code.</p>:null}
      <details><summary>iPhone or password-manager help</summary><p>Face ID verifies a passkey; it does not create one by itself. If Apple Passwords is not offered, check Settings → General → AutoFill &amp; Passwords, turn on AutoFill Passwords and Passkeys, and allow Passwords. For Apple’s passkeys, also check Settings → your name → iCloud → Passwords (or Passwords &amp; Keychain) → Sync This iPhone. Your Apple Account needs two-factor authentication and your phone needs a passcode.</p><p>A Google-only chooser reflects the password providers offered by the browser; it does not prove that Apple Passwords is enabled or disabled. FluffyTail cannot inspect those settings or guarantee Face ID instead of your passcode. A compatible third-party manager can also hold your own passkey.</p><p><a href="https://support.apple.com/en-us/109016" target="_blank" rel="noreferrer">Apple’s Passwords &amp; Keychain instructions</a></p></details>
      <p>Already created your own passkey? <a href={signin}>Sign in as {ownerNames[owner]}</a>. Signing in never uses an enrollment invitation.</p></>:<><h2>Passkey saved for {ownerNames[savedOwner]}</h2><p>This registration does not establish that you can independently sign in on this phone. Save and verify your recovery codes, then try your own sign-in.</p>{codes.length?<RecoveryCodes codes={codes}/>:<p>Your existing recovery codes remain unchanged. Manage them under Staff access &amp; recovery.</p>}<label htmlFor="enroll-recovery">Enter one saved recovery code</label><input id="enroll-recovery" type="password" autoComplete="off" value={code} onChange={e=>setCode(e.target.value)} maxLength={100}/><button className="staff-primary" disabled={busy||!code} onClick={()=>void run(async()=>{await accessAction('confirm-recovery',{owner:savedOwner,code});setCodes([]);setCode('');await accessAction('logout');window.location.replace(signin)})}>Verify recovery, then sign in as {ownerNames[savedOwner]}</button></>}
    {error?<p className="staff-error" role="alert">{error}</p>:null}
  </div>
}
