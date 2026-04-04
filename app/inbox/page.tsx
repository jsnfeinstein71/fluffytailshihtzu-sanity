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
      <p className="lead">
        Incoming FluffyTail text messages saved from the Twilio webhook.
      </p>

      {messages.length === 0 ? (
        <div className="card section" style={{marginTop: '18px'}}>
          <div className="pad">
            <p className="lead" style={{marginBottom: 0}}>
              No messages yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid" style={{gridTemplateColumns: '1fr', marginTop: '18px'}}>
          {messages.map((message) => (
            <div className="card" key={message._id}>
              <div className="pad">
                <div className="ctaRow" style={{justifyContent: 'space-between', marginTop: 0}}>
                  <span className="badge">{message.direction || 'inbound'}</span>
                  <span className="badge">{formatDateTime(message.receivedAt)}</span>
                </div>

                <div className="meta" style={{marginTop: '12px'}}>
                  <span>From: {message.from || 'Unknown'}</span>
                  <span>To: {message.to || 'Unknown'}</span>
                  {message.source ? <span>Source: {message.source}</span> : null}
                </div>

                <div className="divider"></div>

                <h2 className="panelTitle" style={{marginBottom: '8px'}}>
                  Message
                </h2>
                <p className="lead" style={{whiteSpace: 'pre-wrap', marginBottom: '12px'}}>
                  {message.body || '(No message body)'}
                </p>

                {message.messageSid ? (
                  <p className="lead" style={{fontSize: '14px', opacity: 0.8, marginBottom: 0}}>
                    SID: {message.messageSid}
                  </p>
                ) : null}
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

function formatDateTime(value?: string) {
  if (!value) return 'Unknown time'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
