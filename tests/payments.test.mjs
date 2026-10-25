import './register-typescript.mjs'
import test, {beforeEach} from 'node:test'
import assert from 'node:assert/strict'
import {existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {parse, evaluate} from 'groq-js'
import {renderToStaticMarkup} from 'react-dom/server'
import Stripe from 'stripe'

const {getPricing, getBalance, PricingError} = await import('../lib/pricing.ts')
const {requireOperator} = await import('../lib/operator-auth.ts')
const {POST: deposit} = await import('../app/inbox/api/create-deposit-session/route.ts')
const {POST: manual} = await import('../app/inbox/api/create-payment-link/route.ts')
const {POST: invoice} = await import('../app/inbox/api/create-invoice/route.ts')
const {POST: webhook} = await import('../app/api/stripe/webhook/route.ts')
const {default: Detail} = await import('../app/puppies/[slug]/page.tsx')
const {default: Pricing} = await import('../app/pricing/page.tsx')
const {default: Success} = await import('../app/payment-success/page.tsx')
const {default: Pay} = await import('../app/pay/[token]/page.tsx')
const operator = 'Basic ' + Buffer.from('fixture:fixture-password').toString('base64')
const sdk = new Stripe('sk_test_not_a_real_key')
const secret = 'whsec_fixture_only'
let docs, sessions, calls, items, eventNumber

function request(path, body, headers = {}) {
  return new Request('https://preview.example' + path, {
    method: 'POST', headers: {authorization: operator, 'content-type': 'application/json', ...headers},
    body: JSON.stringify(body),
  })
}
const body = (extra = {}) => ({puppySlug: 'puppy', customerEmail: 'fixture@example.test', customerPhone: '+15555550101', ...extra})
const clone = value => structuredClone(value)
const records = () => docs.filter(doc => doc._type === 'paymentRecord')
const links = () => docs.filter(doc => doc._type === 'depositLink')

function patch(id) {
  const result = {id, values: {}, removed: [], revision: undefined,
    set(values) {Object.assign(this.values, values); return this},
    unset(keys) {this.removed.push(...keys); return this},
    ifRevisionId(revision) {this.revision = revision; return this},
    async commit() {applyPatch(this); return clone(docs.find(doc => doc._id === id))},
  }
  return result
}
function applyPatch(change) {
  const doc = docs.find(doc => doc._id === change.id)
  if (!doc || (change.revision && doc._rev !== change.revision)) throw Error('Revision conflict')
  Object.assign(doc, change.values, {_rev: doc._rev + '-next'})
  for (const key of change.removed) delete doc[key]
}

beforeEach(() => {
  process.env.INBOX_BASIC_AUTH_USER = 'fixture'
  process.env.INBOX_BASIC_AUTH_PASS = 'fixture-password'
  process.env.STRIPE_WEBHOOK_SECRET = secret
  delete process.env.VERCEL_ENV
  process.env.NEXT_PUBLIC_SITE_URL = 'https://preview.example'
  docs = [
    {_id: 'litter', _rev: 'l1', _type: 'litter', title: 'Fixture Litter', status: 'current', price: 1600, deposit: 400},
    {_id: 'puppy-id', _rev: 'p1', _type: 'puppy', name: 'Fixture Puppy', status: 'available', slug: {current: 'puppy'}, litter: {_ref: 'litter'}},
  ]
  sessions = new Map()
  calls = []
  items = []
  eventNumber = 0
  const fetch = async (query, params = {}, options) => {
    if (options?.cache !== 'no-store' && !options?.next) throw Error('Uncached payment read required')
    return (await evaluate(parse(query), {dataset: docs, params})).get()
  }
  globalThis.fixtureSanityFetch = fetch
  globalThis.fixtureOperatorClient = {
    fetch, patch,
    async getDocument(id) {return clone(docs.find(doc => doc._id === id))},
    async createIfNotExists(doc) {
      const existing = docs.find(item => item._id === doc._id)
      if (existing) return clone(existing)
      const saved = {...clone(doc), _rev: 'new'}
      docs.push(saved)
      return clone(saved)
    },
    async create(doc) {const saved = {...clone(doc), _id: doc._id || 'created-' + docs.length, _rev: 'new'}; docs.push(saved); return clone(saved)},
    transaction() {
      const creates = [], patches = []
      return {
        createIfNotExists(doc) {creates.push(doc); return this},
        patch(id, value) {const change = patch(id); if (typeof value === 'function') value(change); else change.set(value.set); patches.push(change); return this},
        async commit() {
          for (const change of patches) {
            const current = docs.find(doc => doc._id === change.id)
            if (!current || (change.revision && current._rev !== change.revision)) throw Error('Revision conflict')
          }
          for (const doc of creates) if (!docs.some(item => item._id === doc._id)) docs.push({...clone(doc), _rev: 'new'})
          for (const change of patches) applyPatch(change)
        },
      }
    },
  }
  globalThis.fixtureStripe = {
    webhooks: sdk.webhooks,
    checkout: {sessions: {
      async create(params, options) {
        const key = options?.idempotencyKey
        if (key && sessions.has(key)) return clone(sessions.get(key))
        calls.push({kind: 'checkout', params: clone(params), options})
        const session = {id: 'cs_test_' + calls.length, url: 'https://checkout.stripe.com/c/pay/' + calls.length,
          metadata: clone(params.metadata), amount_total: params.line_items[0].price_data.unit_amount,
          currency: 'usd', payment_status: 'unpaid', client_reference_id: params.client_reference_id,
        }
        sessions.set(key || session.id, session)
        sessions.set(session.id, session)
        return clone(session)
      },
      async retrieve(id) {if (!sessions.has(id)) throw Error('Unknown session'); return clone(sessions.get(id))},
    }},
    customers: {async create(params) {calls.push({kind: 'customer', params}); return {id: 'cus_fixture'}}},
    invoiceItems: {async create(params) {items.push(params); return {id: 'ii_' + items.length}}},
    invoices: {
      async create(params) {calls.push({kind: 'invoice', params}); return {id: 'in_fixture'}},
      async finalizeInvoice(id) {
        const cents = items.reduce((sum, item) => sum + item.amount, 0)
        return {id, currency: 'usd', amount_due: cents, amount_paid: 0, amount_remaining: cents, status: 'open', hosted_invoice_url: 'https://invoice.stripe.com/i/fixture'}
      },
    },
  }
})

async function signedEvent(type, object, signatureValid = true) {
  const payload = JSON.stringify({id: 'evt_fixture_' + ++eventNumber, object: 'event', type, data: {object}})
  const signature = sdk.webhooks.generateTestHeaderString({payload, secret: signatureValid ? secret : 'wrong_secret'})
  return webhook(new Request('https://preview.example/api/stripe/webhook', {method: 'POST', headers: {'stripe-signature': signature}, body: payload}))
}
async function createdDeposit() {
  const response = await deposit(request('/inbox/api/create-deposit-session', body()))
  assert.equal(response.status, 200, await response.clone().text())
  return sessions.get(calls.find(call => call.kind === 'checkout') ? 'cs_test_1' : '')
}
const paid = (amount = 400, type = 'deposit') => docs.push({_id: 'historic-' + docs.length, _type: 'paymentRecord', puppySlug: 'puppy', paymentStatus: 'paid', amountPaid: amount, paymentType: type})

test('default litter price, puppy override, deposit and exact-cent remaining balance', () => {
  assert.deepEqual(getPricing({litterPrice: 1600, litterDeposit: 400}), {totalCents: 160000, depositCents: 40000, remainingCents: 120000})
  assert.deepEqual(getPricing({overridePrice: 2000, litterPrice: 1600, litterDeposit: 400}), {totalCents: 200000, depositCents: 40000, remainingCents: 160000})
  assert.equal(getPricing({litterPrice: 1600.25, litterDeposit: 400}).remainingCents, 120025)
  assert.equal(getBalance(160000, [{paymentStatus: 'paid', amountPaid: 400}, {paymentStatus: 'pending', amountPaid: 50}]).remainingCents, 120000)
})

test('missing, invalid, negative, zero, fractional and inconsistent prices never fall back', () => {
  for (const value of [undefined, null, '', '1600', NaN, Infinity, -1, 0, 1600.001]) {
    assert.throws(() => getPricing({overridePrice: value, litterPrice: value, litterDeposit: 400}), PricingError)
    assert.throws(() => getPricing({litterPrice: 1600, litterDeposit: value}), PricingError)
  }
  assert.throws(() => getPricing({overridePrice: 0, litterPrice: 1600, litterDeposit: 400}), PricingError)
  assert.throws(() => getPricing({litterPrice: 200, litterDeposit: 400}), PricingError)
  assert.throws(() => getBalance(160000, [{paymentStatus: 'paid', amountPaid: 1700}]), PricingError)
  assert.throws(() => getBalance(160000, [{paymentStatus: 'paid'}]), PricingError)
})

test('deposit ignores forged browser prices/names and binds the Sanity puppy and litter', async () => {
  const response = await deposit(request('/inbox/api/create-deposit-session', body({deposit: 1, amount: 1, totalPrice: 1, puppyName: 'Wrong', litterTitle: 'Wrong'})))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).remainingBalance, 1200)
  const params = calls[0].params
  assert.equal(params.line_items[0].price_data.unit_amount, 40000)
  assert.equal(params.client_reference_id, 'puppy-id')
  assert.equal(params.metadata.puppyId, 'puppy-id')
  assert.equal(params.metadata.litterId, 'litter')
  assert.equal(params.metadata.puppyName, 'Fixture Puppy')
  assert.equal(params.metadata.totalPriceCents, '160000')
  assert.match(params.line_items[0].price_data.product_data.description, /applied to the total/)
  assert.equal(links().length, 1)
  assert.match(links()[0]._id, /^private\.deposit\./)
})

