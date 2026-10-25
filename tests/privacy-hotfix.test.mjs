import './register-typescript.mjs'
import test, {beforeEach} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import {parse, evaluate} from 'groq-js'
import Stripe from 'stripe'
import {planPrivacyMigration} from '../scripts/sanity-privacy-migration.mjs'

process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'fixture123'
process.env.NEXT_PUBLIC_SANITY_DATASET = 'synthetic'
process.env.SANITY_API_WRITE_TOKEN = 'fixture-server-token'
globalThis.fixtureWriterConfigs = []
const {NextRequest} = await import('next/server')
const {getOperationalClient: realClient} = await import('../sanity/lib/operational-client.ts')
const {default: Inbox} = await import('../app/inbox/page.tsx')
const {default: Pay} = await import('../app/pay/[token]/page.tsx')
const {POST: inquiry} = await import('../app/api/fluffytail/inquiry/route.ts')
const {POST: inbound} = await import('../app/api/fluffytail/sms/inbound/route.ts')
const {POST: outbound} = await import('../app/api/fluffytail/sms/send/route.ts')
const {POST: deposit} = await import('../app/api/stripe/create-deposit-session/route.ts')
const {POST: invoice} = await import('../app/api/stripe/create-invoice/route.ts')
const {POST: manual} = await import('../app/api/stripe/create-payment-link/route.ts')
const {POST: webhook} = await import('../app/api/stripe/webhook/route.ts')
const {POST: deleteConversation} = await import('../app/inbox/api/delete-conversation/route.ts')
const {POST: upload} = await import('../app/api/fluffytail/upload-image/route.ts')
const {proxy, config: proxyConfig} = await import('../proxy.ts')
const sdk = new Stripe('sk_test_fixture_not_a_real_key')
const secret = 'whsec_fixture_only'
const clone = value => structuredClone(value)
let docs, calls, reads, invoiceItems
const request = (path, body) => new Request('https://fixture.example' + path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})
const customer = {customerName: 'Synthetic Customer', customerEmail: 'synthetic@example.test', customerPhone: '+15555550101'}
const puppyInfo = {puppySlug: 'synthetic-puppy', puppyName: 'Synthetic Puppy', litterTitle: 'Synthetic Litter'}
const created = type => docs.filter(doc => doc._type === type)

beforeEach(() => {
  delete process.env.FLUFFYTAIL_WRITE_FREEZE
  process.env.SANITY_API_WRITE_TOKEN = 'fixture-server-token'
  process.env.INBOX_BASIC_AUTH_USER = 'fixture'
  process.env.INBOX_BASIC_AUTH_PASS = 'fixture-pass'
  process.env.STRIPE_WEBHOOK_SECRET = secret
  process.env.NEXT_PUBLIC_SITE_URL = 'https://fixture.example'
  process.env.TWILIO_FROM_NUMBER = '+15555550102'
  process.env.FLUFFYTAIL_ALERT_NUMBER = '+15555550103'
  process.env.FLUFFYTAIL_ALERT_NUMBER_2 = '+15555550104'
  docs = [
    {_id: 'public-litter', _rev: 'l1', _type: 'litter', title: 'Synthetic Litter', price: 1600, deposit: 400},
    {_id: 'public-puppy', _rev: 'p1', _type: 'puppy', name: 'Synthetic Puppy', slug: {current: 'synthetic-puppy'}, status: 'available', litter: {_type: 'reference', _ref: 'public-litter'}},
  ]
  calls = []; reads = []; invoiceItems = []
  const fetch = async (query, params = {}, options) => {
    reads.push({query, params, options})
    return (await evaluate(parse(query), {dataset: docs, params})).get()
  }
  const create = async doc => {
    assert.match(doc._id, /^private\.[A-Za-z][A-Za-z0-9-]*\.[a-f0-9]{64}$/, 'All sensitive creates must be private')
    assert.ok(!docs.some(existing => existing._id === doc._id))
    docs.push({...clone(doc), _rev: 'new'})
    return clone(doc)
  }
  function patch(id) {
    return {values: {}, set(values) {Object.assign(this.values, values); return this}, async commit() {
      const doc = docs.find(item => item._id === id)
      assert.ok(doc)
      Object.assign(doc, this.values)
      return clone(doc)
    }}
  }
  globalThis.fixtureOperationalClient = {fetch, create, patch,
    transaction() {
      const creates = [], deletes = []
      return {create(doc) {creates.push(doc); return this}, delete(id) {deletes.push(id); return this}, async commit() {
        for (const doc of creates) await create(doc)
        docs = docs.filter(doc => !deletes.includes(doc._id))
      }}
    },
  }
  globalThis.fixtureSanityFetch = async () => {throw Error('Operational readers must not use the anonymous public client')}
  globalThis.fixtureTwilio = {messages: {async create(params) {calls.push({kind: 'sms', params: clone(params)}); return {sid: 'SM_fixture_' + calls.length}}}}
  globalThis.fixtureStripe = {
    webhooks: sdk.webhooks,
    checkout: {sessions: {async create(params) {calls.push({kind: 'checkout', params: clone(params)}); return {id: 'cs_test_fixture', url: 'https://checkout.stripe.com/c/pay/fixture'}}}},
    customers: {async create(params) {calls.push({kind: 'customer', params: clone(params)}); return {id: 'cus_fixture'}}},
    invoiceItems: {async create(params) {invoiceItems.push(clone(params)); return {id: 'ii_fixture'}}},
    invoices: {async create(params) {calls.push({kind: 'invoice', params: clone(params)}); return {id: 'in_fixture'}},
      async finalizeInvoice(id) {calls.push({kind: 'finalize', id}); return {id, hosted_invoice_url: 'https://invoice.stripe.com/i/fixture', status: 'open', amount_due: invoiceItems.reduce((sum, item) => sum + item.amount, 0), amount_paid: 0, amount_remaining: invoiceItems.reduce((sum, item) => sum + item.amount, 0)}}},
  }
})

