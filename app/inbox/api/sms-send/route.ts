import {NextRequest, NextResponse} from 'next/server'
import {getOperatorClient} from '@/sanity/lib/operator-client'
import {requireOperator} from '@/lib/operator-auth'
import twilio from 'twilio'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const denied = requireOperator(req)
  if (denied) return denied
  try {
    const sanity = getOperatorClient()
    const payload = await req.json()

    const to = String(payload.to || '').trim()
    const body = String(payload.body || '').trim()
    const mediaUrls = Array.isArray(payload.mediaUrls)
      ? payload.mediaUrls.map((value: unknown) => String(value)).filter(Boolean)
      : []

    if (!to) {
      return NextResponse.json({error: 'Missing recipient number'}, {status: 400})
    }

    if (!body && mediaUrls.length === 0) {
      return NextResponse.json({error: 'Message body or media is required'}, {status: 400})
    }

    if (process.env.VERCEL_ENV === 'preview') {
      return NextResponse.json({error: 'Messaging is disabled in preview.'}, {status: 503})
    }
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
    const message = await twilioClient.messages.create({
      from: process.env.TWILIO_FROM_NUMBER!,
      to,
      body: body || undefined,
      mediaUrl: mediaUrls.length > 0 ? mediaUrls : undefined,
    })

    await sanity.create({
      _type: 'smsMessage',
      messageSid: message.sid,
      from: process.env.TWILIO_FROM_NUMBER!,
      to,
      body,
      direction: 'outbound',
      source: 'fluffytail',
      receivedAt: new Date().toISOString(),
      numMedia: mediaUrls.length,
      mediaUrls,
    })

    return NextResponse.json({ok: true, sid: message.sid})
  } catch {
    console.error('Failed to send SMS/MMS')
    return NextResponse.json({error: 'Failed to send SMS/MMS'}, {status: 500})
  }
}
