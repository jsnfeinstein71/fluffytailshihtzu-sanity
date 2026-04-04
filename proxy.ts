import {NextRequest, NextResponse} from 'next/server'

export function proxy(req: NextRequest) {
  const user = process.env.INBOX_BASIC_AUTH_USER || ''
  const pass = process.env.INBOX_BASIC_AUTH_PASS || ''

  if (!user || !pass) {
    return new NextResponse('Inbox auth is not configured.', {status: 500})
  }

  const authHeader = req.headers.get('authorization')

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ')

    if (scheme === 'Basic' && encoded) {
      try {
        const decoded = atob(encoded)
        const separatorIndex = decoded.indexOf(':')

        if (separatorIndex !== -1) {
          const suppliedUser = decoded.slice(0, separatorIndex)
          const suppliedPass = decoded.slice(separatorIndex + 1)

          if (suppliedUser === user && suppliedPass === pass) {
            return NextResponse.next()
          }
        }
      } catch {
        // Fall through to auth challenge below.
      }
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="FluffyTail Inbox"',
      'Cache-Control': 'no-store',
    },
  })
}

export const config = {
  matcher: ['/inbox/:path*'],
}
