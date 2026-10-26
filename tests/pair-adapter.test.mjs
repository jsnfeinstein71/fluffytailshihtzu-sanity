import assert from 'node:assert/strict'
import {test} from 'node:test'
import {Readable} from 'node:stream'
import {createPairAdapter} from '../lib/mail/pair-adapter.mjs'
const account='jeanne@fluffytailshihtzu.com'
const message={from:account,replyTo:account,to:account,subject:'Owner-only fictional adapter test',body:'Offline test only.',messageId:'<outgoing@fluffytailshihtzu.com>',inReplyTo:null,references:[]}
const options={password:'offline-fake-only',recipientAllowlist:[account]}

test('Pair adapter refuses real sends/reads before any transport construction when either permission is absent',async()=>{
  let calls=0
  const adapter=createPairAdapter({...options,smtpFactory:()=>{calls++},imapFactory:()=>{calls++}})
  await assert.rejects(adapter.send(message),{code:'MAIL_DISABLED'})
  await assert.rejects(adapter.sync({cursor:{validity:'',lastUid:0},threads:[]}),{code:'MAIL_DISABLED'})
  assert.equal(calls,0)
})

test('Pair SMTP adapter fixes envelope/From/Reply-To and stable Message-ID, enforces TLS and records acceptance only',async()=>{
  let configuration,payload,closed=false
  const adapter=createPairAdapter({...options,sendEnabled:true,smtpFactory:config=>{configuration=config;return {sendMail:async value=>{payload=value;return {accepted:[account],rejected:[],response:'250 queued'}},close(){closed=true}}}})
  assert.deepEqual(await adapter.send(message),{outcome:'accepted',code:'SMTP_ACCEPTED'})
  assert.equal(configuration.host,'smtp.pairpromail.com');assert.equal(configuration.port,465);assert.equal(configuration.secure,true);assert.equal(configuration.tls.rejectUnauthorized,true);assert.equal(configuration.tls.minVersion,'TLSv1.2');assert.equal(configuration.logger,false);assert.equal(configuration.debug,false);assert.equal(configuration.pool,false)
  assert.deepEqual(payload.envelope,{from:account,to:[account]});assert.equal(payload.from,account);assert.equal(payload.replyTo,account);assert.equal(payload.messageId,message.messageId);assert.equal(payload.html,undefined);assert.equal(payload.attachments,undefined);assert.equal(payload.disableFileAccess,true);assert.equal(payload.disableUrlAccess,true);assert.equal(closed,true)
})

test('SMTP errors distinguish explicit non-acceptance from uncertain DATA outcomes without leaking raw errors or retrying',async()=>{
  for(const [error,outcome]of [[{command:'AUTH PLAIN',code:'EAUTH'},'rejected'],[{command:'DATA',responseCode:550},'rejected'],[{command:'DATA',code:'ETIMEDOUT'},'uncertain'],[{},'uncertain']]){
    let calls=0
    const adapter=createPairAdapter({...options,sendEnabled:true,smtpFactory:()=>({sendMail:async()=>{calls++;throw Object.assign(new Error('PRIVATE PASSWORD AND MAIL'),error)},close(){}})})
    const result=await adapter.send(message)
    assert.equal(result.outcome,outcome);assert.doesNotMatch(JSON.stringify(result),/PRIVATE|PASSWORD|MAIL/);assert.equal(calls,1)
  }
})

test('Pair reply submission preserves the verified In-Reply-To and References chain',async()=>{
  let payload
  const adapter=createPairAdapter({...options,sendEnabled:true,smtpFactory:()=>({sendMail:async value=>{payload=value;return {accepted:[account],rejected:[],response:'250 queued'}},close(){}})})
  const parent='<incoming-owner-reply@example.test>',references=['<original@fluffytailshihtzu.com>',parent]
  await adapter.send({...message,inReplyTo:parent,references})
  assert.equal(payload.inReplyTo,parent);assert.deepEqual(payload.references,references);assert.equal(payload.replyTo,account);assert.deepEqual(payload.envelope.to,[account])
})

