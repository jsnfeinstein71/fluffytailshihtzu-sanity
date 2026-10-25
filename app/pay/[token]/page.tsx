import {redirect, notFound} from 'next/navigation'
import {getOperatorClient} from '@/sanity/lib/operator-client'
import {getPaymentContext} from '@/sanity/lib/payment-context'

export const revalidate = 0
export const metadata = {robots: {index: false, follow: false}}

type DepositLink = {
  stripeCheckoutUrl?: string; active?: boolean; expiresAt?: string; puppySlug?: string
  puppyId?: string; litterId?: string; checkoutMetadata?: Record<string, string>
}

export default async function DepositRedirectPage({params}: {params: Promise<{token: string}>}) {
  const {token} = await params
  if (!/^[a-f0-9]{48}$/.test(token)) notFound()
  const link = await getOperatorClient().fetch<DepositLink | null>(
    `*[_type == "depositLink" && token == $paymentToken][0]{stripeCheckoutUrl, active, expiresAt, puppySlug, puppyId, litterId, checkoutMetadata}`,
    {paymentToken: token}, {cache: 'no-store'},
  )
  // Legacy quotes without a verifiable price snapshot must be reissued by the operator.
  if (!link?.active || !link.stripeCheckoutUrl || !link.puppySlug || !link.expiresAt || Date.parse(link.expiresAt) <= Date.now() || !Number.isFinite(Date.parse(link.expiresAt)) || link.checkoutMetadata?.pricingVersion !== '1') notFound()
  let valid = false
  try {
    const {puppy, pricing, balance} = await getPaymentContext(link.puppySlug)
    valid = puppy._id === link.puppyId && puppy.litterId === link.litterId &&
      ['available', 'hold'].includes(puppy.status) && ['current', 'active'].includes(puppy.litterStatus) &&
      puppy.isVisible !== false && puppy.litterVisible !== false && balance.paidCents === 0 &&
      link.checkoutMetadata.totalPriceCents === String(pricing.totalCents) &&
      link.checkoutMetadata.depositCents === String(pricing.depositCents)
    const destination = new URL(link.stripeCheckoutUrl)
    valid = valid && destination.protocol === 'https:' && destination.hostname === 'checkout.stripe.com'
  } catch {valid = false}
  if (!valid) notFound()
  redirect(link.stripeCheckoutUrl)
}
