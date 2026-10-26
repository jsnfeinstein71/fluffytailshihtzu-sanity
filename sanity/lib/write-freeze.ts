import 'server-only'
import {NextResponse} from 'next/server'

export function operationalWriteFreeze() {
  if (process.env.FLUFFYTAIL_WRITE_FREEZE !== '1') return null
  return NextResponse.json({error: 'Operational writes are temporarily paused.'}, {
    status: 503, headers: {'Cache-Control': 'no-store', 'Retry-After': '60'},
  })
}
