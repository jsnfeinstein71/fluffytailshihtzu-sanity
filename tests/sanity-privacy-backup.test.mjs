import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {mkdtempSync, mkdirSync, readFileSync, unlinkSync, rmdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {syntheticPrivacyFixture} from './privacy-synthetic-fixture.mjs'
import {prepareExecutionBundle, executionReceipt, backupReceipt, writeEncryptedBackupCopies, verifyEncryptedBackupFile} from '../scripts/sanity-privacy-backup.mjs'
import {captureExecutionBundle} from '../scripts/sanity-privacy-capture.mjs'
import {fingerprint, prepareBackup, planPrivacyMigration} from '../scripts/sanity-privacy-migration.mjs'
import {parse, evaluate} from 'groq-js'

const context = {projectId: 'fixture-project', dataset: 'synthetic', hotfixCommit: '2cdf3fb2ad6c7d98454735a202fed4788657040d',
  expectedCounts: {puppyInquiry: 5, smsMessage: 26, depositLink: 9, invoiceRecord: 14, paymentRecord: 0, inquiryRate: 0},
  publicQueryDigests: {public: fingerprint('synthetic public result')},
  audit: {complete: true, outsideReferences: 0, namespaceCompanions: 0, destinationCollisions: 0}}

test('execution manifest pins target, source revisions, exact mutations and redacted approval digests', () => {
  const bundle = prepareExecutionBundle(syntheticPrivacyFixture(), context), receipt = executionReceipt(bundle)
  assert.equal(receipt.mutationCount, 162)
  assert.equal(bundle.executionManifest.sources.length, 54)
  assert.doesNotMatch(JSON.stringify(receipt), /Synthetic Customer|synthetic@example|inquiry-0|synthetic-token/)
  assert.equal(receipt.hotfixCommit, context.hotfixCommit)
  assert.throws(() => prepareExecutionBundle(syntheticPrivacyFixture(), {...context, expectedCounts: {}}), /scope/)
  assert.throws(() => prepareExecutionBundle(syntheticPrivacyFixture(), {...context, audit: {...context.audit, outsideReferences: 1}}), /audits/)
  bundle.snapshot[0].title = 'Changed public snapshot'
  assert.throws(() => executionReceipt(bundle), /integrity/)
})

test('post-cutover private state can be backed up for recovery without manufacturing a new root migration', () => {
  const plan = planPrivacyMigration(syntheticPrivacyFixture())
  const privateState = plan.replacements.map(doc => ({...doc, _rev: 'private-fixture-revision'}))
  const backup = prepareBackup(context.projectId, context.dataset, privateState)
  const receipt = backupReceipt(backup)
  assert.equal(receipt.purpose, 'recovery-snapshot')
  assert.equal(receipt.documentCount, 54)
  assert.equal(receipt.historicalRoots, 0)
  assert.equal(backup.executionManifest, undefined)
  assert.doesNotMatch(JSON.stringify(receipt), /Synthetic Customer|synthetic-token/)
})

test('two exclusive encrypted copies restore in a credential-free process with the key on stdin', () => {
  const root = mkdtempSync(join(tmpdir(), 'fluffytail-backup-fixture-')), key = randomBytes(32)
  const dirs = [join(root, 'primary'), join(root, 'recovery')]
  for (const dir of dirs) mkdirSync(dir, {mode: 0o700})
  const paths = dirs.map(dir => join(dir, 'synthetic.aes256gcm.json'))
  try {
    const bundle = prepareExecutionBundle(syntheticPrivacyFixture(), context)
    const receipt = writeEncryptedBackupCopies(bundle, key, paths, {storageApproved: true})
    assert.equal(receipt.encryptedCopiesVerified, 2)
    for (const path of paths) {
      assert.doesNotMatch(readFileSync(path, 'utf8'), /Synthetic Customer|synthetic@example|synthetic-token/)
      assert.throws(() => verifyEncryptedBackupFile(path, key, {...context, projectId: 'wrong-project'}), /different target/)
      assert.throws(() => verifyEncryptedBackupFile(path, randomBytes(32), context), /integrity/)
    }
    const script = `import {readFileSync} from 'node:fs';
      import {verifyEncryptedBackupFile} from ${JSON.stringify(new URL('../scripts/sanity-privacy-backup.mjs', import.meta.url).href)};
      const input=JSON.parse(readFileSync(0,'utf8'));
      console.log(JSON.stringify(input.paths.map(path=>verifyEncryptedBackupFile(path,Buffer.from(input.key,'base64'),input.expected))));`
    const restored = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      input: JSON.stringify({paths, key: key.toString('base64'), expected: {projectId: context.projectId, dataset: context.dataset}}),
      env: {SystemRoot: process.env.SystemRoot || ''}, encoding: 'utf8',
    }))
    assert.ok(restored.every(item => item.manifestDigest === receipt.manifestDigest))
    assert.throws(() => writeEncryptedBackupCopies(bundle, key, paths, {storageApproved: true}), /overwrite/)
    assert.throws(() => writeEncryptedBackupCopies(bundle, key, paths), /approved/)
  } finally {
    for (const path of paths) unlinkSync(path)
    for (const dir of dirs) rmdirSync(dir)
    rmdirSync(root)
    key.fill(0)
  }
})

