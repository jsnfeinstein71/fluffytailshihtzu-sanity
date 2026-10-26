import '../home.css'
import '../content.css'
import Link from 'next/link'
import {getInventory} from '@/sanity/lib/inventory'
import {formatCurrency, normalizeLitterStatus} from '@/lib/inventory'
import {tryPricing} from '@/lib/pricing'

export const revalidate = 60

export const metadata = {title: 'Pricing & Process', alternates: {canonical: '/pricing'}}

export default async function PricingPage() {
  const {litters, puppies} = await getInventory()
  const offered = litters.filter(litter => ['current', 'planned'].includes(normalizeLitterStatus(litter.status) || ''))
  const quotes = offered.map(litter => tryPricing({litterPrice: litter.price, litterDeposit: litter.deposit}))
  quotes.push(...puppies.filter(puppy => offered.some(litter => litter._id === puppy.litterId)).map(tryPricing))
  const prices = quotes.flatMap(quote => quote ? [quote.totalCents / 100] : [])
  const range = prices.length ? [Math.min(...prices), Math.max(...prices)] : []
  const priceText = range.length ? range[0] === range[1] ? formatCurrency(range[0], true) : range.map(value => formatCurrency(value, true)).join(' to ') : 'Please contact FluffyTail to confirm pricing'
  const deposits = quotes.flatMap(quote => quote ? [quote.depositCents / 100] : [])
  const depositRange = deposits.length ? [Math.min(...deposits), Math.max(...deposits)] : []
  const depositText = depositRange.length ? depositRange[0] === depositRange[1] ? formatCurrency(depositRange[0], true) : depositRange.map(value => formatCurrency(value, true)).join(' to ') : 'Please contact FluffyTail to confirm the deposit'
  return (
    <main className="wrap content-page">
      <header className="content-intro"><p className="eyebrow">From hello to home</p><h1 className="h1">Pricing & Process</h1><p className="lead">We want the process to feel straightforward.</p></header>
      <section className="pricing-overview">
        <div><h2>General pricing</h2><p>Current and upcoming litter pricing: <strong className="pricing-range">{priceText}</strong></p><p>Prices may vary by litter and individual puppy. Currently, no additional taxes or fees are added to the listed puppy price.</p></div>
        <div><h2>Deposit</h2><p>Current and upcoming litter deposits: <strong className="pricing-range">{depositText}</strong></p><p>Deposits are non-refundable. The deposit is applied toward the total puppy price, not added on top. See each puppy page for its exact price and deposit.</p><p>A reserved puppy is not available for a new reservation.</p></div>
      </section>
      <section className="pricing-process">
        <h2>How the process works</h2>
        <ol className="pricing-steps">
          <li><h3>Browse or inquire</h3><p>Start by browsing active litters and puppy pages, then request info if a puppy catches your eye.</p></li>
          <li><h3>Ask questions</h3><p>We encourage families to ask about availability, timing, fit, and next steps before making a decision.</p></li>
          <li><h3>Reserve a puppy</h3><p>When a puppy is selected and the deposit is placed, that puppy will be marked reserved on the site.</p></li>
        </ol>
      </section>
      <section className="content-next">
        <h2>Final payment and pickup</h2>
        <p>The remaining balance can be paid before pickup or at pickup.</p>
        <p>Pickup is usually in Mobile or at the airport. Coordinate the location and time directly with Jeanne.</p>
      </section>
      <section className="content-next">
        <h2>What comes with your puppy</h2>
        <ul className="content-facts">
          <li>A veterinary check, first vaccinations, and deworming</li>
          <li>CKC registration papers and written vaccination and deworming records</li>
          <li>A puppy starter kit with food, treats, toys, and a blanket with mom and littermates’ scent</li>
          <li>Early socialization and initial potty training</li>
        </ul>
      </section>
      <section className="content-next">
        <h2>Ready to take the next step?</h2>
        <p>Browse current puppies, review active litters, or contact us with questions.</p>
        <div className="ctaRow"><Link className="brand-button" href="/available-puppies">Meet our puppies <span aria-hidden="true">&rarr;</span></Link><Link className="text-link" href="/upcoming-litters">Upcoming litters <span aria-hidden="true">&rarr;</span></Link><Link className="text-link" href="/contact">Contact Jeanne <span aria-hidden="true">&rarr;</span></Link></div>
      </section>
    </main>
  )
}

