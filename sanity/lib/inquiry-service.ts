import {randomUUID} from 'node:crypto'
import {InquiryError, normalizePhone, type InquiryInput} from '@/lib/inquiry'
import {inquiryHash} from '@/lib/inquiry-security'
import type {Puppy} from '@/lib/inventory'
import {client} from './client'
import {puppyQuery} from './inventory-queries'
import {getOperatorClient} from './operator-client'
import {privateRecordId} from './private-records'
import {getTwilio} from './twilio'

type Admission = {_id: string; _rev: string; count: number}

async function admit(sanity: ReturnType<typeof getOperatorClient>, key: string, limit: number, milliseconds: number) {
  const bucket = Math.floor(Date.now() / milliseconds)
  const id = privateRecordId('inquiryRate', `${inquiryHash('rate', key)}:${bucket}`)
  await sanity.createIfNotExists({_id: id, _type: 'inquiryRate', count: 0, expiresAt: new Date((bucket + 1) * milliseconds).toISOString()})
  for (let attempt = 0; attempt < 4; attempt++) {
    const record = await sanity.getDocument<Admission>(id)
    if (!record || !Number.isInteger(record.count) || record.count >= limit) throw new InquiryError('Too many inquiries. Please try again later.', 429)
    try {
      await sanity.patch(id).ifRevisionId(record._rev).inc({count: 1}).commit()
      return
    } catch (error) {
      if ((error as {statusCode?: number}).statusCode !== 409) throw error
    }
  }
  throw new InquiryError('Please try again in a moment.', 429)
}

function alertNumbers() {
  if (process.env.VERCEL_ENV === 'preview') return []
  const numbers = [process.env.FLUFFYTAIL_ALERT_NUMBER, process.env.FLUFFYTAIL_ALERT_NUMBER_2].map(value => value?.trim() || '').filter(Boolean)
  if (!numbers.length) throw new InquiryError('Inquiries are temporarily unavailable. Please contact us directly.', 503)
  return [...new Set(numbers.map(normalizePhone))]
}

export async function acceptInquiry(input: InquiryInput, ip: string) {
  const sanity = getOperatorClient()
  const puppy = input.puppySlug
    ? await client.fetch<Puppy | null>(puppyQuery, {slug: input.puppySlug}, {perspective: 'published', cache: 'no-store'})
    : null
  if (input.puppySlug && !puppy) throw new InquiryError('This puppy is no longer listed. Please refresh or send a general inquiry.', 409)
  const id = privateRecordId('inquiry', inquiryHash('duplicate', JSON.stringify({...input, day: new Date().toISOString().slice(0, 10)})))
  if (await sanity.getDocument(id)) return {duplicate: true}
  const numbers = alertNumbers()
  if (numbers.length) getTwilio()
  await admit(sanity, `ip:${ip}`, 5, 15 * 60_000)
  await admit(sanity, `email:${input.email}`, 3, 60 * 60_000)

  const receipt = randomUUID()
  const puppyPageUrl = puppy ? `https://www.fluffytailshihtzu.com/puppies/${encodeURIComponent(input.puppySlug)}` : ''
  const record = await sanity.createIfNotExists({
    _id: id, _type: 'puppyInquiry', receipt,
    submittedAt: new Date().toISOString(),
    name: input.name, email: input.email, phone: input.phone,
    preferredContactMethod: input.preferredContactMethod, message: input.message,
    smsConsent: input.smsConsent, consentAt: input.smsConsent ? new Date().toISOString() : undefined,
    consentVersion: 'native-2026-10', interest: input.interest,
    puppyId: puppy?._id, litterId: puppy?.litterId,
    puppy: puppy?.name || '', litter: puppy?.litterTitle || '', puppyPageUrl,
    source: 'fluffytail-native', notificationStatus: numbers.length ? 'pending' : 'preview',
  })
  if (record.receipt !== receipt) return {duplicate: true}

  const body = [
    'New puppy inquiry', puppy ? `Puppy: ${puppy.name}` : '',
    puppy?.litterTitle ? `Litter: ${puppy.litterTitle}` : '',
    `Name: ${input.name}`, `Email: ${input.email}`, input.phone ? `Phone: ${input.phone}` : '',
    `Prefers: ${input.preferredContactMethod}`, `Message: ${input.message.slice(0, 300)}`,
    'Inbox: https://www.fluffytailshihtzu.com/inbox',
  ].filter(Boolean).join('\n')
  let failed = false
  for (const to of numbers) {
    const alertId = privateRecordId('alert', `${id}:${to}`)
    try {
      // Claim before sending. An ambiguous provider result requires operator review, not an automatic resend.
      const claim = await sanity.createIfNotExists({
        _id: alertId, _type: 'smsMessage', receipt, direction: 'outbound',
        source: 'fluffytail-alert', to, status: 'sending', receivedAt: new Date().toISOString(),
      })
      if (claim.receipt !== receipt) continue
      const sent = await getTwilio().messages.create({from: process.env.TWILIO_FROM_NUMBER!, to, body})
      await sanity.patch(alertId).set({messageSid: sent.sid, from: process.env.TWILIO_FROM_NUMBER!, body, status: 'sent'}).commit()
    } catch {
      failed = true
      try { await sanity.patch(alertId).set({status: 'needs-review'}).commit() } catch { /* The saved inquiry remains available in the Inbox. */ }
    }
  }
  try {
    await sanity.patch(id).set({notificationStatus: failed ? 'needs-review' : numbers.length ? 'sent' : 'preview'}).commit()
  } catch { /* Do not tell a customer to resubmit an inquiry that was already saved. */ }
  return {duplicate: false}
}
