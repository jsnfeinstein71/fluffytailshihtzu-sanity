import Link from 'next/link'
import {getStripe} from '@/sanity/lib/stripe'
import {formatCurrency} from '@/lib/inventory'

export const revalidate = 0
export const metadata = {robots: {index: false, follow: false}}

export default async function PaymentSuccessPage({searchParams}: {searchParams: Promise<{session_id?: string}>}) {
  const {session_id: sessionId} = await searchParams || {}
  let amount: number | undefined
  let remaining: number | undefined
  let deposit = false
  if (typeof sessionId === 'string' && /^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId)
      if (session.payment_status === 'paid' && session.currency === 'usd' && session.amount_total && Number.isSafeInteger(session.amount_total) && session.amount_total > 0 && ['deposit', 'manual-payment'].includes(session.metadata?.paymentType || '')) {
        amount = session.amount_total / 100
        deposit = session.metadata?.paymentType === 'deposit'
        const cents = deposit ? Number(session.metadata?.totalPriceCents) - session.amount_total : Number(session.metadata?.remainingBalanceCents)
        if (Number.isSafeInteger(cents) && cents >= 0) remaining = cents / 100
      }
    } catch {
      // A visit to this URL is not proof of payment.
    }
  }
  return (
    <main style={{maxWidth: '720px', margin: '0 auto', padding: '40px 16px'}}>
      <h1 style={{fontSize: '40px', marginBottom: '12px'}}>{amount !== undefined ? deposit ? 'Deposit received' : 'Payment received' : 'Payment confirmation'}</h1>
      <p style={{fontSize: '18px', color: '#5a6472', marginBottom: '20px'}}>
        {amount !== undefined ? <>Thank you. Stripe has confirmed your {deposit ? 'deposit' : 'payment'} of {formatCurrency(amount, true)}.</> : 'We cannot confirm a completed payment from this page. If you just paid, please check your Stripe receipt or contact FluffyTail before trying again.'}
      </p>
      {deposit && amount !== undefined ? <p>Your deposit is applied toward the total puppy price, not added on top.</p> : null}
      {remaining !== undefined ? <p>Remaining balance at checkout: {formatCurrency(remaining, true)}.</p> : null}
      <Link href="/available-puppies" style={{display: 'inline-block', padding: '12px 18px', borderRadius: '999px', background: '#1f6fff', color: '#fff', textDecoration: 'none', fontWeight: 700}}>Back to Available Puppies</Link>
    </main>
  )
}
