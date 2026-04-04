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

type SmsMessageRecord = {
  _id: string
  from?: string
  to?: string
  direction?: string
  source?: string
}

type PuppyInquiryRecord = {
  _id: string
  phone?: string
}

export async function POST(req: NextRequest) {
  try {
    const {phone} = await req.json()

    const normalizedTarget = normalizePhone(String(phone || ''))

    if (!normalizedTarget) {
      return NextResponse.json({error: 'Missing phone'}, {status: 400})
    }

    const [messages, inquiries] = await Promise.all([
      sanity.fetch<SmsMessageRecord[]>(
        `*[_type == "smsMessage"]{
          _id,
          from,
          to,
          direction,
          source
        }`
      ),
      sanity.fetch<PuppyInquiryRecord[]>(
        `*[_type == "puppyInquiry"]{
          _id,
          phone
        }`
      ),
    ])

    const messageIdsToDelete = messages
      .filter((message) => {
        if (message.source === 'fluffytail-alert') return false

        const conversationPhone =
          message.direction === 'outbound'
            ? normalizePhone(message.to)
            : normalizePhone(message.from)

        return conversationPhone === normalizedTarget
      })
      .map((message) => message._id)

    const inquiryIdsToDelete = inquiries
      .filter((inquiry) => normalizePhone(inquiry.phone) === normalizedTarget)
      .map((inquiry) => inquiry._id)

    const idsToDelete = [...messageIdsToDelete, ...inquiryIdsToDelete]

    if (idsToDelete.length === 0) {
      return NextResponse.json({
        ok: true,
        deleted: 0,
      })
    }

    const transaction = sanity.transaction()

    for (const id of idsToDelete) {
      transaction.delete(id)
    }

    await transaction.commit()

    return NextResponse.json({
      ok: true,
      deleted: idsToDelete.length,
      deletedMessages: messageIdsToDelete.length,
      deletedInquiries: inquiryIdsToDelete.length,
    })
  } catch (error) {
    console.error('Failed to delete conversation', error)
    return NextResponse.json({error: 'Failed to delete conversation'}, {status: 500})
  }
}

function normalizePhone(value?: string) {
  if (!value) return ''

  const digits = value.replace(/\D/g, '')

  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1)
  }

  if (digits.length === 10) {
    return digits
  }

  return digits
}
