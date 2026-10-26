export const revalidate = 60

import '../home.css'
import Link from 'next/link'
import {getInventory} from '@/sanity/lib/inventory'
import {normalizeLitterStatus, sortLitters} from '@/lib/inventory'
import LitterTile from '../components/LitterTile'

export const metadata = {title: 'Upcoming Litters', alternates: {canonical: '/upcoming-litters'}}

export default async function UpcomingLittersPage() {
  const inventory = await getInventory()
  const litters = sortLitters(inventory.litters.filter(litter => ['planned', 'current'].includes(normalizeLitterStatus(litter.status))))

  return <main className="wrap">
    <header className="page-intro"><p className="eyebrow">Looking ahead</p><h1 className="h1">Upcoming Litters</h1><p className="lead">A little planning for a lot of love. Follow our active and upcoming litters as Jeanne shares photos, timing and updates.</p></header>
    <div className="strip" aria-label="Active and upcoming litters">
      {litters.length ? litters.map(litter => <LitterTile key={litter._id} litter={litter} />) : <p>No active or upcoming litters listed yet.</p>}
    </div>
    <section className="litter-section"><div className="section-heading"><div><h2>Thinking about a future puppy?</h2><p>Tell Jeanne what you are looking for and ask about timing.</p></div><Link className="brand-button" href="/puppy-inquiry?interest=waitlist">Ask about future puppies <span aria-hidden="true">&rarr;</span></Link></div><p><Link className="text-link" href="/available-puppies">Or meet our current puppies <span aria-hidden="true">&rarr;</span></Link></p></section>
  </main>
}
