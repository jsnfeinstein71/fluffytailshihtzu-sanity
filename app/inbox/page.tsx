import '../home.css'
import {client} from '@/sanity/lib/client'
import InboxClient from './InboxClient'

export const revalidate = 10

export type SmsMessage = {
  _id: string
  messageSid?: string
  from?: string
  to?: string
  body?: string
  direction?: string
  source?: string
  receivedAt?: string
  numMedia?: number
  mediaUrls?: string[]
}

export type PuppyInquiry = {
  _id: string
  submittedAt?: string
  name?: string
  phone?: string
  email?: string
  preferredContactMethod?: string
  message?: string
  puppy?: string
  litter?: string
  puppyPageUrl?: string
  source?: string
}

export type PaymentRecord = {
  _id: string
  puppySlug?: string
  puppyName?: string
  customerPhone?: string
  paymentType?: string
  paymentStatus?: string
  amountPaid?: number
  createdAt?: string
}

export type PuppyPrice = {
  slug?: string
  name?: string
  overridePrice?: number
  litterPrice?: number
}

export type PaymentSummary = {
  records: PaymentRecord[]
  totalPaid: number
  remainingBalance?: number
  puppySlug?: string
  puppyName?: string
  totalPrice?: number
}

export type Conversation = {
  phone: string
  messages: SmsMessage[]
  latestAt?: string
  preview?: string
  inquiry?: PuppyInquiry | null
  paymentSummary?: PaymentSummary | null
}

const smsMessagesQuery = `*[_type == "smsMessage"] | order(receivedAt desc){
  _id,
  messageSid,
  from,
  to,
  body,
  direction,
  source,
  receivedAt,
  numMedia,
  mediaUrls
}`

const puppyInquiriesQuery = `*[_type == "puppyInquiry"] | order(submittedAt desc){
  _id,
  submittedAt,
  name,
  phone,
  email,
  preferredContactMethod,
  message,
  puppy,
  litter,
  puppyPageUrl,
  source
}`

const paymentRecordsQuery = `*[_type == "paymentRecord"] | order(createdAt desc){
  _id,
  puppySlug,
  puppyName,
  customerPhone,
  paymentType,
  paymentStatus,
  amountPaid,
  createdAt
}`

const puppyPricesQuery = `*[_type == "puppy"]{
  "slug": slug.current,
  name,
  overridePrice,
  "litterPrice": litter->price
}`

export default async function InboxPage() {
  const [messages, inquiries, paymentRecords, puppyPrices] = await Promise.all([
    client.fetch<SmsMessage[]>(smsMessagesQuery),
    client.fetch<PuppyInquiry[]>(puppyInquiriesQuery),
    client.fetch<PaymentRecord[]>(paymentRecordsQuery),
    client.fetch<PuppyPrice[]>(puppyPricesQuery),
  ])

  const conversations = buildConversations(
    messages,
    inquiries,
    paymentRecords,
    puppyPrices
  )

  return <InboxClient conversations={conversations} />
}

