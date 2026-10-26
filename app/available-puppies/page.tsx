export const revalidate = 60

import '../home.css'
import './available.css'
import Link from 'next/link'
import {getInventory} from '@/sanity/lib/inventory'
import {formatCurrency, formatDate, getLittersByStatus, getPuppiesForLitter, getReadyDate} from '@/lib/inventory'
import {tryPricing} from '@/lib/pricing'
import LitterTile from '../components/LitterTile'
import PuppyCard from '../components/PuppyCard'

export const metadata = {title: 'Available Puppies', alternates: {canonical: '/available-puppies'}}

export default async function AvailablePuppiesPage() {
  const {litters, puppies} = await getInventory()
  const activeLitters = getLittersByStatus(litters, 'current')
  const pastLitters = getLittersByStatus(litters, 'past')
  const availableCount = puppies.filter(puppy => puppy.status === 'available' && activeLitters.some(litter => litter._id === puppy.litterId)).length

  return (
    <main className="wrap available-page">
      <header className="available-intro">
        <div><p className="eyebrow">Find your little companion</p>
          <h1 className="h1">Available Puppies</h1>
          <p className="lead">Little personalities, raised with love in our Alabama home.</p>
        </div>
        {activeLitters.length ? <p className="available-count">
          <span>{activeLitters.length} active litter{activeLitters.length === 1 ? '' : 's'}</span>
          <span>{availableCount} available {availableCount === 1 ? 'puppy' : 'puppies'}</span>
        </p> : null}
      </header>

      {activeLitters.map(litter => {
        const members = getPuppiesForLitter(puppies, litter._id)
        const pricing = tryPricing({litterPrice: litter.price, litterDeposit: litter.deposit})
        const born = formatDate(litter.birthDate)
        const ready = getReadyDate(litter.birthDate)
        return <section className="available-litter" key={litter._id} data-litter-id={litter._id}>
          <header className="available-litter-heading">
            <div>
              <h2>{litter.title || 'Active litter'}</h2>
              <ul className="available-litter-facts" aria-label="Litter details">
                <li>{born ? `Born ${born}` : 'Birth date to be confirmed'}</li>
                {ready ? <li>Ready from {ready}</li> : null}
                <li>{members.length} {members.length === 1 ? 'puppy' : 'puppies'}</li>
              </ul>
              {litter.summary ? <p className="available-litter-summary">{litter.summary}</p> : null}
            </div>
            {pricing ? <div className="available-litter-pricing">
              <dl>
                <div><dt>Default puppy price</dt><dd>{formatCurrency(pricing.totalCents / 100, pricing.totalCents % 100 !== 0)}</dd></div>
                <div><dt>Deposit</dt><dd>{formatCurrency(pricing.depositCents / 100, pricing.depositCents % 100 !== 0)}</dd></div>
              </dl>
              <p>The deposit is included in the total.</p>
            </div> : null}
          </header>
          <div className="puppyGrid">
            {members.length ? members.map(puppy => <PuppyCard key={puppy._id} puppy={puppy} browsing />) : <p className="available-empty-litter">No puppies listed yet for this litter.</p>}
          </div>
        </section>
      })}
      {!activeLitters.length ? <section className="available-empty">
        <h2>No active litters listed</h2>
        <p>Contact Jeanne about future availability.</p>
        <Link className="text-link" href="/upcoming-litters">Upcoming litters <span aria-hidden="true">&rarr;</span></Link>
      </section> : null}

      {pastLitters.length ? <section className="available-archive" aria-labelledby="past-litters-title">
        <h2 id="past-litters-title">Past litters</h2>
        {pastLitters.map(litter => {
          const members = getPuppiesForLitter(puppies, litter._id)
          return <details className="available-past-litter" key={litter._id} data-past-litter-id={litter._id}>
            <summary><span className="available-past-summary"><span>{litter.title || 'Past litter'}</span><span>{members.length} {members.length === 1 ? 'puppy' : 'puppies'}</span></span></summary>
            <div className="available-past-overview"><LitterTile litter={litter} /></div>
            <div className="puppyGrid">{members.map(puppy => <PuppyCard key={puppy._id} puppy={puppy} />)}</div>
          </details>
        })}
      </section> : null}
    </main>
  )
}
