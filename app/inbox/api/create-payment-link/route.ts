import {NextRequest, NextResponse} from 'next/server'
import {requireOperator} from '@/lib/operator-auth'
import {toCents} from '@/lib/pricing'
import {getStripe} from '@/sanity/lib/stripe'
import {getPaymentContext, paymentMetadata, paymentBaseUrl, paymentFailure, PaymentError} from '@/sanity/lib/payment-context'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const denied = requireOperator(req)
  if (denied) return denied
  try {
    const body = await req.json()
    const context = await getPaymentContext(String(body.puppySlug || '').trim())
    const {puppy, balance} = context
    // The operator may request a partial payment, but it cannot exceed the server-calculated debt.
    const amountCents = toCents(body.amount, 'Requested payment')
    if (amountCents > balance.remainingCents) throw new PaymentError('Requested payment exceeds the outstanding balance.', 409)
    const base = paymentBaseUrl(req)
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment', client_reference_id: puppy._id,
      success_url: `${base}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/puppies/${encodeURIComponent(puppy.slug)}`,
      customer_email: String(body.customerEmail || '').trim() || undefined,
      metadata: {...paymentMetadata(context), paymentType: 'manual-payment', chargedAmountCents: String(amountCents),
        customerName: String(body.customerName || '').trim(), customerEmail: String(body.customerEmail || '').trim(), customerPhone: String(body.customerPhone || '').trim(),
        remainingBalanceCents: String(balance.remainingCents - amountCents),
      },
      line_items: [{quantity: 1, price_data: {currency: 'usd', unit_amount: amountCents, product_data: {name: `${puppy.name} payment`, description: `Payment toward the outstanding balance for ${puppy.name} from ${puppy.litterTitle}.`}}}],
    })
    if (!session.url) throw new Error('Checkout URL unavailable.')
    return NextResponse.json({ok: true, url: session.url, amount: amountCents / 100}, {headers: {'Cache-Control': 'no-store'}})
  } catch (error) {return paymentFailure(error)}
}
