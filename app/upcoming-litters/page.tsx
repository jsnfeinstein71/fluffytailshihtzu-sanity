export const revalidate = 60

import '../home.css'
import './upcoming.css'
import {pageDescriptions} from '@/lib/public-copy'
import Link from 'next/link'
import LitterPlaces from './LitterPlaces'
import {litterReservationMode,litterReservationsEnabled} from '@/lib/litter-reservations'
import {getInventory} from '@/sanity/lib/inventory'
import {formatCurrency, formatDate, getLitterDate, getLittersByStatus} from '@/lib/inventory'
import {tryPricing} from '@/lib/pricing'
import LitterTile from '../components/LitterTile'

import {publicPageMetadata} from '@/lib/seo'
export const metadata = publicPageMetadata({title: 'Upcoming Litters', description:pageDescriptions.upcoming, path: '/upcoming-litters'})

export default async function UpcomingLittersPage() {
  const inventory = await getInventory()
  const expectedLitters = getLittersByStatus(inventory.litters, 'planned')
  const activeLitters = getLittersByStatus(inventory.litters, 'current')

  return <main className="wrap upcoming-page">
    <header className="upcoming-intro">
      <p className="eyebrow">Planning ahead</p>
      <h1 className="h1">Upcoming Litters</h1>
      <p className="lead">Hoping for a puppy from an upcoming litter?</p>
      <p>You don’t have to wait until the puppies arrive to talk with Jeanne. Tell her what you’re hoping for, and she’ll help you decide whether an upcoming litter could be a good fit.</p>
    </header>

    {litterReservationMode()==='test'?<p className="expected-status" role="status">TEST — fictional litters only. No real charges or inventory changes. Use a fictional @example.test email for inquiries; messages are disabled.</p>:null}
    {expectedLitters.map((litter, index) => {
      const date = formatDate(getLitterDate(litter))
      const pricing = tryPricing({litterPrice: litter.price, litterDeposit: litter.deposit})
      const parents = [{role: 'Mother', parent: litter.dam}, {role: 'Father', parent: litter.sire}]
        .filter(({parent}) => parent?.name?.trim() || parent?.photoUrl?.trim())
      return <section className="expected-litter" key={litter._id} data-litter-id={litter._id}>
        <header className="expected-litter-heading">
          <div><span className="expected-status">Upcoming</span><h2>{litter.title || 'Expected litter'}</h2></div>
          <dl className="expected-litter-date"><div><dt>Expected around</dt><dd>{date || 'Date to be confirmed'}</dd></div></dl>
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
                <div><dt>Litter price</dt><dd>{formatCurrency(pricing.totalCents / 100, pricing.totalCents % 100 !== 0)}</dd></div>
                <div><dt>Deposit toward the total</dt><dd>{formatCurrency(pricing.depositCents / 100, pricing.depositCents % 100 !== 0)}</dd></div>
              </dl>
            </div> : null}
            {litterReservationsEnabled()?<LitterPlaces litterId={litter._id} title={litter.title||'Upcoming litter'} depositCents={pricing?.depositCents??null} showGuidance={index===0}/>:<>            <div className="expected-inquiry">
              <h3>Interested in this litter?</h3>
              <p>Tell Jeanne which litter you’re following and a little about the home you have in mind. Asking now starts a conversation; it doesn’t reserve a puppy.</p>
              <Link className="brand-button" href={'/puppy-inquiry?interest=waitlist&litterId='+encodeURIComponent(litter._id)}>Ask Jeanne about this litter <span aria-hidden="true">&rarr;</span></Link>
            </div></>}
          </div>
        </div>
      </section>
    })}

    {!expectedLitters.length ? <section className="upcoming-empty">
      <h2>Nothing announced just yet.</h2>
      <p>If you’re planning for a future puppy, you can still tell Jeanne what you’re looking for and ask about timing.</p>
      <Link className="brand-button" href="/puppy-inquiry?interest=waitlist">Ask about future puppies <span aria-hidden="true">&rarr;</span></Link>
    </section> : null}

    {activeLitters.length ? <section className="upcoming-current" aria-labelledby="current-litters-title">
      <div className="upcoming-current-heading"><div><p className="eyebrow">Already here</p><h2 id="current-litters-title">Already here</h2></div><Link className="text-link" href="/available-puppies">Meet our puppies <span aria-hidden="true">&rarr;</span></Link></div>
      <div className="upcoming-current-grid">{activeLitters.map(litter => <LitterTile key={litter._id} litter={litter} />)}</div>
    </section> : null}
  </main>
}
