'use client'

import {useEffect, useRef, useState} from 'react'
import Link from 'next/link'
import {feedbackPhotoLimit, type FeedbackStatus} from '@/lib/feedback'

// This preview is a local object URL, never an uploaded or optimized asset.
/* eslint-disable @next/next/no-img-element */

const invitationStorageKey = 'fluffytail.feedback.invitation.v1'
const invitationTokenPattern = /^[a-f0-9]{64}\.[\w-]{43}$/
const photoTypes = ['image/jpeg', 'image/png', 'image/webp']
type FormStatus = FeedbackStatus['status'] | 'loading' | 'unavailable' | 'submitted'

async function photoPayload(file: File) {
  const contentBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(new Error('photo-read-failed'))
    reader.readAsDataURL(file)
  })
  return {contentBase64, contentType: file.type, filename: file.name}
}

export default function FeedbackForm() {
  const [status, setStatus] = useState<FormStatus>('loading')
  const [feedback, setFeedback] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [puppyName, setPuppyName] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const token = useRef('')
  const sending = useRef(false)
  const photoInput = useRef<HTMLInputElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    // A fragment is never sent to the server or in a Referrer. Remove it before
    // checking the invitation and retain it only for this tab's reloads.
    const fragment = window.location.hash.slice(1)
    const invitationFragment = fragment && fragment !== 'site-content' ? fragment : ''
    if (invitationFragment) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    try {
      if (invitationFragment) {
        token.current = invitationTokenPattern.test(invitationFragment) ? invitationFragment : ''
        if (token.current) sessionStorage.setItem(invitationStorageKey, token.current)
        else sessionStorage.removeItem(invitationStorageKey)
      } else token.current = token.current || sessionStorage.getItem(invitationStorageKey) || ''
    } catch {
      if (invitationFragment) token.current = invitationTokenPattern.test(invitationFragment) ? invitationFragment : ''
    }

    async function checkInvitation() {
      if (!token.current) { setStatus('invalid'); return }
      try {
        const response = await fetch('/api/feedback', {
          method: 'POST', headers: {'Content-Type': 'application/json'}, cache: 'no-store',
          body: JSON.stringify({action: 'status', token: token.current}), signal: controller.signal,
        })
        if (!response.ok) throw new Error('invitation-check-failed')
        const result: FeedbackStatus = await response.json()
        if (!['ready', 'used', 'expired', 'revoked', 'invalid'].includes(result.status)) throw new Error('invalid-status')
        setStatus(result.status)
        if (result.status === 'ready') {
          setDisplayName(current => current || result.displayName || '')
          setPuppyName(current => current || result.puppyName || '')
        }
      } catch {
        if (!controller.signal.aborted) setStatus('unavailable')
      }
    }
    void checkInvitation()
    return () => controller.abort()
  }, [retry])

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])
  useEffect(() => { if (status === 'submitted') resultHeading.current?.focus() }, [status])

  function selectPhoto(file: File | null) {
    setError('')
    if (file && (!photoTypes.includes(file.type) || file.size > feedbackPhotoLimit)) {
      setError(`Please choose a JPG, PNG or WebP photograph up to 2.5 MB. ${photo ? 'Your earlier photograph is still attached.' : 'You can also send your feedback without a photo.'}`)
      if (photoInput.current) photoInput.current.value = ''
      return
    }
    setPhoto(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : '')
    if (!file && photoInput.current) photoInput.current.value = ''
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending.current || status !== 'ready') return
    if (!feedback.trim() || !displayName.trim()) { setError('Please add your feedback and the name you would like to share.'); return }
    sending.current = true
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, cache: 'no-store',
        body: JSON.stringify({action: 'submit', token: token.current, feedback: feedback.trim(), displayName: displayName.trim(), puppyName: puppyName.trim(), ...(photo ? {photo: await photoPayload(photo)} : {})}),
      })
      const result = await response.json().catch(() => null)
      if (response.status === 404 || response.status === 410) {
        setError('This invitation is no longer available. Your words and photograph are still here. Please reply to Jeanne’s invitation for help or a new link.')
        return
      }
      if (response.status === 429) {
        setError('Please wait a moment before trying again. Your words and photograph are still here.')
        return
      }
      if (response.status === 400) {
        setError('Please check your name and feedback, and use a non-animated JPG, PNG or WebP photograph up to 2.5 MB and 20 megapixels. Your words and photograph are still here.')
        return
      }
      if (!response.ok || !result?.submitted) throw new Error('submission-failed')
      setStatus('submitted')
      setPhoto(null)
      setPhotoPreview('')
    } catch {
      setError('Your feedback could not be confirmed. Your words and photograph are still here. Please try again; a retry will not send a second submission. If this continues, reply to Jeanne’s invitation for help.')
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  if (status === 'loading') return <p role="status">Opening your invitation…</p>
  if (status === 'submitted' || status === 'used') return <section className="feedback-result" aria-labelledby="feedback-result-title">
    <h2 id="feedback-result-title" ref={resultHeading} tabIndex={-1}>Thank you for sharing.</h2>
    <p>{status === 'used' ? 'This invitation has already been used. Thank you for taking the time to share your experience with Jeanne.' : 'Your feedback is with Jeanne. Thank you for taking the time to share a little of your life together.'}</p>
    <p>If you would like to add or correct something, just reply to Jeanne’s invitation.</p>
    <Link className="text-link" href="/">Back to FluffyTail <span aria-hidden="true">&rarr;</span></Link>
  </section>
  if (status !== 'ready') return <section className="feedback-result" aria-labelledby="feedback-unavailable-title">
    <h2 id="feedback-unavailable-title">{status === 'unavailable' ? 'Let’s try that again.' : status === 'expired' ? 'This invitation has expired.' : status === 'revoked' ? 'This invitation is no longer available.' : 'Open your personal invitation.'}</h2>
    <p>{status === 'unavailable' ? 'Your invitation could not be checked just now. Please try again in a moment.' : status === 'invalid' ? 'Use the “Share your feedback” link Jeanne sent you. If that link is not working, reply to her message and she can help.' : 'Reply to Jeanne’s message to ask for a fresh invitation. You do not need an account.'}</p>
    {status === 'unavailable' ? <button type="button" className="brand-button" onClick={() => {setStatus('loading'); setRetry(value => value + 1)}}>Try again</button> : <Link className="text-link" href="/contact">Contact Jeanne <span aria-hidden="true">&rarr;</span></Link>}
  </section>

  return <form className="feedback-form" onSubmit={submit} aria-busy={busy}>
    <fieldset disabled={busy}>
      <div className="feedback-field">
        <label htmlFor="family-feedback">Your experience</label>
        <p id="family-feedback-help">How has life been with your puppy? Share whatever you would like Jeanne to know.</p>
        <textarea id="family-feedback" required maxLength={6000} rows={7} value={feedback} onChange={event => setFeedback(event.target.value)} aria-describedby="family-feedback-help" />
      </div>
      <div className="feedback-field-pair">
        <div className="feedback-field">
          <label htmlFor="feedback-display-name">Name to share publicly</label>
          <p id="feedback-name-help">A first name and last initial is fine, such as Alex R.</p>
          <input id="feedback-display-name" required maxLength={80} autoComplete="off" value={displayName} onChange={event => setDisplayName(event.target.value)} aria-describedby="feedback-name-help" />
        </div>
        <div className="feedback-field">
          <label htmlFor="feedback-puppy-name">Puppy’s name <span>(optional)</span></label>
          <input id="feedback-puppy-name" maxLength={80} autoComplete="off" value={puppyName} onChange={event => setPuppyName(event.target.value)} />
        </div>
      </div>
      <div className="feedback-field feedback-photo-field">
        <label htmlFor="feedback-photo">A puppy photograph <span>(optional)</span></label>
        <p id="feedback-photo-help">I always love seeing them grow. Choose a photograph you are happy to share, without private information or other people. JPG, PNG or WebP, up to 2.5 MB.</p>
        <input ref={photoInput} id="feedback-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => selectPhoto(event.target.files?.[0] || null)} aria-describedby="feedback-photo-help" />
        {photo ? <div className="feedback-photo-preview">
          <img src={photoPreview} alt="Your chosen puppy photograph" />
          <div><p>{photo.name}</p><button type="button" className="feedback-remove" onClick={() => selectPhoto(null)}>Remove photograph</button></div>
        </div> : null}
      </div>
      <p className="feedback-privacy">Your story, the name above and any photograph may be shared on FluffyTail’s website. Please leave out contact details or anything you would rather keep private. Your contact information stays private. <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy <span className="feedback-new-tab">(opens in a new tab)</span></Link></p>
      {error ? <p className="feedback-error" role="alert">{error}</p> : null}
      <button className="brand-button feedback-submit" type="submit">{busy ? 'Sending your feedback…' : 'Share your feedback'}</button>
    </fieldset>
  </form>
}
