import {createHash, timingSafeEqual} from 'node:crypto'
import {NextResponse} from 'next/server'
import {isolatedStaffPreview,staffWorkspaceAvailable,validStaffSession} from './staff-session'
import {isPasskeyHost,passkeyMode} from './passkey-config'
import {getStaffIdentity} from '@/sanity/lib/staff-auth'

function equal(a: string, b: string) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())
}

export function requireOperator(req: Request) {
  if(passkeyMode()!=='off')return requirePasskeyOrTransition(req)
  return requireLegacyOperator(req)
}
async function requirePasskeyOrTransition(req:Request){
  const headers={'Cache-Control':'private, no-store'}
  try{
    if(isPasskeyHost(req)){
      if(!await getStaffIdentity(req))return NextResponse.json({error:'Unlock the staff workspace to continue.'},{status:401,headers})
      if(!['GET','HEAD','OPTIONS'].includes(req.method)&&(req.headers.get('origin')!==new URL(req.url).origin||req.headers.get('sec-fetch-site')==='cross-site'))return NextResponse.json({error:'Cross-origin staff requests are not allowed.'},{status:403,headers})
      return null
    }
    if(passkeyMode()==='transition'&&new URL(req.url).origin==='https://www.fluffytailshihtzu.com')return requireLegacyOperator(req)
    return NextResponse.json({error:'Use the private staff address.'},{status:401,headers})
  }catch{return NextResponse.json({error:'Staff access could not be verified. Try again shortly.'},{status:503,headers})}
}
function requireLegacyOperator(req: Request) {
  const user = process.env.INBOX_BASIC_AUTH_USER
  const pass = process.env.INBOX_BASIC_AUTH_PASS
  const headers = {'Cache-Control': 'no-store'}
  if (!user || !pass) return NextResponse.json({error: 'Operator authentication is not configured.'}, {status: 503, headers})

  const authorization = req.headers.get('authorization') || ''
  const match = /^Basic ([A-Za-z0-9+/]+=*)$/i.exec(authorization)
  let valid = false
  if (match) {
    const decoded = Buffer.from(match[1], 'base64').toString('utf8')
    const split = decoded.indexOf(':')
    if (split >= 0) valid = equal(decoded.slice(0, split), user) && equal(decoded.slice(split + 1), pass)
  }
  if (!valid && !validStaffSession(req)) {
    const workspace=isolatedStaffPreview()||staffWorkspaceAvailable()&&(new URL(req.url).pathname==='/inbox/workspace'||new URL(req.url).pathname.startsWith('/inbox/workspace/'))
    // A background workspace fetch must never open a browser-wide Basic Auth dialog.
    return NextResponse.json({error:'Authentication required.'},{status:401,headers:workspace?headers:{...headers,'WWW-Authenticate':'Basic realm="FluffyTail Inbox"'}})
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.get('origin')
    if (req.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== new URL(req.url).origin)) {
      return NextResponse.json({error: 'Cross-origin operator requests are not allowed.'}, {status: 403, headers})
    }
  }
  return null
}
