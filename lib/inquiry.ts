export type ContactMethod = 'Email' | 'Text' | 'Either'
export type InquiryInput = {
  name: string; email: string; phone: string; preferredContactMethod: ContactMethod
  message: string; smsConsent: boolean; puppySlug: string; interest: 'puppy' | 'waitlist' | 'general'
}

export class InquiryError extends Error {
  constructor(message: string, public status = 400) {super(message)}
}

export function normalizePhone(value: string) {
  if (!value.trim()) return ''
  const digits = value.trim().replace(/[\s().-]/g, '')
  if (digits.startsWith('+')) {
    if (/^\+[1-9]\d{7,14}$/.test(digits)) return digits
    throw new InquiryError('Enter a valid phone number.')
  }
  if (!/^\d+$/.test(digits)) throw new InquiryError('Enter a valid phone number.')
  if (digits.length === 10) return '+1' + digits
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits
  throw new InquiryError('Enter a valid phone number, including the country code if outside the US.')
}

export function validateInquiry(value: unknown): InquiryInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InquiryError('Invalid inquiry.')
  const body = value as Record<string, unknown>
  function field(name: string, max: number) {
    if (typeof body[name] !== 'string' || (body[name] as string).length > max) throw new InquiryError('Please check your ' + name + '.')
    const text = (body[name] as string).trim()
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw new InquiryError('Invalid characters in ' + name + '.')
    return text
  }
  const name = field('name', 100)
  const email = field('email', 254).toLowerCase()
  const message = field('message', 2000)
  if (name.length < 2 || /[\r\n]/.test(name)) throw new InquiryError('Please enter your name.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InquiryError('Please enter a valid email address.')
  if (message.length < 5) throw new InquiryError('Please enter a short message.')
  const preferredContactMethod = body.preferredContactMethod
  if (!['Text', 'Email', 'Either'].includes(String(preferredContactMethod))) throw new InquiryError('Choose a contact method.')
  const phone = normalizePhone(field('phone', 40))
  if (preferredContactMethod !== 'Email' && (!phone || body.smsConsent !== true)) throw new InquiryError('Text or Either requires a phone number and SMS consent. You can choose Email instead.')
  const puppySlug = typeof body.puppySlug === 'string' ? body.puppySlug.trim() : ''
  if (puppySlug.length > 200 || /[\s/?#\\]/.test(puppySlug)) throw new InquiryError('Invalid puppy selection.')
  const interest = puppySlug ? 'puppy' : body.interest === 'waitlist' ? 'waitlist' : 'general'
  return {name, email, phone, preferredContactMethod: preferredContactMethod as ContactMethod, message,
    smsConsent: preferredContactMethod !== 'Email' && body.smsConsent === true, puppySlug, interest}
}

export function legacyPuppySlug(params: Record<string, string | string[] | undefined>) {
  const first = (value?: string | string[]) => Array.isArray(value) ? value[0] : value
  const slug = first(params.puppySlug)
  if (slug) return slug
  try {
    const url = new URL(first(params.puppyPageUrl) || '')
    const match = /^\/puppies\/([^/]+)\/?$/.exec(url.pathname)
    return match ? decodeURIComponent(match[1]) : ''
  } catch {return ''}
}
