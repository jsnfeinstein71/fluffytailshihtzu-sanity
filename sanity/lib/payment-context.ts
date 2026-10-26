import {NextResponse} from 'next/server'
import {getPricing, getBalance, PricingError} from '@/lib/pricing'
import {getOperatorClient} from './operator-client'

export class PaymentError extends Error {
  constructor(message: string, public status = 400) {super(message)}
}

export const paymentPuppyQuery = `*[_type == "puppy" && slug.current == $slug && !(_id in path("drafts.**")) && !(_id in path("versions.**"))][0...2]{
  _id, _rev, name, status, isVisible, overridePrice,
  "slug": slug.current, "litterId": litter->_id, "litterTitle": litter->title,
  "litterStatus": litter->status, "litterVisible": litter->isVisible,
  "litterPrice": litter->price, "litterDeposit": litter->deposit
}`

export const paidRecordsQuery = `*[_type == "paymentRecord" && puppySlug == $slug && paymentStatus == "paid"]{amountPaid, paymentStatus, paymentType, createdAt}`

type PaymentPuppy = {
  _id: string; _rev: string; name: string; slug: string; status: string; isVisible?: boolean
  litterId: string; litterTitle: string; litterStatus: string; litterVisible?: boolean
  overridePrice?: number | null; litterPrice?: number | null; litterDeposit?: number | null
}

export async function getPaymentContext(slug: string) {
  if (!slug) throw new PaymentError('Puppy slug is required.')
  const sanity = getOperatorClient()
  const matches = await sanity.fetch<PaymentPuppy[]>(paymentPuppyQuery, {slug}, {cache: 'no-store'})
  if (matches.length !== 1) throw new PaymentError('A unique published puppy could not be found.', 409)
  const puppy = matches[0]
  if (!puppy._id || !puppy.name || !puppy.litterId || !puppy.litterTitle || /^(drafts|versions)\./.test(puppy.litterId)) throw new PaymentError('Puppy or litter information is incomplete.', 409)
  const pricing = getPricing(puppy)
  const records = await sanity.fetch<{amountPaid: number; paymentStatus: string; paymentType?: string; createdAt?: string}[]>(paidRecordsQuery, {slug}, {cache: 'no-store'})
  return {sanity, puppy, pricing, records, balance: getBalance(pricing.totalCents, records)}
}

export function paymentMetadata(context: Awaited<ReturnType<typeof getPaymentContext>>) {
  const {puppy, pricing} = context
  return {
    pricingVersion: '1', puppyId: puppy._id, puppySlug: puppy.slug, puppyName: puppy.name,
    litterId: puppy.litterId, litterTitle: puppy.litterTitle,
    totalPriceCents: String(pricing.totalCents), depositCents: String(pricing.depositCents),
  }
}

export function paymentFailure(error: unknown) {
  const status = error instanceof PaymentError ? error.status : error instanceof PricingError ? 422 : 500
  const message = status === 500 ? 'Payment service is unavailable. Please contact FluffyTail.' : (error as Error).message
  return NextResponse.json({error: message}, {status, headers: {'Cache-Control': 'no-store'}})
}

export function paymentBaseUrl(req: Request) {
  // Preview links must stay on the preview host, even if production SITE_URL is inherited.
  return process.env.VERCEL_ENV === 'preview' ? new URL(req.url).origin : process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fluffytailshihtzu.com'
}
