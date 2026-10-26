import {NextRequest, NextResponse} from 'next/server'
import {requireOperator} from '@/lib/operator-auth'
import {isolatedStaffPreview} from '@/lib/staff-session'

export function proxy(req: NextRequest) {
  if(req.nextUrl.pathname==='/inbox/access'||req.nextUrl.pathname==='/inbox/access/api')return NextResponse.next()
  const denied = requireOperator(req)
  if (denied) {
    if(isolatedStaffPreview()&&req.method==='GET'&&req.nextUrl.pathname==='/inbox/workspace'&&req.headers.get('accept')?.includes('text/html'))return NextResponse.redirect(new URL('/inbox/access',req.url))
    return denied
  }
  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export const config = {matcher: ['/inbox/:path*']}
