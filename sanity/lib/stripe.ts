import Stripe from 'stripe'
import {paymentTestWorkspaceEnabled,requirePaymentTestConfiguration} from '@/lib/payment-test-mode'

let client: Stripe | undefined

export function getStripe() {
  if(paymentTestWorkspaceEnabled())requirePaymentTestConfiguration()
  const key = paymentTestWorkspaceEnabled()?process.env.FLUFFYTAIL_STRIPE_TEST_SECRET_KEY:process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Stripe is not configured.')
  if (process.env.VERCEL_ENV === 'preview' && !key.startsWith('sk_test_') && !key.startsWith('rk_test_') && !key.startsWith('rkcs_test_')) {
    throw new Error('Preview payments require Stripe test credentials.')
  }
  return client ||= new Stripe(key, {apiVersion: '2025-08-27.basil'})
}
