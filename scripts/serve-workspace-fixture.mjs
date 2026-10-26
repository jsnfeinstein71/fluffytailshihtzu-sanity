// Local browser QA only. Actual route handlers + a disk-backed fake Sanity store.
// Never deploy this helper or supply it with real provider/customer credentials.
import '../tests/register-typescript.mjs'
import {createServer} from 'node:http'
import {spawn} from 'node:child_process'
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises'
import {join,dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {workspaceStoreFixture} from '../tests/workspace-store-fixture.mjs'

if(process.env.VERCEL)throw new Error('This fixture helper is local-only.')
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const storage=join(process.env.LOCALAPPDATA || process.env.TMPDIR || '/tmp','FluffyTail','WorkspaceReview','families.json')
const allowed=['PATH','Path','SystemRoot','SYSTEMROOT','SystemDrive','WINDIR','windir','COMSPEC','ComSpec','PATHEXT','TEMP','TMP','LOCALAPPDATA','APPDATA','USERPROFILE','HOME']
const childEnv=Object.fromEntries(allowed.filter(key=>process.env[key]).map(key=>[key,process.env[key]]))
Object.assign(childEnv,{NEXT_PUBLIC_SANITY_PROJECT_ID:'gu1xkpsg',NEXT_PUBLIC_SANITY_DATASET:'synthetic',VERCEL_ENV:'preview',FLUFFYTAIL_LOCAL_MAIL_UI:'1',FLUFFYTAIL_MAIL_MODE:'fictional',FLUFFYTAIL_WRITE_FREEZE:'0',INBOX_BASIC_AUTH_USER:'fixture-operator',INBOX_BASIC_AUTH_PASS:'fixture-only-password'})
Object.assign(process.env,childEnv)
let initial=[]
try{initial=JSON.parse(await readFile(storage,'utf8'))}catch(error){if(error.code!=='ENOENT')throw new Error('The local fixture could not be read; refusing to replace it.')}
await mkdir(dirname(storage),{recursive:true})
globalThis.fixtureOperatorClient=workspaceStoreFixture(initial,async documents=>{
  await writeFile(storage+'.next',JSON.stringify(documents,null,2),{mode:0o600})
  await rename(storage+'.next',storage)
})
const {GET,POST}=await import('../app/inbox/workspace/api/state/route.ts')
const emailRoutes=await import('../app/inbox/workspace/api/email/route.ts')
const {default:PaymentPreview}=await import('../app/inbox/workspace/payment-preview/[requestId]/page.tsx')
const {default:PaymentNotFound}=await import('../app/inbox/workspace/payment-preview/[requestId]/not-found.tsx')
const {renderToStaticMarkup}=await import('react-dom/server')
const {requireOperator}=await import('../lib/operator-auth.ts')
const {createLocalMailService,MailboxError}=await import('./mail/inbox-reader.mjs')
const mailStorage=join(dirname(storage),'fictional-email.json')
let localMailState={drafts:[],reviews:[]}
try{localMailState=JSON.parse(await readFile(mailStorage,'utf8'))}catch(error){if(error.code!=='ENOENT')throw error}
const exampleMessage={key:'42:7',uid:7,validity:'42',from:'family@example.test',name:'Fictional family',subject:'Question about a puppy',date:'2026-10-26',recipient:'family@example.test',messageId:'<fictional-incoming@example.test>'}
const localMail=createLocalMailService({reader:{list:async()=>[exampleMessage],envelope:async key=>{if(key!==exampleMessage.key)throw new MailboxError('Email not found.',404);return exampleMessage},message:async key=>{if(key!==exampleMessage.key)throw new MailboxError('Email not found.',404);return {...exampleMessage,body:'Hello Jeanne, could you tell me about the next steps?\n<script>Untrusted content stays plain text.</script>'}}},readState:async()=>structuredClone(localMailState),writeState:async state=>{await writeFile(mailStorage+'.next',JSON.stringify(state),{mode:0o600});await rename(mailStorage+'.next',mailStorage);localMailState=structuredClone(state)}})
let queue=Promise.resolve()
const app=spawn(process.execPath,[join(root,'node_modules','next','dist','bin','next'),'start','--port','3101','--hostname','localhost'],{cwd:root,env:childEnv,stdio:['ignore','inherit','inherit'],windowsHide:true})
app.on('error',()=>{console.error('The local app could not start.');process.exitCode=1})
const server=createServer(async(req,res)=>{
  const path=req.url||'/'
  const pathname=path.split('?')[0]
  if(pathname==='/inbox/mail/api/local'){
    const task=queue.then(async()=>{
      const chunks=[];let length=0
      for await(const chunk of req){length+=chunk.length;if(length>100000){res.writeHead(413);res.end();return}chunks.push(chunk)}
      const request=new Request('http://localhost:3100'+path,{method:req.method,headers:req.headers})
      const denied=requireOperator(request)
      if(denied){res.writeHead(denied.status,Object.fromEntries(denied.headers));res.end(await denied.text());return}
      res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json')
      try{
        if(req.method!=='POST')throw new MailboxError('Use the email workspace.',405)
        const input=JSON.parse(Buffer.concat(chunks).toString('utf8'))
        const data=input.type==='state'?await localMail.state():input.type==='list'?{messages:await localMail.list()}:input.type==='message'?{message:await localMail.message(input.key)}:await localMail.action(input)
        res.writeHead(200);res.end(JSON.stringify({...data,fixture:true,mailboxReadEnabled:true}))
      }catch(error){res.writeHead(error instanceof MailboxError?error.status:503);res.end(JSON.stringify({error:error instanceof MailboxError?error.message:'The local email fixture is unavailable.',conflict:error.conflict}))}
    });queue=task.catch(()=>{});await task;return
  }
  if(pathname==='/inbox/workspace/workspace-review.css'){
    const denied=requireOperator(new Request('http://localhost:3100'+path,{headers:req.headers}))
    if(denied){res.writeHead(denied.status,Object.fromEntries(denied.headers));res.end();return}
    res.writeHead(200,{'Content-Type':'text/css','Cache-Control':'private, no-store'});res.end(await readFile(join(root,'app/inbox/workspace/workspace.css')));return
  }
  if(pathname.startsWith('/inbox/workspace/payment-preview/')){
    const denied=requireOperator(new Request('http://localhost:3100'+path,{headers:req.headers}))
    if(denied){res.writeHead(denied.status,Object.fromEntries(denied.headers));res.end();return}
    let status=200;let page
    try{page=await PaymentPreview({params:Promise.resolve({requestId:pathname.split('/').at(-1)})})}catch{status=404;page=PaymentNotFound()}
    res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'})
    res.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Staff test payment request</title><link rel="stylesheet" href="/inbox/workspace/workspace-review.css"></head><body>'+renderToStaticMarkup(page)+'</body></html>');return
  }
  if(pathname==='/inbox/workspace/api/state'||pathname==='/inbox/workspace/api/email'){
    // Serialize the disk-backed fixture. Real Sanity concurrency is tested separately.
    const task=queue.then(async()=>{
      const chunks=[];let length=0
      for await(const chunk of req){length+=chunk.length;if(length>150000){res.writeHead(413,{'Cache-Control':'no-store'});res.end('Request too large');return}chunks.push(chunk)}
      const request=new Request('http://localhost:3100'+path,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)})
      const routes=pathname.endsWith('/email')?emailRoutes:{GET,POST}
      const response=req.method==='GET'?await routes.GET(request):req.method==='POST'?await routes.POST(request):new Response(null,{status:405})
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))
    })
    queue=task.catch(()=>{})
    try{await task}catch{res.writeHead(503,{'Cache-Control':'no-store'});res.end('Local fixture unavailable')}
    return
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Cache-Control':'no-store'});res.end('Only workspace fixture writes are supported.');return}
  try{
    const headers={...req.headers};delete headers.host
    const upstream=await fetch('http://localhost:3101'+path,{method:req.method,headers,redirect:'manual'})
    const output=Object.fromEntries(upstream.headers);delete output['content-encoding'];delete output['content-length']
    res.writeHead(upstream.status,output);res.end(Buffer.from(await upstream.arrayBuffer()))
  }catch{res.writeHead(503,{'Cache-Control':'no-store'});res.end('Local application is starting. Reload in a moment.')}
})
server.listen(3100,'localhost',()=>console.log('Local fixture review: http://localhost:3100/inbox/workspace (fictional records; no live integrations)'))
function stop(){server.close();app.kill();setTimeout(()=>process.exit(0),300).unref()}
process.on('SIGINT',stop);process.on('SIGTERM',stop)
app.on('exit',code=>{if(code){server.close();process.exitCode=code}})
