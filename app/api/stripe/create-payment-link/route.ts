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
}

const puppyQuery = `*[_type == "puppy" && slug.current == $slug][0]{
  name
}`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const puppySlug = String(body.puppySlug || '').trim()
    const customerName = String(body.customerName || '').trim()
    const customerEmail = String(body.customerEmail || '').trim()
    const customerPhone = String(body.customerPhone || '').trim()
    const amount = Number(body.amount || 0)

    if (!puppySlug || amount <= 0) {
      return NextResponse.json({error: 'Missing payment info'}, {status: 400})
    }

    const puppy = await sanity.fetch<PuppyPricing | null>(
      puppyQuery as string,
      {slug: puppySlug} as Record<string, string>
    )

    if (!puppy?.name) {
      return NextResponse.json({error: 'Puppy not found'}, {status: 404})
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fluffytailshihtzu.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/puppies/${encodeURIComponent(puppySlug)}`,
      customer_email: customerEmail || undefined,
      metadata: {
        puppySlug,
        puppyName: puppy.name,
        customerName,
        customerEmail,
        customerPhone,
        paymentType: 'manual-payment',
        amountPaid: String(amount),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${puppy.name} payment`,
              description: `Payment toward balance for ${puppy.name}`,
            },
            unit_amount: Math.round(amount * 100),
          },
        },
      ],
    })

    return NextResponse.json({
      ok: true,
      url: session.url,
      amount,
    })
  } catch (error) {
    console.error('Failed to create payment link', error)
    return NextResponse.json({error: 'Failed to create payment link'}, {status: 500})
  }
}
