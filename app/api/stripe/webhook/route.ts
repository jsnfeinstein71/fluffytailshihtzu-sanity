import {NextRequest, NextResponse} from 'next/server'
import Stripe from 'stripe'
import {stripe} from '@/sanity/lib/stripe'
import {createClient} from '@sanity/client'

export const runtime = 'nodejs'

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2025-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN!,
  useCdn: false,
})

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new NextResponse('Missing signature', {status: 400})
  }

  const payload = await req.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed', err)
    return new NextResponse('Webhook Error', {status: 400})
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    console.log('Stripe checkout.session.completed', {
      id: session.id,
      payment_status: session.payment_status,
      metadata: session.metadata,
    })

    // For now, just confirm the event was received.
    // We will add Sanity updates next.
  }

  return NextResponse.json({received: true})
}