test('override flows through Checkout and the actual puppy page; litter defaults remain labeled', async () => {
  docs[1].overridePrice = 2000
  const response = await deposit(request('/inbox/api/create-deposit-session', body()))
  const json = await response.json()
  assert.equal(json.totalPrice, 2000)
  assert.equal(json.remainingBalance, 1600)
  const html = renderToStaticMarkup(await Detail({params: Promise.resolve({slug: 'puppy'})}))
  for (const price of ['$2,000.00', '$400.00', '$1,600.00']) assert.ok(html.includes(price), price)
  assert.match(html, /not added on top/)
  const pricing = renderToStaticMarkup(await Pricing())
  assert.match(pricing, /\$1,600.00 to \$2,000.00/)
  assert.doesNotMatch(pricing, /\$1,500|\$2,500/)
})

test('invalid pricing fails before any Stripe action or deposit claim is created', async () => {
  for (const value of [undefined, 0, -400, '400', 400.001, 1700]) {
    docs[0].deposit = value
    const response = await deposit(request('/inbox/api/create-deposit-session', body()))
    assert.equal(response.status, 422)
  }
  assert.equal(calls.length, 0)
  assert.equal(links().length, 0)
})

test('reserved/sold/holdback/gone-home, nonactive/hidden litters and previous payments block new deposits', async () => {
  for (const status of ['reserved', 'sold', 'holdback', 'gone-home', 'unknown']) {
    docs[1].status = status
    assert.equal((await deposit(request('/inbox/api/create-deposit-session', body()))).status, 409)
  }
  docs[1].status = 'available'
  for (const status of ['planned', 'upcoming', 'past']) {
    docs[0].status = status
    assert.equal((await deposit(request('/inbox/api/create-deposit-session', body()))).status, 409)
  }
  docs[0].status = 'current'
  docs[0].isVisible = false
  assert.equal((await deposit(request('/inbox/api/create-deposit-session', body()))).status, 409)
  delete docs[0].isVisible
  paid()
  assert.equal((await deposit(request('/inbox/api/create-deposit-session', body()))).status, 409)
  assert.equal(calls.length, 0)
})

