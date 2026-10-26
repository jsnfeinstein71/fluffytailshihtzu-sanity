'use client'

import {useCallback,useEffect,useRef,useState} from 'react'

import Image from 'next/image'

type Incoming={key:string;from:string;name:string;subject:string;date:string;recipient:string;messageId:string|null;body?:string;truncated?:boolean}

type Value={to:string;subject:string;body:string;parentKey:string|null}

type Draft={id:string;revision:string;value:Value;updatedAt:string}

type Held={id:string;draftId:string;revision:string;from:string;replyTo:string;to:string;subject:string;body:string;inReplyTo:string|null;status:'held';createdAt:string}

type MailState={drafts:Draft[];reviews:Held[]}

type Result=Partial<MailState>&{messages?:Incoming[];message?:Incoming;error?:string;conflict?:Draft;fixture?:boolean;mailboxReadEnabled?:boolean}

const blank=():Value=>({to:'',subject:'',body:'',parentKey:null})

const equal=(a:Value,b:Value)=>a.to===b.to&&a.subject===b.subject&&a.body===b.body&&a.parentKey===b.parentKey

const account='jeanne@fluffytailshihtzu.com'

export default function LocalMailbox(){

  const [view,setView]=useState<'Inbox'|'Drafts'|'Held reviews'>('Inbox')

  const [messages,setMessages]=useState<Incoming[]>([])

  const [selected,setSelected]=useState<Incoming|null>(null)

  const [state,setState]=useState<MailState>({drafts:[],reviews:[]})

  const [id,setId]=useState('')

  const [revision,setRevision]=useState<string|null>(null)

  const [value,setValue]=useState<Value>(blank)

  const [base,setBase]=useState<Value>(blank)

  const [conflict,setConflict]=useState<Draft|null>(null)

  const [busy,setBusy]=useState(false)

  const [connected,setConnected]=useState(false)

  const [fixture,setFixture]=useState(false)
  const [mailboxReadEnabled,setMailboxReadEnabled]=useState(false)

  const [error,setError]=useState('')

  const [notice,setNotice]=useState('')

  const [review,setReview]=useState<Held|null>(null)

  const lock=useRef(false)

  const reviewIds=useRef<Record<string,string>>({})

  const dirty=!equal(value,base)

  const call=useCallback(async(action:Record<string,unknown>)=>{

    if(lock.current)return null

    lock.current=true;setBusy(true);setError('');setNotice('')

    try{

      const response=await fetch(new URL('/inbox/mail/api/local',window.location.origin),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action),cache:'no-store',signal:AbortSignal.timeout(45000)})

      const result:Result=await response.json()

      if(!response.ok){if(result.conflict)setConflict(result.conflict);throw new Error(result.error||'The email action could not be confirmed. Your entries are kept.')}

      if(result.drafts&&result.reviews){setState({drafts:result.drafts,reviews:result.reviews});setConnected(true)}

      if(result.messages)setMessages(result.messages)

      if(result.fixture!==undefined)setFixture(result.fixture)
      if(result.mailboxReadEnabled!==undefined)setMailboxReadEnabled(result.mailboxReadEnabled)

      return result

    }catch(cause){setError(cause instanceof Error&&!['TimeoutError','TypeError','SyntaxError'].includes(cause.name)?cause.message:'The email connection is unavailable or timed out. Your entries are kept. Reconnect and retry to confirm the saved result.');return null}

    finally{lock.current=false;setBusy(false)}

  },[])

  useEffect(()=>{void call({type:'state'})},[call])

  useEffect(()=>{

    if(!dirty)return

    const warn=(event:BeforeUnloadEvent)=>event.preventDefault()

    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)

  },[dirty])

  function openDraft(draft:Draft){if(dirty){setError('Save this email before opening another draft. Your entries are kept.');return}setId(draft.id);setRevision(draft.revision);setValue(draft.value);setBase(draft.value);setConflict(null);setReview(null);setSelected(null);setNotice('Saved draft opened.');setError('')}

  function compose(parent:Incoming|null=null){

    if(dirty){setError('Save this email before starting another. Your entries are kept.');return}

    const next:Value=parent?{to:parent.recipient,subject:/^re:/i.test(parent.subject)?parent.subject:`Re: ${parent.subject}`.slice(0,160),body:'',parentKey:parent.key}:blank()

    setId(crypto.randomUUID());setRevision(null);setValue(next);setBase(next);setConflict(null);setReview(null);setError('');setNotice(parent?'Reply started. Recipient will be checked against the original email before review.':'New email started.')

  }

  async function save(){

    const captured=value

    const result=await call({type:'save',id,revision,value:captured})

    const draft=result?.drafts?.find(d=>d.id===id)

    if(draft){setBase(draft.value);setRevision(draft.revision);setNotice(fixture?'Fictional email draft saved. Nothing was sent.':'Email draft saved encrypted on this laptop. Nothing was sent.')}

  }

  async function prepare(){

    if(!revision||dirty||conflict)return

    reviewIds.current[revision]||=crypto.randomUUID()

    const result=await call({type:'review',id,revision,requestId:reviewIds.current[revision]})

    const held=result?.reviews?.find(r=>r.id===reviewIds.current[revision])

    if(held){setReview(held);setNotice('Email review held. Nothing was sent.')}

  }

  async function openMessage(message:Incoming){const result=await call({type:'message',key:message.key});if(result?.message)setSelected(result.message)}

  function resolve(useSaved:boolean){if(!conflict)return;setBase(conflict.value);setRevision(conflict.revision);if(useSaved)setValue(conflict.value);setConflict(null);setError('');setNotice(useSaved?'Saved version restored.':'Your version is kept. Save it to replace the reviewed saved version.')}

  return <div className="ops-workspace ops-local-mail">

    <a className="ops-skip" href="#mail-content">Skip to email</a>

    <aside className="ops-sidebar"><div className="ops-brand"><Image unoptimized src="/brand/fluffytail-logo-color.svg" alt="" width="52" height="52"/><span><strong>FluffyTail</strong><small>THE STAFF WORKSPACE</small></span></div><span className="ops-sidebar-caption">JEANNE’S EMAIL</span><nav aria-label="Private email">{(['Inbox','Drafts','Held reviews'] as const).map(item=><button key={item} aria-current={view===item?'page':undefined} onClick={()=>setView(item)}>{item}</button>)}</nav><div className="ops-sidebar-bottom"><span className="ops-lock">PRIVATE · THIS LAPTOP ONLY</span><p>For you and Jeanne.<br/>Customer sending is disabled.</p><a href="https://pairpromail.com/" target="_blank" rel="noopener noreferrer">Open Pair webmail ↗</a></div></aside>

    <div className="ops-main"><div className="ops-review-banner"><span><b>{fixture?'Fictional mail review':'Local email preparation'}</b> · {mailboxReadEnabled?'Read-only connection':'Existing mailbox reads paused'} · Customer sending disabled</span></div><header className="ops-topbar"><span>FluffyTail / Email</span><span className="ops-user">J</span></header><main id="mail-content" className="ops-content"><div className="ops-page-heading"><div><p className="ops-eyebrow">YOUR CORRESPONDENCE</p><h1>A thoughtful reply, all together.</h1><p>{account} · Compose and review privately before customer delivery is activated.</p></div><button className="ops-button" disabled={!connected||busy} onClick={()=>compose()}>Compose email</button></div>

      <section className="ops-persistence"><p>{fixture?'This browser review uses fictional email only. Saved test drafts and held reviews stay separate from Jeanne’s real correspondence.':'Reading existing mailbox messages is paused. You can prepare saved drafts and held reviews on this laptop. Drafts stay encrypted, separate from the synthetic Preview. Nothing will be sent.'}</p><button className="ops-button secondary" disabled={busy||!mailboxReadEnabled} onClick={()=>void call({type:'list'})}>{busy?'Connecting…':'Refresh Inbox'}</button>{!connected?<button className="ops-button secondary" disabled={busy} onClick={()=>void call({type:'state'})}>Reconnect saved drafts</button>:null}</section>

      {error?<p className="ops-error" role="alert">{error}</p>:null}{notice?<p className="ops-notice" role="status">{notice}</p>:null}

      <div className="ops-conversation-layout"><section className="ops-family-list" aria-label={view}>{view==='Inbox'?(messages.length?messages.map(message=><button key={message.key} onClick={()=>void openMessage(message)} disabled={busy} aria-pressed={selected?.key===message.key}><span><strong>{message.name||message.from||'Unknown sender'}</strong><small>{message.date}</small><p>{message.subject}</p></span></button>):<p className="ops-empty">{mailboxReadEnabled?'Choose Refresh Inbox to load the latest 30 messages. Message text loads only when opened.':'Reading existing mailbox messages is paused. Compose a draft or use the fictional test workspace to try replies.'}</p>):view==='Drafts'?(state.drafts.length?state.drafts.map(draft=><button key={draft.id} onClick={()=>openDraft(draft)} disabled={busy} aria-pressed={id===draft.id}><span><strong>{draft.value.subject||'(No subject)'}</strong><small>{draft.value.to}</small><p>Saved {new Date(draft.updatedAt).toLocaleString()}</p></span></button>):<p className="ops-empty">No saved email drafts yet.</p>):state.reviews.length?state.reviews.map(held=><button key={held.id} onClick={()=>setReview(held)}><span><strong>{held.subject}</strong><small>{held.to} · Held</small></span></button>):<p className="ops-empty">No held reviews yet.</p>}</section>

      <section className="ops-thread"><header><div className="ops-thread-person"><span className="ops-avatar">J</span><div><h2>{id?'Prepare your email':'Your private email'}</h2><p>Nothing can be sent from this connection yet.</p></div></div></header>

      {selected?<article className="ops-activity ops-incoming-mail"><h3>{selected.subject}</h3><dl><dt>From</dt><dd>{selected.from}</dd><dt>Reply to</dt><dd>{selected.recipient||'Unavailable — use Pair webmail'}</dd></dl><pre>{selected.body}</pre>{selected.truncated?<p>Message text may be shortened. Open Pair webmail for the complete message.</p>:null}<button className="ops-button secondary" disabled={busy||!selected.recipient||!selected.messageId} onClick={()=>compose(selected)}>Reply to this email</button></article>:null}

      {id?<div className="ops-composer ops-email-compose"><dl className="ops-email-addresses"><dt>From / Reply-To</dt><dd>{account}</dd><dt>Conversation</dt><dd>{value.parentKey?'Reply to selected incoming email':'New email'}</dd></dl><label htmlFor="local-mail-to">To</label><input id="local-mail-to" type="email" value={value.to} readOnly={!!value.parentKey} maxLength={254} onChange={event=>setValue(previous=>({...previous,to:event.target.value}))}/><label htmlFor="local-mail-subject">Subject</label><input id="local-mail-subject" value={value.subject} maxLength={160} onChange={event=>setValue(previous=>({...previous,subject:event.target.value}))}/><label htmlFor="local-mail-body">Email message</label><textarea id="local-mail-body" rows={7} value={value.body} maxLength={10000} onChange={event=>setValue(previous=>({...previous,body:event.target.value}))}/><div className="ops-draft-save"><span role="status">{dirty?'Unsaved email changes':revision?'Email draft saved':'New email — not saved yet'}</span><button className="ops-button secondary" disabled={busy||!!conflict||(!dirty&&!!revision)||!value.to.trim()} onClick={()=>void save()}>Save email draft</button></div>

      {conflict?<section className="ops-draft-conflict" role="alert"><strong>Compare the saved email</strong><p>{conflict.value.to} · {conflict.value.subject}</p><pre>{conflict.value.body}</pre><div><button className="ops-button secondary" onClick={()=>resolve(true)}>Use saved email</button><button className="ops-button secondary" onClick={()=>resolve(false)}>Keep my email</button></div></section>:null}

      <button className="ops-button" disabled={busy||dirty||!revision||!!conflict||!value.subject.trim()||!value.body.trim()} onClick={()=>void prepare()}>Review email</button><p className="ops-draft-note">Reviewing saves a held copy. It does not send or add a message to Pair’s Sent folder.</p></div>:<div className="ops-empty"><h2>A place to prepare.</h2><p>Open an incoming message to reply, choose a saved draft, or compose a new email.</p></div>}

      {review?<section className="ops-activity ops-email-outbox" aria-label="Email review"><h3>{review.subject}</h3><p>Held · Nothing sent · {new Date(review.createdAt).toLocaleString()}{id===review.draftId&&(dirty||revision!==review.revision)?' · Earlier saved version; save and review your edits again.':''}</p><dl><dt>From / Reply-To</dt><dd>{review.from}</dd><dt>To</dt><dd>{review.to}</dd><dt>Conversation</dt><dd>{review.inReplyTo?'Reply to incoming message':'New email'}</dd></dl><pre>{review.body}</pre><button className="ops-button" disabled>Send email — disabled</button></section>:null}</section>

      <aside className="ops-context"><p className="ops-eyebrow">BEFORE SENDING</p><h3>Keep every detail clear.</h3><p>Verify the recipient and puppy details before customer delivery is enabled.</p><h3>Payment links</h3><p>Deposit and balance preparation is being tested with fictional families in the isolated workspace. Real payment-link creation and customer delivery remain disabled here.</p><p className="ops-context-footnote">No customer accounts. No production Sanity or payment records are changed. Formatted email, attachments and older mail remain available in Pair webmail.</p></aside></div>

    </main><footer className="ops-footer">FluffyTail staff email · This laptop only · Sending disabled</footer></div>

  </div>

}
