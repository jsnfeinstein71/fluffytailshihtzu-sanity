import './register-typescript.mjs'
import test, {beforeEach} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync, existsSync} from 'node:fs'
import {createRequire} from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import {parse, evaluate} from 'groq-js'

process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'fixture123'
process.env.NEXT_PUBLIC_SANITY_DATASET = 'synthetic'
const {NextRequest} = await import('next/server')
const {getOperationalClient} = await import('../sanity/lib/operational-client.ts')
const {default: Inbox} = await import('../app/inbox/page.tsx')
const {default: Pay} = await import('../app/pay/[token]/page.tsx')
const {proxy} = await import('../proxy.ts')
const paths = ['app/api/inquiry/route.ts', 'app/api/fluffytail/sms/inbound/route.ts',
  'app/api/stripe/webhook/route.ts', ...['sms-send', 'create-deposit-session', 'create-invoice',
    'create-payment-link', 'delete-conversation', 'upload-image'].map(name => 'app/inbox/api/' + name + '/route.ts')]
const handlers = await Promise.all(paths.map(async path => (await import('../' + path)).POST))
const auth = 'Basic ' + Buffer.from('fixture:fixture-pass').toString('base64')
let docs, reads
beforeEach(() => {
  delete process.env.FLUFFYTAIL_WRITE_FREEZE
  delete process.env.VERCEL_ENV
  process.env.SANITY_API_WRITE_TOKEN = 'fixture-server-token'
  process.env.INBOX_BASIC_AUTH_USER = 'fixture'
  process.env.INBOX_BASIC_AUTH_PASS = 'fixture-pass'
  globalThis.fixtureWriterConfigs = []
  docs = [
    {_id: 'litter', _type: 'litter', status: 'current', title: 'Synthetic Litter', price: 1600, deposit: 400},
    {_id: 'puppy', _rev: 'p1', _type: 'puppy', name: 'Synthetic Puppy', status: 'available', slug: {current: 'synthetic-puppy'}, litter: {_ref: 'litter'}},
  ]
  reads = []
  globalThis.fixtureOperatorClient = {async fetch(query, params = {}, options) {
    reads.push({query, options})
    return (await evaluate(parse(query), {dataset: docs, params})).get()
  }}
  globalThis.fixtureSanityFetch = () => {throw Error('Operational reads must authenticate')}
})

test('production operational client stays server-only, credential-required, published and off CDN', () => {
  assert.equal(getOperationalClient(), globalThis.fixtureOperatorClient)
  const config = globalThis.fixtureWriterConfigs[0]
  assert.equal(config.token, 'fixture-server-token')
  assert.equal(config.useCdn, false)
  assert.equal(config.perspective, 'published')
  assert.match(readFileSync('sanity/lib/operational-client.ts', 'utf8'), /import 'server-only'/)
  assert.match(readFileSync('sanity/lib/operator-client.ts', 'utf8'), /return getOperationalClient\(\)/)
  delete process.env.SANITY_API_WRITE_TOKEN
  assert.throws(getOperationalClient, /credentials are not configured/)
})