function buildConversations(
  messages: SmsMessage[],
  inquiries: PuppyInquiry[],
  paymentRecords: PaymentRecord[],
  puppyPrices: PuppyPrice[]
): Conversation[] {
  const inquiryMap = new Map<string, PuppyInquiry>()
  const paymentMap = new Map<string, PaymentRecord[]>()

  for (const inquiry of inquiries) {
    const phone = normalizePhone(inquiry.phone)
    if (phone && !inquiryMap.has(phone)) {
      inquiryMap.set(phone, inquiry)
    }
  }

  for (const payment of paymentRecords) {
    const phone = normalizePhone(payment.customerPhone)
    if (!phone) continue

    const existing = paymentMap.get(phone) || []
    existing.push(payment)
    paymentMap.set(phone, existing)
  }

  const puppyPriceMap = new Map<string, PuppyPrice>()
  for (const puppy of puppyPrices) {
    if (puppy.slug) {
      puppyPriceMap.set(puppy.slug, puppy)
    }
  }

  const customerMessages = messages.filter(
    (message) => message.source !== 'fluffytail-alert'
  )

  const phoneSet = new Set<string>()

  for (const inquiry of inquiries) {
    const phone = normalizePhone(inquiry.phone)
    if (phone) phoneSet.add(phone)
  }

  for (const payment of paymentRecords) {
    const phone = normalizePhone(payment.customerPhone)
    if (phone) phoneSet.add(phone)
  }

  for (const message of customerMessages) {
    const phone =
      message.direction === 'outbound'
        ? normalizePhone(message.to)
        : normalizePhone(message.from)

    if (phone) phoneSet.add(phone)
  }

  const conversations: Conversation[] = Array.from(phoneSet).map((phone) => {
    const groupedMessages = customerMessages
      .filter((message) => {
        const messagePhone =
          message.direction === 'outbound'
            ? normalizePhone(message.to)
            : normalizePhone(message.from)

        return messagePhone === phone
      })
      .sort((a, b) => {
        const aTime = a.receivedAt ? new Date(a.receivedAt).getTime() : 0
        const bTime = b.receivedAt ? new Date(b.receivedAt).getTime() : 0
        return aTime - bTime
      })

    const inquiry = inquiryMap.get(phone) || null
    const inquiryPuppySlug = extractPuppySlugFromInquiry(inquiry)

    const allPhonePayments = paymentMap.get(phone) || []
    const scopedPayments = inquiryPuppySlug
      ? allPhonePayments.filter((record) => record.puppySlug === inquiryPuppySlug)
      : allPhonePayments

    const paymentSummary = buildPaymentSummary(scopedPayments, puppyPriceMap)

    const latestMessage = groupedMessages[groupedMessages.length - 1]

    const latestAt =
      latestMessage?.receivedAt ||
      paymentSummary?.records[0]?.createdAt ||
      inquiry?.submittedAt ||
      undefined

    const preview =
      latestMessage?.body ||
      (latestMessage?.mediaUrls && latestMessage.mediaUrls.length > 0
        ? 'Photo'
        : inquiry?.message || 'New inquiry')

    return {
      phone,
      messages: groupedMessages,
      latestAt,
      preview,
      inquiry,
      paymentSummary,
    }
  })

  return conversations.sort((a, b) => {
    const aTime = a.latestAt ? new Date(a.latestAt).getTime() : 0
    const bTime = b.latestAt ? new Date(b.latestAt).getTime() : 0
    return bTime - aTime
  })
}

function buildPaymentSummary(
  records: PaymentRecord[],
  puppyPriceMap: Map<string, PuppyPrice>
): PaymentSummary | null {
  if (!records.length) return null

  const paidRecords = records
    .filter((record) => record.paymentStatus === 'paid')
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })

  if (!paidRecords.length) {
    return {
      records,
      totalPaid: 0,
      puppySlug: records[0]?.puppySlug,
      puppyName: records[0]?.puppyName,
    }
  }

  const primary = paidRecords[0]
  const totalPaid = paidRecords.reduce((sum, record) => {
    return sum + (typeof record.amountPaid === 'number' ? record.amountPaid : 0)
  }, 0)

  const puppy = primary.puppySlug ? puppyPriceMap.get(primary.puppySlug) : undefined
  const totalPrice =
    typeof puppy?.overridePrice === 'number'
      ? puppy.overridePrice
      : typeof puppy?.litterPrice === 'number'
        ? puppy.litterPrice
        : undefined

  return {
    records: paidRecords,
    totalPaid,
    remainingBalance:
      typeof totalPrice === 'number' ? Math.max(totalPrice - totalPaid, 0) : undefined,
    puppySlug: primary.puppySlug,
    puppyName: primary.puppyName || puppy?.name,
    totalPrice,
  }
}

function extractPuppySlugFromInquiry(inquiry?: PuppyInquiry | null) {
  const url = inquiry?.puppyPageUrl
  if (!url) return ''

  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split('/').filter(Boolean)
    const puppiesIndex = parts.findIndex((part) => part === 'puppies')

    if (puppiesIndex >= 0 && parts[puppiesIndex + 1]) {
      return parts[puppiesIndex + 1]
    }
  } catch {
    const match = url.match(/\/puppies\/([^/?#]+)/i)
    if (match?.[1]) {
      return match[1]
    }
  }

  return ''
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