test('server-only operational client requires a token and retains content-reader API perspective/version', () => {
  const before = globalThis.fixtureWriterConfigs.length
  realClient()
  const config = globalThis.fixtureWriterConfigs.at(-1)
  assert.equal(config.token, 'fixture-server-token')
  assert.equal(config.useCdn, false)
  assert.equal(config.perspective, 'published')
  assert.equal(config.apiVersion, '2026-03-30')
  assert.match(readFileSync('sanity/lib/operational-client.ts', 'utf8'), /import 'server-only'/)
  delete process.env.SANITY_API_WRITE_TOKEN
  assert.throws(realClient, /credentials are not configured/)
  assert.equal(globalThis.fixtureWriterConfigs.length, before + 1)
})

test('existing authenticated writer API version and token configuration are unchanged', () => {
  const writers = globalThis.fixtureWriterConfigs.filter(config => config.apiVersion === '2025-01-01')
  assert.equal(writers.length, 9) // Six sensitive writers, manual-payment/deletion readers and asset upload.
  for (const config of writers) {assert.equal(config.token, 'fixture-server-token'); assert.equal(config.useCdn, false)}
})

test('all three active legacy deposit shapes redirect unchanged with root, mixed and migrated private IDs', async () => {
  for (const stage of ['root', 'mixed', 'private']) {
    const links = Array.from({length: 3}, (_, i) => ({_id: `old-link-${i}`, _rev: 'old', _type: 'depositLink', active: true, token: 'legacy-token-' + i, stripeCheckoutUrl: 'https://checkout.stripe.com/c/pay/legacy-' + i}))
    docs = docs.filter(doc => doc._type !== 'depositLink')
    const plan = planPrivacyMigration(links)
    docs.push(...links.map((doc, i) => stage === 'private' || stage === 'mixed' && i % 2 ? plan.replacements.find(replacement => replacement._id === plan.mapping[doc._id]) : doc))
    for (let i = 0; i < 3; i++) {
      await assert.rejects(() => Pay({params: Promise.resolve({token: 'legacy-token-' + i})}), error => error.digest === `NEXT_REDIRECT;replace;https://checkout.stripe.com/c/pay/legacy-${i};307;`)
    }
  }
  for (const read of reads) assert.equal(read.options.cache, 'no-store')
  assert.equal(calls.length, 0)
})

