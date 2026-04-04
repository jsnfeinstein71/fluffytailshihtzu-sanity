import '../home.css'
import {client} from '@/sanity/lib/client'

export const revalidate = 30

type SmsMessage = {
  _id: string
  messageSid?: string
  from?: string
  to?: string
  body?: string
  direction?: string
  source?: string
  receivedAt?: string
}

type Conversation = {
  phone: string
  messages: SmsMessage[]
  latestAt?: string
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

  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <a className="btn" href="/">Home</a>
        <a className="btn" href="/available-puppies">Available Puppies</a>
        <a className="btn" href="/contact">Contact</a>
      </div>

      <div className="topbar">
        <div className="pill">
          <span className="dot"></span>
          FluffyTail Inbox
        </div>
      </div>

      <h1 className="h1">SMS Inbox</h1>
      <p className="lead">Incoming FluffyTail text messages grouped by conversation.</p>

      {conversations.length === 0 ? (
        <div className="card section" style={{marginTop: '18px'}}>
          <div className="pad">
            <p className="lead" style={{marginBottom: 0}}>No messages yet.</p>
          </div>
        </div>
      ) : (
        <div className="grid" style={{gridTemplateColumns: '1fr', marginTop: '18px'}}>
          {conversations.map((conversation) => (
            <div className="card" key={conversation.phone}>
              <div className="pad">
                <div className="ctaRow" style={{justifyContent: 'space-between', marginTop: 0}}>
                  <span className="badge">Conversation</span>
                  <span className="badge">{formatDateTime(conversation.latestAt)}</span>
                </div>

                <h2 className="panelTitle" style={{marginTop: '14px', marginBottom: '8px'}}>
                  {conversation.phone}
                </h2>

                <p className="lead" style={{marginBottom: '16px'}}>
                  {conversation.messages.length} message{conversation.messages.length === 1 ? '' : 's'}
                </p>

                <div className="divider"></div>

                <form
                  action="/api/fluffytail/sms/send"
                  method="POST"
                  style={{marginTop: '16px', marginBottom: '18px'}}
                >
                  <input type="hidden" name="to" value={conversation.phone} />
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 600,
                      marginBottom: '8px',
                    }}
                  >
                    Reply
                  </label>
                  <textarea
                    name="body"
                    required
                    rows={4}
                    style={{
                      width: '100%',
                      borderRadius: '14px',
                      border: '1px solid rgba(0,0,0,0.12)',
                      padding: '12px 14px',
                      font: 'inherit',
                      resize: 'vertical',
                      background: '#fff',
                    }}
                    placeholder={`Reply to ${conversation.phone}`}
                  />
                  <div className="ctaRow" style={{marginTop: '12px'}}>
                    <button className="btn btnPrimary" type="submit">
                      Send Reply
                    </button>
                  </div>
                </form>

                <div style={{display: 'grid', gap: '14px'}}>
                  {conversation.messages.map((message) => (
                    <div key={message._id}>
                      <div className="ctaRow" style={{justifyContent: 'space-between', marginTop: 0}}>
                        <span className="badge">{message.direction || 'inbound'}</span>
                        <span className="badge">{formatDateTime(message.receivedAt)}</span>
                      </div>

                      <div className="meta" style={{marginTop: '10px'}}>
                        <span>From: {message.from || 'Unknown'}</span>
                        <span>To: {message.to || 'Unknown'}</span>
                        {message.source ? <span>Source: {message.source}</span> : null}
                      </div>

                      <p className="lead" style={{whiteSpace: 'pre-wrap', marginTop: '12px', marginBottom: '8px'}}>
                        {message.body || '(No message body)'}
                      </p>

                      {message.messageSid ? (
                        <p className="lead" style={{fontSize: '14px', opacity: 0.8, marginBottom: 0}}>
                          SID: {message.messageSid}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="footer">
        © {new Date().getFullYear()} FluffyTail Shih Tzu • In-home raised as family pets
      </div>
    </main>
  )
}

function buildConversations(messages: SmsMessage[]): Conversation[] {
  const map = new Map<string, SmsMessage[]>()

  for (const message of messages) {
    const phone = message.direction === 'outbound' ? message.to || 'Unknown' : message.from || 'Unknown'
    const current = map.get(phone) || []
    current.push(message)
    map.set(phone, current)
  }

  return Array.from(map.entries())
    .map(([phone, groupedMessages]) => {
      const sortedMessages = groupedMessages.sort((a, b) => {
        const aTime = a.receivedAt ? new Date(a.receivedAt).getTime() : 0
        const bTime = b.receivedAt ? new Date(b.receivedAt).getTime() : 0
        return bTime - aTime
      })

      return {
        phone,
        messages: sortedMessages,
        latestAt: sortedMessages[0]?.receivedAt,
      }
    })
    .sort((a, b) => {
      const aTime = a.latestAt ? new Date(a.latestAt).getTime() : 0
      const bTime = b.latestAt ? new Date(b.latestAt).getTime() : 0
      return bTime - aTime
    })
}

function formatDateTime(value?: string) {
  if (!value) return 'Unknown time'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
