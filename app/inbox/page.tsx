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

export type Conversation = {
  phone: string
  messages: SmsMessage[]
  latestAt?: string
  preview?: string
  inquiry?: PuppyInquiry | null
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

export default async function InboxPage() {
  const [messages, inquiries] = await Promise.all([
    client.fetch<SmsMessage[]>(smsMessagesQuery),
    client.fetch<PuppyInquiry[]>(puppyInquiriesQuery),
  ])

  const conversations = buildConversations(messages, inquiries)

  return <InboxClient conversations={conversations} />
}

function buildConversations(
  messages: SmsMessage[],
  inquiries: PuppyInquiry[]
): Conversation[] {
  const inquiryMap = new Map<string, PuppyInquiry>()

  for (const inquiry of inquiries) {
    const phone = normalizePhone(inquiry.phone)
    if (phone && !inquiryMap.has(phone)) {
      inquiryMap.set(phone, inquiry)
    }
  }

  const map = new Map<string, SmsMessage[]>()

  for (const message of messages) {
    const phone =
      message.direction === 'outbound'
        ? normalizePhone(message.to)
        : normalizePhone(message.from)

    const key = phone || 'Unknown'
    const current = map.get(key) || []
    current.push(message)
    map.set(key, current)
  }

  return Array.from(map.entries())
    .map(([phone, groupedMessages]) => {
      const sortedMessages = [...groupedMessages].sort((a, b) => {
        const aTime = a.receivedAt ? new Date(a.receivedAt).getTime() : 0
        const bTime = b.receivedAt ? new Date(b.receivedAt).getTime() : 0
        return aTime - bTime
      })

      const latest = sortedMessages[sortedMessages.length - 1]

      return {
        phone,
        messages: sortedMessages,
        latestAt: latest?.receivedAt,
        preview:
          latest?.body ||
          (latest?.mediaUrls && latest.mediaUrls.length > 0 ? 'Photo' : ''),
        inquiry: inquiryMap.get(phone) || null,
      }
    })
    .sort((a, b) => {
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
