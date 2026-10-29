'use client'

import {inquiryFailure,formLoadingFailure} from '@/lib/public-copy'
import Link from 'next/link'
import {useEffect, useRef, useState, type FormEvent} from 'react'
import type {ContactMethod} from '@/lib/inquiry'
import './inquiry-form.css'

function fitMessage(field: HTMLTextAreaElement | null) {
  if (!field) return
  field.style.height = 'auto'
  field.style.height = `${field.scrollHeight + field.offsetHeight - field.clientHeight}px`
}

export default function InquiryForm({puppySlug = '', puppyName = '', puppyPhotoUrl = '', litterId = '', litterTitle = '', interest = 'general'}: {
  litterId?:string; puppySlug?: string; puppyName?: string; puppyPhotoUrl?: string; litterTitle?: string; interest?: 'puppy' | 'waitlist' | 'general'
}) {
  const [method, setMethod] = useState<ContactMethod>('Email')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const textRequested = method !== 'Email'

  useEffect(() => {
    const fit = () => fitMessage(messageRef.current)
    fit()
    void document.fonts.ready.then(fit)
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  useEffect(() => {
    if (confirmation || error) feedbackRef.current?.focus()
  }, [confirmation, error])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/inquiry', {cache: 'no-store', signal: controller.signal})
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || formLoadingFailure)
        setToken(data.token)
      })
      .catch((reason) => {if (!controller.signal.aborted) setError(reason.message || formLoadingFailure)})
    return () => controller.abort()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !token) return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/inquiry', {
        method: 'POST', headers: {'Content-Type': 'application/json', 'X-Inquiry-Token': token},
        body: JSON.stringify({
          name: form.get('name'), email: form.get('email'), phone: form.get('phone') || '',
          preferredContactMethod: method, message: form.get('message'), smsConsent: form.get('smsConsent') === 'on',
          website: form.get('website') || '', puppySlug, litterId, interest,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || inquiryFailure)
      setConfirmation(data.message)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : inquiryFailure)
    } finally { setBusy(false) }
  }

  const puppyContext = puppySlug ? <div className="inquiry-context">
    {puppyPhotoUrl ? <img src={puppyPhotoUrl} width={72} height={72} alt="" decoding="async" /> : null}
    <div><strong>{puppyName}</strong>{litterTitle ? <span>Litter: {litterTitle}</span> : null}</div>
  </div> : null

  const litterContext=litterId?<div className="inquiry-context"><div><strong>{litterTitle}</strong><span>Reservation inquiry · This free inquiry does not secure a selection position.</span></div></div>:null
  if (confirmation) return <div className="inquiry-confirmation" role="status" tabIndex={-1} ref={feedbackRef}>{puppyContext}{litterContext}<h2>Thank you — your message is saved.</h2><p>{confirmation}</p><Link className="text-link" href="/available-puppies">Back to puppies <span aria-hidden="true">&rarr;</span></Link></div>

  return (
    <form className="inquiry-form" onSubmit={submit} aria-label="Puppy inquiry" aria-busy={busy}>
      {puppyContext}{litterContext}
      <div className="inquiry-fields">
        <label>Your name<input name="name" autoComplete="name" maxLength={100} minLength={2} required /></label>
        <label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      </div>
      <fieldset><legend>How should Jeanne reply?</legend><div className="inquiry-methods">{(['Email', 'Text', 'Either'] as const).map((value) => (
        <label key={value} className={method === value ? 'inquiry-method-selected' : undefined}><input type="radio" name="preferredContactMethod" value={value} checked={method === value} onChange={() => setMethod(value)} />{value}</label>
      ))}</div></fieldset>
      <label>Phone number {textRequested ? '' : '(optional)'}<input name="phone" type="tel" autoComplete="tel" maxLength={40} required={textRequested} /></label>
      <label>Message<textarea name="message" rows={4} ref={messageRef} onInput={event => fitMessage(event.currentTarget)} onFocus={event => fitMessage(event.currentTarget)} minLength={5} maxLength={2000} placeholder={!puppySlug && interest === 'general' ? 'Tell Jeanne what you’d like to know.' : undefined} defaultValue={litterId?`Hi Jeanne, I’d like to ask about reserving a selection position in ${litterTitle}. Here’s what I have in mind:`:puppySlug ? `Hi Jeanne, I’d like to know more about ${puppyName}.` : interest === 'waitlist' ? 'Hi Jeanne, I’m interested in a future puppy. Here’s what I have in mind:' : ''} required /></label>
      {textRequested ? <label className="inquiry-consent"><input type="checkbox" name="smsConsent" required />
        <span>By checking this box and submitting this puppy inquiry form, I agree to receive conversational and customer-care SMS messages from FluffyTail Shih Tzu at the phone number provided about my puppy inquiry, puppy availability, scheduling, and next steps. Message frequency varies. Message and data rates may apply. Reply STOP to opt out and HELP for help. Consent is not a condition of purchase. See our <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" title="Opens in a new tab; your inquiry stays here">Privacy Policy</Link> and <Link href="/terms-and-conditions" target="_blank" rel="noopener noreferrer" title="Opens in a new tab; your inquiry stays here">Terms and Conditions</Link>.</span>
      </label> : null}
      {!textRequested ? <p className="inquiry-policy-links">See our <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" title="Opens in a new tab; your inquiry stays here">Privacy Policy</Link> and <Link href="/terms-and-conditions" target="_blank" rel="noopener noreferrer" title="Opens in a new tab; your inquiry stays here">Terms and Conditions</Link>.</p> : null}
      <div className="inquiry-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {error ? <div className="inquiry-error" role="alert" tabIndex={-1} ref={feedbackRef}>{error}</div> : null}
      <button type="submit" className="btn btnPrimary" disabled={busy || !token}>{busy ? 'Sending…' : 'Send to Jeanne'}</button>
    </form>
  )
}
