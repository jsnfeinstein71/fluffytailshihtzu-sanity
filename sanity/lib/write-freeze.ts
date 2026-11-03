import 'server-only'
import {NextResponse} from 'next/server'
import {publicReviewEnabled} from '@/lib/public-review'

export function operationalWriteFreeze() {
  if (process.env.FLUFFYTAIL_WRITE_FREEZE !== '1'&&!publicReviewEnabled()) return null
  return NextResponse.json({error: 'Operational writes are temporarily paused.'}, {
    status: 503, headers: {'Cache-Control': 'no-store', 'Retry-After': '60'},
  })
}