test('integrated maintenance barrier blocks all nine current writers before parsing or effects', async () => {
  process.env.FLUFFYTAIL_WRITE_FREEZE = '1'
  for (const handler of handlers) {
    const response = await handler(new NextRequest('https://fixture.example/mutation', {
      method: 'POST', headers: {authorization: auth}, body: 'invalid payload',
    }))
    assert.equal(response.status, 503)
    assert.equal(response.headers.get('retry-after'), '60')
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
  assert.equal(reads.length, 0)
  assert.equal(docs.length, 2)
})

test('retired Tally never writes and removed public operator aliases are not restored by the merge', async () => {
  const {POST} = await import('../app/api/fluffytail/inquiry/route.ts')
  assert.equal((await POST()).status, 410)
  for (const file of ['app/api/fluffytail/sms/send/route.ts', 'app/api/fluffytail/upload-image/route.ts',
    ...['create-deposit-session', 'create-payment-link', 'create-invoice'].map(name => 'app/api/stripe/' + name + '/route.ts')]) assert.equal(existsSync(file), false, file)
  assert.equal(reads.length, 0)
})

test('Inbox preserves mixed private/root history and actual historical payment credits with no-store reads', async () => {
  docs.push(
    {_id: 'legacy-inquiry', _type: 'puppyInquiry', phone: '+15555550101', name: 'Synthetic Customer', puppyPageUrl: 'https://example.test/puppies/synthetic-puppy'},
    {_id: 'private.sms.fixture', _type: 'smsMessage', from: '+15555550101', direction: 'inbound', body: 'Synthetic message'},
    {_id: 'legacy-alert', _type: 'smsMessage', to: '+15555550101', source: 'fluffytail-alert', direction: 'outbound'},
    {_id: 'private.payment.fixture', _type: 'paymentRecord', customerPhone: '+15555550101', puppySlug: 'synthetic-puppy', paymentStatus: 'paid', amountPaid: 300},
  )
  const result = await Inbox()
  const conversation = result.props.conversations[0]
  assert.equal(result.props.conversations.length, 1)
  assert.equal(conversation.messages.length, 1)
  assert.equal(conversation.inquiry._id, 'legacy-inquiry')
  assert.equal(conversation.paymentSummary.totalPaid, 300)
  assert.equal(conversation.paymentSummary.remainingBalance, 1300)
  assert.equal(reads.length, 4)
  assert.ok(reads.every(read => read.options.cache === 'no-store'))
})

test('verified quotes resolve identically across root/private IDs; unverifiable historical links stay blocked', async () => {
  const token = 'a'.repeat(48)
  for (const id of ['legacy-link', 'private.deposit.fixture']) {
    docs = docs.filter(doc => doc._type !== 'depositLink')
    docs.push({_id: id, _type: 'depositLink', token, active: true, expiresAt: new Date(Date.now() + 60000).toISOString(),
      stripeCheckoutUrl: 'https://checkout.stripe.com/c/pay/synthetic', puppySlug: 'synthetic-puppy',
      puppyId: 'puppy', litterId: 'litter', checkoutMetadata: {pricingVersion: '1', totalPriceCents: '160000', depositCents: '40000'}})
    await assert.rejects(() => Pay({params: Promise.resolve({token})}),
      error => error.digest === 'NEXT_REDIRECT;replace;https://checkout.stripe.com/c/pay/synthetic;307;')
  }
  for (const token of ['a'.repeat(12), 'b'.repeat(12), 'c'.repeat(12)]) {
    await assert.rejects(() => Pay({params: Promise.resolve({token})}),
      error => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404')
  }
  assert.ok(reads.every(read => read.options.cache === 'no-store'))
})

test('Inbox proxy preserves private/no-store HTML and RSC plus fail-closed Basic Auth', async () => {
  assert.equal((await proxy(new NextRequest('https://fixture.example/inbox'))).status, 401)
  const response = await proxy(new NextRequest('https://fixture.example/inbox?_rsc=fixture', {headers: {authorization: auth}}))
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  delete process.env.INBOX_BASIC_AUTH_PASS
  assert.equal((await proxy(new NextRequest('https://fixture.example/inbox'))).status, 503)
})

test('Studio retains private-ID publishing and duplicate restrictions including native inquiry admission records', () => {
  const require = createRequire(import.meta.url)
  const compiled = ts.transpileModule(readFileSync('sanity.config.ts', 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText
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
  const types = ['puppyInquiry', 'smsMessage', 'paymentRecord', 'depositLink', 'invoiceRecord', 'inquiryRate']
  const templates = types.concat(['puppy', 'litter']).map(schemaType => ({schemaType}))
  assert.deepEqual(Array.from(config.schema.templates(templates)).map(item => item.schemaType), ['puppy', 'litter'])
  const actions = ['publish', 'unpublish', 'delete', 'duplicate'].map(action => ({action}))
  for (const schemaType of types) {
    for (const documentId of [undefined, 'root', 'drafts.root']) {
      assert.deepEqual(Array.from(config.document.actions(actions, {schemaType, documentId})).map(item => item.action), ['unpublish', 'delete'])
    }
    for (const documentId of ['private.inquiry.fixture', 'drafts.private.inquiry.fixture']) {
      assert.deepEqual(Array.from(config.document.actions(actions, {schemaType, documentId})).map(item => item.action), ['publish', 'unpublish', 'delete'])
    }
  }
  assert.equal(config.document.actions(actions, {schemaType: 'puppy'}), actions)
})
