import './register-typescript.mjs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const {paymentEmailPatch,paymentTextBody,paymentSnippet}=await import('../app/inbox/workspace/payment-compose.ts')
const {default:Payments}=await import('../app/inbox/workspace/TestPayments.tsx')
const deposit={_id:'deposit',familyId:'rowan',kind:'deposit',puppyName:'Practice Autumn — TEST',amountCents:45000,totalCents:180000,depositCents:45000,testOnly:true,checkoutUrl:'https://preview.example.test/pay/old',litterReservationId:'selection',selectionPosition:1,createdAt:'2026-10-29T15:00:00Z'}
const final={...deposit,_id:'final',kind:'balance',puppyName:'Juniper — TEST',amountCents:150000,totalCents:195000,paidCents:45000,checkoutUrl:'https://preview.example.test/pay/current',litterReservationId:undefined,createdAt:'2026-10-29T17:00:00Z'}
const requests=[final,deposit]
test('changing from a litter deposit to a final request changes attachment and subject without losing personal text or thread',()=>{
 const value={subject:'FluffyTail deposit request — Practice Autumn — TEST',body:`Hi Rowan, Juniper is doing well!\nYour request: ${deposit.checkoutUrl}\nPlease keep https://example.test/my-note handy.`,paymentRequestId:deposit._id,replyToId:'incoming',attachmentIds:['photo']}
 const patch=paymentEmailPatch(value,final,requests)
 assert.equal(patch.paymentRequestId,final._id);assert.equal(patch.subject,'FluffyTail final payment request — Juniper — TEST')
 assert.equal(patch.body,value.body.replace(deposit.checkoutUrl,final.checkoutUrl));assert.equal({...value,...patch}.replyToId,'incoming');assert.deepEqual({...value,...patch}.attachmentIds,['photo'])
 const pending=paymentEmailPatch(value,{...final,checkoutUrl:undefined},requests);assert.equal(pending.paymentRequestId,final._id);assert(!pending.body.includes(deposit.checkoutUrl));assert(!pending.body.includes('undefined'));assert(pending.body.includes('Juniper is doing well!'));
 assert(!patch.body.includes(deposit.checkoutUrl));assert.equal(paymentEmailPatch({...value,...patch},final,requests).body,patch.body)
 const text=`Hi Rowan, here is Juniper’s update.\n${paymentSnippet(deposit)}`
 const next=paymentTextBody(text,final,requests);assert(next.startsWith('Hi Rowan, here is Juniper’s update.'));assert(!next.includes(deposit.checkoutUrl));assert(!next.includes('450.00 deposit'));assert(next.includes('1,500.00 final payment'));assert.equal(paymentTextBody(next,final,requests),next)
})
test('payment history renders Open and Copy for the existing request, and a recovery action for an unfinished one',()=>{
 const family={id:'rowan',records:[{paymentType:'deposit',amountPaid:450}]}
 const html=renderToStaticMarkup(React.createElement(Payments,{family,email:{data:{paymentRequests:requests},busy:false}}))
 assert(html.includes(final.checkoutUrl));assert(html.includes('Open payment request'));assert(html.includes('Copy link'));assert(html.indexOf('1,500.00')<html.indexOf('450.00',html.indexOf('Payment requests')))
 const unfinished=renderToStaticMarkup(React.createElement(Payments,{family,email:{data:{paymentRequests:[{...final,checkoutUrl:undefined}]},busy:false}}))
 assert(unfinished.includes('Prepare existing payment link'));assert(unfinished.includes('link preparation incomplete'));assert(!unfinished.includes('Create another'))
})

test('paid payment attachments render as Paid and confirmation/removal keep personal text and files',async()=>{
 const {paymentConfirmationPatch}=await import('../app/inbox/workspace/payment-compose.ts'),{paymentDraftEmail}=await import('../lib/mail/payment-email.ts'),{default:Composer}=await import('../app/inbox/workspace/EmailComposer.tsx')
 const paid={...final,publicToken:'b'.repeat(48),checkoutUrl:'https://preview.example.test/pay/'+'b'.repeat(48),webhookVerifiedAt:'2026-10-29T18:00:00Z',verifiedPaid:true,verifiedPaidCents:195000,verifiedReserved:true}
 const value={subject:'A personal subject',body:'Your photo is attached. See you soon!',paymentRequestId:paid._id,replyToId:'incoming',attachmentIds:['photo']},patch=paymentConfirmationPatch(value,paid),confirmed={...value,...patch}
 assert.equal(confirmed.body,value.body);assert.equal(confirmed.subject,value.subject);assert.deepEqual(confirmed.attachmentIds,['photo']);assert.equal(confirmed.replyToId,'incoming');assert.equal(confirmed.paymentLinkPurpose,'confirmation')
 assert.equal(paymentDraftEmail(paid,'Rowan',value.body),null)
 const receipt=paymentDraftEmail(paid,'Rowan',value.body,'confirmation');assert.equal(receipt.kind,'paid-confirmation');assert.equal(receipt.paidCents,195000);assert.equal(receipt.reserved,true)
 const family={id:'rowan',name:'Fictional Rowan',email:'rowan@example.test'},email={entries:{rowan:{value,base:value,revision:'one'}},data:{paymentRequests:[paid],messages:[],outgoing:[],capabilities:{canDispatch:true}},busy:false}
 const html=renderToStaticMarkup(React.createElement(Composer,{family,email,detailsTarget:null}));assert(html.includes('Paid ·'));assert(html.includes('Use payment-confirmation link'));assert(html.includes('Remove paid request'));assert(html.includes('Paid. Remove this request'));assert(!html.includes('Preview formatted email'));assert(html.includes(value.body))
})
