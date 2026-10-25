'use client'

import Link from 'next/link'
import {useEffect, useState, type FormEvent} from 'react'
import type {ContactMethod} from '@/lib/inquiry'
import './inquiry-form.css'

export default function InquiryForm({puppySlug = '', puppyName = '', litterTitle = '', interest = 'general'}: {
  puppySlug?: string; puppyName?: string; litterTitle?: string; interest?: 'puppy' | 'waitlist' | 'general'
}) {
  const [method, setMethod] = useState<ContactMethod>('Email')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const textRequested = method !== 'Email'

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/inquiry', {cache: 'no-store', signal: controller.signal})
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to open the form. Please try again later.')
        setToken(data.token)
      })
      .catch((reason) => {if (!controller.signal.aborted) setError(reason.message || 'Unable to open the form. Please try again later.')})
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
          website: form.get('website') || '', puppySlug, interest,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to submit. Please try again later.')
      setConfirmation(data.message)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to submit. Please try again later.')
    } finally { setBusy(false) }
  }

  if (confirmation) return <div className="inquiry-confirmation" role="status"><h2>Inquiry received</h2><p>{confirmation}</p><Link href="/available-puppies">Back to puppies</Link></div>

  return (
    <form className="inquiry-form" onSubmit={submit} aria-label="Puppy inquiry">
      {puppySlug ? <div className="inquiry-context"><strong>{puppyName}</strong>{litterTitle ? <span>Litter: {litterTitle}</span> : null}</div> : null}
      <div className="inquiry-fields">
        <label>Name<input name="name" autoComplete="name" maxLength={100} minLength={2} required /></label>
        <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      </div>
      <fieldset><legend>Preferred contact method</legend><div className="inquiry-methods">{(['Email', 'Text', 'Either'] as const).map((value) => (
        <label key={value}><input type="radio" name="preferredContactMethod" value={value} checked={method === value} onChange={() => setMethod(value)} />{value}</label>
      ))}</div></fieldset>
      <label>Phone {textRequested ? '' : '(optional)'}<input name="phone" type="tel" autoComplete="tel" maxLength={40} required={textRequested} /></label>
      <label>Message<textarea name="message" rows={5} minLength={5} maxLength={2000} defaultValue={puppySlug ? `Hi, I'm interested in ${puppyName}. Please send me more information.` : interest === 'waitlist' ? 'I would like to hear about future puppies and upcoming litters.' : ''} required /></label>
      {textRequested ? <label className="inquiry-consent"><input type="checkbox" name="smsConsent" required />
        <span>By checking this box and submitting this puppy inquiry form, I agree to receive conversational and customer-care SMS messages from FluffyTail Shih Tzu at the phone number provided about my puppy inquiry, puppy availability, scheduling, and next steps. Message frequency varies. Message and data rates may apply. Reply STOP to opt out and HELP for help. Consent is not a condition of purchase. See our <Link href="/privacy-policy">Privacy Policy</Link> and <Link href="/terms-and-conditions">Terms and Conditions</Link>.</span>
      </label> : null}
      {!textRequested ? <p>See our <Link href="/privacy-policy">Privacy Policy</Link> and <Link href="/terms-and-conditions">Terms and Conditions</Link>.</p> : null}
      <div className="inquiry-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {error ? <p className="inquiry-error" role="alert">{error}</p> : null}
      <button type="submit" className="btn btnPrimary" disabled={busy || !token}>{busy ? 'Submitting...' : 'Send inquiry'}</button>
    </form>
  )
}
