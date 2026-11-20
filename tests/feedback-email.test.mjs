import './register-typescript.mjs'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import nodemailer from 'nodemailer'
import {createPairAdapter} from '../lib/mail/pair-adapter.mjs'
const {renderFeedbackEmail,feedbackEmailPatch,feedbackTextBody,feedbackInvitationMessage}=await import('../lib/mail/feedback-email.ts')
const {sameEmail,emptyEmail}=await import('../app/inbox/workspace/email-model.ts')
const {getMailCapabilities}=await import('../sanity/lib/mail-provider.ts')
const link='https://feedback.example.test/feedback#'+'a'.repeat(64)+'.'+'b'.repeat(43)
test('feedback invitation preserves the approved copy, personal edits and private files without automatic sending',()=>{
 const original={...emptyEmail('I loved the new puppy picture.'),subject:'A note from Jeanne',attachmentIds:['private-file'],replyToId:'reply-message'}
 const patch=feedbackEmailPatch(original,'invitation-1'),draft={...original,...patch}
 assert.equal(draft.subject,original.subject);assert.ok(draft.body.startsWith(original.body));assert.ok(draft.body.includes(feedbackInvitationMessage));assert.deepEqual(draft.attachmentIds,original.attachmentIds);assert.equal(draft.replyToId,original.replyToId)
 assert.equal(feedbackEmailPatch(draft,'invitation-1').body,draft.body)
 assert.equal(sameEmail(draft,{...draft,feedbackInvitationId:'invitation-2'}),false)
 assert.equal(sameEmail({...draft,feedbackInvitationId:null},{...draft,feedbackInvitationId:undefined}),true)
 const text=feedbackTextBody('Your puppy is lovely.',link),replacement=feedbackTextBody(text,link.replace('a'.repeat(64),'c'.repeat(64)))
 assert.ok(replacement.startsWith('Your puppy is lovely.'));assert.equal(replacement.split('Share your feedback:').length,2);assert.equal(replacement.split(feedbackInvitationMessage).length,2)
})
test('branded feedback email has an escaped personal note, single CTA, usable text and correct logo',()=>{
 const message=feedbackInvitationMessage+'\n<script>private note</script>',rendered=renderFeedbackEmail({name:'Avery Brooks',message,url:link,testOnly:true})
 assert.ok(rendered.text.includes(message));assert.ok(rendered.text.includes(link));assert.match(rendered.html,/Share your feedback<\/a>/);assert.match(rendered.html,/fluffytail-email-logo-transparent.png/);assert.match(rendered.html,/bgcolor="#58493D"/);assert.match(rendered.html,/D8BD9D/);assert.match(rendered.html,/prefers-color-scheme:dark/);assert.match(rendered.html,/&lt;script&gt;/);assert.doesNotMatch(rendered.html,/<script>|<form|<input/);assert.ok(!rendered.html.includes('>'+link));assert.match(rendered.text,/TEST/)
 assert.doesNotMatch(renderFeedbackEmail({name:'Avery',message,url:link,testOnly:false}).html,/TEST —/)
 for(const url of ['javascript:alert(1)',link.replace('https:','http:'),link.replace('/feedback#','/inbox#'),link+'?query',link.replace('https://','https://password@')])assert.throws(()=>renderFeedbackEmail({name:'Avery',message,url,testOnly:true}))
})
test('Pair feedback invitation retains MIME alternatives and threading without contacting a provider',async()=>{
 const formatted=renderFeedbackEmail({name:'Avery',message:feedbackInvitationMessage,url:link,testOnly:true});let payload,mime
 const adapter=createPairAdapter({password:'fictional',sendEnabled:true,recipientAllowlist:['avery@example.test'],smtpFactory:()=>({async sendMail(data){payload=data;mime=(await nodemailer.createTransport({streamTransport:true,buffer:true}).sendMail(data)).message.toString();return {accepted:['avery@example.test'],rejected:[],response:'250 fixture'}},close(){}})})
 const result=await adapter.send({from:'jeanne@fluffytailshihtzu.com',replyTo:'jeanne@fluffytailshihtzu.com',to:'avery@example.test',subject:'How is your puppy?',body:formatted.text,html:formatted.html,messageId:'<feedback-fixed@fluffytailshihtzu.com>',inReplyTo:'<family@example.test>',references:['<family@example.test>']})
 assert.equal(result.outcome,'accepted');assert.equal(result.delivery,undefined);assert.equal(payload.messageId,'<feedback-fixed@fluffytailshihtzu.com>');assert.equal(payload.inReplyTo,'<family@example.test>');assert.match(mime,/multipart\/alternative/);assert.match(mime,/text\/plain/);assert.match(mime,/text\/html/)
})
test('feedback Preview overrides provider settings and cannot send or read a mailbox',()=>{
 const before={...process.env};try{Object.assign(process.env,{FLUFFYTAIL_FEEDBACK_PREVIEW:'1',FLUFFYTAIL_MAIL_MODE:'pair',FLUFFYTAIL_PAIR_SEND_ENABLED:'1',FLUFFYTAIL_PAIR_READ_ENABLED:'1',FLUFFYTAIL_PAIR_MAIL_PASSWORD:'fixture'});assert.deepEqual(getMailCapabilities(),{provider:'disabled',canDispatch:false,canSync:false})}finally{for(const key of Object.keys(process.env))if(!(key in before))delete process.env[key];Object.assign(process.env,before)}
})
