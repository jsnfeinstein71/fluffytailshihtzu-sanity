'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import type {Conversation, SmsMessage} from './page'

type UploadedImage = {
  url: string
  name: string
}

export default function InboxClient({
  conversations,
}: {
  conversations: Conversation[]
}) {
  const router = useRouter()
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)

  const [selectedPhone, setSelectedPhone] = useState(conversations[0]?.phone || '')
  const [search, setSearch] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list')
  const [replyBody, setReplyBody] = useState('')
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [composerError, setComposerError] = useState('')

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

  useEffect(() => {
    setReplyBody('')
    setUploadedImages([])
    setComposerError('')
  }, [selectedPhone])

  const openConversation = (phone: string) => {
    setSelectedPhone(phone)
    if (isMobile) setMobileView('thread')
  }

  const showList = !isMobile || mobileView === 'list'
  const showThread = !isMobile || mobileView === 'thread'

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    setComposerError('')
    setIsUploading(true)

    try {
      const nextImages: UploadedImage[] = []

      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/fluffytail/upload-image', {
          method: 'POST',
          body: formData,
        })

        const json = await response.json()

        if (!response.ok || !json.url) {
          throw new Error(json.error || 'Failed to upload image')
        }

        nextImages.push({
          url: json.url,
          name: file.name,
        })
      }

      setUploadedImages((current) => [...current, ...nextImages])
    } catch (error) {
      console.error(error)
      setComposerError('Image upload failed.')
    } finally {
      setIsUploading(false)
      if (galleryInputRef.current) galleryInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
    }
  }

  function removeImage(index: number) {
    setUploadedImages((current) => current.filter((_, i) => i !== index))
  }

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedConversation) return

    const trimmedBody = replyBody.trim()

    if (!trimmedBody && uploadedImages.length === 0) {
      setComposerError('Add a message or a photo.')
      return
    }

    setComposerError('')
    setIsSending(true)

    try {
      const response = await fetch('/api/fluffytail/sms/send', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          to: selectedConversation.phone,
          body: trimmedBody,
          mediaUrls: uploadedImages.map((image) => image.url),
        }),
      })

      const json = await response.json()

      if (!response.ok || !json.ok) {
        throw new Error(json.error || 'Failed to send message')
      }

      setReplyBody('')
      setUploadedImages([])
      router.refresh()
    } catch (error) {
      console.error(error)
      setComposerError('Failed to send reply.')
    } finally {
      setIsSending(false)
    }
  }

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
                style={inputStyle}
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
                  const title =
                    conversation.inquiry?.name?.trim() ||
                    formatDisplayPhone(conversation.phone)

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
                          <div style={conversationTitleStyle}>{title}</div>

                          <div style={conversationPhoneStyle}>
                            {formatDisplayPhone(conversation.phone)}
                          </div>

                          {subtitleParts.length > 0 ? (
                            <div style={conversationMetaStyle}>
                              {subtitleParts.join(' • ')}
                            </div>
                          ) : null}

                          <div style={conversationPreviewStyle}>
                            {conversation.preview || 'No message'}
                          </div>

                          <div style={conversationCountStyle}>
                            {conversation.messages.length} message
                            {conversation.messages.length === 1 ? '' : 's'}
                          </div>
                        </div>

                        <div style={conversationDateStyle}>
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
                      {selectedConversation.inquiry?.name?.trim() ||
                        formatDisplayPhone(selectedConversation.phone)}
                    </h2>

                    <p className="lead" style={{margin: '6px 0 0 0'}}>
                      {formatDisplayPhone(selectedConversation.phone)}
                    </p>

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
                  {selectedConversation.messages.length > 0 ? (
                    selectedConversation.messages.map((message) => (
                      <MessageBubble key={message._id} message={message} />
                    ))
                  ) : (
                    <div
                      style={{
                        background: '#fff',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: '18px',
                        padding: '14px 16px',
                      }}
                    >
                      <div style={{fontWeight: 700, marginBottom: '8px'}}>
                        Inquiry received
                      </div>
                      <div style={{whiteSpace: 'pre-wrap', lineHeight: 1.45}}>
                        {selectedConversation.inquiry?.message || 'No message included.'}
                      </div>
                    </div>
                  )}
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
                  <form onSubmit={handleSend}>
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
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      rows={3}
                      placeholder={`Reply to ${
                        selectedConversation.inquiry?.name?.trim() ||
                        formatDisplayPhone(selectedConversation.phone)
                      }`}
                      style={textareaStyle}
                    />

                    {uploadedImages.length > 0 ? (
                      <div
                        style={{
                          display: 'grid',
                          gap: '10px',
                          marginTop: '12px',
                        }}
                      >
                        {uploadedImages.map((image, index) => (
                          <div
                            key={`${image.url}-${index}`}
                            style={{
                              border: '1px solid rgba(0,0,0,0.08)',
                              borderRadius: '14px',
                              padding: '10px',
                              background: '#fff',
                            }}
                          >
                            <img
                              src={image.url}
                              alt={image.name}
                              style={{
                                width: '100%',
                                maxWidth: '220px',
                                borderRadius: '10px',
                                display: 'block',
                                marginBottom: '8px',
                              }}
                            />
                            <div
                              style={{
                                fontSize: '13px',
                                opacity: 0.75,
                                marginBottom: '8px',
                                wordBreak: 'break-word',
                              }}
                            >
                              {image.name}
                            </div>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => removeImage(index)}
                            >
                              Remove Photo
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      style={{display: 'none'}}
                    />

                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handleFileChange}
                      style={{display: 'none'}}
                    />

                    <div className="ctaRow" style={{marginTop: '12px'}}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => galleryInputRef.current?.click()}
                        disabled={isUploading || isSending}
                      >
                        Gallery
                      </button>

                      <button
                        type="button"
                        className="btn"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={isUploading || isSending}
                      >
                        Camera
                      </button>

                      <button
                        className="btn btnPrimary"
                        type="submit"
                        disabled={isUploading || isSending}
                      >
                        {isUploading
                          ? 'Uploading...'
                          : isSending
                            ? 'Sending...'
                            : 'Send Reply'}
                      </button>
                    </div>

                    {composerError ? (
                      <p
                        className="lead"
                        style={{marginTop: '12px', color: '#b42318', marginBottom: 0}}
                      >
                        {composerError}
                      </p>
                    ) : null}
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

        {message.body ? (
          <div
            style={{
              whiteSpace: 'pre-wrap',
              lineHeight: 1.45,
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              marginBottom: message.mediaUrls?.length ? '10px' : 0,
            }}
          >
            {message.body}
          </div>
        ) : null}

        {message.mediaUrls?.length ? (
          <div style={{display: 'grid', gap: '10px'}}>
            {message.mediaUrls.map((url, index) => (
              <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer">
                <img
                  src={url}
                  alt="Message media"
                  style={{
                    width: '100%',
                    maxWidth: '240px',
                    borderRadius: '12px',
                    display: 'block',
                  }}
                />
              </a>
            ))}
          </div>
        ) : null}
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

function formatDisplayPhone(value?: string) {
  if (!value) return 'Unknown'

  const digits = value.replace(/\D/g, '')

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    const local = digits.slice(1)
    return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`
  }

  return value
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: '14px',
  border: '1px solid rgba(0,0,0,0.12)',
  padding: '12px 14px',
  font: 'inherit',
  background: '#fff',
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: '14px',
  border: '1px solid rgba(0,0,0,0.12)',
  padding: '12px 14px',
  font: 'inherit',
  resize: 'vertical',
  background: '#fff',
}

const conversationTitleStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: '16px',
  marginBottom: '4px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const conversationPhoneStyle: React.CSSProperties = {
  fontSize: '13px',
  opacity: 0.7,
  marginBottom: '4px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const conversationMetaStyle: React.CSSProperties = {
  fontSize: '13px',
  opacity: 0.8,
  marginBottom: '6px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const conversationPreviewStyle: React.CSSProperties = {
  fontSize: '14px',
  opacity: 0.75,
  marginBottom: '6px',
  lineHeight: 1.35,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical' as const,
  overflow: 'hidden',
  wordBreak: 'break-word',
}

const conversationCountStyle: React.CSSProperties = {
  fontSize: '12px',
  opacity: 0.65,
}

const conversationDateStyle: React.CSSProperties = {
  fontSize: '12px',
  opacity: 0.65,
  whiteSpace: 'nowrap',
}
