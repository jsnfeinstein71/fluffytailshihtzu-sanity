import {NextRequest, NextResponse} from 'next/server'
import {requireOperator} from '@/lib/operator-auth'

export function proxy(req: NextRequest) {
  if(req.nextUrl.pathname==='/inbox/access'||req.nextUrl.pathname==='/inbox/access/api')return NextResponse.next()
  const denied = requireOperator(req)
  if (denied) return denied
  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export const config = {matcher: ['/inbox/:path*']}
