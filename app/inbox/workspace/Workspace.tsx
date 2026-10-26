'use client'

import {useEffect, useReducer, useRef, useState} from 'react'
import Link from 'next/link'
import {draftKey, families as fixtureFamilies, familyFromSaved, initialState, matchesFamily, money, paymentSummary, pickupChecks, puppies, reviewReducer, type Channel, type Attempt, type Family} from './model'
import {useSavedWorkspace} from './useSavedWorkspace'
import {useEmailWorkspace} from './useEmailWorkspace'
import EmailComposer,{EmailOutbox,SyncedEmails} from './EmailComposer'

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

export default function Workspace() {
  const [view, setView] = useState<View>('Today')
  const [familyId, setFamilyId] = useState(fixtureFamilies[0].id)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All families')
  const [channel, setChannel] = useState<Channel>('Email')
  const [threadTab, setThreadTab] = useState('Messages')
  const [scenario, setScenario] = useState<Attempt['outcome']>('simulated')
  const [noteDrafts, setNoteDrafts] = useState<Record<string,string>>({})
  const [notice, setNotice] = useState('')
  const [paymentReview, setPaymentReview] = useState(false)
  const [state, dispatch] = useReducer(reviewReducer, undefined, initialState)
  const saved = useSavedWorkspace()
  const email = useEmailWorkspace(saved.ready)
  const restored = useRef(false)
  const noteRequests = useRef<Record<string,{body:string;id:string}>>({})
  const families=saved.records?.length?saved.records.map(familyFromSaved):fixtureFamilies
  const family = families.find(f => f.id === familyId)||families[0]
  const puppy = puppies.find(p => p.id === family.puppyId)
  const balance = paymentSummary(family)
  const draft = state.drafts[draftKey(family.id, channel)] || ''
  const note = noteDrafts[family.id] || ''
  const draftConflict = saved.conflicts[draftKey(family.id,channel)]
  const draftDirty = saved.ready && draft !== saved.base(family.id,channel)
  const visible = families.filter(f => matchesFamily(f, search) && (filter !== 'Needs a reply' || f.unread) && (filter !== 'Pickup planning' || f.stage === 'Pickup planning'))
  const attempts = state.attempts.filter(a => a.familyId === family.id)
  useEffect(()=>{
    if(saved.ready && saved.records){dispatch({type:'restore',families:saved.records,loadDrafts:!restored.current});restored.current=true}
  },[saved.records,saved.ready])
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
    if(confirmed){setNoteDrafts(previous=>previous[key]?.trim()===body?{...previous,[key]:''}:previous);delete noteRequests.current[key];setNotice(`Private note saved for ${family.name} in the test workspace.`)}
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
    setFamilyId(f.id); setChannel(f.preference === 'Text' ? 'Text' : 'Email'); setThreadTab('Messages'); setView(destination); setNotice(''); setPaymentReview(false); dispatch({type:'clear-error'})
  }
  function changeView(next: View) {setView(next); setPaymentReview(false); setNotice(''); dispatch({type:'clear-error'})}
  function simulate() {
    const action = {type:'attempt' as const, familyId:family.id, channel, outcome:scenario}
    const result = reviewReducer(state, action)
    dispatch(action)
    setNotice(result.error ? '' : scenario === 'simulated' ? 'Simulation recorded. Nothing was sent.' : scenario === 'failed' ? 'Simulated failure. Your draft is retained; nothing was sent.' : 'Simulated uncertain result. Review the activity before retrying. Nothing was sent.')
  }

  return <div className="ops-workspace">
    <a className="ops-skip" href="#workspace-content">Skip to workspace</a>
    <aside className="ops-sidebar">
      <div className="ops-brand"><img src="/brand/fluffytail-logo-color.svg" alt="" width="52" height="52" /><span><strong>FluffyTail</strong><small>THE STAFF WORKSPACE</small></span></div>
      <span className="ops-sidebar-caption">YOUR BUSINESS</span>
      <nav aria-label="Staff workspace">{navigation.map(item => <button key={item.name} onClick={() => changeView(item.name)} aria-current={view === item.name ? 'page' : undefined}><span aria-hidden="true">{item.symbol}</span>{item.name}{item.name === 'Conversations' ? <b>{families.filter(f=>f.unread).length}</b> : null}</button>)}</nav>
      <div className="ops-sidebar-bottom"><span className="ops-lock">PRIVATE · STAFF ONLY</span><p>For you and Jeanne.<br />Families don’t need an account.</p><Link href="/inbox">Open existing Inbox ↗</Link></div>
    </aside>
    <div className="ops-main">
      <div className="ops-review-banner"><span><b>Test workspace</b> · Synthetic inquiries and examples · Saved conversations · Customer sending disabled</span><button onClick={() => {dispatch({type:'reset-attempts'}); setNotice('Delivery simulations cleared. Saved drafts, notes and pickup preparation are kept.')}}>Reset simulations</button></div>
      <header className="ops-topbar"><span>FluffyTail <span aria-hidden="true">/</span> {view}</span><div><span className="ops-status-dot" /> Preview only <span className="ops-user">J</span></div></header>
      <main id="workspace-content" className="ops-content">
        <div className="ops-page-heading"><div><p className="ops-eyebrow">{view === 'Today' ? 'WELCOME BACK, JEANNE' : `YOUR ${view.toUpperCase()}`}</p><h1>{headings[view]}</h1><p>{descriptions[view]}</p></div><Badge tone="quiet">Staff only</Badge></div>
        {notice ? <p role="status" className="ops-notice">{notice}</p> : null}
        <section className="ops-persistence" aria-label="Saved workspace connection">
          {saved.loading ? <p role="status">Loading saved workspace…</p> : saved.ready ? <p><Badge tone={saved.error?'amber':'green'}>{saved.error?'Saved copy loaded · connection needs attention':'Saved records connected'}</Badge> Drafts, private notes and pickup preparation can be saved. Email drafts and held reviews can be saved. Customer delivery and live payments are disabled.</p> : saved.records ? <><p>Connect submitted test inquiries to their private family records and conversations. Any existing saved records are kept.</p><button className="ops-button secondary" disabled={saved.busy} onClick={()=>void saved.mutate({type:'initialize'})}>{saved.busy?'Starting…':'Load example families'}</button><button className="ops-button secondary" disabled={saved.busy} onClick={()=>void saved.mutate({type:'sync-inquiries'})}>Connect submitted inquiries</button></> : <p>The saved workspace is not connected yet. Editing is paused until its records can be loaded.</p>}
          {saved.error ? <div role="alert"><p>{saved.error}</p><button className="ops-button secondary" onClick={()=>void saved.load()} disabled={saved.busy||saved.loading}>Retry connection</button></div> : null}
          {saved.ready&&!saved.error ? <button className="ops-button secondary" onClick={()=>{void saved.mutate({type:'sync-inquiries'}).then(()=>email.load())}} disabled={saved.busy||saved.loading}>Refresh inquiries and saved records</button> : null}
        </section>
        {view === 'Today' ? <>
          <div className="ops-stats">
            {[{label:'Families to follow up',value:String(families.filter(f=>f.unread).length),detail:'New questions and next steps',next:'Conversations' as View}, {label:'Available puppies',value:'1',detail:'In the fictional Autumn litter',next:'Puppies' as View}, {label:'Recorded deposits',value:money(families.reduce((sum,f)=>sum+f.records.filter(r=>r.paymentStatus==='paid').reduce((paid,r)=>paid+Math.round(r.amountPaid*100),0),0)),detail:'Confirmed example payments only',next:'Payments' as View}, {label:'Pickup to coordinate',value:'1',detail:'Time and details need confirmation',next:'Pickups' as View}].map(stat => <button className="ops-stat" key={stat.label} onClick={() => changeView(stat.next)}><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.detail}</small><i aria-hidden="true">↗</i></button>)}
          </div>
          <div className="ops-overview-grid"><section className="ops-panel"><div className="ops-panel-heading"><div><p className="ops-eyebrow">A LITTLE ATTENTION</p><h2>What needs you next</h2></div><Badge>{families.filter(f=>f.unread).length} next steps</Badge></div>
            {families.filter(f => f.unread).map((f,i) => <button className="ops-task" key={f.id} onClick={() => selectFamily(f)}><span className="ops-task-number">0{i+1}</span><span><strong>{f.next}</strong><small>{f.name} · {f.stage}</small></span><span aria-hidden="true">→</span></button>)}
            <div className="ops-panel-footer">Start with a conversation. Confirm the details before requesting payment.</div>
          </section><section className="ops-feature"><span className="ops-eyebrow">THE AUTUMN LITTER · FICTIONAL</span><h2>One more little<br />hello to make.</h2><p>Clover is available in this review. Keep her inquiry and family conversations close at hand.</p><button className="ops-button light" onClick={() => changeView('Puppies')}>Meet the puppies <span aria-hidden="true">→</span></button><div className="ops-feature-photo" role="img" aria-label="Two cream Shih Tzu puppies from the approved FluffyTail photography" /></section></div>
          <section className="ops-panel ops-connection-strip"><div><Badge tone="amber">Connections pending</Badge><h3>Your business stays in your hands.</h3><p>Email preparation is connected to saved test records. Live mail, payments, and inventory remain separate. Good Dog stays available while the new workflow is proven.</p></div><button className="ops-button secondary" onClick={() => changeView('Readiness')}>Review readiness →</button></section>
        </> : null}

        {view === 'Families' || view === 'Conversations' ? <>
          <div className="ops-tools"><label><span className="ops-sr">Search families, puppies, or stages</span><input type="search" placeholder="Search families, puppies, or stages…" value={search} onChange={e => setSearch(e.target.value)} /></label><label><span className="ops-sr">Filter families</span><select value={filter} onChange={e => setFilter(e.target.value)}><option>All families</option><option>Needs a reply</option><option>Pickup planning</option></select></label><span>{visible.length} {visible.length === 1 ? 'family' : 'families'}</span></div>
          {view === 'Families' ? <div className="ops-family-grid">{visible.length ? visible.map(f => <article className="ops-panel ops-family-card" key={f.id}><div className="ops-thread-person"><Avatar family={f}/><div><h2>{f.name}</h2><p>{f.location}</p></div></div><Badge>{f.stage}</Badge><dl><dt>Preferred contact</dt><dd>{f.preference}</dd><dt>Puppy</dt><dd>{puppies.find(p => p.id === f.puppyId)?.name || 'Not associated'}</dd><dt>Confirmed paid</dt><dd>{paymentSummary(f) ? money(paymentSummary(f)!.paidCents) : 'No payment record'}</dd></dl><p>{f.next}</p><button className="ops-button secondary" onClick={() => selectFamily(f)}>Open family conversation →</button></article>) : <p className="ops-empty">No families match. Try another name or clear the filter.</p>}</div> : <div className="ops-conversation-layout"><section className="ops-family-list" aria-label="Families">{visible.length ? visible.map(f => <button aria-pressed={family.id === f.id} key={f.id} onClick={() => selectFamily(f)}><Avatar family={f}/><span><strong>{f.name}{f.unread ? <i aria-label="Needs follow-up" /> : null}</strong><small>{f.stage} · {f.preference}</small><p>{f.messages.at(-1)?.body}</p></span></button>) : <p className="ops-empty">No families match. Try another name or clear the filter.</p>}</section>
            <section className="ops-thread"><header><div className="ops-thread-person"><Avatar family={family}/><div><h2>{family.name}</h2><p>{family.location} · Prefers {family.preference.toLowerCase()}</p></div></div><Badge>{family.stage}</Badge></header>
              <div className="ops-thread-tabs" aria-label="Conversation sections">{['Messages','Activity','Private notes'].map(tab => <button aria-pressed={threadTab === tab} key={tab} onClick={() => setThreadTab(tab)}>{tab}</button>)}</div>
              {threadTab === 'Messages' ? <><div className="ops-messages"><p className="ops-thread-disclosure">Test conversation · Submission and delivery status appear separately below</p>{family.messages.map(m => <article className={`ops-message ${m.direction}`} key={m.id}><small>{m.direction === 'in' ? family.name.split(' ')[0] : 'Jeanne'} · {m.channel} · {m.time}</small><p>{m.body}</p>{m.channel==='Email'&&m.direction==='in'&&!m.id.startsWith('private.inquiry.')?<button className="ops-button secondary" disabled={!email.entries[family.id]} onClick={()=>{setChannel('Email');email.startReply(family.id,m.id)}}>Reply by email</button>:null}</article>)}<SyncedEmails familyId={family.id} email={email} onReply={messageId=>{setChannel('Email');email.startReply(family.id,messageId)}}/>{attempts.map(a => <article className="ops-message out simulated" key={a.id}><small>{a.channel} · {a.outcome === 'simulated' ? 'Simulated only' : a.outcome === 'failed' ? 'Failed simulation' : 'Needs review · simulated'}</small><p>{a.body}</p></article>)}</div>
                <div className="ops-composer"><div className="ops-channel-picker"><label>Reply via <select aria-label="Reply channel" value={channel} onChange={e => setChannel(e.target.value as Channel)}><option>Email</option><option disabled={!family.smsConsent}>Text</option></select></label><small>{channel === 'Email' ? 'Saved drafts · customer sending disabled' : 'SMS consent recorded in this fixture'}</small></div>
                  {!family.smsConsent ? <p className="ops-consent-note">No SMS consent. Use email for this family.</p> : null}
                  {channel==='Email'?<EmailComposer family={family} email={email}/>:<><label className="ops-sr" htmlFor="workspace-reply">Message to {family.name}</label><textarea id="workspace-reply" value={draft} disabled={!saved.ready} maxLength={10000} onChange={e => dispatch({type:'draft', familyId:family.id, channel, body:e.target.value})} placeholder="Write a text reply…" rows={4}/>
                  <div className="ops-draft-save"><span role="status">{!saved.ready?'Connect saved records before editing.':draftDirty?'Unsaved draft changes':'Draft matches your saved copy'}</span><button className="ops-button secondary" disabled={!saved.ready||saved.busy||!draftDirty||!!draftConflict} onClick={()=>void saveDraft()}>{saved.busy?'Saving…':'Save draft'}</button></div>
                  {draftConflict ? <section className="ops-draft-conflict" role="alert"><strong>This draft changed in another tab.</strong><p>Your text is kept above. Compare it with the saved version:</p><pre>{draftConflict.saved||'(Empty saved draft)'}</pre><div><button className="ops-button secondary" onClick={()=>resolveDraft(true)}>Use saved draft</button><button className="ops-button secondary" onClick={()=>resolveDraft(false)}>Keep my draft</button></div></section> : null}
                  <div className="ops-compose-actions"><label>Test result <select aria-label="Simulated delivery result" value={scenario} onChange={e => setScenario(e.target.value as Attempt['outcome'])}><option value="simulated">Success simulation</option><option value="failed">Failure simulation</option><option value="review">Uncertain simulation</option></select></label><button className="ops-button" onClick={simulate} disabled={!draft.trim()}>Simulate reply →</button></div>
                  <p className="ops-draft-note">Save your draft to keep it after reloading. Delivery simulations do not change the saved copy or send anything.</p>{state.error ? <p role="alert" className="ops-error">{state.error}</p> : null}</>}
                </div></> : threadTab === 'Activity' ? <div className="ops-activity"><h3>Conversation & payment activity</h3><p>Inquiry received · {family.preference} preferred</p>{family.records.map((r,i) => <p key={i}>Fixture payment confirmed · {money(r.amountPaid * 100)}</p>)}{attempts.map(a => <p key={a.id}>Attempt {a.id} · {a.channel} · {a.outcome === 'review' ? 'Uncertain simulation — review before retrying' : a.outcome === 'failed' ? 'Failure simulation — draft retained' : 'Success simulation — nothing sent'}</p>)}<EmailOutbox reviews={(email.data?.reviews||[]).filter(r=>r.familyId===family.id)}/><small>Sending a message never marks a payment paid or reserves a puppy.</small></div> : <div className="ops-activity"><h3>Notes for your team</h3><p>Internal only. Saved notes remain here after reloading.</p>{(state.notes[family.id] || []).map((n,i) => <p className="ops-private-note" key={i}>{n}</p>)}<form onSubmit={e => {e.preventDefault();void saveNote()}}><label htmlFor="workspace-note">Add a private note</label><textarea id="workspace-note" value={note} maxLength={4000} disabled={!saved.ready} onChange={e => setNoteDrafts(previous=>({...previous,[family.id]:e.target.value}))} rows={4}/><button className="ops-button" disabled={!saved.ready||saved.busy||!note.trim()}>{saved.busy?'Saving…':'Save private note'}</button></form></div>}
            </section>
            <aside className="ops-context"><p className="ops-eyebrow">FAMILY DETAILS</p><h3>{puppy?.name || 'Finding the right fit'}</h3><p>{puppy ? `${puppy.sex} · ${puppy.color} · ${puppy.litter}` : 'No puppy associated yet. An inquiry is not a reservation.'}</p><dl><dt>Email</dt><dd>{family.email}</dd><dt>Phone</dt><dd>{family.phone}</dd><dt>Next step</dt><dd>{family.next}</dd></dl>{balance ? <><h3>Payment snapshot</h3><dl><dt>Agreed price · fixture</dt><dd>{money(balance.totalCents)}</dd><dt>Confirmed paid</dt><dd>{money(balance.paidCents)}</dd><dt>Remaining balance</dt><dd>{money(balance.remainingCents)}</dd></dl><button className="ops-button secondary" onClick={() => {setView('Payments'); setPaymentReview(true)}}>Review payment request</button></> : null}<p className="ops-context-footnote">Private staff record. No account, invitation, or password is needed by this family.</p></aside>
          </div>}
        </> : null}

        {view === 'Puppies' ? <div className="ops-puppy-grid">{puppies.map(p => <article className="ops-panel ops-puppy" key={p.id}><div className={`ops-puppy-monogram ${p.id}`} aria-hidden="true">{p.name[0]}</div><div><div className="ops-panel-heading"><h2>{p.name}</h2><Badge tone={p.status === 'Available' ? 'green' : ''}>{p.status}</Badge></div><p>{p.sex} · {p.color}</p><small>{p.litter} · Fictional inventory</small><dl><dt>Price</dt><dd>{money(p.price * 100)}</dd><dt>Deposit</dt><dd>{money(p.deposit * 100)}</dd><dt>Associated family</dt><dd>{families.find(f => f.puppyId === p.id)?.name || 'No family yet'}</dd></dl>{families.find(f => f.puppyId === p.id) ? <button className="ops-button secondary" onClick={() => selectFamily(families.find(f => f.puppyId === p.id)!)}>Open family →</button> : <button className="ops-button secondary" onClick={() => {setSearch(p.name); setFilter('All families'); setView('Conversations')}}>Find related inquiry →</button>}<p className="ops-context-footnote">Association and availability are separate. No inventory changes are made in this review.</p></div></article>)}</div> : null}

        {view === 'Payments' ? <><div className="ops-callout"><strong>Payment certainty comes first.</strong><p>Historical prices remain attached to their records. A payment request or sent link does not confirm payment. No live links are created here.</p></div><div className="ops-payment-grid"><section className="ops-panel"><div className="ops-panel-heading"><h2>Payment overview</h2><Badge>Fixture records</Badge></div>{families.filter(f => f.puppyId).map(f => {const b = paymentSummary(f)!; return <button className="ops-payment-row" key={f.id} onClick={() => {setFamilyId(f.id); setPaymentReview(true)}}><Avatar family={f}/><span><strong>{f.name}</strong><small>{puppies.find(p => p.id === f.puppyId)?.name} · {b.paidCents ? 'Deposit recorded' : 'No payment recorded'}</small></span><span><strong>{money(b.remainingCents)}</strong><small>Remaining</small></span><span aria-hidden="true">→</span></button>})}</section>
          <section className="ops-panel ops-payment-detail">{paymentReview && balance ? <><p className="ops-eyebrow">REVIEW REQUEST · NO LINK CREATED</p><h2>{family.name}</h2><p>{puppy?.name} · {family.preference} preferred</p><dl><dt>Puppy price</dt><dd>{money(balance.totalCents)}</dd><dt>Deposit amount</dt><dd>{money(balance.depositCents)}</dd><dt>Recorded paid</dt><dd>{money(balance.paidCents)}</dd><dt>Remaining</dt><dd>{money(balance.remainingCents)}</dd><dt>Additional taxes / fees</dt><dd>$0.00</dd></dl><p>Deposits are non-refundable and apply to the total price. Balance may be paid before or at pickup, as coordinated with Jeanne.</p><Badge tone="amber">Live request creation disabled</Badge><p className="ops-context-footnote">Prepare a test payment email in the family conversation. Test links cannot collect money; delivery, live checkout and reconciliation remain disabled.</p><button className="ops-button secondary" onClick={() => selectFamily(family)}>Open conversation →</button></> : <div className="ops-empty"><span aria-hidden="true">↖</span><h2>Review before requesting.</h2><p>Choose a family to see the puppy, price, confirmed payments, and remaining balance together.</p></div>}</section></div></> : null}

        {view === 'Pickups' ? <div className="ops-pickup-grid">{families.filter(f => f.puppyId).map(f => <section className="ops-panel" key={f.id}><div className="ops-panel-heading"><div><p className="ops-eyebrow">{puppies.find(p => p.id === f.puppyId)?.name} + {f.name}</p><h2>{f.pickup ? 'Plan coming together' : 'Details to coordinate'}</h2></div><Badge>{(state.checks[f.id]||[]).length}/{pickupChecks.length}</Badge></div><p className="ops-pickup-location">{f.pickup || 'Pickup location and time have not been confirmed.'}</p><p>Pickup in Mobile or at the airport, coordinated with Jeanne.</p><div className="ops-checklist">{pickupChecks.map(item => <label key={item}><input type="checkbox" disabled={!saved.ready||saved.busy} checked={(state.checks[f.id]||[]).includes(item)} onChange={event => void saved.mutate({type:'check',familyId:f.id,item,checked:event.target.checked})}/><span>{item}</span></label>)}</div><p className="ops-context-footnote">Preparation checks save only after confirmation. They do not create appointments, medical records, or payment confirmations.</p><button className="ops-button secondary" onClick={() => selectFamily(f)}>Coordinate with family →</button></section>)}</div> : null}

        {view === 'Readiness' ? <section className="ops-panel ops-readiness"><div className="ops-panel-heading"><div><p className="ops-eyebrow">BEFORE LIVE BUSINESS</p><h2>Prove each part of the journey.</h2></div><Badge tone="amber">Not ready for live use</Badge></div>{[
          ['Staff access','Existing operator protection is required. This review has no customer login or public navigation link.'],
          ['Jeanne’s email','Hosted compose/reply drafts, outgoing attempts and threaded reply synchronization are implemented. Pair access needs the approved owner-only trial; customer email and production activation remain gated.'],
          ['Text messaging','No messages sent. Retain opt-in checks, delivery states, incoming replies, and retry protection before activation.'],
          ['Deposits & balances','No live links created. Validate historical pricing, confirmed payments, expired links, duplicate events, and before/at-pickup collection.'],
          ['Puppies & reservations','Fictional inventory only. Family association, availability, reservation confirmation, and payment state need independent checks.'],
          ['Pickup & records','Private preparation checks can be saved for fictional families. Actual documents, starter kit handling, and pickup agreements still need integration.'],
          ['Privacy & recovery','Saved records and draft conflict handling are under isolated testing. Production privacy release gates, backups, and payment reconciliation remain open.'],
        ].map(([title,detail]) => <article key={title}><span className="ops-readiness-circle" aria-hidden="true">○</span><div><h3>{title}</h3><p>{detail}</p></div><Badge tone="quiet">Pending</Badge></article>)}<div className="ops-panel-footer">No production records, payments, mailbox settings, or customer-facing design are changed by this review.</div></section> : null}
      </main>
      <footer className="ops-footer">FluffyTail staff workspace · Fictional records only · Saved drafts, notes and pickup checks survive reloading</footer>
    </div>
  </div>
}
