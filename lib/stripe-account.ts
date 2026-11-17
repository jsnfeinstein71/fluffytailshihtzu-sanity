// Account IDs are public identifiers. Keys and signing secrets never belong here.
export const previousFluffyTailStripeAccount = 'acct_1TItmjCbX8jC3xHn'
const accountId = /^acct_[A-Za-z0-9]+$/

export function stripeAccountMigrationEnabled() {
  return process.env.VERCEL_ENV === 'production' && process.env.FLUFFYTAIL_STRIPE_ACCOUNT_MIGRATION === '1'
}

// Stage the new merchant's credentials without changing a running legacy release.
// The single cutover flag selects both credentials; neither falls back afterward.
export function stripeServerSecretKey() {
  return stripeAccountMigrationEnabled() ? process.env.FLUFFYTAIL_JEANNE_STRIPE_SECRET_KEY : process.env.STRIPE_SECRET_KEY
}

export function stripeWebhookSigningSecret() {
  return stripeAccountMigrationEnabled() ? process.env.FLUFFYTAIL_JEANNE_STRIPE_WEBHOOK_SECRET : process.env.STRIPE_WEBHOOK_SECRET
}

export function configuredStripeAccountId(): string | undefined {
  // An inherited live account pin must never change an isolated Preview.
  if (process.env.VERCEL_ENV === 'preview' || process.env.FLUFFYTAIL_PAYMENT_TEST_WORKSPACE === '1') {
    const testId = process.env.FLUFFYTAIL_STRIPE_TEST_ACCOUNT_ID
    if (testId && !accountId.test(testId)) throw new Error('Stripe test account configuration is invalid.')
    return testId || undefined
  }
  if (!stripeAccountMigrationEnabled()) return undefined
  const id = process.env.STRIPE_ACCOUNT_ID
  if (!id || !accountId.test(id) || id === previousFluffyTailStripeAccount || process.env.STRIPE_LEGACY_LINKS_CLOSED !== '1') {
    throw new Error('The new Stripe account and closure of previous payment links must be verified before cutover.')
  }
  return id
}

export function stripeAccountMetadata(): Record<string,string> {
  const id = configuredStripeAccountId()
  return id ? {stripeAccountId: id} : {}
}

export function retiredStripeRequest(record: {stripeAccountId?: string;testOnly?: boolean;workspace?: string}) {
  return stripeAccountMigrationEnabled() && record.testOnly !== true && record.workspace !== 'review-v1' && record.stripeAccountId !== configuredStripeAccountId()
}

export function requireCurrentStripeAccount(record: {stripeAccountId?: string;testOnly?: boolean;workspace?: string}) {
  if (retiredStripeRequest(record)) throw new Error('This request belongs to the previous payment account and cannot be paid or sent again. Its history and your draft are kept. Contact Jeanne for a replacement.')
}

export function requireStripeMetadataAccount(metadata: {stripeAccountId?: string} | null | undefined) {
  const id = configuredStripeAccountId()
  if (id && metadata?.stripeAccountId !== id) throw new Error('The Stripe object belongs to a different payment account and requires review.')
}
