export const revalidate = 60

import '../home.css'
import './available.css'
import {pageDescriptions} from '@/lib/public-copy'
import Link from 'next/link'
import {getInventory} from '@/sanity/lib/inventory'
import {formatCurrency, formatDate, getLittersByStatus, getPuppiesForLitter, getReadyDate} from '@/lib/inventory'
import {tryPricing} from '@/lib/pricing'
import LitterTile from '../components/LitterTile'
import PuppyCard from '../components/PuppyCard'

import {publicPageMetadata} from '@/lib/seo'
export const metadata = publicPageMetadata({title: 'Available Puppies', description:pageDescriptions.available, path: '/available-puppies'})

export default async function AvailablePuppiesPage() {
  const {litters, puppies} = await getInventory()
  const activeLitters = getLittersByStatus(litters, 'current')
  const pastLitters = getLittersByStatus(litters, 'past')
  const availableCount = puppies.filter(puppy => puppy.status === 'available' && activeLitters.some(litter => litter._id === puppy.litterId)).length

  return (
    <main className="wrap available-page">
      <header className="available-intro">
        <div><p className="eyebrow">Meet our puppies</p>
          <h1 className="h1">Available Puppies</h1>
          <p className="lead">Take a closer look at each puppy’s photos and details. If one catches your eye, Jeanne can tell you more.</p>
        </div>
        {activeLitters.length ? <p className="available-count">
          <span>{activeLitters.length} current litter{activeLitters.length === 1 ? '' : 's'}</span>
          <span>{availableCount} available {availableCount === 1 ? 'puppy' : 'puppies'}</span>
        </p> : null}
      </header>

      <p className="lead">Reserved puppies stay with their litter on this page, so you can still see all the little ones together. Check each puppy’s status before asking about a reservation.</p>
      <p className="sublead">Jeanne will confirm pickup timing with you.</p>
      {activeLitters.map(litter => {
        const members = getPuppiesForLitter(puppies, litter._id)
        const pricing = tryPricing({litterPrice: litter.price, litterDeposit: litter.deposit})
        const born = formatDate(litter.birthDate)
        const ready = getReadyDate(litter.birthDate)
        return <section className="available-litter" key={litter._id} data-litter-id={litter._id}>
          <header className="available-litter-heading">
            <div>
              <h2>{litter.title || 'Current litter'}</h2>
              <ul className="available-litter-facts" aria-label="Litter details">
                <li>{born ? `Born ${born}` : 'Birth date to be confirmed'}</li>
                {ready ? <li>Estimated ready date: {ready}</li> : null}
                <li>{members.length} {members.length === 1 ? 'puppy' : 'puppies'}</li>
              </ul>
              {litter.summary ? <p className="available-litter-summary">{litter.summary}</p> : null}
            </div>
            {pricing ? <div className="available-litter-pricing">
              <dl>
                <div><dt>Litter price</dt><dd>{formatCurrency(pricing.totalCents / 100, pricing.totalCents % 100 !== 0)}</dd></div>
                <div><dt>Deposit toward the total</dt><dd>{formatCurrency(pricing.depositCents / 100, pricing.depositCents % 100 !== 0)}</dd></div>
              </dl>
              <p>See each puppy’s profile for the exact price. The deposit counts toward that total.</p>
            </div> : null}
          </header>
          <div className="puppyGrid">
            {members.length ? members.map(puppy => <PuppyCard key={puppy._id} puppy={puppy} browsing />) : <p className="available-empty-litter">Individual puppy details will appear here when they’re added. You can ask Jeanne about this litter in the meantime.</p>}
          </div>
        </section>
      })}
      {!activeLitters.length ? <section className="available-empty">
        <h2>Looking for our next litter?</h2>
        <p>We don’t have a current litter listed here. See what’s coming up, or tell Jeanne when you hope to bring a puppy home.</p>
        <Link className="text-link" href="/upcoming-litters">See upcoming litters <span aria-hidden="true">&rarr;</span></Link>
      </section> : null}

      {pastLitters.length ? <section className="available-archive" aria-labelledby="past-litters-title">
        <h2 id="past-litters-title">Past litters</h2><p>A look back at our earlier litters. Prices and details below belong to those litters; see current puppies for today’s availability.</p>
        {pastLitters.map(litter => {
          const members = getPuppiesForLitter(puppies, litter._id)
          return <details className="available-past-litter" key={litter._id} data-past-litter-id={litter._id}>
            <summary><span className="available-past-summary"><span>{litter.title || 'Past litter'}</span><span>{members.length} {members.length === 1 ? 'puppy' : 'puppies'}</span></span></summary>
            <div className="available-past-overview"><LitterTile litter={litter} photoSizes="(max-width: 380px) calc(100vw - 42px), 338px" /></div>
            <div className="puppyGrid">{members.map(puppy => <PuppyCard key={puppy._id} puppy={puppy} />)}</div>
          </details>
        })}
      </section> : null}
    </main>
  )
}