test('recipient/From forgery and incomplete SMTP acceptance evidence cannot produce a successful send record',async()=>{
  let calls=0
  const adapter=createPairAdapter({...options,sendEnabled:true,smtpFactory:()=>({sendMail:async()=>{calls++;return {accepted:[account],rejected:[],response:'Unknown response'}},close(){}})})
  for(const payload of [{...message,to:'customer@example.test'},{...message,from:'other@example.test'},{...message,replyTo:'other@example.test'}])await assert.rejects(adapter.send(payload),{code:'MAIL_DISABLED'})
  assert.equal(calls,0);assert.equal((await adapter.send(message)).outcome,'uncertain')
})

function imapFixture({validity=42n,uidNext=10,from=account,inReplyTo=message.messageId}={}){
  const calls=[]
  return {calls,client:{on(){},async connect(){calls.push('connect')},async mailboxOpen(path,config){calls.push({path,config});return {readOnly:true,uidValidity:validity,uidNext}},async search(query,config){calls.push({query,config});return [9]},async fetchOne(uid,query,config){calls.push({uid,query,config});return {envelope:{from:[{address:from}],to:[{address:account}],messageId:'<owner-reply@example.test>',inReplyTo,subject:'Re: owner test'},headers:Buffer.from('References: '+inReplyTo+'\r\n'),bodyStructure:{type:'text/plain',part:'1'},internalDate:new Date().toISOString()}},async download(uid,part,config){calls.push({download:uid,part,config});return {meta:{charset:'utf-8'},content:Readable.from([Buffer.from('Owner reply received.')])}},async logout(){calls.push('logout')},close(){calls.push('close')}}}
}

test('initial Pair sync establishes a future-only UID watermark without searching or reading historical messages',async()=>{
  const fixture=imapFixture()
  const adapter=createPairAdapter({...options,readEnabled:true,imapFactory:()=>fixture.client})
  assert.deepEqual(await adapter.sync({cursor:{validity:'',lastUid:0},threads:[]}),{validity:'42',lastUid:9,messages:[],initialized:true})
  assert.equal(fixture.calls.some(c=>c.query||c.uid||c.download),false)
  assert.deepEqual(fixture.calls.find(c=>c.path),{path:'INBOX',config:{readOnly:true}})
})

test('scoped Pair synchronization searches only new thread replies and fetches plain text without mailbox changes',async()=>{
  const fixture=imapFixture()
  const adapter=createPairAdapter({...options,readEnabled:true,imapFactory:()=>fixture.client})
  const result=await adapter.sync({cursor:{validity:'42',lastUid:8},threads:[message]})
  assert.equal(result.messages[0].body,'Owner reply received.');assert.equal(result.messages[0].inReplyTo,message.messageId);assert.equal(result.lastUid,9)
  const query=fixture.calls.find(c=>c.query?.or).query
  assert.equal(query.uid,'9:*');assert.equal(query.from,account);assert.equal(query.to,account);assert.deepEqual(query.or,[{header:{'in-reply-to':message.messageId}},{header:{references:message.messageId}}])
  assert.deepEqual(fixture.calls.find(c=>c.download),{download:'9',part:'1',config:{uid:true,maxBytes:50000}})
  assert.equal(fixture.calls.at(-1),'close')
})

test('wrong sender/thread and changed UIDVALIDITY never fetch a message body or reset a saved cursor',async()=>{
  for(const configuration of [{from:'unrelated@example.test'},{inReplyTo:'<unrelated@example.test>'},{validity:43n}]){
    const fixture=imapFixture(configuration)
    const adapter=createPairAdapter({...options,readEnabled:true,imapFactory:()=>fixture.client})
    if(configuration.validity)await assert.rejects(adapter.sync({cursor:{validity:'42',lastUid:8},threads:[message]}),/could not be confirmed/)
    else assert.equal((await adapter.sync({cursor:{validity:'42',lastUid:8},threads:[message]})).messages.length,0)
    assert.equal(fixture.calls.some(c=>c.download),false)
  }
})
