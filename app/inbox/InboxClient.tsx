'use client'

import {useEffect, useMemo, useState} from 'react'
import type {Conversation, SmsMessage} from './page'

export default function InboxClient({
  conversations,
}: {
  conversations: Conversation[]
}) {
  const [selectedPhone, setSelectedPhone] = useState(conversations[0]?.phone || '')
  const [search, setSearch] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list')

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 900)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations

    return conversations.filter((conversation) => {
      const inPhone = conversation.phone.toLowerCase().includes(q)
      const inPreview = (conversation.preview || '').toLowerCase().includes(q)
      const inName = (conversation.inquiry?.name || '').toLowerCase().includes(q)
      const inEmail = (conversation.inquiry?.email || '').toLowerCase().includes(q)
      const inPuppy = (conversation.inquiry?.puppy || '').toLowerCase().includes(q)
      const inLitter = (conversation.inquiry?.litter || '').toLowerCase().includes(q)

      return inPhone || inPreview || inName || inEmail || inPuppy || inLitter
    })
  }, [conversations, search])

  const selectedConversation =
    filtered.find((c) => c.phone === selectedPhone) || filtered[0] || null

  useEffect(() => {
    if (!selectedConversation && filtered[0]) {
      setSelectedPhone(filtered[0].phone)
    }
  }, [filtered, selectedConversation])

  const openConversation = (phone: string) => {
    setSelectedPhone(phone)
    if (isMobile) setMobileView('thread')
  }

  const showList = !isMobile || mobileView === 'list'
  const showThread = !isMobile || mobileView === 'thread'

  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <a className="btn" href="/">
          Home
        </a>
        <a className="btn" href="/available-puppies">
          Available Puppies
        </a>
        <a className="btn" href="/contact">
          Contact
        </a>
      </div>

      <div className="topbar">
        <div className="pill">
          <span className="dot"></span>
          FluffyTail Inbox
        </div>
      </div>

      <h1 className="h1" style={{marginBottom: '10px'}}>
        Inbox
      </h1>
      <p className="lead" style={{marginBottom: '18px'}}>
        Messages from FluffyTail customer conversations.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '360px 1fr',
          gap: '18px',
          alignItems: 'start',
        }}
      >
        {showList ? (
          <aside className="card" style={{overflow: 'hidden'}}>
            <div className="pad">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <h2 className="panelTitle" style={{margin: 0}}>
                  Conversations
                </h2>
                <span className="badge">{filtered.length}</span>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, number, puppy, message"
                style={{
                  width: '100%',
                  borderRadius: '14px',
                  border: '1px solid rgba(0,0,0,0.12)',
                  padding: '12px 14px',
                  font: 'inherit',
                  background: '#fff',
                }}
              />
            </div>

            <div style={{borderTop: '1px solid rgba(0,0,0,0.08)'}}>
              {filtered.length === 0 ? (
                <div className="pad">
                  <p className="lead" style={{margin: 0}}>
                    No matching conversations.
                  </p>
                </div>
              ) : (
                filtered.map((conversation) => {
                  const isActive = selectedConversation?.phone === conversation.phone
                  const title = conversation.inquiry?.name || conversation.phone
                  const subtitleParts = [
                    conversation.inquiry?.puppy ? `Puppy: ${conversation.inquiry.puppy}` : '',
                    conversation.inquiry?.litter ? conversation.inquiry.litter : '',
                  ].filter(Boolean)

                  return (
                    <button
                      key={conversation.phone}
                      onClick={() => openConversation(conversation.phone)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: '0',
                        background: isActive ? 'rgba(0,0,0,0.04)' : 'transparent',
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                        padding: '14px 16px',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '12px',
                          alignItems: 'start',
                        }}
                      >
                        <div style={{minWidth: 0, flex: 1}}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '16px',
                              marginBottom: '4px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {title}
                          </div>

                          {conversation.inquiry?.name ? (
                            <div
                              style={{
                                fontSize: '13px',
                                opacity: 0.7,
                                marginBottom: '4px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {conversation.phone}
                            </div>
                          ) : null}

                          {subtitleParts.length > 0 ? (
                            <div
                              style={{
                                fontSize: '13px',
                                opacity: 0.8,
                                marginBottom: '6px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {subtitleParts.join(' • ')}
                            </div>
                          ) : null}

                          <div
                            style={{
                              fontSize: '14px',
                              opacity: 0.75,
                              marginBottom: '6px',
                              lineHeight: 1.35,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical' as const,
                              overflow: 'hidden',
                              wordBreak: 'break-word',
                            }}
                          >
                            {conversation.preview || 'No message'}
                          </div>

                          <div style={{fontSize: '12px', opacity: 0.65}}>
                            {conversation.messages.length} message
                            {conversation.messages.length === 1 ? '' : 's'}
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: '12px',
                            opacity: 0.65,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatShortDate(conversation.latestAt)}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </aside>
        ) : null}

        {showThread ? (
          <section className="card" style={{overflow: 'hidden'}}>
            {!selectedConversation ? (
              <div className="pad">
                <p className="lead" style={{margin: 0}}>
                  No conversation selected.
                </p>
              </div>
            ) : (
              <>
                <div
                  className="pad"
                  style={{
                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{minWidth: 0, width: '100%'}}>
                    {isMobile ? (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setMobileView('list')}
                        style={{marginBottom: '10px'}}
                      >
                        ← Conversations
                      </button>
                    ) : null}

                    <h2
                      className="panelTitle"
                      style={{
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word',
                      }}
                    >
                      {selectedConversation.inquiry?.name || selectedConversation.phone}
                    </h2>

                    {selectedConversation.inquiry?.name ? (
                      <p className="lead" style={{margin: '6px 0 0 0'}}>
                        {selectedConversation.phone}
                      </p>
                    ) : null}

                    {selectedConversation.inquiry ? (
                      <div
                        style={{
                          display: 'grid',
                          gap: '6px',
                          marginTop: '12px',
                          fontSize: '14px',
                          opacity: 0.82,
                        }}
                      >
                        {selectedConversation.inquiry.email ? (
                          <div>Email: {selectedConversation.inquiry.email}</div>
                        ) : null}
                        {selectedConversation.inquiry.preferredContactMethod ? (
                          <div>
                            Prefers: {selectedConversation.inquiry.preferredContactMethod}
                          </div>
                        ) : null}
                        {selectedConversation.inquiry.puppy ? (
                          <div>Puppy: {selectedConversation.inquiry.puppy}</div>
                        ) : null}
                        {selectedConversation.inquiry.litter ? (
                          <div>Litter: {selectedConversation.inquiry.litter}</div>
                        ) : null}
                        {selectedConversation.inquiry.puppyPageUrl ? (
                          <div style={{wordBreak: 'break-word'}}>
                            Page:{' '}
                            <a
                              href={selectedConversation.inquiry.puppyPageUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open puppy page
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="lead" style={{margin: '6px 0 0 0'}}>
                        {selectedConversation.messages.length} messages
                      </p>
                    )}
                  </div>

                  {!isMobile ? (
                    <div className="badge">
                      Latest {formatDateTime(selectedConversation.latestAt)}
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    padding: '18px',
                    display: 'grid',
                    gap: '12px',
                    maxHeight: isMobile ? '50vh' : '62vh',
                    overflowY: 'auto',
                    background: 'rgba(0,0,0,0.015)',
                  }}
                >
                  {selectedConversation.messages.map((message) => (
                    <MessageBubble key={message._id} message={message} />
                  ))}
                </div>

                <div
                  className="pad"
                  style={{
                    borderTop: '1px solid rgba(0,0,0,0.08)',
                    position: 'sticky',
                    bottom: 0,
                    background: '#fff',
                  }}
                >
                  <form action="/api/fluffytail/sms/send" method="POST">
                    <input type="hidden" name="to" value={selectedConversation.phone} />

                    <label
                      style={{
                        display: 'block',
                        fontWeight: 700,
                        marginBottom: '8px',
                      }}
                    >
                      Reply
                    </label>

                    <textarea
                      name="body"
                      required
                      rows={3}
                      placeholder={`Reply to ${
                        selectedConversation.inquiry?.name || selectedConversation.phone
                      }`}
                      style={{
                        width: '100%',
                        borderRadius: '14px',
                        border: '1px solid rgba(0,0,0,0.12)',
                        padding: '12px 14px',
                        font: 'inherit',
                        resize: 'vertical',
                        background: '#fff',
                      }}
                    />

                    <div className="ctaRow" style={{marginTop: '12px'}}>
                      <button className="btn btnPrimary" type="submit">
                        Send Reply
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </section>
        ) : null}
      </div>

      <div className="footer">
        © {new Date().getFullYear()} FluffyTail Shih Tzu • In-home raised as family pets
      </div>
    </main>
  )
}

function MessageBubble({message}: {message: SmsMessage}) {
  const outbound = message.direction === 'outbound'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: outbound ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          maxWidth: '84%',
          background: outbound ? 'rgba(37, 99, 235, 0.10)' : '#fff',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '18px',
          padding: '12px 14px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '8px',
          }}
        >
          <span className="badge">{outbound ? 'You' : 'Customer'}</span>
          <span style={{fontSize: '12px', opacity: 0.65}}>
            {formatTimeOnly(message.receivedAt)}
          </span>
        </div>

        <div
          style={{
            whiteSpace: 'pre-wrap',
            lineHeight: 1.45,
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
          }}
        >
          {message.body || '(No message body)'}
        </div>
      </div>
    </div>
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

function formatShortDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatTimeOnly(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
