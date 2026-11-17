import 'server-only'
import {configuredStripeAccountId} from '@/lib/stripe-account'
import {getStripe} from './stripe'
import {privateRecordId} from './private-records'

export function depositClaimId(puppyId: string) {
  const account = configuredStripeAccountId()
  return privateRecordId('deposit', account ? account + ':' + puppyId : puppyId)
}

// Verify the account behind the key, rather than trusting its live/test prefix.
// Readiness is rechecked for every new charge path; no fallback account is used.
export async function getVerifiedStripe() {
  const stripe = getStripe(), expected = configuredStripeAccountId()
  if (expected) {
    const account = await stripe.accounts.retrieve()
    if (account.id !== expected) throw new Error('Stripe credentials do not match the configured merchant account.')
    if (process.env.VERCEL_ENV === 'production' && (!account.charges_enabled || !account.payouts_enabled || !account.details_submitted || account.requirements?.disabled_reason || account.requirements?.past_due?.length || account.requirements?.currently_due?.length)) {
      throw new Error('Jeanne’s Stripe account still needs activation or payout verification. No checkout was created.')
    }
  }
  return stripe
}
