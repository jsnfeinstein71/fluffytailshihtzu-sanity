import assert from 'node:assert/strict'
import {test} from 'node:test'
import {account,checkConnection,requireLocalMailboxAccess,validateProfile} from '../scripts/mail/connection-check.mjs'

function clients({smtpError,imapError,readOnly=true}={}){
  const calls=[];const options={}
  return {calls,options,
    smtpFactory(config){options.smtp=config;return {async verify(){calls.push('smtp.verify');if(smtpError)throw smtpError},close(){calls.push('smtp.close')},sendMail(){throw new Error('Sending is forbidden in a connection check')}}},
    imapFactory(config){options.imap=config;return {on(){},async connect(){calls.push('imap.connect');if(imapError)throw imapError},async mailboxOpen(path,mode){calls.push(['imap.open',path,mode]);return {readOnly}},async logout(){calls.push('imap.logout')},close(){calls.push('imap.close')},fetch(){throw new Error('Message reads are forbidden')},messageFlagsAdd(){throw new Error('Mailbox writes are forbidden')}}},
  }
}
test('live mailbox tooling refuses Vercel/Preview contexts and non-Windows hosts',()=>{
  for(const env of [{VERCEL:'1'},{VERCEL_ENV:'preview'},{VERCEL_ENV:'production'},{FLUFFYTAIL_WORKSPACE_FIXTURE_SERVER:'1'}])assert.throws(()=>requireLocalMailboxAccess(env,'win32'),/separate/)
  assert.throws(()=>requireLocalMailboxAccess({},'linux'),/separate/)
  assert.doesNotThrow(()=>requireLocalMailboxAccess({},'win32'))
})
test('connection profile is bound to the approved account and diagnostic-only purpose',()=>{
  const profile={version:1,account,provider:'PairProMail',purpose:'connection-check',protectedPassword:'encrypted-fixture-value-only'}
  assert.equal(validateProfile(profile),profile)
  assert.throws(()=>validateProfile({...profile,account:'different@example.test'}),/invalid/)
  assert.throws(()=>validateProfile({...profile,purpose:'send'}),/invalid/)
})
test('connection check verifies TLS authentication and read-only Inbox without reading/sending/writing messages',async()=>{
  const fake=clients()
  const report=await checkConnection('fixture-not-a-real-password',fake)
  assert.deepEqual(fake.calls,['smtp.verify','smtp.close','imap.connect',['imap.open','INBOX',{readOnly:true}],'imap.logout','imap.close'])
  assert.equal(report.messagesSent,0);assert.equal(report.messageBodiesRead,0);assert.equal(report.mailboxChanges,0);assert.equal(report.emailDelivery,'not tested')
  for(const kind of ['smtp','imap']){
    assert.equal(fake.options[kind].secure,true);assert.equal(fake.options[kind].tls.rejectUnauthorized,true);assert.equal(fake.options[kind].tls.minVersion,'TLSv1.2');assert.equal(fake.options[kind].logger,false);assert.equal(fake.options[kind].auth.user,account)
  }
  assert.equal(fake.options.smtp.port,465);assert.equal(fake.options.imap.port,993);assert.equal(fake.options.imap.disableAutoIdle,true)
})
test('SMTP failure is not retried and prevents further mailbox login attempts or raw error/password logging',async()=>{
  const fake=clients({smtpError:Object.assign(new Error('Secret fixture-password echoed by provider'),{code:'EAUTH'})})
  const report=await checkConnection('fixture-password',fake)
  assert.deepEqual(fake.calls,['smtp.verify','smtp.close'])
  assert.equal(report.smtp.status,'failed');assert.equal(report.imap.status,'not attempted after SMTP failure')
  assert.doesNotMatch(JSON.stringify(report),/fixture-password|echoed by provider/)
})
test('IMAP errors or unconfirmed read-only mode fail safely and never turn into a delivery claim',async()=>{
  for(const options of [{imapError:new Error('provider private detail')},{readOnly:false}]){
    const fake=clients(options);const report=await checkConnection('fixture-password',fake)
    assert.equal(report.smtp.status,'secure sign-in verified');assert.equal(report.imap.status,'failed');assert.equal(report.emailDelivery,'not tested');assert.equal(fake.calls.at(-1),'imap.close')
    assert.doesNotMatch(JSON.stringify(report),/provider private detail/)
  }
})
