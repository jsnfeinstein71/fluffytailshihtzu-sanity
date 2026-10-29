import {toCents, type PricingInput} from './pricing'

export type PricingStatus = 'established' | 'estimated' | 'unset'
const cents = (value: unknown) => { try { return toCents(value) } catch { return null } }

/** Presentation only. Checkout, recorded quotes and payment calculations are unchanged. */
export function priceDetails(input: PricingInput, configuredStatus?: string | null) {
  const override = input.overridePrice != null
  let totalCents = cents(override ? input.overridePrice : input.litterPrice)
  let depositCents = cents(input.litterDeposit)
  let status: PricingStatus = configuredStatus === 'estimated' ? 'estimated' : configuredStatus == null || configuredStatus === 'established' ? 'established' : 'unset'
  if (override && totalCents !== null) status = 'established'
  if (status === 'unset') totalCents = null
  if (totalCents !== null && depositCents !== null && depositCents > totalCents) {
    totalCents = null
    depositCents = null
  }
  if (totalCents === null) status = 'unset'
  return {status, totalCents, depositCents, remainingCents: status === 'established' && totalCents !== null && depositCents !== null ? totalCents - depositCents : null}
}

export const directPurchaseBenefits = [
  'Veterinary check.',
  'Initial vaccinations and deworming.',
  'CKC registration papers.',
  'Written vaccination and deworming records.',
  'Starter kit with food, treats, toys, and a scented blanket.',
  'Early socialization and initial potty-training work.',
]
