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
    const {to, body} = await req.json()

    if (!to || !body) {
      return NextResponse.json({error: 'Missing to or body'}, {status: 400})
    }

    const message = await twilioClient.messages.create({
      from: process.env.TWILIO_FROM_NUMBER!,
      to,
      body,
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
    })

    return NextResponse.json({ok: true, sid: message.sid})
  } catch (error) {
    console.error('Failed to send SMS', error)
    return NextResponse.json({error: 'Failed to send SMS'}, {status: 500})
  }
}
