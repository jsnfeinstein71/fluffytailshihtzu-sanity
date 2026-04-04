// app/api/fluffytail/sms/inbound/route.ts
import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@sanity/client'

export const runtime = 'nodejs'

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2025-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN!,
  useCdn: false,
})

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const payload = {
    messageSid: String(formData.get('MessageSid') || ''),
    from: String(formData.get('From') || ''),
    to: String(formData.get('To') || ''),
    body: String(formData.get('Body') || ''),
    receivedAt: new Date().toISOString(),
  }

  try {
    await writeClient.create({
      _type: 'smsMessage',
      messageSid: payload.messageSid,
      from: payload.from,
      to: payload.to,
      body: payload.body,
      direction: 'inbound',
      source: 'fluffytail',
      receivedAt: payload.receivedAt,
    })
  } catch (error) {
    console.error('Failed to save inbound SMS', error)
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thanks for contacting FluffyTail Shih Tzu. We received your message and will reply as soon as we can. Reply STOP to opt out. Reply HELP for help.</Message>
</Response>`

  return new NextResponse(twiml, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
