import 'server-only'
import {adminOrigin} from './staff-access-shared'
export {adminOrigin,ownerNames,ownerKey,safeStaffReturn,type OwnerKey} from './staff-access-shared'
export function passkeyMode(){return process.env.STAFF_PASSKEY_MODE==='transition'?'transition':process.env.STAFF_PASSKEY_MODE==='cutover'?'cutover':'off'}
export function passkeyConfig(){
  if(passkeyMode()==='off')throw new Error('Passkey access is not configured.')
  const production=process.env.VERCEL_ENV==='production'
  if(production&&(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!=='3glz6dkx'||process.env.NEXT_PUBLIC_SANITY_DATASET!=='production'))throw new Error('Invalid staff storage.')
  if(!production&&!(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID==='gu1xkpsg'&&process.env.NEXT_PUBLIC_SANITY_DATASET==='synthetic'))throw new Error('Passkey testing requires isolated storage.')
  const origin=production?adminOrigin:process.env.STAFF_PASSKEY_ORIGIN
  if(!origin)throw new Error('Preview passkey origin is not configured.')
  const url=new URL(origin)
  if(url.origin!==origin||url.username||url.password||!production&&(url.hostname==='admin.fluffytailshihtzu.com'||url.protocol!=='https:'&&!(url.hostname==='localhost'&&process.env.NODE_ENV!=='production')))throw new Error('Invalid passkey origin.')
  const secret=process.env.STAFF_SESSION_SECRET
  if(!secret||secret.length<43||secret===process.env.INBOX_BASIC_AUTH_PASS)throw new Error('An independent staff session secret is required.')
  return {origin,rpID:url.hostname,secret,scope:production?'staff-auth-live-v1':'staff-auth-preview-v1',secure:url.protocol==='https:'}
}
export function isPasskeyHost(req:Request){try{return new URL(req.url).origin===passkeyConfig().origin}catch{return false}}
