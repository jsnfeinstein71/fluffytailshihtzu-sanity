// Offline planning only: no client, network, filesystem, environment access or production executor.
import {createCipheriv, createDecipheriv, createHash, randomBytes} from 'node:crypto'

export const operationalTypes = ['puppyInquiry', 'smsMessage', 'paymentRecord', 'depositLink', 'invoiceRecord', 'inquiryRate']
const version = 'fluffytail-operational-privacy-v1'
const clone = value => structuredClone(value)
const order = (a, b) => a < b ? -1 : a > b ? 1 : 0
const stable = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => order(a, b))) : item)
export const fingerprint = value => createHash('sha256').update(stable(value)).digest('hex')

export function legacyPrivateId(doc) {
  if (!operationalTypes.includes(doc._type) || typeof doc._id !== 'string' || doc._id.includes('.')) throw Error('Only root operational records may be mapped.')
  return `private.legacy-${doc._type}.${createHash('sha256').update(doc._id).digest('hex')}`
}

function references(value) {
  if (!value || typeof value !== 'object') return []
  return [typeof value._ref === 'string' ? value._ref : null, ...Object.values(value).flatMap(references)].filter(Boolean)
}

function rewriteReferences(value, mapping) {
  if (Array.isArray(value)) return value.map(item => rewriteReferences(item, mapping))
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    key === '_ref' && mapping.has(item) ? mapping.get(item) : rewriteReferences(item, mapping)]))
}

function createPayload(doc) {
  // Revisions/base lineage belong to the old identity, not the new document. Backup retains both.
  return Object.fromEntries(Object.entries(doc).filter(([key]) => !['_rev', '_system'].includes(key)))
}

export function planPrivacyMigration(snapshot) {
  if (!Array.isArray(snapshot)) throw Error('A complete reviewed snapshot is required.')
  const ids = new Set(snapshot.map(doc => doc._id))
  if (ids.size !== snapshot.length) throw Error('Duplicate document identities in snapshot.')
  const operational = snapshot.filter(doc => operationalTypes.includes(doc._type))
  if (operational.some(doc => doc._id.includes('.') && !doc._id.startsWith('private.'))) {
    throw Error('Operational draft, version or unknown namespace needs explicit review.')
  }
  const originals = operational.filter(doc => !doc._id.includes('.')).sort((a, b) => order(a._id, b._id))
  const mapping = new Map(originals.map(doc => [doc._id, legacyPrivateId(doc)]))
  for (const doc of originals) {
    if (!doc._rev) throw Error('Every source record needs a pinned revision.')
    if (ids.has(mapping.get(doc._id))) throw Error('Destination collision; do not overwrite or silently skip.')
    if (doc._system && (Object.keys(doc._system).some(key => key !== 'base') ||
      !doc._system.base || doc._system.base.id !== doc._id || !doc._system.base.rev ||
      Object.keys(doc._system.base).some(key => !['id', 'rev'].includes(key)))) {
      throw Error('Unknown system provenance needs explicit review.')
    }
  }
  for (const doc of snapshot) {
    if (!mapping.has(doc._id) && references(doc).some(id => mapping.has(id))) {
      throw Error('An outside document references the scope; expand only after explicit review.')
    }
  }
  const replacements = originals.map(doc => ({...rewriteReferences(createPayload(doc), mapping), _id: mapping.get(doc._id)}))
  const digest = fingerprint({version, originals, replacements})
  const mutations = [
    ...replacements.map(doc => ({create: doc})),
    // A real guarded patch, then deletion, in the SAME atomic transaction. No query-based deletes.
    ...originals.map(doc => ({patch: {id: doc._id, ifRevisionID: doc._rev, set: {privacyMigrationGuard: digest}}})),
    ...originals.map(doc => ({delete: {id: doc._id}})),
  ]
  const requestBytes = Buffer.byteLength(JSON.stringify({mutations}))
  if (requestBytes >= 4_000_000) throw Error('Plan exceeds the single-transaction size gate; stop rather than split automatically.')
  return {version, digest, originals: clone(originals), replacements, mutations, requestBytes,
    counts: Object.fromEntries(operationalTypes.map(type => [type, originals.filter(doc => doc._type === type).length])),
    mapping: Object.fromEntries(mapping),
  }
}

export function classifyMigration(plan, current) {
  const byId = new Map(current.map(doc => [doc._id, doc]))
  if (byId.size !== current.length) throw Error('Drift: duplicate identities in current snapshot.')
  const sourceIds = new Set(plan.originals.map(doc => doc._id))
  if (current.some(doc => operationalTypes.includes(doc._type) && doc._id.includes('.') && !doc._id.startsWith('private.'))) {
    throw Error('Drift: operational draft, version or unknown namespace appeared.')
  }
  if (current.some(doc => !sourceIds.has(doc._id) && references(doc).some(id => sourceIds.has(id)))) {
    throw Error('Drift: an outside document references the original scope.')
  }
  if (current.some(doc => operationalTypes.includes(doc._type) && !doc._id.includes('.') && !sourceIds.has(doc._id))) {
    throw Error('Drift: a new public operational record appeared; re-establish the write freeze.')
  }
  const before = plan.originals.every(doc => byId.has(doc._id) && fingerprint(byId.get(doc._id)) === fingerprint(doc) && !byId.has(plan.mapping[doc._id]))
  const after = plan.originals.every(doc => !byId.has(doc._id)) && plan.replacements.every(doc => {
    const actual = byId.get(doc._id)
    return actual && fingerprint(createPayload(actual)) === fingerprint(doc)
  })
  if (before) return 'ready'
  if (after) return 'already-applied'
  throw Error('Drift, incomplete state or conflicting destination; stop for reconciliation.')
}

export function prepareBackup(projectId, dataset, snapshot, now = new Date()) {
  const plan = planPrivacyMigration(snapshot)
  return {version, projectId, dataset, capturedAt: now.toISOString(),
    snapshot: clone(snapshot), snapshotDigest: fingerprint(snapshot), planDigest: plan.digest, mapping: plan.mapping}
}

export function sealBackup(backup, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw Error('Use a separately stored random 256-bit key.')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from(version))
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(backup), 'utf8'), cipher.final()])
  return {version, algorithm: 'aes-256-gcm', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64')}
}

export function openBackup(envelope, key) {
  try {
    if (envelope.version !== version || envelope.algorithm !== 'aes-256-gcm' || !Buffer.isBuffer(key) || key.length !== 32) throw Error()
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'))
    decipher.setAAD(Buffer.from(version))
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'))
    const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()])
    const backup = JSON.parse(plaintext.toString('utf8'))
    if (backup.version !== version || backup.snapshotDigest !== fingerprint(backup.snapshot)) throw Error()
    const plan = planPrivacyMigration(backup.snapshot)
    if (plan.digest !== backup.planDigest || stable(plan.mapping) !== stable(backup.mapping)) throw Error()
    return backup
  } catch { throw Error('Backup authentication or integrity validation failed.') }
}