test('concurrent retries share one deposit session and expired claims reissue with the current quote', async () => {
  const responses = await Promise.all(Array.from({length: 4}, () => deposit(request('/inbox/api/create-deposit-session', body()))))
  assert.ok(responses.every(response => response.status === 200))
  assert.equal(calls.filter(call => call.kind === 'checkout').length, 1)
  const oldToken = links()[0].token
  links()[0].expiresAt = '2000-01-01T00:00:00Z'
  docs[0].deposit = 450
  const response = await deposit(request('/inbox/api/create-deposit-session', body()))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).deposit, 450)
  assert.notEqual(links()[0].token, oldToken)
  assert.equal(calls.at(-1).params.line_items[0].price_data.unit_amount, 45000)
  assert.equal(links()[0].litterId, 'litter')
})

test('changing a puppy litter cannot reuse an active quote even when the price is identical', async () => {
  await createdDeposit()
  docs.push({...clone(docs[0]), _id: 'other-litter', title: 'Other Litter'})
  docs[1].litter._ref = 'other-litter'
  assert.equal((await deposit(request('/inbox/api/create-deposit-session', body()))).status, 409)
  assert.equal(calls.filter(call => call.kind === 'checkout').length, 1)
})

test('missing/duplicate puppies and missing litter references reject payment creation', async () => {
  docs[1].litter._ref = 'missing'
  assert.equal((await deposit(request('/inbox/api/create-deposit-session', body()))).status, 409)
  docs[1].litter._ref = 'litter'
  docs.push({...clone(docs[1]), _id: 'duplicate'})
  assert.equal((await deposit(request('/inbox/api/create-deposit-session', body()))).status, 409)
  assert.equal(calls.length, 0)
})

