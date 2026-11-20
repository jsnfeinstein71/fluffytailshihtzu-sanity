'use client'
import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {renderFeedbackEmail,type FeedbackEmail} from '@/lib/mail/feedback-email'
export default function FeedbackEmailPreview({email}:{email:FeedbackEmail}){
 const [open,setOpen]=useState(false)
 return <><button className="ops-button secondary" type="button" onClick={()=>setOpen(true)}>Preview formatted invitation</button>{open?createPortal(<Dialog email={email} close={()=>setOpen(false)}/>,document.body):null}</>
}
function Dialog({email,close}:{email:FeedbackEmail;close:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),[plain,setPlain]=useState(false),rendered=renderFeedbackEmail(email)
 useEffect(()=>{const node=ref.current;node?.showModal();return()=>node?.close()},[])
 return <dialog ref={ref} className="ops-email-preview-dialog" aria-labelledby="feedback-email-title" onCancel={close} onClose={close}><header><div><h2 id="feedback-email-title">Feedback invitation</h2><p>Your current draft. Previewing does not send.</p></div><button className="ops-button secondary" onClick={close} autoFocus>Close preview</button></header><div className="ops-email-preview-controls"><label><input type="checkbox" checked={plain} onChange={e=>setPlain(e.target.checked)}/> Plain text alternative</label></div>{plain?<pre>{rendered.text}</pre>:<iframe title="Formatted feedback invitation" sandbox="" srcDoc={rendered.html}/>}</dialog>
}
