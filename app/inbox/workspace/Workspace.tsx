'use client'
import {testSmsConsentText} from '@/lib/test-customer-copy'
import type {PaymentRequest} from './email-model'

import {useEffect, useLayoutEffect, useReducer, useRef, useState} from 'react'
import Link from 'next/link'
import {draftKey, families as fixtureFamilies, familyFromSaved, initialState, matchesFamily, money, paymentSummary, pickupChecks, puppies as fixturePuppies, reviewReducer, type Channel, type Attempt, type Family} from './model'
import {useSavedWorkspace} from './useSavedWorkspace'
import {useEmailWorkspace} from './useEmailWorkspace'
import EmailComposer,{EmailOutbox} from './EmailComposer'
import {conversationEvents} from './conversation'
import {sendTextDraft} from './send-draft'
import TestPayments from './TestPayments'
import LitterReservations from './LitterReservations'
import AddToMessage from './AddToMessage'
import {attachmentPath} from '@/lib/mail/attachment-model'
import AutoGrowMessage from './AutoGrowMessage'
import {useConversationLayout} from './useConversationLayout'

type View = 'Today' | 'Families' | 'Conversations' | 'Puppies' | 'Payments' | 'Pickups' | 'Readiness'
const navigation: {name:View; symbol:string}[] = [
  {name:'Today',symbol:'◈'}, {name:'Families',symbol:'♧'}, {name:'Conversations',symbol:'☏'},
  {name:'Puppies',symbol:'♡'}, {name:'Payments',symbol:'＄'}, {name:'Pickups',symbol:'▣'}, {name:'Readiness',symbol:'⚙'},
]
const headings: Record<View,string> = {Today:'A little clarity for your day.', Families:'Every family, in one place.', Conversations:'Keep the conversation together.', Puppies:'Small paws. A clear picture.', Payments:'Know where every payment stands.', Pickups:'Ready for their first day home.', Readiness:'Confidence before connection.'}
const descriptions: Record<View,string> = {
  Today:'Your next steps, from the first hello to going home.', Families:'Private family records for Jeanne and the team. No customer accounts.',
  Conversations:'Email and text beside the puppy, payment history, and next step.', Puppies:'Review availability and family associations without changing public inventory.',
  Payments:'A request, a delivered link, and a confirmed payment are separate events.', Pickups:'Coordinate with each family and prepare their puppy’s records and starter kit.',
  Readiness:'This review is disconnected from your live business. Each connection needs its own checks.',
}

function Badge({children, tone = ''}: {children:React.ReactNode; tone?:string}) {return <span className={`ops-badge ${tone}`}>{children}</span>}
function Avatar({family}: {family:Family}) {return <span className={`ops-avatar ops-avatar-${family.id}`}>{family.initials}</span>}