test('one active deposit quote is reused; another customer or changed price cannot compete', async () => {
  const first = await deposit(request('/inbox/api/create-deposit-session', body()))
  const second = await deposit(request('/inbox/api/create-deposit-session', body()))
  assert.equal((await first.json()).url, (await second.json()).url)
  assert.equal(calls.length, 1)
  assert.equal((await deposit(request('/inbox/api/create-deposit-session', body({customerEmail: 'other@example.test'})))).status, 409)
  docs[0].deposit = 450
  assert.equal((await deposit(request('/inbox/api/create-deposit-session', body()))).status, 409)
  assert.equal(calls.length, 1)
})

test('authenticated partial payments are bounded by real remaining balance, not browser totals', async () => {
  paid()
  docs[1].status = 'reserved'
  for (const amount of [0, -1, '100', 1.001, 1200.01]) {
    assert.ok((await manual(request('/inbox/api/create-payment-link', body({amount, totalPrice: 999999})))).status >= 400)
  }
  const response = await manual(request('/inbox/api/create-payment-link', body({amount: 1200, deposit: 1})))
  assert.equal(response.status, 200)
  assert.equal(calls[0].params.line_items[0].price_data.unit_amount, 120000)
  assert.equal(calls[0].params.metadata.remainingBalanceCents, '0')
  assert.equal(calls[0].params.metadata.litterId, 'litter')
})

test('invoice credits actual historical payments and uses puppy override, not hardcoded deposit', async () => {
  docs[1].overridePrice = 2000
  paid(400)
  paid(100, 'manual-payment')
  const response = await invoice(request('/inbox/api/create-invoice', body({price: 1, deposit: 1})))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).amountDue, 1500)
  assert.deepEqual(items.map(item => item.amount), [200000, -40000, -10000])
  assert.equal(docs.find(doc => doc._type === 'invoiceRecord').puppyId, 'puppy-id')
  assert.match(docs.find(doc => doc._type === 'invoiceRecord')._id, /^private\.invoice\./)
})

