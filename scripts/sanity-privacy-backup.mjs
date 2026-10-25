// Offline backup/manifest preparation only. No Sanity client or migration executor.
import {openSync, closeSync, writeFileSync, fsyncSync, readFileSync, realpathSync, existsSync} from 'node:fs'
import {dirname, isAbsolute, relative, sep} from 'node:path'
import {fileURLToPath} from 'node:url'
import {prepareBackup, planPrivacyMigration, sealBackup, openBackup, fingerprint} from './sanity-privacy-migration.mjs'

const repository = realpathSync(fileURLToPath(new URL('..', import.meta.url)))
const within = (root, path) => {const part = relative(root, path); return part === '' || (!part.startsWith('..' + sep) && part !== '..' && !isAbsolute(part))}

export function prepareExecutionBundle(snapshot, context) {
  const {projectId, dataset, hotfixCommit, expectedCounts, publicQueryDigests, audit} = context
  if (!projectId || !dataset || !/^[a-f0-9]{40}$/.test(hotfixCommit || '')) throw Error('An explicit target and reviewed hotfix commit are required.')
  if (!audit?.complete || audit.outsideReferences !== 0 || audit.namespaceCompanions !== 0 || audit.destinationCollisions !== 0) {
    throw Error('Complete current reference, namespace and collision audits are required.')
  }
  if (!publicQueryDigests || Object.keys(publicQueryDigests).length === 0 || Object.values(publicQueryDigests).some(value => !/^[a-f0-9]{64}$/.test(value))) {
    throw Error('Public-query fingerprints are required.')
  }
  const backup = prepareBackup(projectId, dataset, snapshot)
  const plan = planPrivacyMigration(snapshot)
  if (!expectedCounts || fingerprint(plan.counts) !== fingerprint(expectedCounts) || plan.originals.length === 0) {
    throw Error('Source scope differs from the reviewed type counts; obtain fresh approval.')
  }
  const manifest = {version: backup.version, projectId, dataset, capturedAt: backup.capturedAt, hotfixCommit,
    counts: plan.counts, snapshotDigest: backup.snapshotDigest, planDigest: plan.digest,
    sourceIdRevisionDigest: fingerprint(plan.originals.map(doc => ({id: doc._id, revision: doc._rev}))),
    publicQueryDigests, audit, sources: plan.originals.map(doc => ({id: doc._id, revision: doc._rev})),
    mapping: plan.mapping, mutations: plan.mutations, requestBytes: plan.requestBytes}
  return {...backup, executionManifest: manifest, executionManifestDigest: fingerprint(manifest)}
}

export function executionReceipt(bundle) {
  const manifest = bundle.executionManifest
  if (!manifest || bundle.snapshotDigest !== fingerprint(bundle.snapshot) || bundle.executionManifestDigest !== fingerprint(manifest) || manifest.snapshotDigest !== bundle.snapshotDigest ||
    manifest.planDigest !== bundle.planDigest || manifest.projectId !== bundle.projectId || manifest.dataset !== bundle.dataset) {
    throw Error('Execution manifest integrity validation failed.')
  }
  const plan = planPrivacyMigration(bundle.snapshot)
  if (plan.digest !== bundle.planDigest || fingerprint(manifest.mutations) !== fingerprint(plan.mutations) || fingerprint(manifest.mapping) !== fingerprint(plan.mapping) ||
    fingerprint(manifest.counts) !== fingerprint(plan.counts) || manifest.requestBytes !== plan.requestBytes ||
    manifest.sourceIdRevisionDigest !== fingerprint(plan.originals.map(doc => ({id: doc._id, revision: doc._rev}))) ||
    fingerprint(manifest.sources) !== fingerprint(plan.originals.map(doc => ({id: doc._id, revision: doc._rev})))) {
    throw Error('Execution manifest does not match its encrypted source snapshot.')
  }
  return {projectId: bundle.projectId, dataset: bundle.dataset, capturedAt: bundle.capturedAt, hotfixCommit: manifest.hotfixCommit,
    counts: manifest.counts, snapshotDigest: bundle.snapshotDigest, planDigest: bundle.planDigest,
    manifestDigest: bundle.executionManifestDigest, sourceIdRevisionDigest: manifest.sourceIdRevisionDigest,
    requestBytes: manifest.requestBytes, mutationCount: manifest.mutations.length}
}

export function backupReceipt(bundle) {
  if (bundle.executionManifest) return executionReceipt(bundle)
  if (bundle.snapshotDigest !== fingerprint(bundle.snapshot)) throw Error('Backup snapshot integrity validation failed.')
  const plan = planPrivacyMigration(bundle.snapshot)
  if (plan.digest !== bundle.planDigest || fingerprint(plan.mapping) !== fingerprint(bundle.mapping)) throw Error('Backup plan integrity validation failed.')
  return {projectId: bundle.projectId, dataset: bundle.dataset, capturedAt: bundle.capturedAt,
    purpose: 'recovery-snapshot', snapshotDigest: bundle.snapshotDigest, planDigest: bundle.planDigest,
    documentCount: bundle.snapshot.length, historicalRoots: plan.originals.length}
}

export function verifyEncryptedBackupFile(path, key, expected) {
  if (!expected?.projectId || !expected.dataset) throw Error('The expected restoration target is required.')
  const bundle = openBackup(JSON.parse(readFileSync(path, 'utf8')), key)
  if (bundle.projectId !== expected.projectId || bundle.dataset !== expected.dataset) throw Error('Backup belongs to a different target.')
  return backupReceipt(bundle)
}

export function writeEncryptedBackupCopies(bundle, key, paths, {storageApproved = false} = {}) {
  if (!storageApproved || !Array.isArray(paths) || paths.length < 2 || paths.some(path => !isAbsolute(path))) {
    throw Error('Two approved absolute encrypted-backup paths are required.')
  }
  const parents = paths.map(path => realpathSync(dirname(path)))
  if (new Set(parents).size !== paths.length || parents.some(parent => within(repository, parent))) {
    throw Error('Use distinct approved backup directories outside the repository.')
  }
  if (paths.some(path => existsSync(path))) throw Error('Backup files must never overwrite existing files.')
  const receipt = backupReceipt(bundle)
  const envelope = JSON.stringify(sealBackup(bundle, key))
  for (const path of paths) {
    const fd = openSync(path, 'wx', 0o600)
    try {writeFileSync(fd, envelope, 'utf8'); fsyncSync(fd)} finally {closeSync(fd)}
    const verified = verifyEncryptedBackupFile(path, key, receipt)
    if (verified.snapshotDigest !== receipt.snapshotDigest || verified.manifestDigest !== receipt.manifestDigest) throw Error('Encrypted backup copy verification failed.')
  }
  return {...receipt, encryptedCopiesVerified: paths.length}
}
