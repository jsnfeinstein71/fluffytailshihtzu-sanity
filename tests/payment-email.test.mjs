import './register-typescript.mjs'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import nodemailer from 'nodemailer'
import {createPairAdapter} from '../lib/mail/pair-adapter.mjs'
const {renderPaymentEmail}=await import('../lib/mail/payment-email.ts')
const base={version:1,kind:'deposit-request',name:'Alex & Sam',message:'I’m happy to help.\nYour note stays here.',puppyName:'Daisy',amountCents:40000,totalCents:160000,paidCents:0,depositCents:40000,url:'https://payments.example.test/pay/'+'a'.repeat(48),testOnly:true}
test('new templates avoid duplicate invitations and use the existing transparent logo; historical rendering stays available',()=>{
 const message='Thank you. Please reply with any questions.',current=renderPaymentEmail({...base,version:2,message}),old=renderPaymentEmail({...base,version:1,message})
 assert.equal(current.text.split('Please reply with any questions.').length,2);assert.equal(current.html.split('Please reply with any questions.').length,2);assert.match(current.html,/fluffytail-email-logo-transparent.png/);assert.match(current.html,/bgcolor="#58493D"/);assert.doesNotMatch(current.html,/fluffytail-email-logo\.png/)
 assert.equal(old.text.split('Please reply with any questions.').length,3);assert.match(old.html,/fluffytail-email-logo\.png/)
 const noInvitation=renderPaymentEmail({...base,version:2,message:'Your puppy’s details are below.'});assert.match(noInvitation.text,/You can reply to this email\./)
})
test('all four templates have truthful summaries, readable CTA, test disclosure and usable text',()=>{
 for(const [kind,paid,amount,button] of [['deposit-request',0,40000,'View deposit request'],['balance-request',40000,120000,'View final payment request'],['deposit-confirmation',40000,40000,'View payment confirmation'],['paid-confirmation',160000,120000,'View payment confirmation']]){
  const result=renderPaymentEmail({...base,kind,paidCents:paid,amountCents:amount})
  assert.match(result.html,/bgcolor="#58493D"/);assert.match(result.html,/D8BD9D/);assert.match(result.html,/fluffytail-email-logo.png/);assert.match(result.html,/Arial,Helvetica/);assert.match(result.html,/prefers-color-scheme:dark/)
  assert.ok(result.html.includes('>'+button+'</a>'));assert.ok(result.html.includes('href="'+base.url+'"'));assert.ok(!result.html.includes('>'+base.url));assert.match(result.html,/Hello Alex &amp; Sam/)
  assert.match(result.text,/TEST — no real charges or inventory changes/);assert.ok(result.text.includes(base.message));assert.ok(result.text.includes(base.url));assert.match(result.text,/Jeanne\nFluffyTail/)
  if(kind.startsWith('deposit'))assert.match(result.text,/non-refundable/)
  if(kind==='paid-confirmation'){assert.match(result.text,/Remaining balance: \$0.00/);assert.match(result.html,/Paid in full/)}
 }
})
test('editable text is escaped, legacy URLs are readable links, and unsafe destinations are rejected',()=>{
 const result=renderPaymentEmail({...base,message:'<script>alert(1)</script> "hello"\n'+base.url})
 assert.doesNotMatch(result.html,/<script>|<form|<input/);assert.match(result.html,/&lt;script&gt;/);assert.match(result.html,/>View payment details<\/a>/);assert.equal(result.text.split(base.url).length,2)
 for(const url of ['javascript:alert(1)','http://payments.example.test/pay/'+'a'.repeat(48),'https://payments.example.test/inbox/workspace','https://user:password@payments.example.test/pay/'+'a'.repeat(48)])assert.throws(()=>renderPaymentEmail({...base,url}))
 assert.throws(()=>renderPaymentEmail({...base,paidCents:170000}))
})
test('Pair submits multipart HTML and text with the same sender, thread and fixed message identity; acceptance is unconfirmed delivery',async()=>{
 const rendered=renderPaymentEmail(base),account='jeanne@fluffytailshihtzu.com',to='owner@example.test'
 let payload,mime
 const adapter=createPairAdapter({password:'fictional',sendEnabled:true,recipientAllowlist:[to],smtpFactory:()=>({async sendMail(data){payload=data;mime=(await nodemailer.createTransport({streamTransport:true,buffer:true,newline:'unix'}).sendMail(data)).message.toString();return {accepted:[to],rejected:[],response:'250 accepted'}},close(){}})})
 const result=await adapter.send({from:account,replyTo:account,to,subject:'Deposit request',body:rendered.text,html:rendered.html,messageId:'<fixed@fluffytailshihtzu.com>',inReplyTo:'<reply@example.test>',references:['<first@example.test>','<reply@example.test>']})
 assert.equal(result.outcome,'accepted');assert.equal(result.delivery,undefined);assert.equal(payload.from,account);assert.equal(payload.replyTo,account);assert.equal(payload.messageId,'<fixed@fluffytailshihtzu.com>');assert.equal(payload.inReplyTo,'<reply@example.test>');assert.deepEqual(payload.references,['<first@example.test>','<reply@example.test>']);assert.equal(payload.disableFileAccess,true);assert.equal(payload.disableUrlAccess,true)
 assert.match(mime,/multipart\/alternative/);assert.match(mime,/Content-Type: text\/plain/);assert.match(mime,/Content-Type: text\/html/);assert.equal(payload.text,rendered.text);assert.equal(payload.html,rendered.html)
})
