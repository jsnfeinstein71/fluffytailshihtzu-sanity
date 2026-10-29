import {applyLitterPayment} from '@/sanity/lib/litter-reservations'
import {liveWorkspaceEnabled} from '@/lib/workspace-mode'
import {applyLiveStaffPayment} from '@/sanity/lib/live-payment'
import {ensureLivePaymentConfirmation} from '@/sanity/lib/email-workflow'
import {NextRequest, NextResponse} from 'next/server'
import type Stripe from 'stripe'
import {privateRecordId} from '@/sanity/lib/private-records'
import {getStripe} from '@/sanity/lib/stripe'
import {getOperatorClient} from '@/sanity/lib/operator-client'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'

export const runtime = 'nodejs'

type PuppyReference = {_id: string; _rev: string; status?: string; litterId?: string}
type Metadata = Stripe.Metadata | null

function paidAmount(cents: number | null, currency: string | null) {
  if (currency !== 'usd' || !Number.isSafeInteger(cents) || !cents || cents < 0) throw new Error('Invalid Stripe paid amount.')
  return cents / 100
}

function validateQuote(metadata: Metadata, amountCents: number) {
  if (metadata?.pricingVersion === '1') {
    if (!metadata.puppyId || !metadata.litterId || !metadata.puppySlug || !/^\d+$/.test(metadata.chargedAmountCents || '') || Number(metadata.chargedAmountCents) !== amountCents) {
      throw new Error('Stripe amount or associations do not match the server quote.')
    }
  }
}

async function findPuppy(sanity: ReturnType<typeof getOperatorClient>, metadata: Metadata) {
  const matches = await sanity.fetch<PuppyReference[]>(
    `*[_type == "puppy" && !(_id in path("drafts.**")) && !(_id in path("versions.**")) && slug.current == $slug && (!defined($id) || _id == $id)][0...2]{_id, _rev, status, "litterId": litter->_id}`,
    {slug: metadata?.puppySlug || '', id: metadata?.puppyId || null}, {cache: 'no-store'}
  )
  if (matches.length !== 1 || (metadata?.litterId && matches[0].litterId !== metadata.litterId)) throw new Error('Payment puppy/litter association needs reconciliation.')
  return matches[0]
}

async function recordCheckout(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid' || !['deposit', 'manual-payment'].includes(session.metadata?.paymentType || '') || !session.metadata?.puppySlug) return
  const amountPaid = paidAmount(session.amount_total, session.currency)
  validateQuote(session.metadata, session.amount_total!)
  const sanity = getOperatorClient()
  const existing = await sanity.fetch<{_id: string} | null>(`*[_type == "paymentRecord" && stripeCheckoutSessionId == $sessionId][0]{_id}`, {sessionId: session.id}, {cache: 'no-store'})
  if (existing) return // Preserve historical records, including earlier deposit amounts.
  const puppy = await findPuppy(sanity, session.metadata)
  const recordId = privateRecordId('paymentCheckout', session.id)
  const transaction = sanity.transaction().createIfNotExists({
    _id: recordId, _type: 'paymentRecord', stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : '',
    paymentType: session.metadata.paymentType, amountPaid, paymentStatus: 'paid',
    ...(session.metadata.pricingVersion==='1'?{quotedTotalCents:Number(session.metadata.totalPriceCents),quotedDepositCents:Number(session.metadata.depositCents)}:{}),
    ...(session.metadata.staffFamilyId?{staffFamilyId:session.metadata.staffFamilyId}:{}),
    puppyId: puppy._id, litterId: puppy.litterId, puppySlug: session.metadata.puppySlug,
    puppyName: session.metadata.puppyName, litterTitle: session.metadata.litterTitle,
    customerName: session.metadata.customerName, customerEmail: session.metadata.customerEmail, customerPhone: session.metadata.customerPhone,
    createdAt: new Date().toISOString(),
  })
  if (session.metadata.paymentType === 'deposit') {
    // Never move a sold/gone-home puppy backwards when an old event arrives.
    if (['available', 'hold'].includes(puppy.status || '')) transaction.patch(puppy._id, patch => patch.ifRevisionId(puppy._rev).set({status: 'reserved'}))
    if (session.metadata.token) {
      const link = await sanity.fetch<{_id: string} | null>(`*[_type == "depositLink" && token == $paymentToken][0]{_id}`, {paymentToken: session.metadata.token}, {cache: 'no-store'})
      if (link) transaction.patch(link._id, {set: {active: false}})
    }
  }
  await transaction.commit()
}

