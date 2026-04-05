import {NextRequest, NextResponse} from 'next/server'
import {stripe} from '@/sanity/lib/stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const puppyName = String(body.puppyName || '').trim()
    const puppySlug = String(body.puppySlug || '').trim()
    const litterTitle = String(body.litterTitle || '').trim()
    const customerName = String(body.customerName || '').trim()
    const customerEmail = String(body.customerEmail || '').trim()
    const customerPhone = String(body.customerPhone || '').trim()

    if (!puppyName || !puppySlug) {
      return NextResponse.json({error: 'Missing puppy info'}, {status: 400})
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fluffytailshihtzu.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/puppies/${encodeURIComponent(puppySlug)}`,
      client_reference_id: puppySlug,
      customer_email: customerEmail || undefined,
      metadata: {
        puppySlug,
        puppyName,
        litterTitle,
        customerName,
        customerEmail,
        customerPhone,
        paymentType: 'deposit',
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${puppyName} deposit`,
              description: litterTitle
                ? `Deposit for ${puppyName} from ${litterTitle}`
                : `Deposit for ${puppyName}`,
            },
            unit_amount: 30000,
          },
        },
      ],
    })

    return NextResponse.json({url: session.url})
  } catch (error) {
    console.error('Failed to create Stripe session', error)
    return NextResponse.json(
      {error: 'Failed to create Stripe session'},
      {status: 500}
    )
  }
}
