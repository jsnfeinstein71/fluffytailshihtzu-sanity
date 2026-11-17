// Development-only provider verification: real Stripe TEST API + application handlers,
// with fictional records in a separate local fixture store. Never deploy this helper.
import '../tests/register-typescript.mjs'
import {createServer} from 'node:http'
import {spawn} from 'node:child_process'
import {readFile,writeFile,readdir} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {randomUUID,createHash} from 'node:crypto'
import Stripe from 'stripe'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {workspaceStoreFixture} from '../tests/workspace-store-fixture.mjs'

if(process.env.VERCEL||process.env.FLUFFYTAIL_JEANNE_STRIPE_QA!=='1'||!process.env.LOCALAPPDATA)throw Error('Explicit local-only merchant QA is required.')
const folder=join(process.env.LOCALAPPDATA,'FluffyTail','JeanneStripeMigration'),secure=join(folder,'secure-qa')
const key=await readFile(join(secure,'test-key.tmp'),'utf8')
if(!/^(sk|rk)_test_[A-Za-z0-9]+$/.test(key.trim()))throw Error('Only a test credential is accepted.')
const stripe=new Stripe(key.trim(),{apiVersion:'2025-08-27.basil'}),merchant=await stripe.accounts.retrieve()
if(merchant.id!=='acct_1UcZd28Dx1QG6hnJ')throw Error('The test credential does not belong to Jeanne.')
const origin='https://merchant-qa.example.test',port=3117
Object.assign(process.env,{VERCEL_ENV:'preview',NEXT_PUBLIC_SANITY_PROJECT_ID:'gu1xkpsg',NEXT_PUBLIC_SANITY_DATASET:'synthetic',FLUFFYTAIL_PAYMENT_TEST_WORKSPACE:'1',FLUFFYTAIL_STRIPE_TEST_ENABLED:'1',FLUFFYTAIL_STRIPE_TEST_SECRET_KEY:key.trim(),FLUFFYTAIL_PAYMENT_TEST_ORIGIN:origin,FLUFFYTAIL_STRIPE_TEST_ACCOUNT_ID:merchant.id,FLUFFYTAIL_WRITE_FREEZE:'0',FLUFFYTAIL_TEST_CUSTOMER_COMMUNICATIONS:'0',STAFF_PASSKEY_MODE:'off',INBOX_BASIC_AUTH_USER:'fixture',INBOX_BASIC_AUTH_PASS:'fictional-local-only',FLUFFYTAIL_LITTER_RESERVATIONS_ENABLED:'0'})
delete process.env.STRIPE_SECRET_KEY;delete process.env.STRIPE_WEBHOOK_SECRET;delete process.env.FLUFFYTAIL_STRIPE_ACCOUNT_MIGRATION
globalThis.fixtureStripe=stripe
globalThis.fixtureTestContacts={email:'merchant-qa@example.test',phone:'+15555550123'}
globalThis.fixtureMailProvider={capabilities:{provider:'fictional',canDispatch:false,canSync:false},send:async()=>{throw Error('No messages may be sent during merchant QA.')},sync:async()=>{throw Error('No mailbox access is available during merchant QA.')}}
const {workspaceId}=await import('../sanity/lib/workspace.ts'),familyId='inquiry-'+createHash('sha256').update('jeanne-merchant-provider-qa-20261117').digest('hex')
const recordPath=join(folder,'provider-qa-records-20261117.json')
let initial
try{initial=JSON.parse(await readFile(recordPath,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
if(!initial){
 const published=JSON.parse(await readFile(join(folder,'production-before.json'),'utf8')).litters[0]
 if(!(published.price>published.deposit&&published.deposit>0))throw Error('A valid inspected quote is required.')
 initial=[{_id:'merchant-qa-litter',_type:'litter',title:'Jeanne merchant QA litter',status:'current',isVisible:true,price:published.price,deposit:published.deposit},{_id:'merchant-qa-puppy',_rev:'initial',_type:'puppy',name:'Merchant QA puppy',status:'available',isVisible:true,paymentTestScenario:'customer-20261027',slug:{current:'merchant-qa-puppy'},litter:{_ref:'merchant-qa-litter'}},{_id:workspaceId(familyId),_rev:'initial',_type:'staffFamily',workspace:'review-v1',schemaVersion:1,familyKey:familyId,profile:{id:familyId,source:'inquiry',name:'Fictional merchant QA family',initials:'QA',...globalThis.fixtureTestContacts,preference:'Email',smsConsent:false,stage:'Ready',next:'Local test only',paymentTestScenario:'customer-20261027',puppyId:'merchant-qa-puppy',puppySlug:'merchant-qa-puppy',messages:[],records:[]},drafts:{Email:'',Text:''},notes:[],checks:[]}]
}
const store=workspaceStoreFixture(initial,docs=>writeFile(recordPath,JSON.stringify(docs,null,2),{mode:0o600}));globalThis.fixtureOperatorClient=store
const email=await import('../app/inbox/workspace/api/email/route.ts'),hook=await import('../app/api/stripe/test-webhook/route.ts'),customer=await import('../app/api/test-payment/[token]/route.ts'),checkout=await import('../app/api/test-payment/[token]/checkout/route.ts'),Customer=(await import('../app/pay/CustomerTestPayment.tsx')).default
const auth='Basic '+Buffer.from('fixture:fictional-local-only').toString('base64')
const request=body=>new Request(origin+'/inbox/workspace/api/email',{method:'POST',headers:{authorization:auth,origin,'content-type':'application/json'},body:JSON.stringify(body)})
async function action(body){const r=await email.POST(request(body));if(!r.ok)throw Error('Application payment preparation failed: '+r.status);return r.json()}
let current,lastSigned,received=0,duplicate=0
async function prepare(kind){
 const prior=[...store.documents.values()].filter(r=>r._type==='staffPaymentRequest'&&r.familyId===familyId&&r.kind===kind).at(-1)
 const id=prior?._id||(await action({type:'payment',familyId,puppyId:'merchant-qa-puppy',kind,requestId:randomUUID()})).preparedPaymentId
 await action({type:'checkout',familyId,paymentRequestId:id});current=store.documents.get(id);return current
}
const snapshot=async token=>{const r=await customer.GET(new Request(origin+'/api/test-payment/'+token),{params:Promise.resolve({token})});if(!r.ok)throw Error('Customer payment view failed: '+r.status);return r.json()}
const summary=()=>({merchant:merchant.id,storage:'local fictional fixture; not hosted Sanity',received,duplicate,current:current?{kind:current.kind,token:current.publicToken,amountCents:current.amountCents,checkoutSessionId:current.checkoutSessionId}:null,payments:[...store.documents.values()].filter(r=>r._type==='paymentRecord').map(r=>({amountPaid:r.amountPaid,event:r.stripeEventId,session:r.stripeCheckoutSessionId,verified:!!r.webhookVerifiedAt})),puppyStatus:store.documents.get('merchant-qa-puppy')?.status})
async function callback(body,signature){const response=await hook.POST(new Request(origin+'/api/stripe/test-webhook',{method:'POST',headers:{'stripe-signature':signature},body}));if(response.ok){const result=await response.clone().json();received++;if(result.duplicate)duplicate++}return response}
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1:'+port)
 let response
 if(url.pathname==='/api/stripe/test-webhook'&&req.method==='POST'){
  const parts=[];for await(const part of req)parts.push(part);const body=Buffer.concat(parts).toString(),signature=req.headers['stripe-signature']||''
  response=await callback(body,signature);if(response.ok)lastSigned={body,signature}
 }else if(url.pathname==='/qa/status'){response=Response.json(summary())
 }else if(url.pathname==='/qa/balance'&&req.method==='POST'){await prepare('balance');response=Response.json(summary())
 }else if(url.pathname==='/qa/expiry'&&req.method==='POST'){
  const id='inquiry-'+createHash('sha256').update('jeanne-merchant-expiry-qa-20261117').digest('hex'),puppyId='merchant-qa-expiry-puppy'
  const source=store.documents.get(workspaceId(familyId))
  await store.createIfNotExists({...store.documents.get('merchant-qa-puppy'),_id:puppyId,status:'available',slug:{current:puppyId}})
  await store.createIfNotExists({...source,_id:workspaceId(id),familyKey:id,profile:{...source.profile,id,name:'Fictional expiry QA family',puppyId,puppySlug:puppyId}})
  let p=[...store.documents.values()].find(r=>r._type==='staffPaymentRequest'&&r.familyId===id)
  if(!p){const created=await action({type:'payment',familyId:id,puppyId,kind:'deposit',requestId:randomUUID()});await action({type:'checkout',familyId:id,paymentRequestId:created.preparedPaymentId});p=store.documents.get(created.preparedPaymentId)}
  const session=await stripe.checkout.sessions.retrieve(p.checkoutSessionId)
  if(session.status==='open')await stripe.checkout.sessions.expire(session.id)
  response=Response.json({expiredSession:p.checkoutSessionId,request:p._id,puppyStatus:store.documents.get(puppyId).status,outcome:store.documents.get(p._id).checkoutOutcome||null})
 }else if(url.pathname==='/qa/replay'&&req.method==='POST'&&lastSigned){response=await callback(lastSigned.body,lastSigned.signature)
 }else if(url.pathname.startsWith('/api/test-payment/')){
  const token=url.pathname.split('/')[3],params={params:Promise.resolve({token})}
  response=url.pathname.endsWith('/checkout')?await checkout.GET(new Request(origin+url.pathname),params):await customer.GET(new Request(origin+url.pathname),params)
 }else if(url.pathname.startsWith('/pay/')){
  const token=url.pathname.split('/')[2],receipt=await snapshot(token),css=(await readdir('.next/static/chunks')).filter(n=>n.endsWith('.css')).map(n=>'<link rel="stylesheet" href="/qa-css/'+n+'">').join('')
  response=new Response('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+css+'</head><body>'+renderToStaticMarkup(React.createElement(Customer,{token,initial:receipt,error:'',canceled:false}))+'</body></html>',{headers:{'content-type':'text/html; charset=utf-8'}})
 }else if(url.pathname.startsWith('/qa-css/')&&/^\/qa-css\/[A-Za-z0-9_.-]+\.css$/.test(url.pathname)){response=new Response(await readFile('.next/static/chunks/'+url.pathname.split('/').at(-1)),{headers:{'content-type':'text/css'}})
 }else if(url.pathname==='/brand/fluffytail-logo-color.svg'){response=new Response(await readFile('public/brand/fluffytail-logo-color.svg'),{headers:{'content-type':'image/svg+xml'}})
 }else response=new Response('Local merchant QA only',{status:404})
 res.writeHead(response.status,{...Object.fromEntries(response.headers),'Cache-Control':'no-store'});res.end(Buffer.from(await response.arrayBuffer()))
 }catch(e){res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({error:'Local QA action failed',type:e.type||e.name,code:e.code||undefined}))}})
