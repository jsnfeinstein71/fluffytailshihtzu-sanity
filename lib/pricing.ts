export class PricingError extends Error {}

export function toCents(value: unknown, label = 'Amount', allowZero = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new PricingError(`${label} is missing or invalid.`)
  const cents = Math.round(value * 100)
  if (!Number.isSafeInteger(cents) || Math.abs(value * 100 - cents) > 0.000001 || (allowZero ? cents < 0 : cents <= 0)) {
    throw new PricingError(`${label} must be a valid dollar amount with at most two decimal places.`)
  }
  return cents
}

export type PricingInput = {overridePrice?: unknown; litterPrice?: unknown; litterDeposit?: unknown}

export function getPricing(input: PricingInput) {
  const totalCents = toCents(input.overridePrice ?? input.litterPrice, 'Puppy price')
  const depositCents = toCents(input.litterDeposit, 'Litter deposit')
  if (depositCents > totalCents) throw new PricingError('Deposit exceeds the total puppy price.')
  return {totalCents, depositCents, remainingCents: totalCents - depositCents}
}

export function getBalance(totalCents: number, records: {amountPaid?: unknown; paymentStatus?: string | null}[]) {
  const paidCents = records.filter(record => record.paymentStatus === 'paid').reduce((sum, record) => sum + toCents(record.amountPaid, 'Recorded payment'), 0)
  if (!Number.isSafeInteger(paidCents) || paidCents > totalCents) throw new PricingError('Recorded payments exceed the puppy price; reconcile the payment history first.')
  return {paidCents, remainingCents: totalCents - paidCents}
}

export function tryPricing(input: PricingInput) {
  try {return getPricing(input)} catch {return null}
}
