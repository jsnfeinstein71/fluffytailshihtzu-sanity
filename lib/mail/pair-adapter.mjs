// Provider I/O only. The application supplies persisted claims, safe snapshots,
// scoped thread IDs and explicit server activation; never a browser-supplied host.
const account='jeanne@fluffytailshihtzu.com'
const disabled=()=>{throw Object.assign(new Error('Real Pair mailbox access and sending are disabled.'),{code:'MAIL_DISABLED'})}
const validId=value=>typeof value==='string'&&/^<[^<>\s\x00-\x1f]{1,250}>$/.test(value)
export function createPairAdapter({password,sendEnabled=false,readEnabled=false,recipientAllowlist=/** @type {string[]} */([]),smtpFactory=undefined,imapFactory=undefined}){
  const allow=recipient=>recipientAllowlist.some(address=>address.toLowerCase()===recipient.toLowerCase())
  return {
    async send(message){
      if(sendEnabled!==true||!password||!allow(message.to)||message.from!==account||message.replyTo!==account)disabled()
      let transport
      try{
        const factory=smtpFactory||((await import('nodemailer')).default.createTransport)
        transport=factory({host:'smtp.pairpromail.com',port:465,secure:true,requireTLS:true,tls:{minVersion:'TLSv1.2',rejectUnauthorized:true,servername:'smtp.pairpromail.com'},auth:{user:account,pass:password},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000,dnsTimeout:5000,logger:false,debug:false,transactionLog:false,disableFileAccess:true,disableUrlAccess:true,pool:false,name:'fluffytailshihtzu.com'})
        const result=await transport.sendMail({from:account,replyTo:account,to:message.to,subject:message.subject,text:message.body,...(message.html?{html:message.html}:{}),messageId:message.messageId,...(message.attachmentParts?.length?{attachments:message.attachmentParts.map(file=>({filename:file.filename,contentType:file.contentType,content:Buffer.from(file.contentBase64,'base64'),contentDisposition:'attachment'}))}:{}),...(message.inReplyTo?{inReplyTo:message.inReplyTo,references:message.references}:{}),envelope:{from:account,to:[message.to]},disableFileAccess:true,disableUrlAccess:true})
        if(result.accepted?.length===1&&String(result.accepted[0]).toLowerCase()===message.to.toLowerCase()&&!result.rejected?.length&&/^2\d\d\b/.test(result.response||''))return {outcome:'accepted',code:'SMTP_ACCEPTED'}
        return {outcome:'uncertain',code:'SMTP_RESULT_UNCONFIRMED'}
      }catch(error){
        // Only explicit protocol rejection or a known pre-DATA failure permits retry.
        const rejected=Number.isInteger(error.responseCode)&&error.responseCode>=400&&error.responseCode<=599
        const beforeData=['CONN','EHLO','HELO','STARTTLS','AUTH','MAIL FROM','RCPT TO'].some(command=>String(error.command||'').toUpperCase().startsWith(command))
        return {outcome:rejected||beforeData?'rejected':'uncertain',code:rejected?'SMTP_REJECTED':beforeData?'SMTP_NOT_SUBMITTED':'SMTP_OUTCOME_UNCERTAIN'}
      }finally{try{transport?.close()}catch{/* Never log credentials or message text. */}}
    },
    async sync({cursor,threads}){
      if(readEnabled!==true||!password)disabled()
      if(threads.some(t=>!allow(t.to)||!validId(t.messageId)))disabled()
      const factory=imapFactory||((options)=>new (imapModule.ImapFlow)(options))
      const imapModule=imapFactory?null:await import('imapflow')
      const client=factory({host:'imap.pairpromail.com',port:993,secure:true,auth:{user:account,pass:password},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true,servername:'imap.pairpromail.com'},logger:false,logRaw:false,disableAutoIdle:true,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000})
      client.on('error',()=>{})
      try{
        await client.connect()
        const mailbox=await client.mailboxOpen('INBOX',{readOnly:true})
        if(mailbox.readOnly!==true)throw new Error('READ_ONLY_REQUIRED')
        const validity=String(mailbox.uidValidity)
        // First approved sync establishes a future-only watermark, never imports history.
        if(!cursor?.validity)return {validity,lastUid:Math.max(0,Number(mailbox.uidNext)-1),messages:[],initialized:true}
        if(cursor.validity!==validity)throw new Error('MAILBOX_IDENTITY_CHANGED')
        const candidates=new Set()
        if(threads.length>100)throw new Error('THREAD_SCOPE_LIMIT')
        for(const recipient of [...new Set(threads.map(t=>t.to))]){
          const scoped=threads.filter(t=>t.to===recipient)
          const found=await client.search({uid:`${cursor.lastUid+1}:*`,from:recipient,to:account,or:scoped.flatMap(thread=>[{header:{'in-reply-to':thread.messageId}},{header:{references:thread.messageId}}])},{uid:true})
          for(const uid of found||[])if(uid>cursor.lastUid)candidates.add(uid)
        }
        const messages=[]
        for(const uid of [...candidates].sort((a,b)=>a-b).slice(0,20)){
          const item=await client.fetchOne(String(uid),{envelope:true,headers:['references'],bodyStructure:true,internalDate:true},{uid:true})
          if(!item)throw new Error('MESSAGE_DISAPPEARED')
          const e=item.envelope||{}
          const references=[...(String(item.headers||'').match(/<[^<>\s\x00-\x1f]{1,250}>/g)||[])].slice(-20)
          const from=e.from?.length===1?e.from[0].address:''
          const to=e.to?.map(a=>a.address)||[]
          const ids=[e.inReplyTo,...references].filter(validId)
          // Recheck exact sender/recipient/thread before fetching any body.
          if(!to.some(address=>String(address).toLowerCase()===account)||!threads.some(t=>t.to.toLowerCase()===String(from).toLowerCase()&&ids.includes(t.messageId)))continue
          function part(node){if(!node||node.disposition==='attachment'||node.type==='message/rfc822')return null;if(node.type==='text/plain')return node;for(const child of node.childNodes||[]){const found=part(child);if(found)return found}return null}
          const plain=part(item.bodyStructure)
          let body='Plain-text content unavailable. Read formatted content or attachments in Pair webmail.'
          if(plain){
            const result=await client.download(String(uid),plain.part||'1',{uid:true,maxBytes:50000})
            if(!result.content)throw new Error('MESSAGE_TEXT_UNAVAILABLE')
            const chunks=[];let size=0
            for await(const chunk of result.content){size+=chunk.length;if(size>50000)throw new Error('MESSAGE_TOO_LARGE');chunks.push(chunk)}
            body=new TextDecoder(result.meta.charset||'utf-8').decode(Buffer.concat(chunks)).replace(/\x00/g,'')
            if(size>=50000)body+='\n[Message preview shortened.]'
          }
          messages.push({uid,validity,messageId:validId(e.messageId)?e.messageId:null,from,to:account,subject:String(e.subject||'(No subject)').replace(/[\x00-\x1f\x7f]/g,' ').slice(0,160),body,inReplyTo:validId(e.inReplyTo)?e.inReplyTo:null,references,time:String(item.internalDate||new Date().toISOString())})
        }
        const considered=[...candidates].sort((a,b)=>a-b).slice(0,20)
        return {validity,lastUid:considered.at(-1)||cursor.lastUid,messages}
      }catch{throw new Error('Pair reply synchronization could not be confirmed. Its saved cursor is kept; no mailbox changes were made.')}
      finally{try{await client.logout()}catch{/* Read-only session. */}try{client.close()}catch{/* No raw protocol errors. */}}
    },
  }
}
