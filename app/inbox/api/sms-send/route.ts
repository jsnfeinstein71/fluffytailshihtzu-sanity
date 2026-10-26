import {NextRequest, NextResponse} from 'next/server'
import {getOperatorClient} from '@/sanity/lib/operator-client'
import {requireOperator} from '@/lib/operator-auth'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'
import {getTwilio} from '@/sanity/lib/twilio'
import {privateRecordId} from '@/sanity/lib/private-records'
import {InquiryError, normalizePhone} from '@/lib/inquiry'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const denied = requireOperator(req)
  if (denied) return denied
  const frozen = operationalWriteFreeze()
  if (frozen) return frozen
  try {
    const sanity = getOperatorClient()
    const payload = await req.json()

    const to = normalizePhone(String(payload.to || '').trim())
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

    const inquiry = await sanity.fetch<{source?: string; smsConsent?: boolean; preferredContactMethod?: string} | null>(
      '*[_type == "puppyInquiry" && phone == $to] | order(submittedAt desc)[0]{source, smsConsent, preferredContactMethod}',
      {to}, {cache: 'no-store'}
    )
    if (inquiry?.source === 'fluffytail-native' && (inquiry.smsConsent !== true || inquiry.preferredContactMethod === 'Email')) {
      return NextResponse.json({error: 'This inquiry does not permit SMS follow-up. Reply by email.'}, {status: 403})
    }
    if (process.env.VERCEL_ENV === 'preview') {
      return NextResponse.json({error: 'Messaging is disabled in preview.'}, {status: 503})
    }
    const twilioClient = getTwilio()
    const message = await twilioClient.messages.create({
      from: process.env.TWILIO_FROM_NUMBER!,
      to,
      body: body || undefined,
      mediaUrl: mediaUrls.length > 0 ? mediaUrls : undefined,
    })

    await sanity.create({
      _id: privateRecordId('sms'),
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
    if (error instanceof InquiryError) return NextResponse.json({error: error.message}, {status: error.status})
    console.error('Failed to send SMS/MMS')
    return NextResponse.json({error: 'Failed to send SMS/MMS'}, {status: 500})
  }
}
