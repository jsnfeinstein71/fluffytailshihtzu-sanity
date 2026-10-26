import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createClient} from '@sanity/client'

// Explicit synthetic target only. Never run this against the production website or dataset.
const base = new URL(process.argv[2])
assert.ok(base.protocol === 'https:' && base.hostname.endsWith('.vercel.app') ||
  base.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(base.hostname))
assert.equal(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, 'gu1xkpsg')
assert.equal(process.env.NEXT_PUBLIC_SANITY_DATASET, 'synthetic')
assert.ok(process.env.SANITY_API_WRITE_TOKEN)
assert.ok(process.env.INBOX_BASIC_AUTH_USER && process.env.INBOX_BASIC_AUTH_PASS)
const sanity = createClient({projectId: 'gu1xkpsg', dataset: 'synthetic', apiVersion: '2025-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN, useCdn: false})
const protection = process.env.PREVIEW_PROTECTION_BYPASS
  ? {'x-vercel-protection-bypass': process.env.PREVIEW_PROTECTION_BYPASS} : {}
async function request(path, options = {}) {
  return fetch(new URL(path, base), {...options, redirect: 'manual',
    headers: {...protection, ...options.headers}})
}
const opened = await request('/api/inquiry')
assert.equal(opened.status, 200, 'Preview form token must be available')
const {token} = await opened.json()
const cookie = opened.headers.get('set-cookie')?.split(';')[0]
assert.ok(token && cookie)
await new Promise(resolve => setTimeout(resolve, 3100))
const id = randomUUID().slice(0, 8)
const headers = {'Content-Type': 'application/json', Origin: base.origin, Cookie: cookie, 'X-Inquiry-Token': token}
const saved = []
const alertsBefore = await sanity.fetch('count(*[_type=="smsMessage" && source=="fluffytail-alert"])')
for (const method of ['Email', 'Text', 'Either']) {
  const name = 'Website QA ' + id + ' ' + method
  const payload = {name, email: `website-qa-${id}-${method.toLowerCase()}@example.test`,
    phone: method === 'Email' ? '' : method === 'Text' ? '+15555550106' : '+15555550107', preferredContactMethod: method,
    message: 'Synthetic website integration verification only.', smsConsent: method !== 'Email', website: '',
    puppySlug: 'preview-girl-1', interest: 'puppy'}
  if (method === 'Text') {
    assert.equal((await request('/api/inquiry', {method: 'POST', headers,
      body: JSON.stringify({...payload, smsConsent: false})})).status, 400)
  }
  assert.equal((await request('/api/inquiry', {method: 'POST', headers: {...headers, Origin: 'https://example.invalid'},
    body: JSON.stringify(payload)})).status, 403)
  const accepted = await request('/api/inquiry', {method: 'POST', headers, body: JSON.stringify(payload)})
  assert.equal(accepted.status, 201, 'Synthetic inquiry must persist')
  assert.match((await accepted.json()).message, /No messages were sent/)
  const duplicate = await request('/api/inquiry', {method: 'POST', headers, body: JSON.stringify(payload)})
  assert.equal(duplicate.status, 200)
  assert.equal((await duplicate.json()).duplicate, true)
  const records = await sanity.fetch('*[_type=="puppyInquiry" && email==$email]', {email: payload.email})
  assert.equal(records.length, 1)
  const record = records[0]
  assert.match(record._id, /^private\.inquiry\./)
  assert.equal(record.puppyId, 'review-puppy-available')
  assert.equal(record.litterId, 'review-litter-one')
  assert.equal(record.preferredContactMethod, method)
  assert.equal(record.smsConsent, method !== 'Email')
  assert.equal(record.notificationStatus, 'preview')
  const anonymous = await fetch(`https://gu1xkpsg.api.sanity.io/v2025-01-01/data/query/synthetic?${new URLSearchParams({query: '*[_id==$id]', $id: JSON.stringify(record._id)})}`)
  assert.equal(anonymous.status, 200)
  assert.deepEqual((await anonymous.json()).result, [])
  saved.push({name, id: record._id})
}
assert.equal(await sanity.fetch('count(*[_type=="smsMessage" && source=="fluffytail-alert"])'), alertsBefore)
assert.equal((await request('/inbox')).status, 401)
const inbox = await request('/inbox', {headers: {Authorization: 'Basic ' +
  Buffer.from(process.env.INBOX_BASIC_AUTH_USER + ':' + process.env.INBOX_BASIC_AUTH_PASS).toString('base64')}})
assert.equal(inbox.status, 200)
assert.match(inbox.headers.get('cache-control'), /private.*no-store/)
const inboxHtml = await inbox.text()
for (const record of saved) assert.ok(inboxHtml.includes(record.name), 'Saved inquiry must appear in authenticated Inbox')
for (const route of ['/api/stripe/webhook', '/api/fluffytail/sms/inbound']) {
  assert.equal((await request(route, {method: 'POST', body: 'synthetic-only'})).status, 503)
}
assert.equal((await request('/api/fluffytail/inquiry', {method: 'POST'})).status, 410)
for (const route of ['/test-stripe', '/puppies/not-a-real-puppy']) assert.equal((await request(route)).status, 404)
console.log(JSON.stringify({host: base.host, syntheticProject: 'gu1xkpsg', dataset: 'synthetic',
  savedInquiries: saved.length, duplicateRecords: 0, anonymousRecords: 0,
  inboxAuthenticated: true, providerCallbacksDisabled: true, notificationsSent: 0,
  syntheticRecordsRetainedForReview: true}, null, 2))
