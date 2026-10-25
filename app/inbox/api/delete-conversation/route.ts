import {NextRequest, NextResponse} from 'next/server'
import {getOperatorClient} from '@/sanity/lib/operator-client'
import {requireOperator} from '@/lib/operator-auth'
import {normalizePhone as normalizeContactPhone} from '@/lib/inquiry'

export const runtime = 'nodejs'

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
  const denied = requireOperator(req)
  if (denied) return denied
  try {
    const sanity = getOperatorClient()
    const {phone, inquiryId} = await req.json()

    const normalizedTarget = normalizePhone(String(phone || ''))

    if (!normalizedTarget) {
      if (typeof inquiryId === 'string') {
        const inquiry = await sanity.getDocument<PuppyInquiryRecord & {_type: string}>(inquiryId)
        if (inquiry?._type === 'puppyInquiry' && !normalizePhone(inquiry.phone)) {
          await sanity.delete(inquiry._id)
          return NextResponse.json({ok: true, deleted: 1, deletedInquiries: 1, deletedMessages: 0})
        }
      }
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
  } catch {
    console.error('Failed to delete conversation')
    return NextResponse.json({error: 'Failed to delete conversation'}, {status: 500})
  }
}

function normalizePhone(value?: string) {
  try { return normalizeContactPhone(value || '') }
  catch { return value?.trim() || '' }
}
