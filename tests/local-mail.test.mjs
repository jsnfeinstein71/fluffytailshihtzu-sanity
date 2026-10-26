import assert from 'node:assert/strict'
import {test,beforeEach} from 'node:test'
import {Readable} from 'node:stream'
import {randomUUID} from 'node:crypto'
import {createInboxReader,createLocalMailService} from '../scripts/mail/inbox-reader.mjs'

const key='42:7'
const envelope={subject:'Puppy inquiry',from:[{name:'Fictional family',address:'family@example.test'}],to:[{address:'jeanne@fluffytailshihtzu.com'}],messageId:'<incoming@example.test>',date:'2026-10-26'}
let calls,state,service,reader
beforeEach(()=>{
  calls=[];state={drafts:[],reviews:[]}
  const client={
    on(){},async connect(){calls.push('connect')},async mailboxOpen(path,options){calls.push({path,options});return {readOnly:true,exists:37,uidValidity:42n}},
    async fetchAll(range,query){calls.push({range,query});return [{uid:7,envelope}]},
    async fetchOne(uid,query,options){calls.push({uid,query,options});return {uid:7,envelope,bodyStructure:{type:'text/plain',part:'1',parameters:{charset:'utf-8'}}}},
    async download(uid,part,options){calls.push({download:uid,part,options});return {meta:{charset:'utf-8'},content:Readable.from([Buffer.from('A fictional puppy question. <script>not executable</script>')])}},
    async logout(){calls.push('logout')},close(){calls.push('close')},
  }
  reader=createInboxReader({password:'offline-fake-password',imapFactory:options=>{calls.push({connection:options});return client}})
  service=createLocalMailService({reader,readState:async()=>structuredClone(state),writeState:async next=>{state=structuredClone(next)}})
})
const value={to:'family@example.test',subject:'Re: Puppy inquiry',body:'Thank you for your inquiry. Jeanne',parentKey:key}

test('local live-mail adapter lists bounded envelopes and reads selected plain text only in read-only mode',async()=>{
  const items=await reader.list();assert.equal(items.length,1);assert.equal(items[0].key,key)
  assert.deepEqual(calls.find(c=>c.range),{range:'8:*',query:{envelope:true,internalDate:true}})
  assert.equal(calls.some(c=>c.download),false)
  const message=await reader.message(key);assert.match(message.body,/fictional puppy/)
  assert.deepEqual(calls.find(c=>c.path),{path:'INBOX',options:{readOnly:true}})
  assert.deepEqual(calls.find(c=>c.download),{download:'7',part:'1',options:{uid:true,maxBytes:100000}})
  const options=calls.find(c=>c.connection).connection;assert.equal(options.logger,false);assert.equal(options.logRaw,false);assert.equal(options.tls.rejectUnauthorized,true);assert.equal(options.tls.minVersion,'TLSv1.2')
  assert.equal(calls.filter(c=>c==='logout').length,2)
})

test('changed mailbox identity cannot reply to a reused UID; provider errors expose no password/message',async()=>{
  await assert.rejects(reader.message('43:7'),{status:409})
  const broken=createInboxReader({password:'never-log-this',imapFactory:()=>({on(){},async connect(){throw new Error('never-log-this PRIVATE MAIL')},close(){}})})
  await assert.rejects(broken.list(),error=>error.status===503&&!/never-log|PRIVATE MAIL/.test(error.message))
})

test('local drafts save offline, survive reopening, retain typing on conflict and leave mailbox untouched',async()=>{
  const id=randomUUID()
  await service.action({type:'save',id,revision:null,value})
  assert.equal(calls.length,0)
  const first=state.drafts[0]
  await service.action({type:'save',id,revision:first.revision,value:{...value,body:'Another tab edit'}})
  await assert.rejects(service.action({type:'save',id,revision:first.revision,value:{...value,body:'Keep my edit'}}),error=>error.status===409&&error.conflict.value.body==='Another tab edit')
  assert.equal((await service.state()).drafts[0].value.body,'Another tab edit')
})

test('real-mail review uses canonical sender, recipient and threading and deduplicates retries without sending',async()=>{
  const id=randomUUID(),requestId=randomUUID()
  await service.action({type:'save',id,revision:null,value})
  const action={type:'review',id,revision:state.drafts[0].revision,requestId}
  await service.action(action);await service.action(action)
  assert.equal(state.reviews.length,1)
  assert.deepEqual({...state.reviews[0],id:undefined,draftId:undefined,revision:undefined,createdAt:undefined},{id:undefined,draftId:undefined,revision:undefined,createdAt:undefined,from:'jeanne@fluffytailshihtzu.com',replyTo:'jeanne@fluffytailshihtzu.com',to:'family@example.test',subject:value.subject,body:value.body,inReplyTo:envelope.messageId,references:[envelope.messageId],status:'held'})
  assert.equal(calls.some(c=>c.download),false)
  const before=structuredClone(state)
  for(const type of ['send','deliver'])await assert.rejects(service.action({type}),{status:403})
  assert.deepEqual(state,before)
})

test('forged recipients, headers, reply metadata and stale review versions fail before held publication',async()=>{
  for(const next of [{...value,subject:'Hi\r\nBcc: other@example.test'},{...value,to:'a@example.test,b@example.test'},{...value,from:'other@example.test'}])await assert.rejects(service.action({type:'save',id:randomUUID(),revision:null,value:next}),{status:400})
  const id=randomUUID()
  await service.action({type:'save',id,revision:null,value:{...value,to:'wrong@example.test'}})
  await assert.rejects(service.action({type:'review',id,revision:state.drafts[0].revision,requestId:randomUUID()}),{status:409})
  await assert.rejects(service.action({type:'review',id,revision:'stale',requestId:randomUUID()}),{status:409})
  assert.equal(state.reviews.length,0)
})

test('new email may be drafted to one chosen address but cannot gain delivery through a request flag',async()=>{
  const id=randomUUID()
  await service.action({type:'save',id,revision:null,value:{...value,parentKey:null}})
  await assert.rejects(service.action({type:'review',id,revision:state.drafts[0].revision,requestId:randomUUID(),send:true}),{status:400})
  await service.action({type:'review',id,revision:state.drafts[0].revision,requestId:randomUUID()})
  assert.equal(state.reviews[0].inReplyTo,null);assert.equal(state.reviews[0].status,'held');assert.equal(calls.length,0)
})
