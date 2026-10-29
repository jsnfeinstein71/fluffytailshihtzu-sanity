import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const {clearRetiredAnalytics}=await import('../lib/retired-analytics.ts')
const LitterPlaces=(await import('../app/upcoming-litters/LitterPlaces.tsx')).default

test('retired analytics clears a saved acceptance and GA cookies while preserving essential state',()=>{
 const storage=new Map([['fluffytail.analytics-consent.v1',JSON.stringify({choice:'accepted',version:1,at:Date.now()})],['inquiry-draft','Keep this draft']]),cookies=new Map([['_ga','old'],['_ga_Y8FN5J7876','old'],['staff_session','keep'],['inquiry_token','keep']]),writes=[]
 const document={get cookie(){return [...cookies].map(([k,v])=>k+'='+v).join('; ')},set cookie(value){writes.push(value);cookies.delete(value.split('=')[0])}}
 clearRetiredAnalytics({document,location:{hostname:'www.fluffytailshihtzu.com'},localStorage:{removeItem:key=>storage.delete(key)}})
 assert.equal(storage.has('fluffytail.analytics-consent.v1'),false);assert.equal(storage.get('inquiry-draft'),'Keep this draft');assert.deepEqual([...cookies.keys()],['staff_session','inquiry_token']);assert(writes.every(v=>/^_ga(?:_|=)/.test(v)))
 assert.doesNotThrow(()=>clearRetiredAnalytics({document,location:{hostname:'admin.fluffytailshihtzu.com'},get localStorage(){throw Error('Blocked storage')}}))
})

test('application contains no analytics provider loader or consent control and keeps the public shell',async()=>{
 const {default:RootLayout}=await import('../app/layout.tsx'),{default:SiteChrome}=await import('../app/components/SiteChrome.tsx'),{default:Cleanup}=await import('../app/components/RetiredAnalyticsCleanup.tsx'),child=React.createElement('p',null,'Page')
 const tree=RootLayout({children:child}),body=tree.props.children.find(n=>n.type==='body');assert(body.props.children.some(n=>n.type===Cleanup));assert(body.props.children.some(n=>n.type===SiteChrome&&n.props.children===child))
 function files(path){return readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path+'/'+e.name):/\.[jt]sx?$/.test(e.name)?[path+'/'+e.name]:[])}
 const source=[...files('app'),...files('lib')].map(p=>readFileSync(p,'utf8')).join('\n')
 assert.doesNotMatch(source,/@vercel\/analytics|googletagmanager\.com|google-analytics\.com|inject\(|AnalyticsPreferences|Analytics settings|Accept analytics/)
})

test('upcoming litter wording uses its own deposit, one common explanation and unchanged inquiry context',()=>{
 const html=renderToStaticMarkup(React.createElement('div',null,
  React.createElement(LitterPlaces,{litterId:'fictional-first',title:'First fictional litter',depositCents:40000,showGuidance:true}),
  React.createElement(LitterPlaces,{litterId:'fictional-second',title:'Second fictional litter',depositCents:52550})))
 assert.match(html,/a \$400 deposit/);assert.match(html,/a \$525\.50 deposit/);assert.equal((html.match(/Every litter is different/g)||[]).length,1);assert.equal((html.match(/If the right puppy isn’t available/g)||[]).length,1)
 assert.match(html,/litterId=fictional-first/);assert.match(html,/litterId=fictional-second/);assert.equal((html.match(/Ask Jeanne about this litter/g)||[]).length,2);assert.equal((html.match(/1st pick/g)||[]).length,2);assert.equal((html.match(/4th pick/g)||[]).length,2);assert.doesNotMatch(html,/non.refundable/i)
 const missing=renderToStaticMarkup(React.createElement(LitterPlaces,{litterId:'fictional',title:'Unpriced fictional litter',depositCents:null}));assert.match(missing,/a deposit confirmed by Jeanne/);assert.doesNotMatch(missing,/\$400/)
})

test('browsing removes refund warnings while deposit checkout and request transport retain disclosure',()=>{
 for(const file of ['app/page.tsx','app/available-puppies/page.tsx','app/upcoming-litters/page.tsx','app/upcoming-litters/LitterPlaces.tsx','app/pricing/page.tsx','app/about/page.tsx','app/contact/page.tsx','app/puppies/[slug]/page.tsx'])assert.doesNotMatch(readFileSync(file,'utf8'),/non[\s‑–-]?refundable/i,file)
 for(const file of ['app/pay/CustomerTestPayment.tsx','lib/mail/payment-email.ts','app/inbox/workspace/payment-compose.ts'])assert.match(readFileSync(file,'utf8'),/non-refundable/i,file)
 assert.match(readFileSync('lib/litter-reservations.ts','utf8'),/non-refundable, transferable to a future litter/)
})

test('both puppy and litter deposit pages disclose terms before the customer can continue to live checkout',async()=>{
 const Customer=(await import('../app/pay/CustomerTestPayment.tsx')).default
 const base={testOnly:false,puppyName:'Fictional puppy',kind:'deposit',amountCents:40000,totalCents:160000,depositCents:40000,paidCents:0,remainingCents:160000,reserved:false,state:'ready',checkoutUrl:'https://checkout.stripe.com/fictional',confirmation:'not-scheduled'}
 for(const initial of [base,{...base,litterReservation:true,litterTitle:'Fictional litter',selectionPosition:1}]){
  const html=renderToStaticMarkup(React.createElement(Customer,{token:'a'.repeat(48),initial,error:'',canceled:false,testOnly:false}))
  assert.match(html,/non-refundable/);assert(html.indexOf('non-refundable')<html.indexOf('Continue to secure'))
  if(initial.litterReservation)assert.match(html,/transferable to a future litter/)
  assert.match(html,/\/api\/payment\/[a-f0-9]+\/checkout/);assert.doesNotMatch(html,/TEST —/)
 }
})
