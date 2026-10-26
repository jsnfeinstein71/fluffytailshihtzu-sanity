import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {mkdtempSync, writeFileSync, readFileSync, unlinkSync, rmdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {parse, evaluate} from 'groq-js'
import {planPrivacyMigration, classifyMigration, prepareBackup, sealBackup, openBackup, fingerprint, legacyPrivateId} from '../scripts/sanity-privacy-migration.mjs'
import {sourceQueries} from './privacy-test-helpers.mjs'
import {syntheticPrivacyFixture as fixture} from './privacy-synthetic-fixture.mjs'
import * as queries from '../sanity/lib/inventory-queries.ts'

const {paidRecordsQuery} = sourceQueries('sanity/lib/payment-context.ts')
const {default: Inbox} = await import('../app/inbox/page.tsx')
const {privateRecordId} = await import('../sanity/lib/private-records.ts')
const clone = value => structuredClone(value)
const query = async (data, groq, params = {}) => (await evaluate(parse(groq), {dataset: data, params})).get()

// Models atomic create/conditional patch/delete and final strong-reference checks; no provider SDK.
function applyOffline(snapshot, mutations) {
  const staged = new Map(snapshot.map(doc => [doc._id, clone(doc)]))
  for (const mutation of mutations) {
    if (mutation.create) {
      if (staged.has(mutation.create._id)) throw Error('Destination exists')
      staged.set(mutation.create._id, {...clone(mutation.create), _rev: 'new-revision'})
    } else if (mutation.patch) {
      const current = staged.get(mutation.patch.id)
      if (!current || current._rev !== mutation.patch.ifRevisionID) throw Error('Revision conflict')
      Object.assign(current, mutation.patch.set)
    } else if (mutation.delete) staged.delete(mutation.delete.id)
    else throw Error('Unexpected mutation')
  }
  function check(value) {
    if (!value || typeof value !== 'object') return
    if (value._ref && !value._weak && !staged.has(value._ref)) throw Error('Dangling reference')
    Object.values(value).forEach(check)
  }
  for (const doc of staged.values()) check(doc)
  return [...staged.values()]
}

test('54-record rehearsal preserves every business field, timestamp and active token without repricing', () => {
  const before = fixture()
  const plan = planPrivacyMigration(before)
  assert.deepEqual(plan.counts, {puppyInquiry: 5, smsMessage: 26, paymentRecord: 0, depositLink: 9, invoiceRecord: 14, inquiryRate: 0})
  assert.equal(plan.mutations.length, 162)
  assert.ok(plan.requestBytes < 4_000_000)
  assert.equal(classifyMigration(plan, before), 'ready')
  const after = applyOffline(before, plan.mutations)
  assert.equal(after.length, before.length)
  assert.equal(classifyMigration(plan, after), 'already-applied')
  for (const original of plan.originals) {
    const migrated = after.find(doc => doc._id === plan.mapping[original._id])
    const fields = Object.fromEntries(Object.entries(original).filter(([key]) => !['_id', '_rev', '_system'].includes(key)))
    const {_id: nextId, _rev: nextRev, ...nextFields} = migrated
    assert.deepEqual(nextFields, fields)
    assert.match(nextId, /^private\.legacy-/)
    assert.notEqual(nextRev, original._rev)
  }
  assert.equal(after.filter(doc => doc._type === 'depositLink' && doc.active).length, 3)
  assert.ok(after.filter(doc => doc._type === 'invoiceRecord').every(doc => doc.amountDue === 300))
})

test('ID mapping matches the established private helper and rerunning cannot create duplicates', () => {
  const before = fixture()
  const first = planPrivacyMigration(before), second = planPrivacyMigration(before)
  assert.equal(first.digest, second.digest)
  assert.equal(legacyPrivateId(first.originals[0]), privateRecordId('legacy-' + first.originals[0]._type, first.originals[0]._id))
  const after = applyOffline(before, first.mutations)
  assert.equal(planPrivacyMigration(after).originals.length, 0)
  assert.throws(() => applyOffline(after, first.mutations), /Destination exists/)
  assert.equal(after.filter(doc => doc._id.startsWith('private.')).length, 54)
})

test('public puppy/litter/detail/sitemap GROQ results are identical before and after', async () => {
  const before = fixture(), after = applyOffline(before, planPrivacyMigration(before).mutations)
  for (const groq of [queries.littersQuery, queries.puppiesQuery, queries.puppyQuery, queries.puppySitemapQuery]) {
    assert.deepEqual(await query(before, groq, {slug: 'synthetic-puppy'}), await query(after, groq, {slug: 'synthetic-puppy'}))
  }
})

test('anonymous operational visibility becomes zero while authenticated count remains 54', async () => {
  const before = fixture(), after = applyOffline(before, planPrivacyMigration(before).mutations)
  const countQuery = 'count(*[_type in ["puppyInquiry","smsMessage","paymentRecord","depositLink","invoiceRecord","inquiryRate"]])'
  // Model Sanity's documented root-only anonymous visibility, not a live ACL probe.
  assert.equal(await query(before.filter(doc => !doc._id.includes('.')), countQuery), 54)
  assert.equal(await query(after.filter(doc => !doc._id.includes('.')), countQuery), 0)
  assert.equal(await query(after, countQuery), 54)
})

test('authenticated real Inbox, payment joins and legacy token lookups retain migrated history', async () => {
  const before = fixture()
  before.push({_id: 'historical-payment', _rev: 'p1', _type: 'paymentRecord', puppySlug: 'synthetic-puppy',
    customerPhone: '+15555550101', amountPaid: 300, paymentStatus: 'paid', paymentType: 'deposit', stripeCheckoutSessionId: 'cs_synthetic_paid', createdAt: '2026-04-02T00:00:00Z'})
  const after = applyOffline(before, planPrivacyMigration(before).mutations)
  globalThis.fixtureOperatorClient = {fetch: (groq, params) => query(after, groq, params)}
  const inbox = await Inbox()
  assert.equal(inbox.props.conversations.length, 1)
  assert.equal(inbox.props.conversations[0].messages.length, 26)
  assert.match(inbox.props.conversations[0].inquiry._id, /^private\./)
  assert.equal(inbox.props.conversations[0].paymentSummary.totalPaid, 300)
  assert.equal(inbox.props.conversations[0].paymentSummary.remainingBalance, 1300)
  assert.deepEqual(await query(before, paidRecordsQuery, {slug: 'synthetic-puppy'}), await query(after, paidRecordsQuery, {slug: 'synthetic-puppy'}))
  for (const groq of [
    '*[_type=="depositLink" && token==$token][0]{active,stripeCheckoutUrl}',
    '*[_type=="invoiceRecord" && stripeInvoiceId==$invoiceId][0]{status,amountPaid,amountRemaining}',
    '*[_type=="paymentRecord" && stripeCheckoutSessionId==$sessionId][0]{amountPaid,paymentStatus}',
    '*[_type=="smsMessage" && messageSid==$sid][0]{body,direction}',
  ]) assert.deepEqual(await query(before, groq, {token: 'synthetic-token-0', invoiceId: 'in_synthetic_0', sessionId: 'cs_synthetic_paid', sid: 'SM_fixture_0'}),
    await query(after, groq, {token: 'synthetic-token-0', invoiceId: 'in_synthetic_0', sessionId: 'cs_synthetic_paid', sid: 'SM_fixture_0'}))
})

test('weak, strong, nested and cyclic references inside the scope are rewritten together', () => {
  const before = fixture()
  before.find(doc => doc._id === 'inquiry-0').related = {_type: 'reference', _ref: 'invoice-0'}
  before.find(doc => doc._id === 'invoice-0').items = [{_type: 'reference', _ref: 'inquiry-0', _weak: true}]
  const plan = planPrivacyMigration(before), after = applyOffline(before, plan.mutations)
  assert.equal(after.find(doc => doc._id === plan.mapping['inquiry-0']).related._ref, plan.mapping['invoice-0'])
  assert.equal(after.find(doc => doc._id === plan.mapping['invoice-0']).items[0]._ref, plan.mapping['inquiry-0'])
  assert.equal(after.find(doc => doc._id === 'public-puppy').litter._ref, 'public-litter')
})

test('outside references, namespace companions and destination conflicts stop the plan', () => {
  const outside = fixture()
  outside[0].customer = {_type: 'reference', _ref: 'inquiry-0'}
  assert.throws(() => planPrivacyMigration(outside), /outside document/)
  const drafts = fixture()
  drafts.push({_id: 'drafts.inquiry-0', _type: 'puppyInquiry', _rev: 'd1'})
  assert.throws(() => planPrivacyMigration(drafts), /draft, version/)
  const conflicts = fixture()
  conflicts.push({_id: legacyPrivateId(conflicts[2]), _type: 'puppyInquiry', _rev: 'c1'})
  assert.throws(() => planPrivacyMigration(conflicts), /Destination collision/)
})

test('source revision drift fails the whole synthetic transaction without loss or partial publication', () => {
  const before = fixture(), plan = planPrivacyMigration(before), changed = clone(before)
  changed.find(doc => doc._id === 'inquiry-0')._rev = 'newer-revision'
  const digest = fingerprint(changed)
  assert.throws(() => classifyMigration(plan, changed), /Drift/)
  assert.throws(() => applyOffline(changed, plan.mutations), /Revision conflict/)
  assert.equal(fingerprint(changed), digest)
  assert.equal(changed.filter(doc => doc._id.startsWith('private.')).length, 0)
  const appeared = clone(before)
  appeared.push({_id: 'new-public-inquiry', _rev: 'unexpected', _type: 'puppyInquiry'})
  assert.throws(() => classifyMigration(plan, appeared), /write freeze/)
})

test('migration recheck rejects newly appeared drafts, versions and outside weak references before and after cutover', () => {
  const before = fixture(), plan = planPrivacyMigration(before), after = applyOffline(before, plan.mutations)
  for (const current of [before, after]) {
    for (const extra of [
      {_id: 'drafts.inquiry-0', _type: 'puppyInquiry', _rev: 'new-draft'},
      {_id: 'versions.release.inquiry-0', _type: 'puppyInquiry', _rev: 'new-version'},
      {_id: 'outside-referrer', _type: 'puppy', _rev: 'new-ref', related: {_type: 'reference', _ref: 'inquiry-0', _weak: true}},
    ]) assert.throws(() => classifyMigration(plan, [...current, extra]), /Drift/)
  }
})

test('unknown system provenance and oversized transactions are rejected, not silently discarded or split', () => {
  const unknown = fixture()
  unknown[2]._system = {unknown: true}
  assert.throws(() => planPrivacyMigration(unknown), /system provenance/)
  const oversized = fixture()
  oversized[2].message = 'a'.repeat(4_000_000)
  assert.throws(() => planPrivacyMigration(oversized), /size gate/)
})

test('backup encryption authenticates contents and retains original revisions/system lineage for recovery', () => {
  const before = fixture(), key = randomBytes(32)
  const backup = prepareBackup('synthetic-project', 'synthetic', before, new Date('2026-10-25T00:00:00Z'))
  const encrypted = sealBackup(backup, key)
  assert.doesNotMatch(JSON.stringify(encrypted), /Synthetic Customer|synthetic@example|old-system-revision/)
  assert.deepEqual(openBackup(encrypted, key), backup)
  assert.notEqual(sealBackup(backup, key).iv, encrypted.iv)
  assert.throws(() => openBackup(encrypted, randomBytes(32)), /integrity/)
  assert.throws(() => openBackup({...encrypted, tag: Buffer.alloc(16).toString('base64')}, key), /integrity/)
  assert.throws(() => sealBackup(backup, Buffer.alloc(16)), /256-bit/)
})

test('synthetic encrypted backup is exclusively written and restored in a separate process without plaintext files', () => {
  const before = fixture(), key = randomBytes(32)
  const backup = prepareBackup('synthetic-project', 'synthetic', before)
  const directory = mkdtempSync(join(tmpdir(), 'fluffytail-synthetic-privacy-'))
  const file = join(directory, 'synthetic-backup.aes256gcm.json')
  try {
    writeFileSync(file, JSON.stringify(sealBackup(backup, key)), {flag: 'wx', mode: 0o600})
    assert.doesNotMatch(readFileSync(file, 'utf8'), /Synthetic Customer|synthetic@example/)
    assert.throws(() => writeFileSync(file, 'overwrite', {flag: 'wx'}), error => error.code === 'EEXIST')
    const script = `
      import {readFileSync} from 'node:fs';
      import {openBackup, fingerprint, operationalTypes} from ${JSON.stringify(new URL('../scripts/sanity-privacy-migration.mjs', import.meta.url).href)};
      const restored = openBackup(JSON.parse(readFileSync(process.env.FIXTURE_BACKUP_PATH, 'utf8')), Buffer.from(process.env.FIXTURE_BACKUP_KEY, 'hex'));
      console.log(JSON.stringify({count:restored.snapshot.filter(doc=>operationalTypes.includes(doc._type)).length,digest:fingerprint(restored.snapshot)}));
    `
    const receipt = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8', env: {SystemRoot: process.env.SystemRoot || '', FIXTURE_BACKUP_PATH: file, FIXTURE_BACKUP_KEY: key.toString('hex')},
    }))
    assert.equal(receipt.count, 54)
    assert.equal(receipt.digest, fingerprint(before))
  } finally {
    unlinkSync(file)
    rmdirSync(directory)
    key.fill(0)
  }
})

