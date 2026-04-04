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

    await sanity.create({
      _type: 'puppyInquiry',
      submittedAt: new Date().toISOString(),
      name: getValue(['Name', 'Full name', 'Full Name']),
      phone: getValue(['Phone number', 'Phone']),
      email: getValue(['Email address', 'Email']),
      preferredContactMethod: getValue([
        'Preferred contact method',
        'Preferred Contact Method',
      ]),
      message: getValue(['Message']),
      puppy: getValue(['puppy', 'Puppy']),
      litter: getValue(['litter', 'Litter']),
      puppyPageUrl: getValue(['puppyPageUrl', 'Puppy Page URL']),
      source: 'fluffytail',
    })

    return NextResponse.json({ok: true})
  } catch (error) {
    console.error('Failed to save puppy inquiry', error)
    return NextResponse.json({error: 'Failed to save puppy inquiry'}, {status: 500})
  }
}
