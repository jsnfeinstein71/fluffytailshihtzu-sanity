// Private loopback companion. No SMTP, Stripe, Sanity or remote writes are available.
import {createServer} from 'node:http'
import {spawn} from 'node:child_process'
import {randomBytes,timingSafeEqual} from 'node:crypto'
import {readFile,writeFile,unlink} from 'node:fs/promises'
import {join,dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {ImapFlow} from 'imapflow'
import {requireLocalMailboxAccess,validateProfile} from './mail/connection-check.mjs'
import {openProtectedPassword} from './mail/windows-credential.mjs'
import {createInboxReader,createLocalMailService,MailboxError} from './mail/inbox-reader.mjs'
import {protectedMailStore} from './mail/protected-state.mjs'
import {gateMailboxReads} from './mail/read-policy.mjs'

requireLocalMailboxAccess()
if(!process.env.LOCALAPPDATA)throw new Error('A local Windows user profile is required.')
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const directory=join(process.env.LOCALAPPDATA,'FluffyTail','MailConnection')
const profilePath=join(directory,'connection.json')
// Fail before opening a listener if the owner has not configured the local account.
validateProfile(JSON.parse(await readFile(profilePath,'utf8')))
const store=protectedMailStore(join(directory,'mail-workspace.dpapi'))
await store.read()
const origin='http://localhost:3110'
let bootstrap=randomBytes(32).toString('hex')
const session=randomBytes(32).toString('hex')
const childPassword=randomBytes(32).toString('hex')
const startedAt=Date.now()
const same=(left,right)=>typeof left==='string'&&/^[a-f0-9]{64}$/.test(left)&&left.length===right.length&&timingSafeEqual(Buffer.from(left),Buffer.from(right))
const allowed=['PATH','Path','SystemRoot','SYSTEMROOT','SystemDrive','WINDIR','windir','COMSPEC','ComSpec','PATHEXT','TEMP','TMP','LOCALAPPDATA','APPDATA','USERPROFILE','HOME']
const childEnv=Object.fromEntries(allowed.filter(key=>process.env[key]).map(key=>[key,process.env[key]]))
Object.assign(childEnv,{NEXT_PUBLIC_SANITY_PROJECT_ID:'gu1xkpsg',NEXT_PUBLIC_SANITY_DATASET:'synthetic',VERCEL_ENV:'preview',FLUFFYTAIL_LOCAL_MAIL_UI:'1',FLUFFYTAIL_WRITE_FREEZE:'1',INBOX_BASIC_AUTH_USER:'local-mail-companion',INBOX_BASIC_AUTH_PASS:childPassword})
async function mailbox(method,key){
  const profile=validateProfile(JSON.parse(await readFile(profilePath,'utf8')))
  const bytes=await openProtectedPassword(profile.protectedPassword)
  let password=bytes.toString('utf8')
  try{return await createInboxReader({password,imapFactory:options=>new ImapFlow(options)})[method](key)}finally{password='';bytes.fill(0)}
}
// Recovery instruction: no existing-message lists, bodies or reply-envelope reads.
// No environment or browser flag enables them in this phase.
const mailboxReadEnabled=false
const reader=gateMailboxReads({list:()=>mailbox('list'),envelope:key=>mailbox('envelope',key),message:key=>mailbox('message',key)},mailboxReadEnabled)
const service=createLocalMailService({reader,readState:()=>store.read(),writeState:state=>store.write(state)})
const accessPath=join(directory,'local-workspace-access.json')
let queue=Promise.resolve()
const server=createServer(async(req,res)=>{
  const common={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}
  const respond=(status,data,headers={})=>{res.writeHead(status,{...common,'Content-Type':'application/json; charset=utf-8',...headers});res.end(JSON.stringify(data))}
  if(req.headers.host!=='localhost:3110')return respond(403,{error:'Use the local staff mailbox address.'})
  const url=new URL(req.url||'/',origin)
  if(url.pathname==='/inbox/mail/connect'&&req.method==='GET'){
    if(Date.now()-startedAt>600000||!bootstrap||!same(url.searchParams.get('key'),bootstrap))return respond(403,{error:'This local sign-in link has expired. Restart the local email companion for a new link.'})
    bootstrap='';await unlink(accessPath).catch(()=>{})
    res.writeHead(303,{...common,Location:'/inbox/mail','Set-Cookie':`fluffytail-local-mail=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`});res.end();return
  }
  const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('fluffytail-local-mail='))?.slice('fluffytail-local-mail='.length)
  if(Date.now()-startedAt>28800000||!same(token,session))return respond(401,{error:'Open the current local staff sign-in link. Customer sending is disabled.'})
  if(url.pathname==='/inbox/mail/api/local'&&req.method==='POST'){
    if(req.headers.origin!==origin||req.headers['sec-fetch-site']==='cross-site')return respond(403,{error:'Use the local staff email page for this action.'})
    if(req.headers['content-type']?.split(';')[0]!=='application/json')return respond(415,{error:'Use a JSON email request.'})
    const task=queue.then(async()=>{
      try{
        const chunks=[];let length=0
        for await(const chunk of req){length+=chunk.length;if(length>100000)throw new MailboxError('The email request is too large.',413);chunks.push(chunk)}
        let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw new MailboxError('Invalid email request.')}
        if(input?.type==='state')return respond(200,{...await service.state(),fixture:false,mailboxReadEnabled})
        if(input?.type==='list')return respond(200,{messages:await service.list(),fixture:false})
        if(input?.type==='message')return respond(200,{message:await service.message(input.key),fixture:false})
        return respond(200,{...await service.action(input),fixture:false})
      }catch(error){return respond(error instanceof MailboxError?error.status:503,{error:error instanceof MailboxError?error.message:'The encrypted email workspace could not confirm this action. Your entries are kept.',conflict:error instanceof MailboxError?error.conflict:undefined})}
    })
    queue=task.catch(()=>{});await task;return
  }
  if(!['GET','HEAD'].includes(req.method))return respond(405,{error:'This local connection cannot send or modify mailbox messages.'})
  if(!(url.pathname==='/inbox/mail'||url.pathname.startsWith('/_next/')||url.pathname.startsWith('/brand/')))return respond(404,{error:'This local service is for Jeanne’s private email only.'})
  try{
    const upstream=await fetch('http://localhost:3111'+url.pathname+url.search,{method:req.method,headers:{authorization:`Basic ${Buffer.from('local-mail-companion:'+childPassword).toString('base64')}`},redirect:'manual'})
    const headers=Object.fromEntries(upstream.headers);delete headers['content-encoding'];delete headers['content-length'];delete headers['set-cookie']
    res.writeHead(upstream.status,{...headers,...common});res.end(Buffer.from(await upstream.arrayBuffer()))
  }catch{return respond(503,{error:'The local email page is starting. Reload in a moment.'})}
})
const app=spawn(process.execPath,[join(root,'node_modules','next','dist','bin','next'),'start','--port','3111','--hostname','localhost'],{cwd:root,env:childEnv,stdio:['ignore','ignore','ignore'],windowsHide:true})
function stop(){server.close();app.kill();void unlink(accessPath).catch(()=>{});setTimeout(()=>process.exit(0),300).unref()}
app.on('error',()=>{console.error('The private local email page could not start.');stop()})
app.on('exit',code=>{if(code){console.error('The private local email page stopped.');stop()}})
server.on('error',()=>{console.error('The private local email address is already in use or unavailable.');stop()})
server.listen(3110,'localhost',async()=>{
  await writeFile(accessPath,JSON.stringify({url:`${origin}/inbox/mail/connect?key=${bootstrap}`} ),{mode:0o600})
  console.log('Jeanne’s local email workspace is ready. Customer sending is disabled. The one-time sign-in link is stored in the protected local connection folder.')
})
process.on('SIGINT',stop);process.on('SIGTERM',stop)
