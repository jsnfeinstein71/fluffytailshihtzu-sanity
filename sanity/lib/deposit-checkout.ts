import {createHash,randomBytes} from 'node:crypto'
import {privateRecordId} from './private-records'
import {getStripe} from './stripe'
import {getPaymentContext,paymentMetadata,PaymentError} from './payment-context'
type DepositLink = {
  _id: string; _rev?: string; token: string; active: boolean; expiresAt: string
  customerName: string; customerEmail: string; customerPhone: string
  checkoutMetadata: Record<string, string>; stripeCheckoutUrl?: string
}

export async function createDepositCheckout(context:Awaited<ReturnType<typeof getPaymentContext>>,body:{customerName?:string;customerEmail?:string;customerPhone?:string},base:string,scope:Record<string,string>={}){
    const stripe = getStripe()
    const {sanity, puppy, pricing, balance} = context
    if (!['available', 'hold'].includes(puppy.status) || !['current', 'active'].includes(puppy.litterStatus) || puppy.isVisible === false || puppy.litterVisible === false || balance.paidCents > 0) {
      throw new PaymentError('This puppy is not eligible for a new deposit.', 409)
    }

    const customerName = String(body.customerName || '').trim()
    const customerEmail = String(body.customerEmail || '').trim()
    const customerPhone = String(body.customerPhone || '').trim()
    if (!customerEmail && !customerPhone) throw new PaymentError('Customer email or phone is required.')
    const token = randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const metadata = {...paymentMetadata(context),...scope, customerName, customerEmail, customerPhone, token, paymentType: 'deposit', chargedAmountCents: String(pricing.depositCents)}
    const legacyId = `deposit-active-${createHash('sha256').update(puppy._id).digest('hex')}`
    const legacy = await sanity.getDocument<DepositLink>(legacyId)
    if (legacy?.active && (!Number.isFinite(Date.parse(legacy.expiresAt)) || Date.parse(legacy.expiresAt) > Date.now())) {
      throw new PaymentError('An earlier deposit claim exists. Reconcile or expire its Stripe checkout before creating a private replacement.', 409)
    }
    const linkId = privateRecordId('deposit', puppy._id)
    // One active deposit link per puppy; Sanity's conditional revision prevents competing claims.
    let link = await sanity.createIfNotExists<DepositLink>({
      _id: linkId, _type: 'depositLink', token, active: true, expiresAt,
      puppySlug: puppy.slug, puppyName: puppy.name, puppyId: puppy._id, litterId: puppy.litterId,
      customerName, customerEmail, customerPhone, checkoutMetadata: metadata, createdAt: new Date().toISOString(),
    })
    if (link.token !== token) {
      if (link.active && Date.parse(link.expiresAt) > Date.now()) {
        if (link.customerEmail !== customerEmail || link.customerPhone !== customerPhone || link.checkoutMetadata.totalPriceCents !== metadata.totalPriceCents || link.checkoutMetadata.depositCents !== metadata.depositCents || link.checkoutMetadata.puppyId !== metadata.puppyId || link.checkoutMetadata.litterId !== metadata.litterId) {
          throw new PaymentError('A deposit checkout already exists for this puppy. Wait for it to expire before issuing a different quote.', 409)
        }
      } else {
        if (!link._rev) throw new PaymentError('Deposit link revision is unavailable.', 409)
        link = await sanity.patch(linkId).ifRevisionId(link._rev).set({
          token, active: true, expiresAt, customerName, customerEmail, customerPhone,
          puppySlug: puppy.slug, puppyName: puppy.name, puppyId: puppy._id, litterId: puppy.litterId,
          checkoutMetadata: metadata, createdAt: new Date().toISOString(),
        }).unset(['stripeCheckoutUrl', 'stripeCheckoutSessionId']).commit<DepositLink>()
      }
    }

    if (!link.stripeCheckoutUrl) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment', currency: 'usd', client_reference_id: puppy._id,
        success_url: `${base}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/puppies/${encodeURIComponent(puppy.slug)}`,
        customer_email: link.customerEmail || undefined,
        expires_at: Math.floor(Date.parse(link.expiresAt) / 1000),
        metadata: link.checkoutMetadata,
        line_items: [{quantity: 1, price_data: {currency: 'usd', unit_amount: pricing.depositCents, product_data: {
          name: link.checkoutMetadata.puppyName + ' deposit',
          description: 'Deposit toward ' + link.checkoutMetadata.puppyName + ' from ' + link.checkoutMetadata.litterTitle + '; applied to the total puppy price.',
        }}}],
      }, {idempotencyKey: link.token})
      if (!session.url) throw new Error('Checkout URL unavailable.')
      await sanity.patch(linkId).set({stripeCheckoutUrl: session.url, stripeCheckoutSessionId: session.id}).commit()
      link.stripeCheckoutUrl = session.url
    }

    const shortUrl = `${base}/pay/${link.token}`
    return {url:shortUrl,shortUrl,stripeUrl:link.stripeCheckoutUrl,sessionId:(await sanity.getDocument<{stripeCheckoutSessionId?:string}>(linkId))?.stripeCheckoutSessionId,totalPrice:pricing.totalCents/100,deposit:pricing.depositCents/100,remainingBalance:pricing.remainingCents/100}
}
