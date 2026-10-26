export const revalidate = 60

import '../home.css'
import {getInventory} from '@/sanity/lib/inventory'
import {getLittersByStatus, getPuppiesForLitter} from '@/lib/inventory'
import LitterSection from '../components/LitterSection'
import LitterTile from '../components/LitterTile'
import PuppyCard from '../components/PuppyCard'

export const metadata = {title: 'Available Puppies', alternates: {canonical: '/available-puppies'}}

export default async function AvailablePuppiesPage() {
  const {litters, puppies} = await getInventory()
  const activeLitters = getLittersByStatus(litters, 'current')
  const pastLitters = getLittersByStatus(litters, 'past')

  return (
    <main className="wrap">

      <header className="page-intro"><p className="eyebrow">Find your little companion</p>
      <h1 className="h1">Available Puppies</h1>
      <p className="lead">Meet our current litters. Open a puppy&apos;s page for their photos, pricing and a direct way to ask Jeanne for more information.</p>
      <div className="topbar"><div className="pill"><span className="dot"></span>
        {activeLitters.length ? `${activeLitters.length} active litter${activeLitters.length === 1 ? '' : 's'}` : 'No active litters listed'}
      </div></div>
      </header>

      {activeLitters.map((litter) => <LitterSection key={litter._id} litter={litter} puppies={puppies} />)}
      {!activeLitters.length ? <div className="card section"><div className="pad">
        <h2 style={{marginTop: 0}}>No active litters listed</h2>
        <p className="lead">Check back soon or use the contact page if you have questions.</p>
      </div></div> : null}

      {pastLitters.length ? <>
        <div className="section"><h2>Recent litters</h2><p className="lead">Past litters from FluffyTail Shih Tzu.</p></div>
        <div className="strip" aria-label="Recent litters">{pastLitters.map((litter) => <LitterTile key={litter._id} litter={litter} />)}</div>
        {pastLitters.map((litter) => <details className="card section" key={litter._id} data-past-litter-id={litter._id}>
          <summary className="pad">{litter.title || 'Past litter'} - Puppies</summary>
          <div className="puppyGrid">{getPuppiesForLitter(puppies, litter._id).map((puppy) => <PuppyCard key={puppy._id} puppy={puppy} />)}</div>
        </details>)}
      </> : null}

    </main>
  )
}