test('inactive, missing and URL-less deposit links keep their 404 behavior', async () => {
  docs.push({_id: 'private.deposit.a', _type: 'depositLink', token: 'inactive', active: false, stripeCheckoutUrl: 'https://checkout.stripe.com/c/pay/fixture'},
    {_id: 'legacy-no-url', _type: 'depositLink', token: 'no-url', active: true})
  for (const token of ['missing', 'inactive', 'no-url']) await assert.rejects(() => Pay({params: Promise.resolve({token})}), error => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404')
})

test('Inbox preserves mixed-ID history, alert exclusion, payment totals and no-store reads', async () => {
  docs.push({_id: 'legacy-inquiry', _type: 'puppyInquiry', phone: customer.customerPhone, name: customer.customerName, puppyPageUrl: 'https://www.fluffytailshihtzu.com/puppies/synthetic-puppy'},
    {_id: 'private.sms.a', _type: 'smsMessage', from: customer.customerPhone, direction: 'inbound', body: 'Synthetic incoming'},
    {_id: 'legacy-alert', _type: 'smsMessage', to: customer.customerPhone, direction: 'outbound', source: 'fluffytail-alert', body: 'Operator alert'},
    {_id: 'private.payment.a', _type: 'paymentRecord', puppySlug: 'synthetic-puppy', customerPhone: customer.customerPhone, paymentStatus: 'paid', paymentType: 'deposit', amountPaid: 300})
  const page = await Inbox(), conversation = page.props.conversations[0]
  assert.equal(page.props.conversations.length, 1)
  assert.equal(conversation.messages.length, 1)
  assert.equal(conversation.inquiry._id, 'legacy-inquiry')
  assert.equal(conversation.paymentSummary.totalPaid, 300)
  assert.equal(conversation.paymentSummary.remainingBalance, 1300)
  assert.equal(reads.length, 4)
  assert.ok(reads.every(read => read.options.cache === 'no-store'))
})

test('Inbox proxy keeps Basic Auth behavior while forbidding authenticated HTML/RSC caching', () => {
  assert.deepEqual(proxyConfig.matcher, ['/inbox/:path*'])
  assert.equal(proxy(new NextRequest('https://fixture.example/inbox')).status, 401)
  const authorized = proxy(new NextRequest('https://fixture.example/inbox?_rsc=fixture', {headers: {authorization: 'Basic ' + Buffer.from('fixture:fixture-pass').toString('base64')}}))
  assert.equal(authorized.headers.get('cache-control'), 'private, no-store')
  delete process.env.INBOX_BASIC_AUTH_PASS
  const missing = proxy(new NextRequest('https://fixture.example/inbox'))
  assert.equal(missing.status, 500)
  assert.equal(missing.headers.get('cache-control'), 'no-store')
})

test('default-off write freeze blocks all nine mutating routes before parsing, provider calls or persistence', async () => {
  process.env.FLUFFYTAIL_WRITE_FREEZE = '1'
  for (const handler of [inquiry, inbound, outbound, deposit, invoice, manual, webhook, deleteConversation, upload]) {
    const response = await handler(new Request('https://fixture.example/mutation', {method: 'POST', body: 'not a valid provider payload'}))
    assert.equal(response.status, 503)
    assert.equal(response.headers.get('retry-after'), '60')
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
  assert.equal(calls.length, 0)
  assert.equal(reads.length, 0)
  assert.equal(docs.length, 2)
})

test('legacy inquiry parsing, explicit consent, operator alerts and both transactional SMS logs are retained', async () => {
  const fields = [['Name', 'Synthetic Customer'], ['Phone', '+15555550101'], ['Email', 'synthetic@example.test'], ['Preferred contact method', 'Text'], ['Message', 'Synthetic inquiry']].map(([label, value]) => ({label, value}))
  fields.push({key: 'question_0MkQkZ', type: 'CHECKBOXES', label: '', value: ['yes']})
  const response = await inquiry(request('/api/fluffytail/inquiry', {data: {fields}, hiddenFields: {puppy: puppyInfo.puppyName, litter: puppyInfo.litterTitle, puppyPageUrl: 'https://www.fluffytailshihtzu.com/puppies/synthetic-puppy'}}))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {ok: true})
  const lead = created('puppyInquiry')[0]
  assert.equal(lead.name, customer.customerName); assert.equal(lead.phone, customer.customerPhone); assert.equal(lead.email, customer.customerEmail)
  assert.equal(lead.smsConsent, true); assert.equal(lead.message, 'Synthetic inquiry'); assert.equal(lead.source, 'fluffytail')
  assert.equal(lead.puppy, puppyInfo.puppyName); assert.equal(lead.litter, puppyInfo.litterTitle)
  const alerts = created('smsMessage')
  assert.equal(alerts.length, 2)
  assert.deepEqual(calls.map(call => call.params.to), ['+15555550103', '+15555550104'])
  for (const alert of alerts) {assert.equal(alert.body, calls[0].params.body); assert.equal(alert.source, 'fluffytail-alert'); assert.match(alert._id, /^private\.alert\./)}
  assert.match(lead._id, /^private\.inquiry\./)
})

test('inbound SMS/MMS callback preserves payload and acknowledgement, adding only a private ID', async () => {
  const form = new URLSearchParams({MessageSid: 'SM_fixture_inbound', From: customer.customerPhone, To: '+15555550102', Body: 'Synthetic MMS', NumMedia: '1', MediaUrl0: 'https://example.test/synthetic.jpg'})
  const response = await inbound(new Request('https://fixture.example/api/fluffytail/sms/inbound', {method: 'POST', body: form}))
  assert.equal(response.status, 200)
  assert.match(await response.text(), /<Message>Thanks for contacting FluffyTail Shih Tzu\./)
  const saved = created('smsMessage')[0]
  assert.match(saved._id, /^private\.sms\./)
  assert.equal(saved.messageSid, 'SM_fixture_inbound')
  assert.equal(saved.direction, 'inbound'); assert.equal(saved.body, 'Synthetic MMS')
  assert.deepEqual(saved.mediaUrls, ['https://example.test/synthetic.jpg'])
  assert.equal(calls.length, 0)
})

test('outbound SMS/MMS provider arguments and response stay unchanged; saved record is private', async () => {
  const response = await outbound(request('/api/fluffytail/sms/send', {to: customer.customerPhone, body: 'Synthetic reply', mediaUrls: ['https://example.test/synthetic.jpg']}))
  assert.deepEqual(await response.json(), {ok: true, sid: 'SM_fixture_1'})
  assert.deepEqual(calls[0].params, {from: '+15555550102', to: customer.customerPhone, body: 'Synthetic reply', mediaUrl: ['https://example.test/synthetic.jpg']})
  assert.match(created('smsMessage')[0]._id, /^private\.sms\./)
})

test('deposit preserves existing Stripe metadata, token, URLs and legacy amount without importing Phase 1 pricing', async () => {
  const response = await deposit(request('/api/stripe/create-deposit-session', {...customer, ...puppyInfo}))
  assert.equal(response.status, 200)
  const json = await response.json(), link = created('depositLink')[0], params = calls[0].params
  assert.match(link._id, /^private\.deposit\./)
  assert.equal(link.token.length, 12)
  assert.equal(params.line_items[0].price_data.unit_amount, 30000) // Intentional compatibility, not pricing approval.
  assert.deepEqual(params.metadata, {token: link.token, ...puppyInfo, ...customer, paymentType: 'deposit'})
  assert.equal(params.client_reference_id, puppyInfo.puppySlug)
  assert.equal(params.success_url, 'https://fixture.example/payment-success?session_id={CHECKOUT_SESSION_ID}')
  assert.equal(params.cancel_url, 'https://fixture.example/puppies/synthetic-puppy')
  assert.deepEqual(json, {url: 'https://fixture.example/pay/' + link.token, shortUrl: 'https://fixture.example/pay/' + link.token, stripeUrl: 'https://checkout.stripe.com/c/pay/fixture'})
})

test('manual payment metadata and cent conversion remain unchanged', async () => {
  const response = await manual(request('/api/stripe/create-payment-link', {...customer, ...puppyInfo, amount: 125.25}))
  assert.equal(response.status, 200)
  assert.equal(calls[0].params.line_items[0].price_data.unit_amount, 12525)
  assert.deepEqual(calls[0].params.metadata, {puppySlug: puppyInfo.puppySlug, puppyName: puppyInfo.puppyName, ...customer, paymentType: 'manual-payment', amountPaid: '125.25'})
})

test('invoices retain puppy override/default pricing and historical private/root payment credits', async () => {
  docs[1].overridePrice = 2000
  docs.push({_id: 'legacy-payment', _type: 'paymentRecord', puppySlug: 'synthetic-puppy', paymentStatus: 'paid', paymentType: 'deposit', amountPaid: 300},
    {_id: 'private.payment.a', _type: 'paymentRecord', puppySlug: 'synthetic-puppy', paymentStatus: 'paid', paymentType: 'manual-payment', amountPaid: 100})
  const response = await invoice(request('/api/stripe/create-invoice', {...customer, ...puppyInfo}))
  assert.equal(response.status, 200)
  assert.deepEqual(invoiceItems.map(item => item.amount), [200000, -30000, -10000])
  assert.equal((await response.json()).amountDue, 1600)
  const params = calls.find(call => call.kind === 'invoice').params
  assert.deepEqual(params.metadata, {puppySlug: puppyInfo.puppySlug, puppyName: puppyInfo.puppyName, ...customer, paymentType: 'invoice', totalPrice: '2000', totalPaid: '400', amountDue: '1600'})
  assert.equal(params.auto_advance, true)
  assert.equal(params.collection_method, 'send_invoice')
  assert.match(created('invoiceRecord')[0]._id, /^private\.invoice\./)
  assert.equal(reads.find(read => read.query.includes('_type == "paymentRecord"')).options.cache, 'no-store')
})

async function event(type, object, valid = true) {
  const payload = JSON.stringify({id: 'evt_fixture', type, data: {object}})
  const signature = sdk.webhooks.generateTestHeaderString({payload, secret: valid ? secret : 'invalid_fixture_secret'})
  return webhook(new Request('https://fixture.example/api/stripe/webhook', {method: 'POST', headers: {'stripe-signature': signature}, body: payload}))
}

test('signed Checkout callback preserves metadata lookup, reservation and token deactivation for migrated records', async () => {
  docs.push({_id: 'private.legacy-depositLink.a', _type: 'depositLink', token: 'legacy-token', active: true})
  const session = {id: 'cs_test_existing', payment_status: 'paid', payment_intent: 'pi_fixture', metadata: {...customer, ...puppyInfo, paymentType: 'deposit', token: 'legacy-token'}}
  assert.equal((await event('checkout.session.completed', session)).status, 200)
  assert.equal(created('paymentRecord')[0].amountPaid, 300)
  assert.match(created('paymentRecord')[0]._id, /^private\.paymentCheckout\./)
  assert.equal(created('paymentRecord')[0].stripePaymentIntentId, 'pi_fixture')
  assert.equal(docs[1].status, 'reserved')
  assert.equal(created('depositLink')[0].active, false)
  assert.equal((await event('checkout.session.completed', session)).status, 200)
  assert.equal(created('paymentRecord').length, 1)
  assert.ok(reads.filter(read => /_type == "(paymentRecord|depositLink)"/.test(read.query)).every(read => read.options.cache === 'no-store'))
})

test('Checkout duplicate lookup recognizes an existing root payment without changing its amount', async () => {
  docs.push({_id: 'old-payment', _type: 'paymentRecord', stripeCheckoutSessionId: 'cs_test_existing', amountPaid: 400})
  assert.equal((await event('checkout.session.completed', {id: 'cs_test_existing', metadata: {...puppyInfo, paymentType: 'manual-payment', amountPaid: '100'}})).status, 200)
  assert.equal(created('paymentRecord').length, 1)
  assert.equal(created('paymentRecord')[0].amountPaid, 400)
})

test('signed invoice callback updates private invoice and deduplicates by unchanged external invoice ID', async () => {
  docs.push({_id: 'private.legacy-invoiceRecord.a', _type: 'invoiceRecord', stripeInvoiceId: 'in_existing', status: 'open'})
  const paidInvoice = {id: 'in_existing', amount_paid: 130000, amount_remaining: 0, status: 'paid', metadata: {...customer, ...puppyInfo}}
  assert.equal((await event('invoice.paid', paidInvoice)).status, 200)
  assert.match(created('paymentRecord')[0]._id, /^private\.paymentInvoice\./)
  assert.equal(created('paymentRecord')[0].amountPaid, 1300)
  assert.equal(created('invoiceRecord')[0].status, 'paid')
  assert.equal(created('invoiceRecord')[0].amountRemaining, 0)
  assert.equal((await event('invoice.paid', paidInvoice)).status, 200)
  assert.equal(created('paymentRecord').length, 1)
})

test('invalid Stripe signatures and unknown events retain existing rejection/no-effect contracts', async t => {
  t.mock.method(console, 'error', () => {})
  assert.equal((await event('checkout.session.completed', {}, false)).status, 400)
  assert.equal((await event('unhandled.fixture', {})).status, 200)
  assert.equal(created('paymentRecord').length, 0)
})

test('conversation deletion continues matching returned private IDs without affecting alerts or payments', async () => {
  docs.push({_id: 'private.inquiry.a', _type: 'puppyInquiry', phone: customer.customerPhone},
    {_id: 'private.sms.a', _type: 'smsMessage', from: customer.customerPhone, direction: 'inbound'},
    {_id: 'private.alert.a', _type: 'smsMessage', to: customer.customerPhone, source: 'fluffytail-alert'},
    {_id: 'legacy-payment', _type: 'paymentRecord', customerPhone: customer.customerPhone})
  const response = await deleteConversation(request('/inbox/api/delete-conversation', {phone: customer.customerPhone}))
  assert.deepEqual(await response.json(), {ok: true, deleted: 2, deletedMessages: 1, deletedInquiries: 1})
  assert.ok(docs.some(doc => doc._id === 'private.alert.a'))
  assert.ok(docs.some(doc => doc._id === 'legacy-payment'))
  assert.ok(reads.every(read => read.options.cache === 'no-store'))
})

test('Studio blocks template-less root publishing and duplication, preserving private operational publishing/content creation', () => {
  const require = createRequire(import.meta.url)
  const source = readFileSync('sanity.config.ts', 'utf8')
  const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText
  const fixtureModule = {exports: {}}
  vm.runInNewContext(compiled, {module: fixtureModule, exports: fixtureModule.exports, require(name) {
    if (name === 'sanity') return {defineConfig: value => value}
    if (name === '@sanity/vision') return {visionTool: () => ({})}
    if (name === 'sanity/structure') return {structureTool: () => ({})}
    if (name === './sanity/env') return {apiVersion: '2026-03-30', dataset: 'synthetic', projectId: 'fixture'}
    if (name === './sanity/schemaTypes') return {schemaTypes: []}
    if (name === './sanity/structure') return {structure: {}}
    return require(name)
  }})
  const config = fixtureModule.exports.default
  const types = ['puppyInquiry', 'smsMessage', 'paymentRecord', 'depositLink', 'invoiceRecord']
  const templates = types.concat(['puppy', 'litter']).map(schemaType => ({schemaType, id: schemaType}))
  assert.deepEqual(Array.from(config.schema.templates(templates)).map(item => item.schemaType), ['puppy', 'litter'])
  const actions = ['publish', 'unpublish', 'delete', 'duplicate'].map(action => ({action}))
  for (const schemaType of types) {
    for (const documentId of [undefined, 'synthetic-root', 'drafts.synthetic-root']) {
      assert.deepEqual(Array.from(config.document.actions(actions, {schemaType, documentId})).map(item => item.action), ['unpublish', 'delete'])
    }
    for (const documentId of ['private.inquiry.synthetic', 'drafts.private.inquiry.synthetic']) {
      assert.deepEqual(Array.from(config.document.actions(actions, {schemaType, documentId})).map(item => item.action), ['publish', 'unpublish', 'delete'])
    }
  }
  assert.equal(config.document.actions(actions, {schemaType: 'puppy'}), actions)
})
