import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@sanity/client'

export const runtime = 'nodejs'

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2025-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN!,
  useCdn: false,
})

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const messageSid = String(formData.get('MessageSid') || '')
  const from = String(formData.get('From') || '')
  const to = String(formData.get('To') || '')
  const body = String(formData.get('Body') || '')
  const numMedia = Number(formData.get('NumMedia') || '0')
  const receivedAt = new Date().toISOString()

  const mediaUrls: string[] = []

  for (let i = 0; i < numMedia; i += 1) {
    const mediaUrl = String(formData.get(`MediaUrl${i}`) || '')
    if (mediaUrl) mediaUrls.push(mediaUrl)
  }

  try {
    await sanity.create({
      _type: 'smsMessage',
      messageSid,
      from,
      to,
      body,
      direction: 'inbound',
      source: 'fluffytail',
      receivedAt,
      numMedia,
      mediaUrls,
    })
  } catch (error) {
    console.error('Failed to save inbound SMS/MMS', error)
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
