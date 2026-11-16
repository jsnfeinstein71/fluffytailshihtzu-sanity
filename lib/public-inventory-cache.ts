import {revalidateTag} from 'next/cache'

// Expire rather than serve stale: a verified deposit must remove the available card
// on the next server request. Only public inventory uses this tag; no payment data.
export function expirePublicInventory() {
  revalidateTag('public-inventory', {expire: 0})
}
