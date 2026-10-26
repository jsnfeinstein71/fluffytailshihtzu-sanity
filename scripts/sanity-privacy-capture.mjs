// Read-only adapter. Production capture requires separate human approval before invocation.
import {operationalTypes, planPrivacyMigration, fingerprint} from './sanity-privacy-migration.mjs'
import {prepareExecutionBundle} from './sanity-privacy-backup.mjs'

export async function captureExecutionBundle(client, context) {
  if (context.authorizedBackup !== true) throw Error('Separate backup authorization is required before any read.')
  const config = client.config()
  if (!config.token || config.projectId !== context.projectId || config.dataset !== context.dataset || config.useCdn) {
    throw Error('Use an authenticated origin client for the explicitly approved target.')
  }
  const options = {perspective: 'raw', cache: 'no-store'}
  // Inspect scope before reading any customer-bearing fields. Never widen a stale approved scope.
  const actualCounts = {}
  for (const type of operationalTypes) {
    actualCounts[type] = await client.fetch('count(*[_type == $type && count(string::split(_id, ".")) == 1])', {type}, options)
  }
  if (fingerprint(actualCounts) !== fingerprint(context.expectedCounts)) throw Error('Live root counts differ from the approved scope; stop before export.')
  const snapshot = await client.fetch('*[_type in $types][0...1001]', {types: operationalTypes}, options)
  if (snapshot.length > 1000) throw Error('Operational snapshot exceeds the reviewed capture bound.')
  const plan = planPrivacyMigration(snapshot)
  const sourceIds = plan.originals.map(doc => doc._id)
  const outsideReferences = await client.fetch('count(*[!(_id in $ids) && references($ids)])', {ids: sourceIds}, options)
  const destinationCollisions = await client.fetch('count(*[_id in $ids])', {ids: Object.values(plan.mapping)}, options)
  const namespaceCompanions = await client.fetch('count(*[_id in $draftIds || (_id in path("versions.**") && string::split(_id, ".")[-1] in $ids)])',
    {ids: sourceIds, draftIds: sourceIds.map(id => 'drafts.' + id)}, options)
  if (outsideReferences || destinationCollisions || namespaceCompanions) throw Error('Reference, destination or namespace audit failed.')
  const publicQueryDigests = {}
  for (const {name, query, params = {}} of context.publicQueries || []) {
    if (!name || publicQueryDigests[name]) throw Error('Use distinct public-query receipt names.')
    publicQueryDigests[name] = fingerprint(await client.fetch(query, params, options))
  }
  const current = await client.fetch('*[_type in $types][0...1001]', {types: operationalTypes}, options)
  if (fingerprint([...current].sort((a, b) => a._id.localeCompare(b._id))) !== fingerprint([...snapshot].sort((a, b) => a._id.localeCompare(b._id)))) {
    throw Error('Records changed during capture; re-establish the approved write freeze.')
  }
  return prepareExecutionBundle(snapshot, {...context, publicQueryDigests,
    audit: {complete: true, outsideReferences, destinationCollisions, namespaceCompanions}})
}
