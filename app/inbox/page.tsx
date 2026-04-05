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
  customerPhone?: string
  paymentType?: string
  paymentStatus?: string
  amountPaid?: number
  createdAt?: string
}

export type Conversation = {
  phone: string
  messages: SmsMessage[]
  latestAt?: string
  preview?: string
  inquiry?: PuppyInquiry | null
  paymentRecord?: PaymentRecord | null
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
  customerPhone,
  paymentType,
  paymentStatus,
  amountPaid,
  createdAt
}`

export default async function InboxPage() {
  const [messages, inquiries, paymentRecords] = await Promise.all([
    client.fetch<SmsMessage[]>(smsMessagesQuery),
    client.fetch<PuppyInquiry[]>(puppyInquiriesQuery),
    client.fetch<PaymentRecord[]>(paymentRecordsQuery),
  ])

  const conversations = buildConversations(messages, inquiries, paymentRecords)

  return <InboxClient conversations={conversations} />
}

function buildConversations(
  messages: SmsMessage[],
  inquiries: PuppyInquiry[],
  paymentRecords: PaymentRecord[]
): Conversation[] {
  const inquiryMap = new Map<string, PuppyInquiry>()
  const paymentMap = new Map<string, PaymentRecord>()

  for (const inquiry of inquiries) {
    const phone = normalizePhone(inquiry.phone)
    if (phone && !inquiryMap.has(phone)) {
      inquiryMap.set(phone, inquiry)
    }
  }

  for (const payment of paymentRecords) {
    const phone = normalizePhone(payment.customerPhone)
    if (phone && !paymentMap.has(phone)) {
      paymentMap.set(phone, payment)
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
    const paymentRecord = paymentMap.get(phone) || null
    const latestMessage = groupedMessages[groupedMessages.length - 1]

    const latestAt =
      latestMessage?.receivedAt ||
      paymentRecord?.createdAt ||
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
      paymentRecord,
    }
  })

  return conversations.sort((a, b) => {
    const aTime = a.latestAt ? new Date(a.latestAt).getTime() : 0
    const bTime = b.latestAt ? new Date(b.latestAt).getTime() : 0
    return bTime - aTime
  })
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
