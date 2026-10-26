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
Object.assign(childEnv,{NEXT_PUBLIC_SANITY_PROJECT_ID:'gu1xkpsg',NEXT_PUBLIC_SANITY_DATASET:'synthetic',VERCEL_ENV:'preview',FLUFFYTAIL_WRITE_FREEZE:'0',INBOX_BASIC_AUTH_USER:'fixture-operator',INBOX_BASIC_AUTH_PASS:'fixture-only-password'})
Object.assign(process.env,childEnv)
let initial=[]
try{initial=JSON.parse(await readFile(storage,'utf8'))}catch(error){if(error.code!=='ENOENT')throw new Error('The local fixture could not be read; refusing to replace it.')}
await mkdir(dirname(storage),{recursive:true})
globalThis.fixtureOperatorClient=workspaceStoreFixture(initial,async documents=>{
  await writeFile(storage+'.next',JSON.stringify(documents,null,2),{mode:0o600})
  await rename(storage+'.next',storage)
})
const {GET,POST}=await import('../app/inbox/workspace/api/state/route.ts')
let queue=Promise.resolve()
const app=spawn(process.execPath,[join(root,'node_modules','next','dist','bin','next'),'start','--port','3101','--hostname','localhost'],{cwd:root,env:childEnv,stdio:['ignore','inherit','inherit'],windowsHide:true})
app.on('error',()=>{console.error('The local app could not start.');process.exitCode=1})
const server=createServer(async(req,res)=>{
  const path=req.url||'/'
  if(path.split('?')[0]==='/inbox/workspace/api/state'){
    // Serialize the disk-backed fixture. Real Sanity concurrency is tested separately.
    const task=queue.then(async()=>{
      const chunks=[];let length=0
      for await(const chunk of req){length+=chunk.length;if(length>150000){res.writeHead(413,{'Cache-Control':'no-store'});res.end('Request too large');return}chunks.push(chunk)}
      const request=new Request('http://localhost:3100'+path,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)})
      const response=req.method==='GET'?await GET(request):req.method==='POST'?await POST(request):new Response(null,{status:405})
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