await new Promise(r=>server.listen(port,'127.0.0.1',r))
const cli=process.env.FLUFFYTAIL_QA_STRIPE_CLI;if(!cli||!resolve(cli).endsWith('stripe.exe'))throw Error('An installed official Stripe CLI is required.')
const listener=spawn(cli,['listen','--forward-to','http://127.0.0.1:'+port+'/api/stripe/test-webhook','--events','checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,invoice.paid','--skip-update'],{env:{...process.env,STRIPE_API_KEY:key.trim()},stdio:['ignore','pipe','pipe'],windowsHide:true})
// Never persist or print raw CLI output: its initial message contains a secret.
await new Promise((ok,reject)=>{let output='';const timeout=setTimeout(()=>reject(Error('The isolated Stripe event listener did not become ready.')),30000);const consume=part=>{output+=part.toString();const secret=output.match(/whsec_[A-Za-z0-9]+/)?.[0];if(secret){process.env.FLUFFYTAIL_STRIPE_TEST_WEBHOOK_SECRET=secret;output='';clearTimeout(timeout);ok()}};listener.stdout.on('data',consume);listener.stderr.on('data',consume);listener.once('error',reject);listener.once('exit',()=>{clearTimeout(timeout);reject(Error('The isolated Stripe event listener exited.'))})})
current=[...store.documents.values()].filter(r=>r._type==='staffPaymentRequest'&&r.familyId===familyId).at(-1)
if(!current?.checkoutSessionId)await prepare('deposit')
await writeFile(join(folder,'provider-qa-status.json'),JSON.stringify(summary(),null,2))
console.log(JSON.stringify({ready:true,merchant:merchant.id,customerPage:'http://127.0.0.1:'+port+'/pay/'+current.publicToken,actualStripeTestProvider:true,storage:'local fictional fixture',messagesDisabled:true}))
const close=()=>{listener.kill();server.close();process.exit()};process.on('SIGINT',close);process.on('SIGTERM',close)
