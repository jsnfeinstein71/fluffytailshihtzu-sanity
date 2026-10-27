import './register-typescript.mjs'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const AddToMessage=(await import('../app/inbox/workspace/AddToMessage.tsx')).default
const TestPayments=(await import('../app/inbox/workspace/TestPayments.tsx')).default
const {families,puppies}=await import('../app/inbox/workspace/model.ts')
test('composer offers the correct deposit/balance, keeps files available when fully paid, and exposes no unsupported text attachments',()=>{
 const puppy={...puppies[1],status:'Available'},family={...families[0],puppyId:puppy.id,records:[]},email={data:{inventory:[puppy],attachmentLibrary:[],paymentRequests:[]},entries:{},busy:false}
 const render=(f,channel='Email')=>renderToStaticMarkup(React.createElement(AddToMessage,{family:f,email,channel,onPayment(){throw new Error('Rendering must never prepare or send')}}))
 let html=render(family);assert.match(html,/Deposit request · \$400.00/);assert.match(html,/Photos/);assert.match(html,/Documents/)
 html=render({...family,records:[{paymentStatus:'paid',amountPaid:400}]});assert.match(html,/Final-payment request · \$1,200.00/);assert.doesNotMatch(html,/Deposit request/)
 const paid={...family,records:[{paymentStatus:'paid',amountPaid:400},{paymentStatus:'paid',amountPaid:1200}]};html=render(paid);assert.doesNotMatch(html,/value="payment"/);assert.match(html,/Photos/);assert.match(html,/Documents/)
 html=render(family,'Text');assert.match(html,/value="payment"/);assert.doesNotMatch(html,/Photos|Documents|type="file"/);assert.equal(render(paid,'Text'),'')
 html=renderToStaticMarkup(React.createElement(TestPayments,{family:paid,email}));assert.doesNotMatch(html,/Request \$0|<button|signed webhook|Webhook/);assert.match(html,/Payment confirmed/)
})
