import {test} from 'node:test'
import assert from 'node:assert/strict'
import {gateMailboxReads} from '../scripts/mail/read-policy.mjs'

test('recovery read gate blocks message lists, bodies and reply headers before invoking the mailbox provider',()=>{
  let calls=0
  const reader={list(){calls++},message(){calls++},envelope(){calls++}}
  const paused=gateMailboxReads(reader)
  for(const method of ['list','message','envelope'])assert.throws(()=>paused[method]('42:7'),error=>error.status===403&&/paused/.test(error.message))
  assert.equal(calls,0)
})

test('fictional reader tests can explicitly exercise reply behavior without altering the live recovery gate',()=>{
  const fictional=gateMailboxReads({list:()=>['fictional'],message:key=>({key,body:'Fictional text'}),envelope:key=>({key,messageId:'<fictional@example.test>'})},true)
  assert.deepEqual(fictional.list(),['fictional'])
  assert.equal(fictional.message('42:7').body,'Fictional text')
  assert.equal(fictional.envelope('42:7').messageId,'<fictional@example.test>')
})
