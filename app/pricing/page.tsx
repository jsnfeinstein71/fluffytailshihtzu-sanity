import '../home.css'
import '../content.css'
import {pageDescriptions} from '@/lib/public-copy'
import Link from 'next/link'
import {getInventory} from '@/sanity/lib/inventory'
import {formatCurrency, normalizeLitterStatus} from '@/lib/inventory'
import {tryPricing} from '@/lib/pricing'

export const revalidate = 60

import {publicPageMetadata} from '@/lib/seo'
export const metadata = publicPageMetadata({
  title: 'Pricing & Process',
  description: pageDescriptions.pricing,
  path: '/pricing',
})

export default async function PricingPage() {
  const {litters, puppies} = await getInventory().catch(()=>({litters:[],puppies:[]}))
  const offered = litters.filter((litter) =>
    ['current', 'planned'].includes(normalizeLitterStatus(litter.status) || ''),
  )
  const quotes = offered.map((litter) =>
    tryPricing({litterPrice: litter.price, litterDeposit: litter.deposit}),
  )
  quotes.push(
    ...puppies
      .filter((puppy) =>
        offered.some((litter) => litter._id === puppy.litterId),
      )
      .map(tryPricing),
  )
  const prices = quotes.flatMap((quote) =>
    quote ? [quote.totalCents / 100] : [],
  )
  const range = prices.length ? [Math.min(...prices), Math.max(...prices)] : []
  const priceText = range.length
    ? range[0] === range[1]
      ? formatCurrency(range[0], true)
      : range.map((value) => formatCurrency(value, true)).join(' to ')
    : 'Please contact FluffyTail to confirm pricing'
  const deposits = quotes.flatMap((quote) =>
    quote ? [quote.depositCents / 100] : [],
  )
  const depositRange = deposits.length
    ? [Math.min(...deposits), Math.max(...deposits)]
    : []
  const depositText = depositRange.length
    ? depositRange[0] === depositRange[1]
      ? formatCurrency(depositRange[0], true)
      : depositRange.map((value) => formatCurrency(value, true)).join(' to ')
    : 'Please contact FluffyTail to confirm the deposit'
  const example =
    quotes[0] &&
    quotes.every(
      (q) =>
        q &&
        q.totalCents === quotes[0]!.totalCents &&
        q.depositCents === quotes[0]!.depositCents,
    )
      ? quotes[0]
      : null
  return (
    <main className="wrap content-page">
      <header className="content-intro">
        <p className="eyebrow">Choosing your puppy</p>
        <h1 className="h1">Pricing &amp; Process</h1>
        <p className="lead">
          Know what your puppy costs, what comes home with them, and what
          happens next.
        </p>
      </header>
      <section className="pricing-overview">
        <div>
          <h2>Your puppy’s price</h2>
          <p>
            Current and upcoming litters:{' '}
            <strong className="pricing-range">{priceText}</strong>
          </p>
          <p className="">
            {
              'Each puppy’s profile shows the exact price. Under current direct-sale pricing, no additional taxes or fees are added to the advertised puppy price.'
            }
          </p>
        </div>
        <div>
          <h2>Your deposit</h2>
          <p>
            Deposit: <strong className="pricing-range">{depositText}</strong>
          </p>
          <p className="">
            {
              'Your deposit counts toward your puppy’s total price. It is not an extra charge. Jeanne will confirm the puppy and next steps with you before you pay.'
            }
          </p>
          {example ? (
            <p className="pricing-example">
              {formatCurrency(example.totalCents / 100, true)} total −{' '}
              {formatCurrency(example.depositCents / 100, true)} deposit ={' '}
              {formatCurrency(example.remainingCents / 100, true)} to pay before
              or at pickup.
            </p>
          ) : null}
        </div>
      </section>
      <section className="pricing-process">
        <h2>From your first message to pickup</h2>
        <ol className="pricing-steps">
          <li>
            <h3>{'Find a puppy you’d like to know more about.'}</h3>
            <p className="">
              {
                'Open the puppy’s profile and send Jeanne your questions. You can also get in touch about an upcoming litter.'
              }
            </p>
          </li>
          <li>
            <h3>{'Talk it through with Jeanne.'}</h3>
            <p className="">
              {
                'Ask about the puppy, your timing, and getting ready at home. Jeanne can explain the deposit and arrange a payment request when you’re ready to proceed.'
              }
            </p>
          </li>
          <li>
            <h3>{'Reserve your puppy and plan pickup.'}</h3>
            <p className="">
              {
                'Once your deposit is confirmed, Jeanne can confirm the reservation with you. A message or payment request alone does not reserve a puppy.'
              }
            </p>
          </li>
        </ol>
      </section>
      <section className="content-next">
        <h2>Pickup and the remaining balance</h2>
        <p className="">
          {
            'The remaining balance is due before or at pickup. Pickup is normally arranged in Mobile, Alabama, or at the airport. Work out the time and meeting place directly with Jeanne before making travel plans.'
          }
        </p>
      </section>
      <section className="content-next">
        <h2>What comes home with your puppy</h2>
        <ul className="content-facts">
          <li>{'A veterinary check, initial vaccinations, and deworming.'}</li>
          <li>{'CKC registration papers.'}</li>
          <li>
            {'Written vaccination and deworming records for your veterinarian.'}
          </li>
          <li>
            {
              'A starter kit with food, treats, toys, and a blanket with mom and littermates’ scent.'
            }
          </li>
          <li>
            {
              'Early socialization and the beginnings of potty training, ready for you to continue at home.'
            }
          </li>
        </ul>
        <p className="">
          {
            'Your puppy is still learning. Plan for a patient routine and accidents as they settle in.'
          }
        </p>
      </section>
      <section className="content-next">
        <h2>Something you’d like to ask first?</h2>
        <p className="">
          {
            'Send Jeanne a message. You can talk through the details before deciding on a puppy.'
          }
        </p>
        <div className="ctaRow">
          <Link className="brand-button" href="/available-puppies">
            Meet our puppies
          </Link>
          <Link className="text-link" href="/contact">
            Ask Jeanne a question
          </Link>
        </div>
      </section>
    </main>
  )
}