async function recordInvoice(invoice: Stripe.Invoice) {
  if (!invoice.id || !invoice.metadata?.puppySlug || invoice.amount_paid <= 0) return
  const amountPaid = paidAmount(invoice.amount_paid, invoice.currency)
  validateQuote(invoice.metadata, invoice.amount_paid)
  const sanity = getOperatorClient()
  const existing = await sanity.fetch<{_id: string} | null>(`*[_type == "paymentRecord" && stripeInvoiceId == $invoiceId][0]{_id}`, {invoiceId: invoice.id}, {cache: 'no-store'})
  if (existing) return
  const puppy = await findPuppy(sanity, invoice.metadata)
  const transaction = sanity.transaction().createIfNotExists({
    _id: privateRecordId('paymentInvoice', invoice.id), _type: 'paymentRecord', stripeInvoiceId: invoice.id,
    paymentType: 'invoice', amountPaid, paymentStatus: 'paid', puppyId: puppy._id, litterId: puppy.litterId,
    puppySlug: invoice.metadata.puppySlug, puppyName: invoice.metadata.puppyName,
    customerName: invoice.metadata.customerName, customerEmail: invoice.metadata.customerEmail, customerPhone: invoice.metadata.customerPhone,
    createdAt: new Date().toISOString(),
  })
  const record = await sanity.fetch<{_id: string} | null>(`*[_type == "invoiceRecord" && stripeInvoiceId == $invoiceId][0]{_id}`, {invoiceId: invoice.id}, {cache: 'no-store'})
  if (record) transaction.patch(record._id, {set: {status: invoice.status || 'paid', amountPaid, amountRemaining: invoice.amount_remaining / 100}})
  await transaction.commit()
}

export async function POST(req: NextRequest) {
  const frozen = operationalWriteFreeze()
  if (frozen) return frozen
  if (process.env.VERCEL_ENV === 'preview') return NextResponse.json({error: 'Provider callbacks are disabled in preview.'}, {status: 503})
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new NextResponse('Missing signature', {status: 400})
  if (!process.env.STRIPE_WEBHOOK_SECRET) return new NextResponse('Webhook is not configured', {status: 503})
  let event: Stripe.Event
  try {event = getStripe().webhooks.constructEvent(await req.text(), signature, process.env.STRIPE_WEBHOOK_SECRET)} catch {return new NextResponse('Webhook Error', {status: 400})}
  if(process.env.VERCEL_ENV==='production'&&event.livemode!==true)return new NextResponse('Live events are required', {status:400})
  try {
    const session=event.data.object as Stripe.Checkout.Session
    if(event.type.startsWith('checkout.session.')&&session.metadata?.litterReservationId){const result=await applyLitterPayment(event);if(result&&'confirmationEligible' in result&&result.confirmationEligible)await ensureLivePaymentConfirmation(session.id);return NextResponse.json({received:true})}
    if(event.type.startsWith('checkout.session.')&&session.metadata?.staffPaymentRequestId&&liveWorkspaceEnabled()){
      const result=await applyLiveStaffPayment(event)
      if(result.confirmationEligible)await ensureLivePaymentConfirmation(session.id)
      return NextResponse.json({received:true})
    }
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') await recordCheckout(event.data.object as Stripe.Checkout.Session)
    if (event.type === 'invoice.paid') await recordInvoice(event.data.object as Stripe.Invoice)
    return NextResponse.json({received: true})
  } catch {
    // A retryable error preserves the signed event in Stripe for reconciliation; avoid logging customer payloads.
    console.error('Stripe event requires reconciliation:', event.id)
    return new NextResponse('Payment reconciliation failed', {status: 500})
  }
}
