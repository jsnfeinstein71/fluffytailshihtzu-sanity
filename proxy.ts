import {NextRequest, NextResponse} from 'next/server'
import {requireOperator} from '@/lib/operator-auth'
import {isolatedStaffPreview,staffWorkspaceAvailable} from '@/lib/staff-session'
import {adminOrigin,isPasskeyHost,passkeyMode,safeStaffReturn} from '@/lib/passkey-config'
import {getStaffIdentity} from '@/sanity/lib/staff-auth'

function continueStaff(req:NextRequest){
  const headers=new Headers(req.headers)
  headers.set('x-fluffytail-staff-path',req.nextUrl.pathname)
  headers.set('x-fluffytail-staff-origin',req.nextUrl.origin)
  const response=NextResponse.next({request:{headers}})
  response.headers.set('Cache-Control','private, no-store')
  response.headers.set('Referrer-Policy','no-referrer')
  response.headers.set('X-Frame-Options','DENY')
  response.headers.set('Permissions-Policy','publickey-credentials-get=(self), publickey-credentials-create=(self)')
  return response
}

export async function proxy(req: NextRequest) {
  const path=req.nextUrl.pathname,mode=passkeyMode(),host=isPasskeyHost(req)
  if(path==='/')return host?NextResponse.redirect(new URL('/inbox/workspace',req.url)):NextResponse.next()
  if(path==='/inbox/unlock'||path==='/inbox/auth/api'||path==='/inbox/auth/invitation'){
    if(!host)return NextResponse.redirect(new URL('/inbox/unlock',adminOrigin))
    return continueStaff(req)
  }
  if(mode!=='off'&&(path==='/inbox'||path.startsWith('/inbox/'))&&!host&&!(mode==='transition'&&req.nextUrl.origin==='https://www.fluffytailshihtzu.com')){
    if(req.method==='GET'&&!path.includes('/api')&&!path.includes('/auth/'))return NextResponse.redirect(new URL('/inbox/unlock?return='+encodeURIComponent(safeStaffReturn(path)),adminOrigin))
    return NextResponse.json({error:'Use the private staff address.'},{status:401,headers:{'Cache-Control':'private, no-store'}})
  }
  if(host&&(path==='/inbox/access'||path==='/inbox/access/api'||path==='/inbox/workspace/api/access'))return NextResponse.json({error:'Use passkey sign-in.'},{status:410})
  if(host&&path==='/inbox/security'){
    try{if(await getStaffIdentity(req,{recovery:true}))return continueStaff(req)}catch{}
    return NextResponse.redirect(new URL('/inbox/unlock?return=/inbox/security',req.url))
  }
  if(req.nextUrl.pathname==='/inbox/access'||req.nextUrl.pathname==='/inbox/access/api')return continueStaff(req)
  const denied = await requireOperator(req)
  if (denied) {
    if(host&&req.method==='GET'&&!path.includes('/api')&&!path.includes('/auth/'))return NextResponse.redirect(new URL('/inbox/unlock?return='+encodeURIComponent(safeStaffReturn(path)),req.url))
    if(mode==='transition'&&req.nextUrl.origin==='https://www.fluffytailshihtzu.com'&&req.method==='GET'&&!path.includes('/api')&&!path.includes('/auth/'))return NextResponse.redirect(new URL('/inbox/access?return='+encodeURIComponent(safeStaffReturn(path)),req.url))
    if(staffWorkspaceAvailable()&&req.method==='GET'&&(req.nextUrl.pathname==='/inbox/workspace'||isolatedStaffPreview()&&!req.nextUrl.pathname.includes('/api/'))&&req.headers.get('accept')?.includes('text/html'))return NextResponse.redirect(new URL('/inbox/access',req.url))
    return denied
  }
  return continueStaff(req)
}

export const config = {matcher: ['/', '/inbox/:path*']}