test('capture refuses missing approval and wrong/anonymous/CDN targets before any query', async () => {
  let reads = 0
  const client = {config: () => ({projectId: 'fixture-project', dataset: 'synthetic', token: 'fixture-token', useCdn: false}), fetch() {reads++; throw Error('Unexpected read')}}
  await assert.rejects(() => captureExecutionBundle(client, context), /authorization/)
  await assert.rejects(() => captureExecutionBundle(client, {...context, authorizedBackup: true, projectId: 'different-project'}), /approved target/)
  for (const configuration of [{token: undefined}, {useCdn: true}]) {
    await assert.rejects(() => captureExecutionBundle({...client, config: () => ({...client.config(), ...configuration})}, {...context, authorizedBackup: true}), /approved target/)
  }
  assert.equal(reads, 0)
})

function captureFixture(documents = syntheticPrivacyFixture(), onRead = () => {}) {
  return {config: () => ({projectId: context.projectId, dataset: context.dataset, token: 'fixture-token', useCdn: false}),
    async fetch(query, params, options) {
      assert.equal(options.perspective, 'raw'); assert.equal(options.cache, 'no-store')
      const result = structuredClone(await (await evaluate(parse(query), {dataset: documents, params})).get())
      onRead(query, documents)
      return result
    }}
}
const captureContext = {...context, authorizedBackup: true, publicQueries: [{name: 'public', query: '*[_type == "puppy"]{_id,name,slug,litter}'}]}

test('read-only capture produces the exact manifest and stops changed counts before exporting fields', async () => {
  const bundle = await captureExecutionBundle(captureFixture(), captureContext)
  assert.equal(bundle.snapshot.length, 54)
  assert.equal(executionReceipt(bundle).mutationCount, 162)
  let exported = false
  await assert.rejects(() => captureExecutionBundle(captureFixture(undefined, query => {if (query.startsWith('*[_type in')) exported = true}),
    {...captureContext, expectedCounts: {...context.expectedCounts, depositLink: 10}}), /approved scope/)
  assert.equal(exported, false)
})

test('read-only capture rejects outside weak references, untyped draft companions and mid-capture revision drift', async () => {
  for (const extra of [
    {_id: 'outside-public', _type: 'litter', related: {_type: 'reference', _ref: 'inquiry-0', _weak: true}},
    {_id: 'drafts.inquiry-0', _type: 'otherType'},
  ]) await assert.rejects(() => captureExecutionBundle(captureFixture([...syntheticPrivacyFixture(), extra]), captureContext), /audit failed/)
  let snapshots = 0
  const drifting = captureFixture(undefined, (query, docs) => {
    if (query.startsWith('*[_type in') && ++snapshots === 1) docs.find(doc => doc._id === 'inquiry-0')._rev = 'changed-fixture-revision'
  })
  await assert.rejects(() => captureExecutionBundle(drifting, captureContext), /changed during capture/)
})
