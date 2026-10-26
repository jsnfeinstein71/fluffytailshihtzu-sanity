import {randomUUID} from 'node:crypto'
import {NextRequest, NextResponse} from 'next/server'
import twilio from 'twilio'
import {InquiryError, normalizePhone} from '@/lib/inquiry'
import {readRequestText} from '@/lib/request-body'
import {getOperatorClient} from '@/sanity/lib/operator-client'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'
import {privateRecordId} from '@/sanity/lib/private-records'

export const runtime = 'nodejs'

function reply(acknowledge = false) {
  const message = acknowledge
    ? '<Message>Thanks for contacting FluffyTail Shih Tzu. We received your message and will reply as soon as we can. Reply STOP to opt out. Reply HELP for help.</Message>' : ''
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${message}</Response>`, {
    headers: {'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store'},
  })
}

export async function POST(req: NextRequest) {
  const frozen = operationalWriteFreeze()
  if (frozen) return frozen
  if (process.env.VERCEL_ENV === 'preview') return NextResponse.json({error: 'Provider callbacks are disabled in preview.'}, {status: 503})
  const signature = req.headers.get('x-twilio-signature')
  if (!signature) return NextResponse.json({error: 'Invalid signature.'}, {status: 403})
  const secret = process.env.TWILIO_AUTH_TOKEN
  if (!secret) return NextResponse.json({error: 'Messaging is not configured.'}, {status: 503})
  try {
    if (!req.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) throw new InquiryError('Form data is required.', 415)
    const form = new URLSearchParams(await readRequestText(req, 32768))
    const params: Record<string, string | string[]> = Object.create(null)
    for (const key of new Set(form.keys())) {
      const values = form.getAll(key)
      params[key] = values.length === 1 ? values[0] : values
    }
    const url = process.env.TWILIO_SMS_WEBHOOK_URL || 'https://www.fluffytailshihtzu.com/api/fluffytail/sms/inbound'
    if (!twilio.validateRequest(secret, signature, url, params)) throw new InquiryError('Invalid signature.', 403)
    const field = (key: string) => {
      if (form.getAll(key).length > 1) throw new InquiryError('Duplicate message fields.')
      return form.get(key) || ''
    }
    const messageSid = field('MessageSid')
    const from = normalizePhone(field('From'))
    const to = normalizePhone(field('To'))
    const body = field('Body')
    const numMedia = Number(field('NumMedia') || '0')
    if (!/^(SM|MM)[a-f0-9]{32}$/i.test(messageSid) || !from || !to || body.length > 1600 || !Number.isInteger(numMedia) || numMedia < 0 || numMedia > 10) {
      throw new InquiryError('Invalid message fields.')
    }
    const mediaUrls: string[] = []
    for (let i = 0; i < numMedia; i++) {
      let media: URL
      try { media = new URL(field(`MediaUrl${i}`)) }
      catch { throw new InquiryError('Invalid media URL.') }
      if (media.protocol !== 'https:' || media.username || media.password) throw new InquiryError('Invalid media URL.')
      mediaUrls.push(media.href)
    }
    const sanity = getOperatorClient()
    const existing = await sanity.fetch('*[_type == "smsMessage" && messageSid == $sid][0]._id', {sid: messageSid}, {cache: 'no-store'})
    if (existing) return reply()
    const receipt = randomUUID()
    const record = await sanity.createIfNotExists({
      _id: privateRecordId('sms', messageSid), _type: 'smsMessage', receipt,
      messageSid, from, to, body, direction: 'inbound', source: 'fluffytail',
      signatureVerified: true, receivedAt: new Date().toISOString(), numMedia, mediaUrls,
    })
    return reply(record.receipt === receipt)
  } catch (error) {
    return NextResponse.json({error: error instanceof InquiryError ? error.message : 'Message persistence failed.'},
      {status: error instanceof InquiryError ? error.status : 503})
  }
}
