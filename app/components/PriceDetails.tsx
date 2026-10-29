'use client'

import {useEffect, useId, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {formatCurrency} from '@/lib/inventory'
import {priceDetails, directPurchaseBenefits} from '@/lib/price-details'
import type {PricingInput} from '@/lib/pricing'
import './price-details.css'

const amount = (value: number) => formatCurrency(value / 100, value % 100 !== 0)

type Props = {name: string; pricing: PricingInput; pricingStatus?: string | null; context?: 'puppy' | 'litter'; upcoming?: boolean}

export function PriceDetailsContent({name, pricing, pricingStatus, context = 'puppy', upcoming = false, nameId}: Props & {nameId?: string}) {
  const quote = priceDetails(pricing, pricingStatus)
  return (
      <div className="price-details-content">
        <p id={nameId} className="price-details-name">{name}</p>
        <dl className="price-details-breakdown">
          <div><dt>Deposit</dt><dd>{quote.depositCents !== null ? amount(quote.depositCents) : 'Jeanne will confirm'}</dd><dd className="price-details-explanation">Applied toward the total{upcoming ? ' price of your selected puppy' : ' puppy price'}.</dd></div>
          <div><dt>{context === 'litter' ? 'Balance at this litter price' : 'Remaining balance'}</dt><dd>{quote.remainingCents !== null ? amount(quote.remainingCents) : 'To be confirmed'}</dd><dd className="price-details-explanation">Payable before or at pickup.{context === 'litter' ? ' Jeanne confirms your selected puppy’s price and remaining balance.' : ''}</dd></div>
          <div><dt>{quote.status === 'estimated' ? context === 'litter' ? 'Estimated litter price' : 'Estimated puppy price' : context === 'litter' ? 'Litter price' : 'Total puppy price'}</dt><dd>{quote.totalCents !== null ? amount(quote.totalCents) : 'Not yet established'}</dd></div>
        </dl>
        {quote.status !== 'established' ? <p>{quote.status === 'estimated' ? 'This price is an estimate. Jeanne will confirm the final puppy price and balance; no exact final balance is quoted here.' : 'The final price is not established. Ask Jeanne to confirm pricing before making a deposit; no exact final balance is quoted here.'}</p> : null}
        {upcoming ? <p>The deposit holds a place in the picking order, not a particular puppy. A position does not guarantee a particular sex, color, or litter size.</p> : null}
        <section className="price-details-policy"><h3>About your deposit</h3><p>Your deposit is non-refundable and counts toward your puppy’s total price.</p>{upcoming ? <p>If a suitable puppy is unavailable, Jeanne can transfer your deposit to the next available position in a future litter. She will confirm that position with you; existing reserved positions are kept.</p> : null}</section>
        <section><h3>Included when you buy directly from FluffyTail</h3><ul>{directPurchaseBenefits.map(benefit => <li key={benefit}>{benefit}</li>)}</ul><p>Initial potty-training work is a beginning; puppies still need consistent training at home.</p></section>
      </div>
  )
}

export default function PriceDetails(props: Props) {
  const quote = priceDetails(props.pricing, props.pricingStatus)
  const [open, setOpen] = useState(false), id = useId()
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null), closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open || !dialog.current) return
    const previous = document.body.style.overflow
    const opener = trigger.current
    dialog.current.showModal()
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    return () => {
      document.body.style.overflow = previous
      if (opener?.isConnected) opener.focus({preventScroll:true})
    }
  }, [open])
  return <div className="price-summary">
    <p className="price-summary-amount">{quote.totalCents !== null ? `${quote.status === 'estimated' ? 'Estimated ' : ''}${amount(quote.totalCents)}` : 'Price to be confirmed'}{quote.depositCents !== null ? ` · ${amount(quote.depositCents)} deposit toward the total` : ' · Deposit to be confirmed'}</p>
    <button ref={trigger} type="button" className="price-details-trigger" aria-haspopup="dialog" aria-controls={id} aria-expanded={open} onClick={() => setOpen(true)}>View price &amp; what’s included</button>
    {open ? createPortal(<dialog ref={dialog} id={id} className="price-details-dialog" aria-labelledby={id+'-title'} aria-describedby={id+'-name'} onClose={() => setOpen(false)}>
      <header className="price-details-header"><h2 id={id+'-title'}>Price &amp; what’s included</h2><button ref={closeButton} type="button" className="price-details-close" onClick={() => dialog.current?.close()}>Close</button></header>
      <PriceDetailsContent {...props} nameId={id+'-name'} />
    </dialog>, document.body) : null}
  </div>
}
