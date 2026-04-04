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
  key?: string
  label?: string
  type?: string
  value?: unknown
  options?: {id: string; text: string}[]
}

type TallyPayload = {
  data?: {
    fields?: TallyField[]
  }
  hiddenFields?: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as TallyPayload
    const fields: TallyField[] = payload?.data?.fields || []
    const hiddenFields = payload?.hiddenFields || {}

    const getFieldValue = (matches: string[]) => {
      for (const field of fields) {
        const fieldKey = String(field.key || '').trim()
        const fieldLabel = String(field.label || '').trim()

        const matched =
          matches.includes(fieldKey) ||
          matches.includes(fieldLabel) ||
          matches.includes(fieldKey.toLowerCase()) ||
          matches.includes(fieldLabel.toLowerCase())

        if (!matched) continue

        if (Array.isArray(field.value) && field.options?.length) {
          const ids = field.value.map(String)
          const texts = field.options
            .filter((option) => ids.includes(option.id))
            .map((option) => option.text)
          return texts.join(', ').trim()
        }

        if (Array.isArray(field.value)) {
          return field.value.map(String).join(', ').trim()
        }

        if (
          typeof field.value === 'string' ||
          typeof field.value === 'number' ||
          typeof field.value === 'boolean'
        ) {
          return String(field.value).trim()
        }
      }

      return ''
    }

    const getHiddenValue = (matches: string[]) => {
      for (const key of Object.keys(hiddenFields)) {
        const keyLower = key.toLowerCase()
        const matched =
          matches.includes(key) ||
          matches.includes(keyLower)

        if (!matched) continue

        const value = hiddenFields[key]

        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          return String(value).trim()
        }
      }

      return ''
    }

    const firstNonEmpty = (...values: string[]) =>
      values.find((value) => value && value.trim())?.trim() || ''

    const name = firstNonEmpty(
      getFieldValue(['Name', 'Full name', 'full name', 'name'])
    )

    const phone = firstNonEmpty(
      getFieldValue(['Phone number', 'phone number', 'Phone', 'phone'])
    )

    const email = firstNonEmpty(
      getFieldValue(['Email address', 'email address', 'Email', 'email'])
    )

    const preferredContactMethod = firstNonEmpty(
      getFieldValue([
        'Preferred contact method',
        'preferred contact method',
        'Preferred Contact Method',
        'preferredcontactmethod',
      ])
    )

    const visibleMessage = getFieldValue(['Message', 'message'])
    const hiddenMessage = getHiddenValue(['message'])
    const message = firstNonEmpty(visibleMessage, hiddenMessage)

    const puppy = firstNonEmpty(
      getFieldValue(['Puppy', 'puppy']),
      getHiddenValue(['puppy'])
    )

    const litter = firstNonEmpty(
      getFieldValue(['Litter', 'litter']),
      getHiddenValue(['litter'])
    )

    const puppyPageUrl = firstNonEmpty(
      getFieldValue(['Puppy Page URL', 'puppy page url', 'puppypageurl']),
      getHiddenValue(['puppypageurl', 'puppyPageUrl'.toLowerCase()])
    )

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
      message ? `Message: ${message}` : '',
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
      numMedia: 0,
      mediaUrls: [],
    })

    return NextResponse.json({ok: true})
  } catch (error) {
    console.error('Failed to save puppy inquiry', error)
    return NextResponse.json({error: 'Failed to save puppy inquiry'}, {status: 500})
  }
}
