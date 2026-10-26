export const revalidate = 60

import '../home.css'
import './upcoming.css'
import Link from 'next/link'
import {getInventory} from '@/sanity/lib/inventory'
import {formatCurrency, formatDate, getLitterDate, getLittersByStatus} from '@/lib/inventory'
import {tryPricing} from '@/lib/pricing'
import LitterTile from '../components/LitterTile'

export const metadata = {title: 'Upcoming Litters', alternates: {canonical: '/upcoming-litters'}}

export default async function UpcomingLittersPage() {
  const inventory = await getInventory()
  const expectedLitters = getLittersByStatus(inventory.litters, 'planned')
  const activeLitters = getLittersByStatus(inventory.litters, 'current')

  return <main className="wrap upcoming-page">
    <header className="upcoming-intro">
      <p className="eyebrow">Looking ahead</p>
      <h1 className="h1">Upcoming Litters</h1>
      <p className="lead">A little planning for a lot of love.</p>
    </header>

    {expectedLitters.map((litter, index) => {
      const date = formatDate(getLitterDate(litter))
      const pricing = tryPricing({litterPrice: litter.price, litterDeposit: litter.deposit})
      const parents = [{role: 'Mother', parent: litter.dam}, {role: 'Father', parent: litter.sire}]
        .filter(({parent}) => parent?.name?.trim() || parent?.photoUrl?.trim())
      return <section className="expected-litter" key={litter._id} data-litter-id={litter._id}>
        <header className="expected-litter-heading">
          <div><span className="expected-status">Upcoming</span><h2>{litter.title || 'Expected litter'}</h2></div>
          <dl className="expected-litter-date"><div><dt>Expected birth</dt><dd>{date || 'Date to be confirmed'}</dd></div></dl>
        </header>
        <div className="expected-litter-layout">
          <figure className="expected-announcement">
            {litter.groupPhotoUrl ? <img
              src={litter.groupPhotoUrl}
              alt={`Litter announcement: ${litter.title || 'Upcoming FluffyTail litter'}`}
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : undefined}
              decoding="async"
            /> : <div className="expected-photo-pending">Announcement coming soon</div>}
          </figure>
          <div className="expected-litter-details">
            {litter.summary ? <p className="expected-litter-summary">{litter.summary}</p> : null}
            {parents.length ? <div className="expected-parents">
              <h3>The parents</h3>
              <dl>{parents.map(({role, parent}) => <div className="expected-parent" key={role}>
                <dt>{role}</dt>
                <dd>{parent?.photoUrl?.trim() ? <img src={parent.photoUrl} width={88} height={88} alt={parent.name?.trim() ? `${role}: ${parent.name}` : role} loading="lazy" decoding="async" /> : null}{parent?.name?.trim() ? <span>{parent.name}</span> : null}</dd>
              </div>)}</dl>
            </div> : null}
            {litter.expectedAvailability ? <div className="expected-availability"><h3>Looking ahead</h3><p>{litter.expectedAvailability}</p></div> : null}
            {pricing ? <div className="expected-pricing">
              <dl>
                <div><dt>Default puppy price</dt><dd>{formatCurrency(pricing.totalCents / 100, pricing.totalCents % 100 !== 0)}</dd></div>
                <div><dt>Deposit</dt><dd>{formatCurrency(pricing.depositCents / 100, pricing.depositCents % 100 !== 0)}</dd></div>
              </dl>
              <p>The deposit is included in the total.</p>
            </div> : null}
            <div className="expected-inquiry">
              <h3>Thinking about a future puppy?</h3>
              <p>Talk with Jeanne about timing and what you are looking for.</p>
              <Link className="brand-button" href="/puppy-inquiry?interest=waitlist">Ask about future puppies <span aria-hidden="true">&rarr;</span></Link>
            </div>
          </div>
        </div>
      </section>
    })}

    {!expectedLitters.length ? <section className="upcoming-empty">
      <h2>No upcoming litters listed yet.</h2>
      <p>Talk with Jeanne about future puppies and timing.</p>
      <Link className="brand-button" href="/puppy-inquiry?interest=waitlist">Ask about future puppies <span aria-hidden="true">&rarr;</span></Link>
    </section> : null}

    {activeLitters.length ? <section className="upcoming-current" aria-labelledby="current-litters-title">
      <div className="upcoming-current-heading"><div><p className="eyebrow">Already here</p><h2 id="current-litters-title">Our current litters</h2></div><Link className="text-link" href="/available-puppies">Meet our puppies <span aria-hidden="true">&rarr;</span></Link></div>
      <div className="upcoming-current-grid">{activeLitters.map(litter => <LitterTile key={litter._id} litter={litter} />)}</div>
    </section> : null}
  </main>
}