test('signed Stripe paid amount is recorded exactly once and the puppy remains in its litter', async () => {
  const session = await createdDeposit()
  session.payment_status = 'paid'
  const event = await signedEvent('checkout.session.completed', session)
  assert.equal(event.status, 200)
  assert.equal(records()[0].amountPaid, 400)
  assert.match(records()[0]._id, /^private\.paymentCheckout\./)
  assert.equal(records()[0].litterId, 'litter')
  assert.equal(docs[1].status, 'reserved')
  assert.equal(docs[1].litter._ref, 'litter')
  assert.equal(links()[0].active, false)
  assert.equal((await signedEvent('checkout.session.completed', session)).status, 200)
  assert.equal(records().length, 1)
})

test('unpaid Checkout never reserves; asynchronous success reserves only after signed paid status', async () => {
  const session = await createdDeposit()
  assert.equal((await signedEvent('checkout.session.completed', session)).status, 200)
  assert.equal(records().length, 0)
  assert.equal(docs[1].status, 'available')
  session.payment_status = 'paid'
  assert.equal((await signedEvent('checkout.session.async_payment_succeeded', session)).status, 200)
  assert.equal(records()[0].amountPaid, 400)
})

test('tampered quote associations/amounts and invalid signatures never mutate records or status', async () => {
  const session = await createdDeposit()
  session.payment_status = 'paid'
  assert.equal((await signedEvent('checkout.session.completed', session, false)).status, 400)
  for (const metadata of [{litterId: 'wrong'}, {puppyId: 'wrong'}, {chargedAmountCents: '1'}]) {
    assert.equal((await signedEvent('checkout.session.completed', {...session, metadata: {...session.metadata, ...metadata}})).status, 500)
  }
  assert.equal(records().length, 0)
  assert.equal(docs[1].status, 'available')
})

test('historical payment records stay unchanged; late events do not reverse sold or gone-home status', async () => {
  const session = {id: 'cs_test_legacy', amount_total: 30000, currency: 'usd', payment_status: 'paid', metadata: {paymentType: 'deposit', puppySlug: 'puppy', amount: '9999'}}
  docs[1].status = 'gone-home'
  assert.equal((await signedEvent('checkout.session.completed', session)).status, 200)
  assert.equal(records()[0].amountPaid, 300)
  assert.equal(docs[1].status, 'gone-home')
  docs[0].deposit = 400
  assert.equal((await signedEvent('checkout.session.completed', session)).status, 200)
  assert.equal(records()[0].amountPaid, 300)
  assert.equal(records().length, 1)
})

test('invoice paid events record the actual remaining payment once', async () => {
  paid()
  await invoice(request('/inbox/api/create-invoice', body()))
  const metadata = calls.find(call => call.kind === 'invoice').params.metadata
  const payment = {id: 'in_fixture', amount_paid: 120000, amount_remaining: 0, currency: 'usd', status: 'paid', metadata}
  assert.equal((await signedEvent('invoice.paid', payment)).status, 200)
  assert.equal((await signedEvent('invoice.paid', payment)).status, 200)
  assert.equal(records().length, 2)
  assert.equal(getBalance(160000, records()).remainingCents, 0)
  assert.match(records().find(record => record.stripeInvoiceId === 'in_fixture')._id, /^private\.paymentInvoice\./)
})

test('an unexpired legacy public deposit claim blocks a competing private replacement', async () => {
  docs.push({_id: 'deposit-active-' + createHash('sha256').update('puppy-id').digest('hex'), _type: 'depositLink', active: true, expiresAt: new Date(Date.now() + 60_000).toISOString()})
  const response = await deposit(request('/inbox/api/create-deposit-session', body()))
  assert.equal(response.status, 409)
  assert.equal(calls.length, 0)
  assert.equal(links().length, 1)
})

