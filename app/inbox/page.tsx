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
}

export type Conversation = {
  phone: string
  messages: SmsMessage[]
  latestAt?: string
  preview?: string
}

const smsMessagesQuery = `*[_type == "smsMessage"] | order(receivedAt desc){
  _id,
  messageSid,
  from,
  to,
  body,
  direction,
  source,
  receivedAt
}`

export default async function InboxPage() {
  const messages = await client.fetch<SmsMessage[]>(smsMessagesQuery)
  const conversations = buildConversations(messages)

  return <InboxClient conversations={conversations} />
}

function buildConversations(messages: SmsMessage[]): Conversation[] {
  const map = new Map<string, SmsMessage[]>()

  for (const message of messages) {
    const phone =
      message.direction === 'outbound'
        ? message.to || 'Unknown'
        : message.from || 'Unknown'

    const current = map.get(phone) || []
    current.push(message)
    map.set(phone, current)
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
        preview: latest?.body || '',
      }
    })
    .sort((a, b) => {
      const aTime = a.latestAt ? new Date(a.latestAt).getTime() : 0
      const bTime = b.latestAt ? new Date(b.latestAt).getTime() : 0
      return bTime - aTime
    })
}
