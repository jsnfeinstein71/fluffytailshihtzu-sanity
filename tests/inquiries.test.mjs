import './register-typescript.mjs'
import test, {beforeEach} from 'node:test'
import assert from 'node:assert/strict'
import {parse, evaluate} from 'groq-js'
import {renderToStaticMarkup} from 'react-dom/server'
import twilio from 'twilio'
import {createElement} from 'react'
const {NextRequest} = await import('next/server')
const {AppRouterContext} = await import('next/dist/shared/lib/app-router-context.shared-runtime.js')

const {validateInquiry, legacyPuppySlug, normalizePhone} = await import('../lib/inquiry.ts')
const {issueInquiryToken, verifyInquiryToken, inquiryCookie} = await import('../lib/inquiry-security.ts')
const {privateRecordId} = await import('../sanity/lib/private-records.ts')
const {GET: formToken, POST: submit} = await import('../app/api/inquiry/route.ts')
const {POST: inbound} = await import('../app/api/fluffytail/sms/inbound/route.ts')
const {POST: retired} = await import('../app/api/fluffytail/inquiry/route.ts')
const {POST: sendSms} = await import('../app/inbox/api/sms-send/route.ts')
const {POST: deleteConversation} = await import('../app/inbox/api/delete-conversation/route.ts')
const {default: Inbox} = await import('../app/inbox/page.tsx')
const {default: InquiryPage} = await import('../app/puppy-inquiry/page.tsx')
const {readRequestText} = await import('../lib/request-body.ts')
const origin = 'https://preview.example'
const webhookUrl = 'https://www.fluffytailshihtzu.com/api/fluffytail/sms/inbound'
const auth = 'Basic ' + Buffer.from('fixture:fixture-password').toString('base64')
const payload = (extra = {}) => ({name: 'Fixture Customer', email: 'fixture@example.test', phone: '', preferredContactMethod: 'Email', message: 'Please tell me about this puppy.', puppySlug: 'puppy', interest: 'puppy', smsConsent: false, website: '', ...extra})
const clone = value => structuredClone(value)
let docs, notifications, revision, failNotification, failSave, failLog, failFinalPatch
const leads = () => docs.filter(doc => doc._type === 'puppyInquiry')
const messages = () => docs.filter(doc => doc._type === 'smsMessage')

beforeEach(() => {
  delete process.env.VERCEL
  delete process.env.VERCEL_ENV
  process.env.INQUIRY_FORM_SECRET = 'fixture-only-secret-at-least-32-characters'
  process.env.TWILIO_AUTH_TOKEN = 'fixture-only-twilio-secret'
  process.env.TWILIO_SMS_WEBHOOK_URL = webhookUrl
  process.env.TWILIO_FROM_NUMBER = '+15555550100'
  process.env.FLUFFYTAIL_ALERT_NUMBER = '+15555550102'
  delete process.env.FLUFFYTAIL_ALERT_NUMBER_2
  process.env.INBOX_BASIC_AUTH_USER = 'fixture'
  process.env.INBOX_BASIC_AUTH_PASS = 'fixture-password'
  docs = [
    {_id: 'litter', _type: 'litter', title: 'Fixture Litter', status: 'current', price: 1600, deposit: 400},
    {_id: 'puppy-id', _type: 'puppy', name: 'Fixture Puppy', slug: {current: 'puppy'}, status: 'available', litter: {_ref: 'litter'}},
  ]
  notifications = []
  revision = 0
  failNotification = failSave = failLog = failFinalPatch = false
  const fetch = async (query, params = {}) => (await evaluate(parse(query), {dataset: docs, params})).get()
  globalThis.fixtureSanityFetch = fetch
  globalThis.fixtureOperatorClient = {
    fetch,
    async getDocument(id) {return clone(docs.find(doc => doc._id === id))},
    async createIfNotExists(doc) {
      if (failSave) throw Error('Fixture persistence failure')
      if (failLog && doc._type === 'smsMessage') throw Error('Fixture alert log failure')
      const existing = docs.find(item => item._id === doc._id)
      if (existing) return clone(existing)
      const saved = {...clone(doc), _rev: String(++revision)}
      docs.push(saved)
      return clone(saved)
    },
    async create(doc) {docs.push({...clone(doc), _rev: String(++revision)}); return clone(doc)},
    async delete(id) {docs = docs.filter(doc => doc._id !== id)},
    patch(id) {
      return {values: {}, increments: {}, revision: null,
        set(values) {Object.assign(this.values, values); return this},
        inc(values) {Object.assign(this.increments, values); return this},
        ifRevisionId(value) {this.revision = value; return this},
        async commit() {
          const doc = docs.find(item => item._id === id)
          if (!doc || (this.revision && doc._rev !== this.revision)) throw Object.assign(Error('Conflict'), {statusCode: 409})
          if (failFinalPatch && doc._type === 'puppyInquiry') throw Error('Fixture final log failure')
          Object.assign(doc, this.values, {_rev: String(++revision)})
          for (const [key, value] of Object.entries(this.increments)) doc[key] += value
          return clone(doc)
        },
      }
    },
  }
  globalThis.fixtureTwilio = {messages: {async create(args) {
    notifications.push(clone(args))
    if (failNotification) throw Error('Fixture provider failure')
    return {sid: 'SM' + 'a'.repeat(32)}
  }}}
})

