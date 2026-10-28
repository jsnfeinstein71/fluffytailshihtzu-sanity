import {NextRequest, NextResponse} from 'next/server'
import {requireOperator} from '@/lib/operator-auth'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'
import {privateRecordId} from '@/sanity/lib/private-records'
import {toCents} from '@/lib/pricing'
import {getStripe} from '@/sanity/lib/stripe'
import {getPaymentContext, paymentMetadata, paymentFailure, PaymentError} from '@/sanity/lib/payment-context'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const denied = await requireOperator(req)
  if (denied) return denied
  const frozen = operationalWriteFreeze()
  if (frozen) return frozen
  try {
    const body = await req.json()
    const customerEmail = String(body.customerEmail || '').trim()
    if (!customerEmail) throw new PaymentError('Customer email is required.')
    const context = await getPaymentContext(String(body.puppySlug || '').trim())
    const {sanity, puppy, pricing, balance, records} = context
    if (!balance.remainingCents) throw new PaymentError('This puppy has already been paid in full.', 409)
    const metadata = {...paymentMetadata(context), paymentType: 'invoice', customerEmail,
      customerName: String(body.customerName || '').trim(), customerPhone: String(body.customerPhone || '').trim(),
      chargedAmountCents: String(balance.remainingCents),
    }
    const stripe = getStripe()
    const customer = await stripe.customers.create({name: metadata.customerName || undefined, email: customerEmail, phone: metadata.customerPhone || undefined, metadata})
    await stripe.invoiceItems.create({customer: customer.id, currency: 'usd', amount: pricing.totalCents, description: `${puppy.name} total price - ${puppy.litterTitle}`})
    for (const record of records) {
      await stripe.invoiceItems.create({customer: customer.id, currency: 'usd', amount: -toCents(record.amountPaid, 'Recorded payment'), description: record.paymentType === 'deposit' ? 'Deposit received (applied toward total)' : 'Payment received'})
    }
    const invoice = await stripe.invoices.create({customer: customer.id, collection_method: 'send_invoice', days_until_due: 30, auto_advance: true, pending_invoice_items_behavior: 'include', metadata})
    if (!invoice.id) throw new Error('Invoice ID unavailable.')
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id)
    if (finalized.amount_due !== balance.remainingCents || finalized.currency !== 'usd') throw new Error('Stripe invoice amount does not match the server balance.')
    await sanity.create({_id: privateRecordId('invoice'), _type: 'invoiceRecord', createdAt: new Date().toISOString(), stripeInvoiceId: finalized.id, stripeCustomerId: customer.id,
      hostedInvoiceUrl: finalized.hosted_invoice_url || '', status: finalized.status || '',
      puppySlug: puppy.slug, puppyName: puppy.name, puppyId: puppy._id, litterId: puppy.litterId,
      customerName: metadata.customerName, customerEmail, customerPhone: metadata.customerPhone,
      amountDue: finalized.amount_due / 100, amountPaid: finalized.amount_paid / 100, amountRemaining: finalized.amount_remaining / 100,
    })
    return NextResponse.json({ok: true, url: finalized.hosted_invoice_url, totalPrice: pricing.totalCents / 100, totalPaid: balance.paidCents / 100, amountDue: balance.remainingCents / 100}, {headers: {'Cache-Control': 'no-store'}})
  } catch (error) {return paymentFailure(error)}
}
