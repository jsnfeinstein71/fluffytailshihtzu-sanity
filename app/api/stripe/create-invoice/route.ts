import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@sanity/client'
import {stripe} from '@/sanity/lib/stripe'

export const runtime = 'nodejs'

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2025-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN!,
  useCdn: false,
})

type PuppyPricing = {
  name?: string
  overridePrice?: number
  litterPrice?: number
}

type PaymentRecord = {
  amountPaid?: number
  paymentStatus?: string
  paymentType?: string
}

const puppyPricingQuery = `*[_type == "puppy" && slug.current == $slug][0]{
  name,
  overridePrice,
  "litterPrice": litter->price
}`

const paidRecordsQuery = `*[
  _type == "paymentRecord" &&
  puppySlug == $slug &&
  paymentStatus == "paid"
] | order(createdAt asc){
  amountPaid,
  paymentStatus,
  paymentType
}`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const puppySlug = String(body.puppySlug || '').trim()
    const customerName = String(body.customerName || '').trim()
    const customerEmail = String(body.customerEmail || '').trim()
    const customerPhone = String(body.customerPhone || '').trim()

    if (!puppySlug || !customerEmail) {
      return NextResponse.json({error: 'Missing invoice info'}, {status: 400})
    }

    const puppy = await sanity.fetch<PuppyPricing | null>(
      puppyPricingQuery as string,
      {slug: puppySlug} as Record<string, string>
    )

    if (!puppy) {
      return NextResponse.json({error: 'Puppy not found'}, {status: 404})
    }

    const puppyName = String(puppy.name || '').trim()
    const totalPrice =
      typeof puppy.overridePrice === 'number'
        ? puppy.overridePrice
        : typeof puppy.litterPrice === 'number'
          ? puppy.litterPrice
          : 0

    if (!puppyName || totalPrice <= 0) {
      return NextResponse.json({error: 'Missing puppy pricing'}, {status: 400})
    }

    const paidRecords = await sanity.fetch<PaymentRecord[]>(
      paidRecordsQuery as string,
      {slug: puppySlug} as Record<string, string>
    )

    const totalPaid = paidRecords.reduce((sum, record) => {
      return sum + (typeof record.amountPaid === 'number' ? record.amountPaid : 0)
    }, 0)

    const amountDue = Math.max(totalPrice - totalPaid, 0)

    if (amountDue <= 0) {
      return NextResponse.json(
        {error: 'This puppy has already been paid in full.'},
        {status: 400}
      )
    }

    const customer = await stripe.customers.create({
      name: customerName || undefined,
      email: customerEmail,
      phone: customerPhone || undefined,
      metadata: {
        puppySlug,
        puppyName,
        customerPhone,
      },
    })

    // Full puppy price
    await stripe.invoiceItems.create({
      customer: customer.id,
      currency: 'usd',
      amount: Math.round(totalPrice * 100),
      description: `${puppyName} total price`,
    })

    // Payments already made (deposit and any later payments)
    if (totalPaid > 0) {
      await stripe.invoiceItems.create({
        customer: customer.id,
        currency: 'usd',
        amount: -Math.round(totalPaid * 100),
        description: `Payments already received`,
      })
    }

    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: 30,
      auto_advance: true,
      pending_invoice_items_behavior: 'include',
      metadata: {
        puppySlug,
        puppyName,
        customerName,
        customerEmail,
        customerPhone,
        paymentType: 'invoice',
        totalPrice: String(totalPrice),
        totalPaid: String(totalPaid),
        amountDue: String(amountDue),
      },
    })

    if (!invoice.id) {
      return NextResponse.json({error: 'Stripe invoice ID missing'}, {status: 500})
    }

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id)

    await sanity.create({
      _type: 'invoiceRecord',
      createdAt: new Date().toISOString(),
      stripeInvoiceId: finalized.id,
      stripeCustomerId: customer.id,
      hostedInvoiceUrl: finalized.hosted_invoice_url || '',
      status: finalized.status || '',
      puppySlug,
      puppyName,
      customerName,
      customerEmail,
      customerPhone,
      amountDue: (finalized.amount_due || 0) / 100,
      amountPaid: (finalized.amount_paid || 0) / 100,
      amountRemaining: (finalized.amount_remaining || 0) / 100,
    })

    return NextResponse.json({
      ok: true,
      url: finalized.hosted_invoice_url,
      totalPrice,
      totalPaid,
      amountDue,
    })
  } catch (error) {
    console.error('Failed to create invoice', error)
    return NextResponse.json({error: 'Failed to create invoice'}, {status: 500})
  }
}
