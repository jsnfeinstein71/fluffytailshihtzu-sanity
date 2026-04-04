import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@sanity/client'
import twilio from 'twilio'

export const runtime = 'nodejs'

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2025-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN!,
  useCdn: false,
})

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export async function POST(req: NextRequest) {
  try {
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
  } catch (error) {
    console.error('Failed to send SMS/MMS', error)
    return NextResponse.json({error: 'Failed to send SMS/MMS'}, {status: 500})
  }
}
