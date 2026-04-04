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

type TallyField = {
  label?: string
  type?: string
  value?: unknown
  options?: {id: string; text: string}[]
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const fields: TallyField[] = payload?.data?.fields || []

    const getField = (labels: string[]) =>
      fields.find((field) => labels.includes(field.label || ''))

    const getValue = (labels: string[]) => {
      const field = getField(labels)
      if (!field) return ''

      if (Array.isArray(field.value) && field.options?.length) {
        const ids = field.value.map(String)
        const texts = field.options
          .filter((option) => ids.includes(option.id))
          .map((option) => option.text)
        return texts.join(', ')
      }

      if (Array.isArray(field.value)) {
        return field.value.map(String).join(', ')
      }

      return typeof field.value === 'string' || typeof field.value === 'number'
        ? String(field.value)
        : ''
    }

    const name = getValue(['Name', 'Full name', 'Full Name'])
    const phone = getValue(['Phone number', 'Phone'])
    const email = getValue(['Email address', 'Email'])
    const preferredContactMethod = getValue([
      'Preferred contact method',
      'Preferred Contact Method',
    ])
    const message = getValue(['Message'])
    const puppy = getValue(['puppy', 'Puppy'])
    const litter = getValue(['litter', 'Litter'])
    const puppyPageUrl = getValue(['puppyPageUrl', 'Puppy Page URL'])

    await sanity.create({
      _type: 'puppyInquiry',
      submittedAt: new Date().toISOString(),
      name,
      phone,
      email,
      preferredContactMethod,
      message,
      puppy,
      litter,
      puppyPageUrl,
      source: 'fluffytail',
    })

    const inboxUrl = 'https://www.fluffytailshihtzu.com/inbox'

    const alertBody = [
      'New puppy inquiry',
      puppy ? `Puppy: ${puppy}` : '',
      litter ? `Litter: ${litter}` : '',
      name ? `Name: ${name}` : '',
      phone ? `Phone: ${phone}` : '',
      email ? `Email: ${email}` : '',
      preferredContactMethod ? `Prefers: ${preferredContactMethod}` : '',
      `Inbox: ${inboxUrl}`,
    ]
      .filter(Boolean)
      .join('\n')

    const alertMessage = await twilioClient.messages.create({
      from: process.env.TWILIO_FROM_NUMBER!,
      to: process.env.FLUFFYTAIL_ALERT_NUMBER!,
      body: alertBody,
    })

    await sanity.create({
      _type: 'smsMessage',
      messageSid: alertMessage.sid,
      from: process.env.TWILIO_FROM_NUMBER!,
      to: process.env.FLUFFYTAIL_ALERT_NUMBER!,
      body: alertBody,
      direction: 'outbound',
      source: 'fluffytail-alert',
      receivedAt: new Date().toISOString(),
    })

    return NextResponse.json({ok: true})
  } catch (error) {
    console.error('Failed to save puppy inquiry', error)
    return NextResponse.json({error: 'Failed to save puppy inquiry'}, {status: 500})
  }
}
