import {account,servers} from './connection-check.mjs'

export class MailboxError extends Error {constructor(message,status=400){super(message);this.status=status}}
const cleanHeader=value=>String(value||'').replace(/[\x00-\x1f\x7f]/g,' ').slice(0,500)
const address=value=>typeof value==='string'&&value.length<=254&&/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value)?value:''
const messageId=value=>typeof value==='string'&&/^<[^<>\s\x00-\x1f]{1,250}>$/.test(value)?value:null
export function summarizeMessage(message,validity){
  const envelope=message.envelope||{}
  const replyAddresses=(envelope.replyTo?.length?envelope.replyTo:envelope.from)||[]
  const recipient=replyAddresses.length===1?address(replyAddresses[0].address):''
  const from=envelope.from?.[0]||{}
  return {key:`${validity}:${message.uid}`,uid:message.uid,validity:String(validity),from:address(from.address),name:cleanHeader(from.name),subject:cleanHeader(envelope.subject)||'(No subject)',date:cleanHeader(envelope.date||message.internalDate),recipient:recipient.toLowerCase()===account?'':recipient,messageId:messageId(envelope.messageId)}
}
function plainPart(node){
  if(!node||node.disposition==='attachment'||node.type==='message/rfc822')return null
  if(node.type==='text/plain')return node
  for(const child of node.childNodes||[]){const found=plainPart(child);if(found)return found}
  return null
}
export function createInboxReader({password,imapFactory}){
  async function connected(operation){
    const client=imapFactory({host:servers.imap,port:993,secure:true,auth:{user:account,pass:password},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true,servername:servers.imap},logger:false,logRaw:false,disableAutoIdle:true,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000})
    client.on('error',()=>{})
    try{
      await client.connect()
      const mailbox=await client.mailboxOpen('INBOX',{readOnly:true})
      if(mailbox.readOnly!==true)throw new MailboxError('Read-only Inbox access could not be confirmed.',503)
      return await operation(client,mailbox)
    }catch(error){if(error instanceof MailboxError)throw error;throw new MailboxError('Jeanne’s mailbox could not be reached securely. Saved drafts are kept. Try again after checking the connection.',503)}
    finally{try{await client.logout()}catch{/* No raw provider errors or correspondence in logs. */}try{client.close()}catch{/* Already closed. */}}
  }
  async function selected(client,mailbox,key,body){
    if(typeof key!=='string'||!/^\d{1,30}:\d{1,12}$/.test(key))throw new MailboxError('Choose an incoming email.',404)
    const [validity,uid]=key.split(':')
    if(String(mailbox.uidValidity)!==validity)throw new MailboxError('The mailbox has changed. Refresh the Inbox before replying.',409)
    const message=await client.fetchOne(uid,{envelope:true,bodyStructure:body,internalDate:true},{uid:true})
    if(!message)throw new MailboxError('This email is no longer in the Inbox. Refresh before replying.',404)
    const result=summarizeMessage(message,validity)
    if(!body)return result
    const part=plainPart(message.bodyStructure)
    if(!part)return {...result,body:'A plain-text version is not available. Open Pair webmail to read formatted content or attachments.',bodyUnavailable:true}
    const download=await client.download(uid,part.part||'1',{uid:true,maxBytes:100000})
    if(!download.content)throw new MailboxError('This message text is unavailable. Open it in Pair webmail.',409)
    const chunks=[];let size=0
    for await(const chunk of download.content){size+=chunk.length;if(size>100000){download.content.destroy();throw new MailboxError('This message is too large for the preview. Open it in Pair webmail.',409)}chunks.push(chunk)}
    let text
    try{text=new TextDecoder(download.meta.charset||part.parameters?.charset||'utf-8').decode(Buffer.concat(chunks))}catch{return {...result,body:'This message’s text encoding is not supported. Open it in Pair webmail.',bodyUnavailable:true}}
    return {...result,body:text.replace(/\x00/g,''),truncated:size>=100000}
  }
  return {
    list:()=>connected(async(client,mailbox)=>{
      if(!mailbox.exists)return []
      const items=await client.fetchAll(`${Math.max(1,mailbox.exists-29)}:*`,{envelope:true,internalDate:true})
      return items.map(m=>summarizeMessage(m,mailbox.uidValidity)).reverse()
    }),
    envelope:key=>connected((client,mailbox)=>selected(client,mailbox,key,false)),
    message:key=>connected((client,mailbox)=>selected(client,mailbox,key,true)),
  }
}

