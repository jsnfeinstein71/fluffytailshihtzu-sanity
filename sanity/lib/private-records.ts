import {createHash, randomUUID} from 'node:crypto'

// Sanity restricts all dotted document IDs to authenticated reads, even in public datasets.
export function privateRecordId(kind: string, key: string = randomUUID()) {
  if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(kind)) throw new Error('Invalid private record kind.')
  return 'private.' + kind + '.' + createHash('sha256').update(key).digest('hex')
}
