export const revalidate = 60

import '../home.css'
import Link from 'next/link'
import {getInventory} from '@/sanity/lib/inventory'
import {normalizeLitterStatus, sortLitters} from '@/lib/inventory'
import LitterTile from '../components/LitterTile'

export const metadata = {title: 'Upcoming Litters', alternates: {canonical: '/upcoming-litters'}}

export default async function UpcomingLittersPage() {
  const inventory = await getInventory()
  const litters = sortLitters(inventory.litters.filter((litter) => ['planned', 'current'].includes(normalizeLitterStatus(litter.status))))

  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <Link className="btn" href="/">Home</Link>
        <a className="btn" href="/about">About</a>
        <a className="btn" href="/the-breed">The Breed</a>
        <a className="btn" href="/puppy-resources">Puppy Resources</a>
        <a className="btn" href="/pricing">Pricing</a>
        <a className="btn" href="/available-puppies">Available Puppies</a>
        <a className="btn" href="/contact">Contact</a>
      </div>

      <div className="topbar">
        <div className="pill">
          <span className="dot"></span>
          Future updates and active litters
        </div>
      </div>

      <h1 className="h1">Upcoming Litters</h1>

      <p className="lead">
        This is where FluffyTail shares active and upcoming litter information. Families can check here
        for timing, updates, and litter details as information becomes available.
      </p>

      <div className="grid">
        <div className="card">
          <div className="pad">
            <div className="section" style={{marginTop: 0}}>
              <h2>How updates work</h2>
              <p className="lead">
                We share litter information here as it becomes available. Active litters and upcoming
                litters may both appear on this page.
              </p>
              <p className="lead" style={{marginBottom: 0}}>
                As details become clearer, puppy pages and active litter sections across the site are updated.
              </p>
            </div>

            <div className="divider"></div>

            <div className="section">
              <h2>What to expect</h2>
              <div className="qa">
                <div>
                  <div className="q">Clear updates</div>
                  <div className="a">
                    As photos and details become available, we update the site and share more information.
                  </div>
                </div>
                <div>
                  <div className="q">Simple process</div>
                  <div className="a">
                    The goal is to keep everything straightforward, personal, and easy to follow.
                  </div>
                </div>
                <div>
                  <div className="q">Questions welcome</div>
                  <div className="a">
                    If you are trying to plan ahead, the contact page is the best place to reach out.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="pad">
            <h2 className="panelTitle">At a glance</h2>
            <div className="meta">
              <span>📍 Mobile, Alabama area</span>
              <span>🐶 Active and future litters</span>
              <span>📬 Questions welcome</span>
              <span>🌎 Primarily Southeast, with broader reach</span>
            </div>

            <div className="ctaRow">
              <a className="btn btnPrimary" href="/available-puppies">
                View Available Puppies
              </a>
              <a className="btn" href="/contact">
                Contact
              </a>
            </div>

            <div className="divider"></div>

            <p className="lead" style={{margin: 0}}>
              Check back here for updates on active and future litters as information becomes available.
            </p>
          </div>
        </div>
      </div>

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad" style={{paddingBottom: 0}}>
          <h2 style={{margin: '0 0 6px'}}>Active and upcoming litter updates</h2>
          <p className="lead" style={{margin: 0}}>
            Litters marked active or upcoming will appear here.
          </p>
        </div>

        <div className="strip" aria-label="Active and upcoming litters">
          {litters.length > 0 ? (
            litters.map((litter) => <LitterTile key={litter._id} litter={litter} />)
          ) : (
            <div style={{padding: '16px 0 18px 16px', color: '#5a6472'}}>
              No active or upcoming litters listed yet.
            </div>
          )}
        </div>
      </div>

      <div className="footer">
        © {new Date().getFullYear()} FluffyTail Shih Tzu • In-home raised as family pets
      </div>
    </main>
  )
}

