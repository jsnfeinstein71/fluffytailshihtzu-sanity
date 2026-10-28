import {inquiryFailure,savedInquiryMessage} from '@/lib/public-copy'
import {NextRequest, NextResponse} from 'next/server'
import {InquiryError, validateInquiry} from '@/lib/inquiry'
import {inquiryCookie, issueInquiryToken, requireInquiryOrigin, verifyInquiryToken} from '@/lib/inquiry-security'
import {readRequestText} from '@/lib/request-body'
import {acceptInquiry} from '@/sanity/lib/inquiry-service'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'

export const runtime = 'nodejs'
const headers = {'Cache-Control': 'no-store', Vary: 'Cookie'}

function failure(error: unknown) {
  return NextResponse.json({error: error instanceof InquiryError ? error.message : inquiryFailure},
    {status: error instanceof InquiryError ? error.status : 503, headers})
}

export async function GET(req: NextRequest) {
  try {
    if (req.headers.get('sec-fetch-site') === 'cross-site') throw new InquiryError('Please open the form on our website.', 403)
    let token = req.cookies.get(inquiryCookie)?.value || ''
    try { verifyInquiryToken(token, token, Date.now(), 0) }
    catch { token = issueInquiryToken() }
    const response = NextResponse.json({token}, {headers})
    response.cookies.set(inquiryCookie, token, {
      httpOnly: true, sameSite: 'strict', secure: new URL(req.url).protocol === 'https:', path: '/api/inquiry', maxAge: 1800,
    })
    return response
  } catch (error) { return failure(error) }
}

export async function POST(req: NextRequest) {
  const frozen = operationalWriteFreeze()
  if (frozen) return frozen
  try {
    requireInquiryOrigin(req)
    if (!req.headers.get('content-type')?.startsWith('application/json')) throw new InquiryError('JSON is required.', 415)
    verifyInquiryToken(req.headers.get('x-inquiry-token') || '', req.cookies.get(inquiryCookie)?.value || '')
    let body
    try { body = JSON.parse(await readRequestText(req, 8192)) }
    catch (error) { throw error instanceof InquiryError ? error : new InquiryError('Invalid request body.') }
    if (typeof body?.website !== 'string' || body.website !== '') throw new InquiryError('Unable to accept this submission.', 403)
    const input = validateInquiry(body)
    const ip = process.env.VERCEL ? req.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() : 'local'
    if (!ip) throw new InquiryError('Unable to verify this request. Please try again later.', 503)
    const result = await acceptInquiry(input, ip)
    return NextResponse.json({ok: true, duplicate: result.duplicate, message: savedInquiryMessage(input.preferredContactMethod)+(process.env.VERCEL_ENV === 'preview'?' Preview inquiry saved. No messages were sent.':'')}, {status: result.duplicate ? 200 : 201, headers})
  } catch (error) { return failure(error) }
}