export function validateCompose(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['to','subject','body','parentKey'].includes(k)))throw new MailboxError('Invalid email draft.')
  const {to,subject,body,parentKey}=input
  if(!address(to)||typeof subject!=='string'||subject.length>160||/[\x00-\x1f\x7f]/.test(subject)||typeof body!=='string'||body.length>10000||!(parentKey===null||typeof parentKey==='string'&&/^\d{1,30}:\d{1,12}$/.test(parentKey)))throw new MailboxError('Use one valid recipient, a subject up to 160 characters, and a message up to 10,000 characters.')
  return {to,subject,body,parentKey}
}

export function createLocalMailService({reader,readState,writeState}){
  const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
  return {
    list:()=>reader.list(),message:key=>reader.message(key),state:()=>readState(),
    async action(input){
      if(input?.type==='send'||input?.type==='deliver')throw new MailboxError('Customer sending is disabled. This local connection can read and prepare email only.',403)
      if(!input||!['save','review'].includes(input.type)||!uuid.test(input.id)||Object.keys(input).some(k=>!['type','id','revision','value','requestId'].includes(k)))throw new MailboxError('Invalid email action.')
      const state=await readState()
      const current=state.drafts.find(d=>d.id===input.id)
      if(input.type==='save'){
        const value=validateCompose(input.value)
        // Saving text does not require a successful live connection. Canonical reply
        // recipient and threading are rechecked against IMAP before creating a review.
        if(current&&JSON.stringify(current.value)===JSON.stringify(value))return state
        if((current?.revision||null)!==input.revision)throw Object.assign(new MailboxError('This draft changed in another tab. Your entries are kept; compare the saved copy before replacing it.',409),{conflict:current})
        const draft={id:input.id,revision:crypto.randomUUID(),value,updatedAt:new Date().toISOString()}
        state.drafts=[draft,...state.drafts.filter(d=>d.id!==input.id)]
        if(state.drafts.length>100)throw new MailboxError('The local draft limit has been reached. No draft was removed.',409)
        await writeState(state);return state
      }
      if(!uuid.test(input.requestId)||!current||input.revision!==current.revision)throw new MailboxError('Save this email before preparing a review.',409)
      if(!current.value.subject.trim()||!current.value.body.trim())throw new MailboxError('Enter a subject and message before reviewing.')
      const existing=state.reviews.find(r=>r.id===input.requestId)
      if(existing){if(existing.draftId!==current.id||existing.revision!==current.revision)throw new MailboxError('This review request belongs to another saved email.',409);return state}
      const parent=current.value.parentKey?await reader.envelope(current.value.parentKey):null
      if(parent&&(!parent.recipient||parent.recipient.toLowerCase()!==current.value.to.toLowerCase()||!parent.messageId))throw new MailboxError('The reply recipient or original message could not be confirmed. Refresh the incoming message before reviewing.',409)
      const review={id:input.requestId,draftId:current.id,revision:current.revision,from:account,replyTo:account,to:parent?.recipient||current.value.to,subject:current.value.subject,body:current.value.body,inReplyTo:parent?.messageId||null,references:parent?.messageId?[parent.messageId]:[],status:'held',createdAt:new Date().toISOString()}
      if(state.reviews.length>=100)throw new MailboxError('The local review limit has been reached. No history was removed.',409)
      state.reviews.unshift(review);await writeState(state);return state
    },
  }
}