function inquiryRequest(body = payload(), headers = {}, token = issueInquiryToken(Date.now() - 3000)) {
  return new NextRequest(origin + '/api/inquiry', {
    method: 'POST', headers: {origin, 'content-type': 'application/json', cookie: `${inquiryCookie}=${token}`, 'x-inquiry-token': token, ...headers}, body: JSON.stringify(body),
  })
}
function operatorRequest(path, body, headers = {}) {
  return new NextRequest(origin + path, {method: 'POST', headers: {origin, authorization: auth, 'content-type': 'application/json', ...headers}, body: JSON.stringify(body)})
}
function smsRequest(extra = {}, {signature = true, signingUrl = webhookUrl, url = webhookUrl} = {}) {
  const params = {MessageSid: 'SM' + 'b'.repeat(32), From: '+15555550101', To: '+15555550100', Body: 'Fixture reply', NumMedia: '0', ...extra}
  return new NextRequest(url, {method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded', ...(signature ? {'x-twilio-signature': twilio.getExpectedTwilioSignature(process.env.TWILIO_AUTH_TOKEN, signingUrl, params)} : {})}, body: new URLSearchParams(params)})
}

test('email-only inquiry requires neither phone nor SMS consent, and server normalizes input', () => {
  const input = validateInquiry(payload({name: ' Fixture Customer ', email: 'FIXTURE@EXAMPLE.TEST', smsConsent: true}))
  assert.equal(input.email, 'fixture@example.test')
  assert.equal(input.name, 'Fixture Customer')
  assert.equal(input.phone, '')
  assert.equal(input.smsConsent, false)
})

test('Text and Either require a valid phone and explicit boolean consent', () => {
  for (const method of ['Text', 'Either']) {
    for (const extra of [{}, {phone: '555-555-0101'}, {phone: 'invalid', smsConsent: true}, {phone: '5555550101', smsConsent: 'true'}]) {
      assert.throws(() => validateInquiry(payload({preferredContactMethod: method, ...extra})))
    }
    const input = validateInquiry(payload({preferredContactMethod: method, phone: '(555) 555-0101', smsConsent: true}))
    assert.equal(input.phone, '+15555550101')
    assert.equal(input.smsConsent, true)
  }
})

test('explicit international numbers are preserved and malformed plus signs are rejected', () => {
  for (const phone of ['+6596661234', '+447700900123', '+15555550101']) assert.equal(normalizePhone(phone), phone)
  assert.equal(normalizePhone('555-555-0101'), '+15555550101')
  for (const phone of ['555+5550101', '++15555550101', '+05555550101']) assert.throws(() => normalizePhone(phone))
})

test('missing, malformed and oversized customer input is rejected', () => {
  for (const extra of [{name: ''}, {name: 'A\nB'}, {email: 'bad'}, {message: 'x'}, {message: 'x'.repeat(2001)}, {preferredContactMethod: 'Fax'}, {puppySlug: '../puppy'}, {phone: '+1bad'}, {name: '\u0000customer'}]) {
    assert.throws(() => validateInquiry(payload(extra)))
  }
  for (const body of [null, [], 'bad', 1]) assert.throws(() => validateInquiry(body))
})

test('form tokens are signed, cookie-bound, time-limited, and unavailable without server configuration', async () => {
  const response = await formToken(new NextRequest(origin + '/api/inquiry'))
  assert.equal(response.status, 200)
  assert.match(response.headers.get('set-cookie'), /HttpOnly/i)
  assert.match(response.headers.get('set-cookie'), /SameSite=strict/i)
  assert.match(response.headers.get('set-cookie'), /Secure/i)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const {token} = await response.json()
  assert.doesNotThrow(() => verifyInquiryToken(token, token, Date.now() + 3000))
  assert.throws(() => verifyInquiryToken(token, 'wrong'))
  assert.throws(() => verifyInquiryToken(token, token))
  assert.throws(() => verifyInquiryToken(token, token, Date.now() + 31 * 60_000))
  const forged = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a')
  assert.throws(() => verifyInquiryToken(forged, forged, Date.now() + 3000))
  delete process.env.INQUIRY_FORM_SECRET
  assert.equal((await formToken(new NextRequest(origin + '/api/inquiry'))).status, 503)
})

test('cross-origin, missing token, honeypot and wrong content type fail before effects', async () => {
  for (const [body, headers, expected] of [
    [payload(), {origin: 'https://attacker.test'}, 403],
    [payload(), {'sec-fetch-site': 'cross-site'}, 403],
    [payload(), {'x-inquiry-token': ''}, 403],
    [payload(), {cookie: ''}, 403],
    [payload({website: 'spam'}), {}, 403],
    [payload(), {'content-type': 'text/plain'}, 415],
  ]) assert.equal((await submit(inquiryRequest(body, headers))).status, expected)
  assert.equal((await formToken(new NextRequest(origin + '/api/inquiry', {headers: {'sec-fetch-site': 'cross-site'}}))).status, 403)
  assert.equal(leads().length, 0)
  assert.equal(notifications.length, 0)
})

test('opening another form reuses a valid cookie token without invalidating the first tab', async () => {
  const token = issueInquiryToken(Date.now() - 3000)
  const secondTab = await formToken(new NextRequest(origin + '/api/inquiry', {headers: {cookie: `${inquiryCookie}=${token}`}}))
  assert.equal((await secondTab.json()).token, token)
  assert.equal((await submit(inquiryRequest(payload(), {}, token))).status, 201)
  const expired = issueInquiryToken(Date.now() - 31 * 60_000)
  const replacement = await formToken(new NextRequest(origin + '/api/inquiry', {headers: {cookie: `${inquiryCookie}=${expired}`}}))
  assert.notEqual((await replacement.json()).token, expired)
})

test('body limits apply to actual stream bytes, not only Content-Length', async () => {
  await assert.rejects(() => readRequestText(new Request(origin, {method: 'POST', body: '12345'}), 4), error => error.status === 413)
  assert.equal((await submit(inquiryRequest(payload({message: 'a'.repeat(9000)})))).status, 413)
  assert.equal(leads().length, 0)
})

test('puppy/litter context is server-selected; forged names and URLs cannot change associations', async () => {
  const response = await submit(inquiryRequest(payload({puppy: 'Forged', litter: 'Forged', puppyPageUrl: 'https://attacker.test'})))
  assert.equal(response.status, 201, await response.clone().text())
  assert.equal(leads()[0].puppyId, 'puppy-id')
  assert.equal(leads()[0].litterId, 'litter')
  assert.equal(leads()[0].puppy, 'Fixture Puppy')
  assert.equal(leads()[0].litter, 'Fixture Litter')
  assert.equal(leads()[0].puppyPageUrl, 'https://www.fluffytailshihtzu.com/puppies/puppy')
  assert.equal(notifications.length, 1)
  assert.equal(notifications[0].to, '+15555550102')
  assert.match(notifications[0].body, /Fixture Puppy/)
  assert.doesNotMatch(await response.text(), /fixture@example.test|private\./)
  for (const doc of docs.filter(doc => !['puppy', 'litter'].includes(doc._type))) assert.match(doc._id, /^private\./)
})

test('missing or hidden puppy/litter is rejected without notifications or new leads', async () => {
  assert.equal((await submit(inquiryRequest(payload({puppySlug: 'missing'})))).status, 409)
  docs[0].isVisible = false
  assert.equal((await submit(inquiryRequest())).status, 409)
  assert.equal(leads().length, 0)
  assert.equal(notifications.length, 0)
})

test('general and waitlist inquiries remain native and do not invent puppy associations', async () => {
  assert.equal((await submit(inquiryRequest(payload({puppySlug: '', interest: 'waitlist'})))).status, 201)
  assert.equal(leads()[0].interest, 'waitlist')
  assert.equal(leads()[0].puppyId, undefined)
  assert.equal(leads()[0].litterId, undefined)
})

test('identical concurrent submissions create one inquiry and one operator alert', async () => {
  const responses = await Promise.all(Array.from({length: 3}, () => submit(inquiryRequest())))
  assert.ok(responses.every(response => [200, 201].includes(response.status)))
  assert.equal(leads().length, 1)
  assert.equal(notifications.length, 1)
  assert.equal(leads()[0].notificationStatus, 'sent')
  assert.equal((await submit(inquiryRequest())).status, 200)
  assert.equal(notifications.length, 1)
})

test('persistent per-email and per-IP limits reject additional distinct submissions', async () => {
  for (let i = 0; i < 3; i++) assert.equal((await submit(inquiryRequest(payload({message: 'Unique inquiry ' + i})))).status, 201)
  assert.equal((await submit(inquiryRequest(payload({message: 'Fourth distinct inquiry'})))).status, 429)
  for (let i = 0; i < 1; i++) assert.equal((await submit(inquiryRequest(payload({email: `other${i}@example.test`})))).status, 201)
  assert.equal((await submit(inquiryRequest(payload({email: 'last@example.test'})))).status, 429)
  assert.equal(notifications.length, 4)
})

test('provider or notification-log failure preserves the accepted lead and never blindly resends', async () => {
  failNotification = true
  assert.equal((await submit(inquiryRequest())).status, 201)
  assert.equal(leads()[0].notificationStatus, 'needs-review')
  assert.equal((await submit(inquiryRequest())).status, 200)
  assert.equal(notifications.length, 1)
  failNotification = false
  failLog = true
  assert.equal((await submit(inquiryRequest(payload({message: 'Another fixture inquiry'})))).status, 201)
  assert.equal(leads()[1].notificationStatus, 'needs-review')
  failFinalPatch = true
  assert.equal((await submit(inquiryRequest(payload({message: 'Third fixture inquiry'})))).status, 201)
  assert.equal(leads().length, 3)
})

test('missing operator alert configuration and persistence failures do not falsely accept leads', async () => {
  delete process.env.FLUFFYTAIL_ALERT_NUMBER
  assert.equal((await submit(inquiryRequest())).status, 503)
  assert.equal(leads().length, 0)
  process.env.FLUFFYTAIL_ALERT_NUMBER = '+15555550102'
  failSave = true
  assert.equal((await submit(inquiryRequest())).status, 503)
  assert.equal(leads().length, 0)
  assert.equal(notifications.length, 0)
})

test('preview saves only through isolated operator configuration and never sends messages', async () => {
  process.env.VERCEL_ENV = 'preview'
  const response = await submit(inquiryRequest())
  assert.equal(response.status, 201)
  assert.match((await response.json()).message, /No messages were sent/)
  assert.equal(leads()[0].notificationStatus, 'preview')
  assert.equal(notifications.length, 0)
  // Existing payments suite independently tests the real production-dataset guard.
})

test('email-only leads are visible in Inbox with separate identity, no fabricated phone', async () => {
  await submit(inquiryRequest())
  const page = await Inbox()
  assert.equal(page.props.conversations.length, 1)
  const conversation = page.props.conversations[0]
  assert.equal(conversation.phone, '')
  assert.equal(conversation.id, 'inquiry:' + leads()[0]._id)
  assert.equal(conversation.inquiry.smsConsent, false)
  assert.equal(conversation.inquiry.email, 'fixture@example.test')
  const html = renderToStaticMarkup(createElement(AppRouterContext.Provider, {value: {refresh() {}}}, page))
  assert.match(html, /Reply by Email/)
  assert.match(html, /mailto:fixture@example.test/)
})

test('native email preference blocks operator SMS even with a supplied phone; legacy conversations remain usable', async () => {
  await submit(inquiryRequest(payload({phone: '5555550101'})))
  const response = await sendSms(operatorRequest('/inbox/api/sms-send', {to: '+15555550101', body: 'Fixture reply'}))
  assert.equal(response.status, 403)
  assert.equal(notifications.length, 1) // Operator alert only; never a customer text.
  leads()[0].smsConsent = true
  leads()[0].preferredContactMethod = 'Text'
  assert.equal((await sendSms(operatorRequest('/inbox/api/sms-send', {to: '+15555550101', body: 'Fixture reply'}))).status, 200)
  assert.match(messages().at(-1)._id, /^private\./)
  assert.equal((await sendSms(operatorRequest('/inbox/api/sms-send', {to: '+15555550103', body: 'Existing conversation'}))).status, 200)
})

test('email-only deletion is authenticated and scoped to the selected inquiry ID', async () => {
  await submit(inquiryRequest())
  const id = leads()[0]._id
  assert.equal((await deleteConversation(operatorRequest('/inbox/api/delete-conversation', {inquiryId: id}, {authorization: ''}))).status, 401)
  assert.equal(leads().length, 1)
  assert.equal((await deleteConversation(operatorRequest('/inbox/api/delete-conversation', {inquiryId: 'puppy-id'}))).status, 400)
  assert.equal((await deleteConversation(operatorRequest('/inbox/api/delete-conversation', {inquiryId: id}))).status, 200)
  assert.equal(leads().length, 0)
  assert.equal(docs.filter(doc => doc._type === 'puppy').length, 1)
})

test('international sender and inquiry identity survive Inbox grouping and reply normalization', async () => {
  await submit(inquiryRequest(payload({preferredContactMethod: 'Text', phone: '+6596661234', smsConsent: true})))
  assert.equal((await inbound(smsRequest({From: '+6596661234'}))).status, 200)
  const page = await Inbox()
  assert.equal(page.props.conversations.length, 1)
  assert.equal(page.props.conversations[0].phone, '+6596661234')
  assert.equal(page.props.conversations[0].messages.length, 1)
  assert.equal((await sendSms(operatorRequest('/inbox/api/sms-send', {to: page.props.conversations[0].phone, body: 'Fixture only'}))).status, 200)
  assert.equal(notifications.at(-1).to, '+6596661234')
})

test('legacy puppy links resolve native context without loading user-supplied URLs', async () => {
  assert.equal(legacyPuppySlug({puppyPageUrl: 'https://old.example/puppies/puppy'}), 'puppy')
  const html = renderToStaticMarkup(await InquiryPage({searchParams: Promise.resolve({puppyPageUrl: 'https://www.fluffytailshihtzu.com/puppies/puppy', puppy: 'Forged', litter: 'Forged'})}))
  assert.match(html, /Fixture Puppy/)
  assert.match(html, /Litter: Fixture Litter/)
  assert.doesNotMatch(html, /iframe|tally.so|Forged/)
  await assert.rejects(() => InquiryPage({searchParams: Promise.resolve({puppySlug: 'missing'})}), error => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404')
})

test('native form presents server-selected puppy/photo context and defaults to email without requiring SMS', async () => {
  docs.push({_id: 'portrait', _type: 'sanity.imageAsset', url: '/original-fixture-puppy.jpg'})
  docs.find(doc => doc._type === 'puppy').mainImage = {asset: {_ref: 'portrait'}}
  const html = renderToStaticMarkup(await InquiryPage({searchParams: Promise.resolve({puppySlug: 'puppy', puppy: 'Forged name', litter: 'Forged litter', puppyPhotoUrl: 'https://attacker.test/image.jpg'})}))
  for (const text of ['Fixture Puppy', 'Litter: Fixture Litter', '/original-fixture-puppy.jpg', 'How should Jeanne reply?', 'Privacy Policy', 'Terms and Conditions']) assert.ok(html.includes(text), text)
  for (const field of ['name', 'email', 'phone', 'message', 'preferredContactMethod', 'website']) assert.ok(html.includes(`name="${field}"`), field)
  assert.match(html, /<input(?=[^>]*name="preferredContactMethod")(?=[^>]*value="Email")(?=[^>]*checked="")[^>]*>/)
  assert.doesNotMatch(html.match(/<input[^>]*name="phone"[^>]*>/)[0], /required/)
  assert.doesNotMatch(html, /name="smsConsent"|<aside|<iframe|Forged|attacker.test/)
  assert.match(html, /<button[^>]*type="submit"[^>]*disabled=""/)
})

test('general and future-interest form presentation remains native without an invented puppy selection', async () => {
  const future = renderToStaticMarkup(await InquiryPage({searchParams: Promise.resolve({interest: 'waitlist'})}))
  assert.match(future, /Ask about future puppies\./)
  assert.match(future, /I would like to hear about future puppies and upcoming litters\./)
  const general = renderToStaticMarkup(await InquiryPage({searchParams: Promise.resolve({})}))
  assert.match(general, /Say hello to Jeanne\./)
  for (const html of [future, general]) {
    assert.doesNotMatch(html, /class="inquiry-context"|name="smsConsent"|<iframe|<aside/)
    for (const method of ['Email', 'Text', 'Either']) assert.ok(html.includes(`value="${method}"`), method)
  }
})

test('Contact starts empty with a placeholder while future-litter links retain their contextual message', async () => {
  const {default: Contact} = await import('../app/contact/page.tsx')
  docs.push({_id: 'settings', _type: 'siteSettings', goodDogUrl: 'https://www.gooddog.com/breeders/fixture'})
  const html = renderToStaticMarkup(await Contact())
  assert.match(html, /Contact Jeanne/)
  assert.equal((html.match(/<form\b/g) || []).length, 1)
  assert.match(html, /placeholder="Tell Jeanne how she can help\."/)
  assert.match(html, /<textarea[^>]*name="message"[^>]*required=""><\/textarea>/)
  assert.doesNotMatch(html, /I would like to hear about future puppies and upcoming litters/)
  assert.match(html, /href="https:\/\/www.gooddog.com\/breeders\/fixture"/)
  assert.match(html, /href="\/puppy-inquiry\?interest=waitlist"/)
  assert.doesNotMatch(html, /name="smsConsent"|<iframe|class="inquiry-context"/)
  const future = renderToStaticMarkup(await InquiryPage({searchParams: Promise.resolve({interest: 'waitlist'})}))
  assert.match(future, /I would like to hear about future puppies and upcoming litters\.<\/textarea>/)
  assert.doesNotMatch(future, /placeholder="Tell Jeanne how she can help/)
})

test('retired Tally callback returns 410 and performs no record or notification work', async () => {
  assert.equal((await retired(inquiryRequest())).status, 410)
  assert.equal(leads().length, 0)
  assert.equal(notifications.length, 0)
})

test('Twilio rejects unsigned, wrong URL and altered parameter signatures before persistence', async () => {
  assert.equal((await inbound(smsRequest({}, {signature: false}))).status, 403)
  assert.equal((await inbound(smsRequest({}, {signingUrl: 'https://attacker.test/inbound'}))).status, 403)
  const changed = smsRequest()
  assert.equal((await inbound(new NextRequest(webhookUrl, {method: 'POST', headers: changed.headers, body: 'MessageSid=forged&Body=changed'}))).status, 403)
  assert.equal(messages().length, 0)
})

test('valid Twilio callback is privately saved once and duplicate events do not repeat the acknowledgement', async () => {
  const responses = await Promise.all([inbound(smsRequest()), inbound(smsRequest())])
  assert.equal(messages().length, 1)
  assert.match(messages()[0]._id, /^private\.sms\./)
  assert.equal(messages()[0].signatureVerified, true)
  const replies = await Promise.all(responses.map(response => response.text()))
  assert.equal(replies.filter(reply => reply.includes('<Message>')).length, 1)
  assert.doesNotMatch(await (await inbound(smsRequest())).text(), /<Message>/)
  assert.equal(notifications.length, 0)
})

test('Twilio recognizes historical SIDs, validates media limits, and returns retryable persistence errors', async () => {
  docs.push({_id: 'legacy-sms', _type: 'smsMessage', messageSid: 'SM' + 'b'.repeat(32)})
  assert.doesNotMatch(await (await inbound(smsRequest())).text(), /<Message>/)
  assert.equal((await inbound(smsRequest({NumMedia: '11'}))).status, 400)
  assert.equal((await inbound(smsRequest({NumMedia: '1', MediaUrl0: 'http://insecure.test/a'}))).status, 400)
  docs = docs.filter(doc => doc._id !== 'legacy-sms')
  failSave = true
  assert.equal((await inbound(smsRequest())).status, 503)
  assert.equal(messages().length, 0)
})

test('private IDs are deterministic per event, opaque, and never encode customer contact details', () => {
  assert.equal(privateRecordId('inquiry', 'fixture@example.test'), privateRecordId('inquiry', 'fixture@example.test'))
  assert.match(privateRecordId('sms'), /^private\.sms\.[a-f0-9]{64}$/)
  assert.doesNotMatch(privateRecordId('inquiry', 'fixture@example.test'), /fixture|example/)
  assert.throws(() => privateRecordId('bad.kind'))
})
