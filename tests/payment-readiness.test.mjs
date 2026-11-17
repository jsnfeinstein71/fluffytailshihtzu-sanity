import './register-typescript.mjs'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {workspaceStoreFixture} from './workspace-store-fixture.mjs'
const {paymentRefreshFinished,startPaymentRefresh}=await import('../lib/payment-status-refresh.ts')
const {paymentRecordLabel,stripeTransactionLink}=await import('../lib/staff-payment-display.ts')
const {listWorkspaceFamilies,workspaceId}=await import('../sanity/lib/workspace.ts')
const Payments=(await import('../app/inbox/workspace/TestPayments.tsx')).default
function clock(){
 let now=0,visible=true,sequence=0;const timers=new Map();let listener
 return {environment:{now:()=>now,visible:()=>visible,setTimer:(fn,ms)=>{timers.set(++sequence,{fn,at:now+ms});return sequence},clearTimer:id=>timers.delete(id),listen:fn=>{listener=fn;return()=>listener=null}},async advance(ms){const end=now+ms;for(;;){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;timers.delete(next[0]);next[1].fn();await new Promise(r=>setImmediate(r))}now=end},visibility(value){visible=value;listener?.()},get size(){return timers.size}}
}
test('payment refresh stops after terminal receipts, remains bounded and pauses hidden reads',async()=>{
 for(const state of ['expired','failed','unavailable'])assert.equal(paymentRefreshFinished({state}),true)
 assert.equal(paymentRefreshFinished({state:'confirmed',confirmation:'submitted'}),true)
 assert.equal(paymentRefreshFinished({state:'confirmed',confirmation:'pending'}),false)
 for(const state of ['ready','pending'])assert.equal(paymentRefreshFinished({state}),false)
 const time=clock();let reads=0
 const stop=startPaymentRefresh(async()=>{reads++;return true},{environment:time.environment})
 time.visibility(false);await time.advance(15000);assert.equal(reads,0)
 time.visibility(true);await time.advance(0);assert.equal(reads,1)
 await time.advance(600000);const finished=reads;assert.ok(reads<61);await time.advance(600000);assert.equal(reads,finished);assert.equal(time.size,0);stop()
 const terminal=clock();reads=0;startPaymentRefresh(async()=>{reads++;return false},{immediate:true,environment:terminal.environment});await terminal.advance(600000);assert.equal(reads,1);assert.equal(terminal.size,0)
 const canceled=clock();reads=0;const cancel=startPaymentRefresh(async()=>{reads++;return true},{environment:canceled.environment});cancel();await canceled.advance(600000);assert.equal(reads,0)
})

