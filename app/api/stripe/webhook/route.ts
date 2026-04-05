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

    const token = session.metadata?.token
    const puppySlug = session.metadata?.puppySlug
    const puppyName = session.metadata?.puppyName
    const litterTitle = session.metadata?.litterTitle
    const customerName = session.metadata?.customerName
    const customerEmail = session.metadata?.customerEmail
    const customerPhone = session.metadata?.customerPhone
    const paymentType = session.metadata?.paymentType

    if (paymentType === 'deposit' && puppySlug) {
      const existing = await sanity.fetch<{_id: string} | null>(
        `*[_type == "paymentRecord" && stripeCheckoutSessionId == $sessionId][0]{_id}`,
        {sessionId: session.id}
      )

      if (!existing) {
        await sanity.create({
          _type: 'paymentRecord',
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : '',
          paymentType: 'deposit',
          amountPaid: 300,
          puppySlug,
          puppyName,
          litterTitle,
          customerName,
          customerEmail,
          customerPhone,
          paymentStatus: session.payment_status,
          createdAt: new Date().toISOString(),
        })
      }

      const puppy = await sanity.fetch<{_id: string} | null>(
        `*[_type == "puppy" && slug.current == $slug][0]{_id}`,
        {slug: puppySlug}
      )

      if (puppy?._id) {
        await sanity.patch(puppy._id).set({status: 'reserved'}).commit()
      }

      if (token) {
        const depositLink = await sanity.fetch<{_id: string} | null>(
          `*[_type == "depositLink" && token == $token][0]{_id}`,
          {token}
        )

        if (depositLink?._id) {
          await sanity.patch(depositLink._id).set({active: false}).commit()
        }
      }
    }
  }

  return NextResponse.json({received: true})
}