test('recovery uses encrypted originals and refuses a changed private payload after migration', () => {
  const before = fixture(), backup = prepareBackup('synthetic-project', 'synthetic', before), key = randomBytes(32)
  const restored = openBackup(sealBackup(backup, key), key), plan = planPrivacyMigration(restored.snapshot)
  const after = applyOffline(before, plan.mutations)
  assert.equal(classifyMigration(plan, after), 'already-applied')
  after.find(doc => doc._type === 'invoiceRecord').amountPaid = 100
  assert.throws(() => classifyMigration(plan, after), /Drift/)
  // Restore privately under the same mapped identity only after review; do not recreate public roots.
  assert.deepEqual(restored.snapshot, before)
})

test('break-glass ID reversal restores original joins but demonstrably reopens anonymous exposure', async () => {
  const before = fixture()
  before.find(doc => doc._id === 'inquiry-0').invoice = {_type: 'reference', _ref: 'invoice-0'}
  const plan = planPrivacyMigration(before), after = applyOffline(before, plan.mutations)
  const reverse = [
    ...plan.originals.map(doc => ({create: Object.fromEntries(Object.entries(doc).filter(([key]) => !['_rev', '_system'].includes(key)))})),
    ...plan.replacements.map(doc => ({patch: {id: doc._id, ifRevisionID: after.find(item => item._id === doc._id)._rev, set: {privacyMigrationGuard: 'synthetic-break-glass-only'}}})),
    ...plan.replacements.map(doc => ({delete: {id: doc._id}})),
  ]
  const reversed = applyOffline(after, reverse)
  assert.equal(reversed.filter(doc => doc._id.startsWith('private.')).length, 0)
  assert.equal(reversed.find(doc => doc._id === 'inquiry-0').invoice._ref, 'invoice-0')
  assert.equal(await query(reversed.filter(doc => !doc._id.includes('.')), 'count(*[_type in ["puppyInquiry","smsMessage","depositLink","invoiceRecord"]])'), 54)
  for (const source of before) {
    const withoutPlatform = doc => Object.fromEntries(Object.entries(doc).filter(([key]) => !['_rev', '_system'].includes(key)))
    assert.deepEqual(withoutPlatform(reversed.find(doc => doc._id === source._id)), withoutPlatform(source))
  }
})
