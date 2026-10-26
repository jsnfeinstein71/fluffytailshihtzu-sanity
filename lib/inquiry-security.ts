import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto'
import {InquiryError} from './inquiry'

export const inquiryCookie = 'fluffytail-inquiry'
const lifetime = 30 * 60 * 1000

function signature(value: string) {
  const secret = process.env.INQUIRY_FORM_SECRET
  if (!secret || secret.length < 32) throw new InquiryError('The inquiry form is temporarily unavailable. Please try again later.', 503)
  return createHmac('sha256', secret).update(value).digest('hex')
}

export function inquiryHash(scope: string, value: string) {return signature(scope + ':' + value)}

export function issueInquiryToken(now = Date.now()) {
  const payload = now + '.' + randomBytes(24).toString('hex')
  return payload + '.' + signature(payload)
}

export function verifyInquiryToken(token: string, cookie: string, now = Date.now(), minimumAge = 2000) {
  if (token.length > 160 || !/^\d{13}\.[a-f0-9]{48}\.[a-f0-9]{64}$/.test(token) || cookie !== token) throw new InquiryError('Please reload the form and try again.', 403)
  const [issued, nonce, mac] = token.split('.')
  if (!timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(signature(issued + '.' + nonce), 'hex'))) throw new InquiryError('Please reload the form and try again.', 403)
  const age = now - Number(issued)
  if (age > lifetime || age < 0) throw new InquiryError('Your form has expired. Please reload and try again.', 403)
  if (age < minimumAge) throw new InquiryError('Please take a moment to complete your inquiry, then try again.', 429)
}

export function requireInquiryOrigin(req: Request) {
  const origin = req.headers.get('origin')
  if (origin !== new URL(req.url).origin || req.headers.get('sec-fetch-site') === 'cross-site') throw new InquiryError('This request is not allowed.', 403)
}