export default function Workspace({live=false,paymentTesting=false}:{live?:boolean;paymentTesting?:boolean}) {
  const [view, setView] = useState<View>(paymentTesting?'Conversations':'Today')
  const [familyId, setFamilyId] = useState(live?'':fixtureFamilies[0].id)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All families')
  const [channel, setChannel] = useState<Channel>('Email')
  const [threadTab, setThreadTab] = useState('Messages')
  const [scenario, setScenario] = useState<Attempt['outcome']>('simulated')
  const [noteDrafts, setNoteDrafts] = useState<Record<string,string>>({})
  const [notice, setNotice] = useState('')
  const [textSending,setTextSending]=useState(false)
  const [textNotice,setTextNotice]=useState<Record<string,string>>({})
  const textLock=useRef(false)
  const [mobilePanel,setMobilePanel]=useState('thread')
  const [detailsTarget,setDetailsTarget]=useState<HTMLDivElement|null>(null)
  const [paymentReview, setPaymentReview] = useState(false)
  const [state, dispatch] = useReducer(reviewReducer, undefined, initialState)
  const stateLatest=useRef(state);useLayoutEffect(()=>{stateLatest.current=state},[state])
  const saved = useSavedWorkspace()
  const email = useEmailWorkspace(saved.ready)
  const restored = useRef(false)
  useEffect(()=>{const key=new URLSearchParams(window.location.search).get('family');if(key&&/^inquiry-[a-f0-9]{64}$/.test(key)){setFamilyId(key);setView('Conversations')}},[])
  const noteRequests = useRef<Record<string,{body:string;id:string}>>({})
  const families=saved.records?saved.records.map(familyFromSaved):live||paymentTesting?[]:fixtureFamilies
  const puppies=live||paymentTesting?(email.data?.inventory||[]):fixturePuppies
  const family = families.find(f => f.id === familyId)||families[0]||{id:'',name:'Choose a family',initials:'',email:'',phone:'',location:'',preference:'Email' as const,smsConsent:false,stage:'',next:'',unread:false,checks:[],records:[],messages:[]}
  const puppy = puppies.find(p => p.id === family.puppyId)
  const balance = paymentSummary(family,puppies)
  const draft = state.drafts[draftKey(family.id, channel)] || ''
  const note = noteDrafts[family.id] || ''
  const draftConflict = saved.conflicts[draftKey(family.id,channel)]
  const draftDirty = saved.ready && draft !== saved.base(family.id,channel)
  const visible = families.filter(f => matchesFamily(f, search) && (filter !== 'Needs a reply' || f.unread) && (filter !== 'Pickup planning' || f.stage === 'Pickup planning'))
  const events=conversationEvents(family,email.data)
  const textBlocked=(!live&&!family.testCommunicationsAllowed?'Text sending is limited to the approved test family.':'')||family.smsBlockedReason||(!family.phone?'This family has no phone number.':!family.smsConsent||family.preference==='Email'?family.testSmsAvailable?'Confirm the test-recipient consent above before sending, or choose Email.':'This family has not permitted text follow-up. Choose Email.':family.messages.some(m=>m.channel==='Text'&&m.direction==='out'&&['sending','uncertain'].includes(m.status||''))?'A previous text needs review before another can be sent.':draftConflict?'Resolve the draft change below before sending.':!draft.trim()?'Write a message to send.':draft.length>1600?'Shorten this text to 1,600 characters.':'')
  const attempts = state.attempts.filter(a => a.familyId === family.id)
  useEffect(()=>{
    if(saved.ready && saved.records){dispatch({type:'restore',families:saved.records,loadDrafts:!restored.current});restored.current=true}
  },[saved.records,saved.ready])
  const ingestProfiles=saved.ingestProfiles
  useEffect(()=>{if(email.data?.families)ingestProfiles(email.data.families)},[email.data,ingestProfiles])
  const refresh=email.refresh
  useEffect(()=>{
    if(view!=='Conversations'||!family.id||textSending)return
    let stopped=false
    const update=()=>{if(!stopped&&document.visibilityState==='visible'&&!textLock.current)void refresh(family.id)}
    update();const timer=window.setInterval(update,20000)
    document.addEventListener('visibilitychange',update)
    return()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',update)}
  },[view,family.id,refresh,textSending])
  const eventSignature=events.map(e=>`${e.id}:${e.status}`).join('|')
  const reading=useConversationLayout(view==='Conversations',family.id,JSON.stringify(events.map(e=>e.id)),eventSignature,`${mobilePanel}:${threadTab}`)
  useEffect(()=>{
    if(view!=='Conversations'||!window.matchMedia('(max-width:999px)').matches)return
    const target=mobilePanel==='families'?'conversation-families-title':mobilePanel==='details'?'conversation-details-title':'conversation-title'
    document.getElementById(target)?.focus({preventScroll:true})
  },[mobilePanel,family.id,view])
  const unsaved = email.dirty || saved.ready && (families.some(f => (state.drafts[draftKey(f.id,'Text')]||'') !== saved.base(f.id,'Text')) || Object.values(noteDrafts).some(body=>body.trim()))
  useEffect(()=>{
    if(!unsaved)return
    const warn=(event:BeforeUnloadEvent)=>event.preventDefault()
    window.addEventListener('beforeunload',warn)
    return()=>window.removeEventListener('beforeunload',warn)
  },[unsaved])

  async function saveNote() {
    const key=family.id;const body=note.trim()
    if(!body)return
    if(noteRequests.current[key]?.body!==body)noteRequests.current[key]={body,id:crypto.randomUUID()}
    const confirmed=await saved.mutate({type:'note',familyId:key,body,requestId:noteRequests.current[key].id})
    if(confirmed){setNoteDrafts(previous=>previous[key]?.trim()===body?{...previous,[key]:''}:previous);delete noteRequests.current[key];setNotice(`Private note saved for ${family.name} in the ${live?'staff':'test'} workspace.`)}
  }
  async function saveDraft() {
    const confirmed=await saved.mutate({type:'draft',familyId:family.id,channel,body:draft,base:saved.base(family.id,channel)})
    if(confirmed)setNotice(`${channel} draft saved for ${family.name}. Nothing was sent.`)
  }
  function resolveDraft(useSaved:boolean) {
    const body=saved.resolve(family.id,channel)
    if(useSaved && body!==undefined)dispatch({type:'draft',familyId:family.id,channel,body})
    setNotice(useSaved?'Saved draft restored.':'Your draft is kept. Save it when you are ready to replace the reviewed saved version.')
  }

  function selectFamily(f: Family, destination: View = 'Conversations') {
    setMobilePanel('thread');setFamilyId(f.id); setChannel(f.preference === 'Text' ? 'Text' : 'Email'); setThreadTab('Messages'); setView(destination); setNotice(''); setPaymentReview(false); dispatch({type:'clear-error'})
  }
  function changeView(next: View) {setView(next); setPaymentReview(false); setNotice(''); dispatch({type:'clear-error'})}
  async function sendText(){
    if(textLock.current||textBlocked)return
    const id=family.id,body=draft
    textLock.current=true;setTextSending(true);setTextNotice(previous=>({...previous,[id]:'Saving and sending…'}))
    try{
      const result=await sendTextDraft(id,body,saved.base(id,'Text'),saved.mutate,async input=>{
        const response=await fetch('/inbox/workspace/api/sms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(35000)})
        const data=await response.json();if(!response.ok)throw new Error(data.error);return data
      })
      if(!result){setTextNotice(previous=>({...previous,[id]:'The draft could not be saved. Your text is kept; check the saved connection or draft conflict.'}));return}
      if(result.state==='accepted'){
        if(result.cleared)dispatch({type:'sent-text',familyId:id,body})
        setTextNotice(previous=>({...previous,[id]:`Sent · accepted by Twilio; delivery unconfirmed.${result.cleared?'':' Your draft is kept.'}`}))
      }else setTextNotice(previous=>({...previous,[id]:'This text has an in-progress or uncertain attempt. Your draft is kept; review before resending.'}))
      await email.refresh(id)
    }catch(error){setTextNotice(previous=>({...previous,[id]:error instanceof Error?error.message:'Text outcome could not be confirmed. Your draft is kept; refresh before retrying.'}))}
    finally{textLock.current=false;setTextSending(false)}
  }
  function insertPayment(request:PaymentRequest,nextChannel:Channel,targetId=family.id){
    if(!request.checkoutUrl)return
    const snippet=request.litterReservationId?`${request.puppyName}: selection position ${request.selectionPosition}. ${money(request.amountCents)} deposit. A verified deposit secures a selection position, not a puppy. Non-refundable; transferable to a future litter when a suitable puppy is unavailable; credited toward the selected puppy’s price. Secure TEST payment link: ${request.checkoutUrl}`:`${request.puppyName}: ${money(request.amountCents)} ${request.kind==='deposit'?'deposit':'final payment'} toward the ${money(request.totalCents)} total. ${request.kind==='deposit'?'The deposit is non-refundable and applied to the total. ':''}Secure TEST payment link: ${request.checkoutUrl}`
    if(nextChannel==='Email'){
      const entry=email.entriesLatest.current[targetId];if(!entry)return
      const priorAutomaticSubject=!entry.value.body.trim()&&['deposit','final payment'].some(kind=>entry.value.subject===`FluffyTail ${kind} request — ${request.puppyName}`)
      void email.saveEdited(targetId,{subject:entry.value.subject.trim()&&entry.value.subject!==email.empty.subject&&!priorAutomaticSubject?entry.value.subject:`FluffyTail ${request.kind==='deposit'?'deposit':'final payment'} request — ${request.puppyName}`,body:entry.value.body.trim()?entry.value.body:`${request.kind==='deposit'?request.litterReservationId?'Here is the deposit request for your approved litter selection position.':'I’m happy to share your puppy’s deposit request.':'Here is the final payment request for your puppy.'} Please reply if you have any questions.`,paymentRequestId:request._id})
    }else{const current=stateLatest.current.drafts[draftKey(targetId,'Text')]||'';if(!current.includes(request.checkoutUrl)){const body=current.trim()?current+'\n\n'+snippet:`Hi! Jeanne at FluffyTail here. ${snippet} Reply with any questions.`;dispatch({type:'draft',familyId:targetId,channel:'Text',body});void saved.mutate({type:'draft',familyId:targetId,channel:'Text',body,base:saved.base(targetId,'Text')})}}
    if(targetId===family.id){setChannel(nextChannel);setView('Conversations');setMobilePanel('thread')}setNotice('Payment request added. Your existing message is kept; edit it and choose Send when ready.')
  }
  function simulate() {
    const action = {type:'attempt' as const, familyId:family.id, channel, outcome:scenario}
    const result = reviewReducer(state, action)
    dispatch(action)
    setNotice(result.error ? '' : scenario === 'simulated' ? 'Simulation recorded. Nothing was sent.' : scenario === 'failed' ? 'Simulated failure. Your draft is retained; nothing was sent.' : 'Simulated uncertain result. Review the activity before retrying. Nothing was sent.')
  }

  const familyTools=<div className="ops-tools"><label><span className="ops-sr">Search families, puppies, or stages</span><input type="search" placeholder="Search families, puppies, or stages…" value={search} onChange={e => setSearch(e.target.value)} /></label><label><span className="ops-sr">Filter families</span><select value={filter} onChange={e => setFilter(e.target.value)}><option>All families</option><option>Needs a reply</option><option>Pickup planning</option></select></label><span>{visible.length} {visible.length === 1 ? 'family' : 'families'}</span></div>

  const familyList=<aside className="ops-list-column" id="conversation-families"><header className="ops-list-heading"><h2 id="conversation-families-title" tabIndex={-1}>Families</h2><button className="ops-button secondary ops-mobile-only" onClick={()=>setMobilePanel('thread')}>← Conversation</button><button className="ops-button secondary ops-mobile-only" onClick={()=>changeView('Today')}>Home</button></header>{familyTools}<section className="ops-family-list" aria-label="Families" tabIndex={0}>{visible.length ? visible.map(f => <button aria-pressed={family.id === f.id} key={f.id} onClick={() => selectFamily(f)}><Avatar family={f}/><span><strong>{f.name}{f.unread ? <i aria-label="Needs follow-up" /> : null}</strong><small>{f.stage} · {f.preference}</small><p>{f.messages.at(-1)?.body}</p></span></button>) : <p className="ops-empty">No families match. Try another name or clear the filter.</p>}</section></aside>

  return <div ref={reading.shell} className={`ops-workspace ${paymentTesting?'ops-payment-testing':''} ${view==='Conversations'?`is-conversations ops-mobile-${mobilePanel}`:''}`}>
    <a className="ops-skip" href="#workspace-content">Skip to workspace</a>
    <aside className="ops-sidebar">
      <div className="ops-brand"><img src="/brand/fluffytail-logo-color.svg" alt="" width="52" height="52" /><span><strong>FluffyTail</strong><small>THE STAFF WORKSPACE</small></span></div>
      <span className="ops-sidebar-caption">YOUR BUSINESS</span>
      <nav aria-label="Staff workspace">{navigation.map(item => <div key={item.name} className={`ops-nav-section ${item.name==='Conversations'&&view==='Conversations'?'is-expanded':''}`}><button onClick={() => {changeView(item.name);if(item.name==='Conversations')setMobilePanel('thread')}} aria-current={view === item.name ? 'page' : undefined}><span aria-hidden="true">{item.symbol}</span>{item.name}{item.name === 'Conversations' ? <b>{families.filter(f=>f.unread).length}</b> : null}</button>{item.name==='Conversations'&&view==='Conversations'?familyList:null}</div>)}</nav>
      <div className="ops-sidebar-bottom"><span className="ops-lock">PRIVATE · STAFF ONLY</span><p>For you and Jeanne.<br />Families don’t need an account.</p><Link href="/inbox">Open existing Inbox ↗</Link><Link href="/inbox/security">Staff access & recovery</Link></div>
    </aside>
    <div className="ops-main">
      <div className="ops-review-banner"><span>{paymentTesting?<strong>TEST — no real charges or inventory changes</strong>:null}<b>{live?'Staff workspace':'Test workspace'}</b> · {live?'Real inquiries · Saved conversations · Messages send only when you choose':paymentTesting?'Isolated Stripe sandbox · Communication only with the approved owner test recipient':'Synthetic inquiries and examples · Saved conversations · Customer sending disabled'}</span>{!live&&!paymentTesting?<button onClick={() => {dispatch({type:'reset-attempts'}); setNotice('Delivery simulations cleared. Saved drafts, notes and pickup preparation are kept.')}}>Reset simulations</button>:null}</div>
      <header className="ops-topbar"><span>FluffyTail <span aria-hidden="true">/</span> {view}</span><div><span className="ops-status-dot" /> {live?'Connected to FluffyTail':'Preview only'} <span className="ops-user">J</span></div></header>
      <main id="workspace-content" className="ops-content">
        <div className="ops-page-heading"><div><p className="ops-eyebrow">{view === 'Today' ? 'WELCOME BACK, JEANNE' : `YOUR ${view.toUpperCase()}`}</p><h1>{headings[view]}</h1><p>{live&&view==='Readiness'?'Configured services and private staff controls.':descriptions[view]}</p></div><Badge tone="quiet">Staff only</Badge></div>
        {notice ? <p role="status" className="ops-notice">{notice}</p> : null}
        <section className={`ops-persistence ${saved.ready&&!saved.error?'is-ready':''}`} aria-label="Saved workspace connection">
          {saved.loading ? <p role="status">Loading saved workspace…</p> : saved.ready ? <p><Badge tone={saved.error?'amber':'green'}>{saved.error?'Saved copy loaded · connection needs attention':'Saved records connected'}</Badge> Drafts, private notes and pickup preparation can be saved. Email and text drafts stay with each family. {live?'Email, consent-aware text and payment actions are manual.':'Customer delivery and live payments are disabled.'}</p> : saved.records ? <><p>{live?'Your submitted inquiries will appear here. Refresh to load the latest.':'Connect submitted test inquiries to their private family records and conversations.'} Any existing saved records are kept.</p><button className="ops-button secondary" disabled={saved.busy} onClick={()=>void saved.mutate({type:'initialize'})}>{saved.busy?'Loading…':live?'Connect inquiries':'Load example families'}</button><button className="ops-button secondary" disabled={saved.busy} onClick={()=>void saved.mutate({type:'sync-inquiries'})}>Connect submitted inquiries</button></> : <p>The saved workspace is not connected yet. Editing is paused until its records can be loaded.</p>}
          {saved.error ? <div role="alert"><p>{saved.error}</p><button className="ops-button secondary" onClick={()=>void saved.load()} disabled={saved.busy||saved.loading}>Retry connection</button></div> : null}
          {saved.ready&&!saved.error ? <button className="ops-button secondary" onClick={()=>{void saved.mutate({type:'sync-inquiries'}).then(()=>email.load())}} disabled={saved.busy||saved.loading}>Refresh inquiries and saved records</button> : null}
        </section>
        {view === 'Today' ? <>
          <div className="ops-stats">
            {[{label:'Families to follow up',value:String(families.filter(f=>f.unread).length),detail:'New questions and next steps',next:'Conversations' as View}, {label:'Available puppies',value:String(puppies.filter(p=>p.status==='Available').length),detail:live?'Published Sanity inventory':'In the fictional Autumn litter',next:'Puppies' as View}, {label:'Recorded deposits',value:money(families.reduce((sum,f)=>sum+f.records.filter(r=>r.paymentStatus==='paid').reduce((paid,r)=>paid+Math.round(r.amountPaid*100),0),0)),detail:live?'Confirmed payment records':'Confirmed example payments only',next:'Payments' as View}, {label:'Pickup to coordinate',value:String(families.filter(f=>f.puppyId).length),detail:'Time and details need confirmation',next:'Pickups' as View}].map(stat => <button className="ops-stat" key={stat.label} onClick={() => changeView(stat.next)}><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.detail}</small><i aria-hidden="true">↗</i></button>)}
          </div>
          <div className="ops-overview-grid"><section className="ops-panel"><div className="ops-panel-heading"><div><p className="ops-eyebrow">A LITTLE ATTENTION</p><h2>What needs you next</h2></div><Badge>{families.filter(f=>f.unread).length} next steps</Badge></div>
            {families.filter(f => f.unread).map((f,i) => <button className="ops-task" key={f.id} onClick={() => selectFamily(f)}><span className="ops-task-number">0{i+1}</span><span><strong>{f.next}</strong><small>{f.name} · {f.stage}</small></span><span aria-hidden="true">→</span></button>)}
            <div className="ops-panel-footer">Start with a conversation. Confirm the details before requesting payment.</div>
          </section><section className="ops-feature"><span className="ops-eyebrow">{live?'FROM THE FIRST HELLO TO HOME':'THE AUTUMN LITTER · FICTIONAL'}</span><h2>One more little<br />hello to make.</h2><p>{live?'Keep each inquiry, conversation and next step close at hand. Confirm details with the family before requesting payment.':'Clover is available in this review. Keep her inquiry and family conversations close at hand.'}</p><button className="ops-button light" onClick={() => changeView('Puppies')}>Meet the puppies <span aria-hidden="true">→</span></button><div className="ops-feature-photo" role="img" aria-label="Two cream Shih Tzu puppies from the approved FluffyTail photography" /></section></div>
          <section className="ops-panel ops-connection-strip"><div><Badge tone="amber">{live?'Your connections':'Connections pending'}</Badge><h3>Your business stays in your hands.</h3><p>{live?'Email, consent-aware SMS, inventory and payment records stay with each saved family. You choose when to send or request payment.':'Email preparation is connected to saved test records. Live mail, payments, and inventory remain separate. Good Dog stays available while the new workflow is proven.'}</p></div><button className="ops-button secondary" onClick={() => changeView('Readiness')}>Review readiness →</button></section>
        </> : null}

        {view === 'Families' || view === 'Conversations' ? <>
          {view==='Families'?familyTools:null}
          {view === 'Families' ? <div className="ops-family-grid">{visible.length ? visible.map(f => <article className="ops-panel ops-family-card" key={f.id}><div className="ops-thread-person"><Avatar family={f}/><div><h2>{f.name}</h2><p>{f.location}</p></div></div><Badge>{f.stage}</Badge><dl><dt>Preferred contact</dt><dd>{f.preference}</dd><dt>Puppy</dt><dd>{puppies.find(p => p.id === f.puppyId)?.name || 'Not associated'}</dd><dt>Confirmed paid</dt><dd>{paymentSummary(f,puppies) ? money(paymentSummary(f,puppies)!.paidCents) : 'No payment record'}</dd></dl><p>{f.next}</p><button className="ops-button secondary" onClick={() => selectFamily(f)}>Open family conversation →</button></article>) : <p className="ops-empty">No families match. Try another name or clear the filter.</p>}</div> : <div className={`ops-conversation-layout ops-mobile-${mobilePanel}`}>
            <section className="ops-thread" aria-label="Selected conversation"><header><button className="ops-button secondary ops-mobile-only" aria-controls="conversation-families" onClick={()=>setMobilePanel('families')}>← Families</button><div className="ops-thread-person"><Avatar family={family}/><div><h2 id="conversation-title" tabIndex={-1}>{family.name}</h2><p>{family.location} · Prefers {family.preference.toLowerCase()}</p></div></div><Badge>{family.stage}</Badge><button className="ops-button secondary ops-mobile-only" aria-controls="conversation-details" onClick={()=>setMobilePanel('details')}>Details</button></header>
              <div className="ops-thread-tabs" aria-label="Conversation sections">{['Messages','Activity'].map(tab => <button aria-pressed={threadTab === tab} key={tab} onClick={() => setThreadTab(tab)}>{tab}</button>)}<button className="ops-refresh" disabled={email.busy||textSending} onClick={()=>void email.refresh(family.id)}>Refresh</button></div>
              {threadTab === 'Messages' ? <><div className="ops-message-region"><div className="ops-messages" ref={reading.timeline} role="region" aria-label="Message history" tabIndex={0} onScroll={reading.capture} onWheel={reading.interact} onTouchMove={reading.interact} onPointerDown={reading.interact} onKeyDown={event=>{if(['PageUp','PageDown','Home','End','ArrowUp','ArrowDown',' '].includes(event.key))reading.interact()}}><div className="ops-message-stack"><div className="ops-thread-disclosure"><span>{live?'Family conversation · Updates automatically':'Test conversation'}</span></div>{email.data?.syncNotice&&!email.data.syncNotice.includes('up to date')&&!email.data.syncNotice.includes('new replies imported')?<p role="status" className="ops-draft-note">{email.data.syncNotice}</p>:null}{events.map(m=><article className={`ops-message ${m.direction}`} key={m.id} data-message-id={m.id}><small>{m.direction==='in'?family.name.split(' ')[0]:'Jeanne'} · {m.label} · {Number.isFinite(Date.parse(m.time))?new Date(m.time).toLocaleString():m.time}{m.status?` · ${m.status}`:''}</small><p>{m.subject?<strong>{m.subject}{'\n'}</strong>:null}{m.body}</p>{m.attachments?.length?<ul className="ops-message-files">{m.attachments.map(file=><li key={file.id}><a href={attachmentPath(file.id)} target="_blank" rel="noopener noreferrer">{file.filename} ↗</a></li>)}</ul>:null}{m.replyId?<button className="ops-button secondary" onClick={()=>{setChannel('Email');email.startReply(family.id,m.replyId)}}>Reply by email</button>:null}</article>)}{attempts.map(a => <article className="ops-message out simulated" key={a.id} data-message-id={a.id}><small>{a.channel} · {a.outcome === 'simulated' ? 'Simulated only' : a.outcome === 'failed' ? 'Failed simulation' : 'Needs review · simulated'}</small><p>{a.body}</p></article>)}</div></div>{reading.unseen?<button className="ops-new-messages ops-button" onClick={reading.latest}><span aria-live="polite">New messages ({reading.unseen}) ↓</span></button>:null}</div>
                <div className="ops-composer" onFocusCapture={reading.endInteraction}><div className="ops-channel-picker"><label>Reply via <select aria-label="Reply channel" value={channel} onChange={e => setChannel(e.target.value as Channel)}><option>Email</option><option>Text</option></select></label><AddToMessage family={family} email={email} channel={channel} onPayment={insertPayment}/><small>{channel === 'Email' ? live||family.testCommunicationsAllowed?'From Jeanne’s Pair email':'Saved drafts · customer sending disabled' : 'SMS permission is checked again before sending'}</small></div>
                  {channel==='Text'?<><p className="ops-recipient">To: {family.phone||'No phone number saved'}</p>{email.error?<p className="ops-error" role="alert">{email.error}</p>:null}</>:null}
                  {channel==='Text'&&family.testSmsAvailable&&!family.smsConsent?<label className="ops-consent-note"><input type="checkbox" checked={false} disabled={saved.busy} onChange={event=>{if(event.target.checked)void saved.mutate({type:'test-sms-consent',familyId:family.id,acknowledged:true})}}/> {testSmsConsentText} Number: {family.phone}</label>:null}{channel==='Email'?<EmailComposer family={family} email={email} detailsTarget={detailsTarget}/>:<><label className="ops-sr" htmlFor="workspace-reply">Message to {family.name}</label><AutoGrowMessage id="workspace-reply" value={draft} disabled={!saved.ready} maxLength={live||family.testCommunicationsAllowed?1600:10000} onChange={e => dispatch({type:'draft', familyId:family.id, channel, body:e.target.value})} placeholder="Write a text reply…" rows={2}/>
                  {draftConflict ? <section className="ops-draft-conflict" role="alert"><strong>This draft changed in another tab.</strong><p>Your text is kept above. Compare it with the saved version:</p><pre>{draftConflict.saved||'(Empty saved draft)'}</pre><div><button className="ops-button secondary" onClick={()=>resolveDraft(true)}>Use saved draft</button><button className="ops-button secondary" onClick={()=>resolveDraft(false)}>Keep my draft</button></div></section> : null}
                  {textBlocked?<p className="ops-consent-note" role="status">{textBlocked}</p>:null}{textNotice[family.id]?<p className="ops-draft-note" role="status">{textNotice[family.id]}</p>:null}<div className="ops-text-footer"><div className="ops-draft-save"><span role="status">{!saved.ready?'Connect saved records before editing.':draftDirty?'Unsaved draft changes':'Draft matches your saved copy'}</span><button className="ops-button secondary" disabled={!saved.ready||saved.busy||textSending||!draftDirty||!!draftConflict} onClick={()=>void saveDraft()}>{saved.busy?'Saving…':'Save draft'}</button></div><div className="ops-compose-actions">{live||family.testCommunicationsAllowed?<button className="ops-button" disabled={!saved.ready||saved.busy||textSending||!!textBlocked} onClick={()=>void sendText()}>{textSending?'Sending…':'Send text →'}</button>:<><label>Test result <select aria-label="Simulated delivery result" value={scenario} onChange={e => setScenario(e.target.value as Attempt['outcome'])}><option value="simulated">Success simulation</option><option value="failed">Failure simulation</option><option value="review">Uncertain simulation</option></select></label><button className="ops-button" onClick={simulate} disabled={!draft.trim()}>Simulate reply →</button></>}</div></div>
                  <p className="ops-draft-note">{live||family.testCommunicationsAllowed?'Send saves your text automatically. Acceptance is separate from delivery and payment confirmation.':'Save your draft to keep it after reloading. Delivery simulations do not change the saved copy or send anything.'}</p>{state.error ? <p role="alert" className="ops-error">{state.error}</p> : null}</>}
                </div></> : threadTab === 'Activity' ? <div className="ops-activity"><h3>Conversation & payment activity</h3><p>Inquiry received · {family.preference} preferred</p>{family.records.map((r,i) => <p key={i}>{live?'Payment confirmed':'Fixture payment confirmed'} · {money(r.amountPaid * 100)}</p>)}{attempts.map(a => <p key={a.id}>Attempt {a.id} · {a.channel} · {a.outcome === 'review' ? 'Uncertain simulation — review before retrying' : a.outcome === 'failed' ? 'Failure simulation — draft retained' : 'Success simulation — nothing sent'}</p>)}<EmailOutbox reviews={(email.data?.reviews||[]).filter(r=>r.familyId===family.id)}/><small>Sending a message never marks a payment paid or reserves a puppy.</small></div> : null}
            </section>
            <aside className="ops-context" id="conversation-details" aria-label="Family details" tabIndex={0}><header className="ops-details-heading"><h2 id="conversation-details-title" tabIndex={-1}>Family details</h2><button className="ops-button secondary ops-mobile-only" onClick={()=>setMobilePanel('thread')}>← Conversation</button></header>{email.data?.litterReservationsEnabled?<LitterReservations key={family.id} family={family} email={email} channel={channel} onPayment={insertPayment}/>:null}<h3>{puppy?.name || 'No puppy associated'}</h3>{puppy?<p>{puppy.sex} · {puppy.color}</p>:<p>An inquiry is not a reservation.</p>}<dl><dt>Puppy reservation</dt><dd>{puppy?.status||'Not reserved'}</dd>{balance?<><dt>Total price</dt><dd>{money(balance.totalCents)}</dd><dt>Verified paid</dt><dd>{money(balance.paidCents)}</dd><dt>Remaining balance</dt><dd>{money(balance.remainingCents)}</dd></>:null}</dl>{balance&&balance.totalCents>0&&balance.remainingCents===0?<Badge tone="green">Paid in full</Badge>:null}<details className="ops-contact-details"><summary>Contact details</summary><dl><dt>Email</dt><dd>{family.email}</dd><dt>Phone</dt><dd>{family.phone}</dd></dl></details>{live&&family.id?<label>Associate a puppy<select value={family.puppyId||''} onChange={event=>{if(event.target.value&&window.confirm('Associate this puppy with the family? This does not reserve the puppy.'))void saved.mutate({type:'associate',familyId:family.id,puppyId:event.target.value})}}><option value="">No puppy associated</option>{puppies.map(p=><option key={p.id} value={p.id}>{p.name} · {p.status}</option>)}</select></label>:null}{family.historicalBalanceNeedsReview?<p className="ops-notice">Historical payments have no verified agreed-price snapshot. Review them in the existing Inbox before requesting a balance.</p>:null}<><TestPayments key={family.id} family={family} email={email}/><div ref={setDetailsTarget}/></><section className="ops-context-pickup"><h3>Pickup preparation</h3><p>{family.pickup||'Pickup time and location are not confirmed.'}</p><div className="ops-checklist">{pickupChecks.map(item=><label key={item}><input type="checkbox" disabled={!saved.ready||saved.busy} checked={(state.checks[family.id]||[]).includes(item)} onChange={event=>void saved.mutate({type:'check',familyId:family.id,item,checked:event.target.checked})}/><span>{item}</span></label>)}</div></section><div className="ops-activity"><h3>Notes for your team</h3><p>Internal only. Saved notes remain here after reloading.</p>{(state.notes[family.id] || []).map((n,i) => <p className="ops-private-note" key={i}>{n}</p>)}<form onSubmit={e => {e.preventDefault();void saveNote()}}><label htmlFor="workspace-note">Add a private note</label><textarea id="workspace-note" value={note} maxLength={4000} disabled={!saved.ready} onChange={e => setNoteDrafts(previous=>({...previous,[family.id]:e.target.value}))} rows={4}/><button className="ops-button" disabled={!saved.ready||saved.busy||!note.trim()}>{saved.busy?'Saving…':'Save private note'}</button></form></div><p className="ops-context-footnote">Private staff record. No account, invitation, or password is needed by this family.</p></aside>
          </div>}
        </> : null}

        {view === 'Puppies' ? <div className="ops-puppy-grid">{puppies.map(p => <article className="ops-panel ops-puppy" key={p.id}><div className={`ops-puppy-monogram ${p.id}`} aria-hidden="true">{p.name[0]}</div><div><div className="ops-panel-heading"><h2>{p.name}</h2><Badge tone={p.status === 'Available' ? 'green' : ''}>{p.status}</Badge></div><p>{p.sex} · {p.color}</p><small>{p.litter} · {live?'Sanity inventory':'Fictional inventory'}</small><dl><dt>Price</dt><dd>{money(p.price * 100)}</dd><dt>Deposit</dt><dd>{money(p.deposit * 100)}</dd><dt>Associated family</dt><dd>{families.find(f => f.puppyId === p.id)?.name || 'No family yet'}</dd></dl>{families.find(f => f.puppyId === p.id) ? <button className="ops-button secondary" onClick={() => selectFamily(families.find(f => f.puppyId === p.id)!)}>Open family →</button> : <button className="ops-button secondary" onClick={() => {setSearch(p.name); setFilter('All families'); setView('Conversations')}}>Find related inquiry →</button>}<p className="ops-context-footnote">{paymentTesting?'Association is separate from reservation. A verified test deposit reserves only this fictional puppy.':'Association and availability are separate. No inventory changes are made in this review.'}</p></div></article>)}</div> : null}

        {view === 'Payments' ? <><div className="ops-callout"><strong>Payment certainty comes first.</strong><p>Historical prices remain attached to their records. A payment request or sent link does not confirm payment. {paymentTesting?'Choose a fictional family to request a Stripe test deposit or final payment. Open or copy links without sending a message.':live?'Create and review links in the family conversation.':'No live links are created here.'}</p></div><div className="ops-payment-grid"><section className="ops-panel"><div className="ops-panel-heading"><h2>Payment overview</h2><Badge>{paymentTesting?'Signed test-webhook records':live?'Confirmed records':'Fixture records'}</Badge></div>{families.filter(f => f.puppyId&&paymentSummary(f,puppies)).map(f => {const b = paymentSummary(f,puppies)!; return <button className="ops-payment-row" key={f.id} onClick={() => {setFamilyId(f.id); setPaymentReview(true)}}><Avatar family={f}/><span><strong>{f.name}</strong><small>{puppies.find(p => p.id === f.puppyId)?.name} · {b.remainingCents===0?'Paid in full':b.paidCents ? 'Deposit recorded' : 'No payment recorded'}</small></span><span><strong>{money(b.remainingCents)}</strong><small>Remaining</small></span><span aria-hidden="true">→</span></button>})}</section>
          <section className="ops-panel ops-payment-detail">{paymentReview && balance ? paymentTesting?<><h2>{family.name}</h2><TestPayments key={family.id} family={family} email={email}/><button className="ops-button secondary" onClick={()=>selectFamily(family)}>Open conversation →</button></>:<><p className="ops-eyebrow">REVIEW REQUEST · NO LINK CREATED</p><h2>{family.name}</h2><p>{puppy?.name} · {family.preference} preferred</p><dl><dt>Puppy price</dt><dd>{money(balance.totalCents)}</dd><dt>Deposit amount</dt><dd>{money(balance.depositCents)}</dd><dt>Recorded paid</dt><dd>{money(balance.paidCents)}</dd><dt>Remaining</dt><dd>{money(balance.remainingCents)}</dd><dt>Additional taxes / fees</dt><dd>$0.00</dd></dl><p>Deposits are non-refundable and apply to the total price. Balance may be paid before or at pickup, as coordinated with Jeanne.</p><Badge tone="amber">{live?'Create a request from the family conversation':'Live request creation disabled'}</Badge><p className="ops-context-footnote">{live?'Open the family conversation to prepare a deposit or balance link. Only Stripe-verified payment records count as paid.':'Prepare a test payment email in the family conversation. Test links cannot collect money; delivery, live checkout and reconciliation remain disabled.'}</p><button className="ops-button secondary" onClick={() => selectFamily(family)}>Open conversation →</button></> : <div className="ops-empty"><span aria-hidden="true">↖</span><h2>Review before requesting.</h2><p>Choose a family to see the puppy, price, confirmed payments, and remaining balance together.</p></div>}</section></div></> : null}

        {view === 'Pickups' ? <div className="ops-pickup-grid">{families.filter(f => f.puppyId).map(f => <section className="ops-panel" key={f.id}><div className="ops-panel-heading"><div><p className="ops-eyebrow">{puppies.find(p => p.id === f.puppyId)?.name} + {f.name}</p><h2>{f.pickup ? 'Plan coming together' : 'Details to coordinate'}</h2></div><Badge>{(state.checks[f.id]||[]).length}/{pickupChecks.length}</Badge></div><p className="ops-pickup-location">{f.pickup || 'Pickup location and time have not been confirmed.'}</p><p>Pickup in Mobile or at the airport, coordinated with Jeanne.</p><div className="ops-checklist">{pickupChecks.map(item => <label key={item}><input type="checkbox" disabled={!saved.ready||saved.busy} checked={(state.checks[f.id]||[]).includes(item)} onChange={event => void saved.mutate({type:'check',familyId:f.id,item,checked:event.target.checked})}/><span>{item}</span></label>)}</div><p className="ops-context-footnote">Preparation checks save only after confirmation. They do not create appointments, medical records, or payment confirmations.</p><button className="ops-button secondary" onClick={() => selectFamily(f)}>Coordinate with family →</button></section>)}</div> : null}

        {view === 'Readiness' ? <section className="ops-panel ops-readiness"><div className="ops-panel-heading"><div><p className="ops-eyebrow">BEFORE LIVE BUSINESS</p><h2>Prove each part of the journey.</h2></div><Badge tone="amber">{live?'Staff connections':'Not ready for live use'}</Badge></div>{[
          ['Staff access','Existing operator protection is required. This review has no customer login or public navigation link.'],
          ['Jeanne’s email','Hosted compose/reply drafts, outgoing attempts and threaded reply synchronization are implemented. Pair access needs the approved owner-only trial; customer email and production activation remain gated.'],
          ['Text messaging','No messages sent. Retain opt-in checks, delivery states, incoming replies, and retry protection before activation.'],
          ['Deposits & balances','No live links created. Validate historical pricing, confirmed payments, expired links, duplicate events, and before/at-pickup collection.'],
          ['Puppies & reservations','Fictional inventory only. Family association, availability, reservation confirmation, and payment state need independent checks.'],
          ['Pickup & records','Private preparation checks can be saved for fictional families. Actual documents, starter kit handling, and pickup agreements still need integration.'],
          ['Privacy & recovery','Saved records and draft conflict handling are under isolated testing. Production privacy release gates, backups, and payment reconciliation remain open.'],
        ].map(([title,detail]) => <article key={title}><span className="ops-readiness-circle" aria-hidden="true">○</span><div><h3>{title}</h3><p>{live?({'Staff access':'Protected staff sign-in with the existing Inbox credentials. No customer accounts.','Jeanne’s email':email.data?.capabilities?.canDispatch?'Pair is configured for manual email sends and scoped reply synchronization.':'Pair configuration needs attention; saved drafts are retained.','Text messaging':'Manual Twilio sends recheck inquiry consent and opt-out status. Accepted does not mean delivered.','Deposits & balances':'Create Stripe checkout links from server pricing; payment and reservation confirmation remain separate.','Puppies & reservations':'Current Sanity inventory; associating a family never reserves a puppy.','Pickup & records':'Private notes and pickup checklists persist. Coordinate timing and records with the family.','Privacy & recovery':'Private staff records and draft conflicts are protected. The paused historical privacy work remains tracked separately.'} as Record<string,string>)[title]:detail}</p></div><Badge tone="quiet">{live?'Manual':'Pending'}</Badge></article>)}<div className="ops-panel-footer">{live?'The existing Inbox stays available during the transition. No customer message is sent automatically.':'No production records, payments, mailbox settings, or customer-facing design are changed by this review.'}</div></section> : null}
      </main>
      <footer className="ops-footer">FluffyTail staff workspace · {live?'Private business records':'Fictional records only'} · Saved drafts, notes and pickup checks survive reloading</footer>
    </div>
  </div>
}