test('default payment refresh calls browser timers with their global receiver',t=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document'),listeners=new Set(),handle=123
 Object.defineProperty(globalThis,'document',{configurable:true,value:{visibilityState:'visible',addEventListener:(_name,fn)=>listeners.add(fn),removeEventListener:(_name,fn)=>listeners.delete(fn)}})
 let scheduled=0,cleared=0
 t.mock.method(globalThis,'setTimeout',function(fn,ms){assert.equal(this,globalThis);assert.equal(typeof fn,'function');assert.equal(ms,3000);scheduled++;return handle})
 t.mock.method(globalThis,'clearTimeout',function(timer){assert.equal(this,globalThis);assert.equal(timer,handle);cleared++})
 try{const stop=startPaymentRefresh(async()=>false);assert.equal(scheduled,1);assert.equal(listeners.size,1);stop();assert.equal(cleared,1);assert.equal(listeners.size,0)}finally{t.mock.restoreAll();if(prior)Object.defineProperty(globalThis,'document',prior);else delete globalThis.document}
})
test('history distinguishes verified live, test and legacy records and uses safe mode-specific Stripe links',()=>{
 const record={paymentStatus:'paid',amountPaid:400,paymentType:'deposit',testOnly:false,workspace:'live-v1',webhookVerifiedAt:'2026-11-14T12:00:00Z',stripePaymentIntentId:'pi_fixture123'}
 assert.equal(paymentRecordLabel(record),'Live payment confirmed');assert.equal(stripeTransactionLink(record),'https://dashboard.stripe.com/payments/pi_fixture123')
 assert.equal(paymentRecordLabel({...record,testOnly:true,workspace:'review-v1'}),'Test payment confirmed');assert.match(stripeTransactionLink({...record,testOnly:true,workspace:'review-v1'}),/\/test\/payments\//)
 assert.equal(stripeTransactionLink({...record,stripeAccountId:'acct_JeanneFixture'}),'https://dashboard.stripe.com/acct_JeanneFixture/payments/pi_fixture123')
 assert.equal(stripeTransactionLink({...record,stripeAccountId:'acct_JeanneFixture',testOnly:true,workspace:'review-v1'}),'https://dashboard.stripe.com/acct_JeanneFixture/test/payments/pi_fixture123')
 assert.equal(stripeTransactionLink({...record,stripeAccountId:'../bad'}),null)
 assert.equal(paymentRecordLabel({paymentStatus:'paid',amountPaid:400}),'Payment recorded');assert.equal(stripeTransactionLink({paymentStatus:'paid',amountPaid:400,stripePaymentIntentId:'pi_fixture'}),null)
 assert.equal(stripeTransactionLink({...record,stripePaymentIntentId:'https://evil.example'}),null);assert.equal(stripeTransactionLink({...record,testOnly:true}),null)
 const markup=renderToStaticMarkup(React.createElement(Payments,{family:{id:'fictional',records:[record]},email:{data:{paymentRequests:[]}}}))
 assert.match(markup,/Deposit/);assert.match(markup,/Live payment confirmed/);assert.match(markup,/Open in Stripe/);assert.match(markup,/Bank transfers are separate/);assert.doesNotMatch(markup,/received in.*bank/)
})
test('real-mode family projection preserves existing transaction metadata without changing financial records',async()=>{
 Object.assign(process.env,{VERCEL_ENV:'production',NEXT_PUBLIC_SANITY_PROJECT_ID:'3glz6dkx',NEXT_PUBLIC_SANITY_DATASET:'production',FLUFFYTAIL_STAFF_WORKSPACE_ENABLED:'1'})
 delete process.env.FLUFFYTAIL_PAYMENT_TEST_WORKSPACE
 const familyId='inquiry-'+'c'.repeat(64)
 const family={_id:workspaceId(familyId),_type:'staffFamily',_rev:'original',workspace:'live-v1',familyKey:familyId,schemaVersion:1,profile:{id:familyId,name:'Fictional Willow',email:'willow@example.test',phone:'',messages:[],records:[]},drafts:{Email:'Unfinished note',Text:''},notes:[],checks:[]}
 const payment={_id:'fixture-payment',_type:'paymentRecord',_rev:'original-payment',paymentStatus:'paid',amountPaid:400,paymentType:'deposit',customerEmail:'willow@example.test',quotedTotalCents:160000,createdAt:'2026-11-14T12:00:00Z',webhookVerifiedAt:'2026-11-14T12:00:00Z',testOnly:false,workspace:'live-v1',stripePaymentIntentId:'pi_fixture123'}
 const store=workspaceStoreFixture([family,payment]);globalThis.fixtureOperatorClient=store
 const before=JSON.stringify([...store.documents.values()]),families=await listWorkspaceFamilies()
 assert.equal(families[0].profile.records[0].paymentType,'deposit');assert.equal(families[0].profile.records[0].stripePaymentIntentId,'pi_fixture123');assert.equal(families[0].profile.records[0].testOnly,false);assert.equal(families[0].profile.records[0].webhookVerifiedAt,payment.webhookVerifiedAt)
 assert.equal(JSON.stringify([...store.documents.values()]),before)
})
