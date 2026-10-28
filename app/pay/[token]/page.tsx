import {paymentCopy} from '@/lib/public-copy'
import {liveWorkspaceEnabled} from '@/lib/workspace-mode'
import {customerLivePayment} from '@/sanity/lib/customer-live-payment'
import {paymentTestWorkspaceEnabled} from '@/lib/payment-test-mode'
import {customerTestPayment} from '@/sanity/lib/customer-test-payment'
import CustomerTestPayment from '../CustomerTestPayment'
import '@/app/inbox/workspace/workspace.css'
import {redirect, notFound} from 'next/navigation'
import {getOperatorClient} from '@/sanity/lib/operator-client'
import {getPaymentContext} from '@/sanity/lib/payment-context'

export const revalidate = 0
export const metadata = {title:'Payment with Jeanne',robots: {index: false, follow: false},referrer:'no-referrer' as const}

type DepositLink = {
  stripeCheckoutUrl?: string; active?: boolean; expiresAt?: string; puppySlug?: string
  puppyId?: string; litterId?: string; checkoutMetadata?: Record<string, string>
}

export default async function DepositRedirectPage({params,searchParams}: {params: Promise<{token: string}>;searchParams?:Promise<{result?:string}>}) {
  const {token} = await params
  if(paymentTestWorkspaceEnabled()){let initial=null,error='';try{initial=await customerTestPayment(token)}catch{error=paymentCopy.unavailable}return <CustomerTestPayment token={token} initial={initial} error={error} canceled={(await searchParams)?.result==='canceled'}/>}

  if(liveWorkspaceEnabled()){
    let initial=null,error=''
    try{initial=await customerLivePayment(token)}catch{
      // Preserve old unscoped deposits without changing an already-issued link.
      const link=await getOperatorClient().fetch<DepositLink|null>('*[_type == \"depositLink\" && token == $paymentToken][0]{checkoutMetadata}',{paymentToken:token},{cache:'no-store'})
      if(link&&!link.checkoutMetadata?.staffPaymentRequestId){const destination=await legacyDepositDestination(token);if(destination)redirect(destination)}
      error=paymentCopy.unavailable
    }
    return <CustomerTestPayment token={token} initial={initial} error={error} canceled={(await searchParams)?.result==='canceled'} testOnly={false}/>
  }
  const destination=await legacyDepositDestination(token)
  if(!destination)notFound()
  redirect(destination)
}

async function legacyDepositDestination(token:string){
  if (!/^[a-f0-9]{48}$/.test(token)) return null
  const link = await getOperatorClient().fetch<DepositLink | null>(
    `*[_type == "depositLink" && token == $paymentToken][0]{stripeCheckoutUrl, active, expiresAt, puppySlug, puppyId, litterId, checkoutMetadata}`,
    {paymentToken: token}, {cache: 'no-store'},
  )
  // Legacy quotes without a verifiable price snapshot must be reissued by the operator.
  if (!link?.active || !link.stripeCheckoutUrl || !link.puppySlug || !link.expiresAt || Date.parse(link.expiresAt) <= Date.now() || !Number.isFinite(Date.parse(link.expiresAt)) || link.checkoutMetadata?.pricingVersion !== '1') return null
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
  if (!valid) return null
  return link.stripeCheckoutUrl
}
