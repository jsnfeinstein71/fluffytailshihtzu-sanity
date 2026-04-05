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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const puppyName = String(body.puppyName || '').trim()
    const puppySlug = String(body.puppySlug || '').trim()
    const customerName = String(body.customerName || '').trim()
    const customerEmail = String(body.customerEmail || '').trim()
    const customerPhone = String(body.customerPhone || '').trim()
    const amountDue = Number(body.amountDue || 0)

    if (!puppyName || !puppySlug || !customerEmail || amountDue <= 0) {
      return NextResponse.json({error: 'Missing invoice info'}, {status: 400})
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

    await stripe.invoiceItems.create({
      customer: customer.id,
      currency: 'usd',
      amount: Math.round(amountDue * 100),
      description: `Final balance for ${puppyName}`,
    })

    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: 30,
      auto_advance: true,
      metadata: {
        puppySlug,
        puppyName,
        customerName,
        customerEmail,
        customerPhone,
        paymentType: 'invoice',
      },
    })

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
    })
  } catch (error) {
    console.error('Failed to create invoice', error)
    return NextResponse.json({error: 'Failed to create invoice'}, {status: 500})
  }
}