test('operator routes fail closed before parsing or invoking any provider; old public actions are removed', async () => {
  for (const name of ['create-deposit-session', 'create-payment-link', 'create-invoice', 'sms-send', 'upload-image', 'delete-conversation']) {
    const {POST} = await import('../app/inbox/api/' + name + '/route.ts')
    const response = await POST(request('/inbox/api/' + name, {}, {authorization: ''}))
    assert.equal(response.status, 401, name)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
  for (const path of ['stripe/create-deposit-session', 'stripe/create-payment-link', 'stripe/create-invoice', 'fluffytail/sms/send', 'fluffytail/upload-image']) assert.equal(existsSync('app/api/' + path + '/route.ts'), false)
  assert.equal(calls.length, 0)
  delete process.env.INBOX_BASIC_AUTH_PASS
  assert.equal(requireOperator(request('/inbox/api/x', {})).status, 503)
})

test('operator CSRF protections reject foreign origins and cross-site browser requests', () => {
  assert.equal(requireOperator(request('/inbox/api/x', {}, {origin: 'https://attacker.test'})).status, 403)
  assert.equal(requireOperator(request('/inbox/api/x', {}, {'sec-fetch-site': 'cross-site'})).status, 403)
  assert.equal(requireOperator(request('/inbox/api/x', {}, {origin: 'https://preview.example'})), null)
})

test('short deposit links reject expired, outdated and reserved quotes instead of forwarding', async () => {
  await createdDeposit()
  const token = links()[0].token
  const render = () => Pay({params: Promise.resolve({token})})
  await assert.rejects(render, error => error.digest?.startsWith('NEXT_REDIRECT'))
  docs[0].deposit = 450
  await assert.rejects(render, error => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404')
  docs[0].deposit = 400
  docs[1].status = 'reserved'
  await assert.rejects(render, error => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404')
  docs[1].status = 'available'
  links()[0].expiresAt = '2000-01-01T00:00:00.000Z'
  await assert.rejects(render, error => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404')
})

test('success URL alone never claims payment; confirmation uses actual Stripe amount and exposes no customer data', async () => {
  const render = async id => renderToStaticMarkup(await Success({searchParams: Promise.resolve({session_id: id})}))
  assert.doesNotMatch(await render(undefined), /Deposit received/)
  const session = await createdDeposit()
  assert.doesNotMatch(await render(session.id), /Deposit received/)
  session.payment_status = 'paid'
  const html = await render(session.id)
  assert.match(html, /Deposit received/)
  assert.match(html, /\$400.00/)
  assert.match(html, /\$1,200.00/)
  assert.doesNotMatch(html, /fixture@example.test|15555550101|fixture-password/)
})

test('preview safety blocks live Stripe credentials and production dataset operator access', async () => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'fixture123'
  process.env.NEXT_PUBLIC_SANITY_DATASET = 'production'
  process.env.SANITY_API_WRITE_TOKEN = 'fixture-not-a-real-token'
  process.env.VERCEL_ENV = 'preview'
  process.env.STRIPE_SECRET_KEY = 'sk_live_fixture_not_a_real_key'
  const {getStripe: realStripe} = await import('../sanity/lib/stripe.ts')
  const {getOperatorClient: realClient} = await import('../sanity/lib/operator-client.ts')
  assert.throws(realStripe, /Stripe test credentials/)
  assert.throws(realClient, /isolated Sanity dataset/)
})

test('preview disables provider callbacks and outbound messaging before operational effects', async () => {
  process.env.VERCEL_ENV = 'preview'
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'fixture123'
  process.env.NEXT_PUBLIC_SANITY_DATASET = 'production'
  for (const path of ['inquiry', 'sms/inbound']) {
    const {POST} = await import('../app/api/fluffytail/' + path + '/route.ts')
    assert.equal((await POST(request('/api/fluffytail/' + path, {}))).status, path === 'inquiry' ? 410 : 503)
  }
  const {POST} = await import('../app/inbox/api/sms-send/route.ts')
  assert.equal((await POST(request('/inbox/api/sms-send', {to: '+15555550101', body: 'fixture'}))).status, 503)
  assert.equal(calls.length, 0)
})
