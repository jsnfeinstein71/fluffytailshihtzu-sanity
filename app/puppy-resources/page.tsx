import '../home.css'
import '../content.css'
import {getInventory} from '@/sanity/lib/inventory'
import {getLittersByStatus, getPuppiesForLitter} from '@/lib/inventory'

export const metadata = {title: 'Puppy Resources', alternates: {canonical: '/puppy-resources'}}

export default async function PuppyResourcesPage() {
  const {litters, puppies} = await getInventory()
  const current = getLittersByStatus(litters, 'current')[0]
  const members = current ? getPuppiesForLitter(puppies, current._id) : []
  const featured = members.find(puppy => puppy.status === 'available' && puppy.photoUrl) || members.find(puppy => puppy.photoUrl)
  return (
    <main className="wrap content-page">
      <header className="content-intro">
      <p className="eyebrow">A happy start at home</p>

      <h1 className="h1">Puppy Resources</h1>

      <p className="lead">
        Bringing home a puppy is exciting, and a little preparation goes a long way.
      </p>
      </header>

      <div className={`grid${featured?.photoUrl ? ' content-has-photo' : ''}`}>
        {featured?.photoUrl ? <figure className="content-photo"><img src={featured.photoUrl} alt={featured.name || 'A FluffyTail puppy'} loading="eager" decoding="async" /></figure> : null}
        <div className="card content-copy">
          <div className="pad">
            <div className="section" style={{marginTop: 0}}>
              <h2>Before your puppy comes home</h2>
              <div className="qa">
                <div>
                  <div className="q">Set up a safe space</div>
                  <div className="a">
                    Choose a quiet area with a crate, soft bedding, water, and a place for your puppy
                    to settle in without too much chaos.
                  </div>
                </div>
                <div>
                  <div className="q">Pick up basic supplies</div>
                  <div className="a">
                    Food and water bowls, a crate, collar, leash, grooming basics, puppy-safe toys,
                    and cleaning supplies are a good place to start.
                  </div>
                </div>
                <div>
                  <div className="q">Plan the first few days</div>
                  <div className="a">
                    Try to keep the first days calm and predictable. Puppies adjust better when home
                    life feels steady and not overwhelming.
                  </div>
                </div>
              </div>
            </div>

            <div className="divider"></div>

            <div className="section">
              <h2>First week at home</h2>
              <div className="qa">
                <div>
                  <div className="q">Keep expectations realistic</div>
                  <div className="a">
                    A new puppy is learning a new home, new people, new sounds, and a new routine all
                    at once.
                  </div>
                </div>
                <div>
                  <div className="q">Use a simple routine</div>
                  <div className="a">
                    Regular potty breaks, meals, rest, and quiet time help puppies settle in much more
                    smoothly.
                  </div>
                </div>
                <div>
                  <div className="q">Go slow with introductions</div>
                  <div className="a">
                    Let your puppy adjust gradually to new rooms, people, pets, and activity levels.
                  </div>
                </div>
              </div>
            </div>

            <div className="divider"></div>

            <div className="section">
              <h2>Grooming basics</h2>
              <p className="lead">
                Shih Tzu puppies benefit from early handling around the face, feet, coat, and brushing routine.
              </p>
              <p className="lead" style={{marginBottom: 0}}>
                Gentle, regular grooming habits are usually easier than waiting until the puppy is older
                and less used to it.
              </p>
            </div>
          </div>
        </div>

        <div className="card content-aside">
          <div className="pad">
            <h2 className="panelTitle">Quick checklist</h2>
            <ul className="content-facts">
              <li>Crate and bedding</li>
              <li>Food and bowls</li>
              <li>Puppy-safe toys</li>
              <li>Brush and grooming basics</li>
              <li>Patience and routine</li>
            </ul>

            <div className="divider"></div>

            <p className="lead" style={{margin: 0}}>
              A prepared home usually makes the transition easier for both the puppy and the family.
            </p>
          </div>
        </div>
      </div>

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad">
          <h2 style={{marginTop: 0}}>Questions before bringing a puppy home?</h2>
          <p className="lead">
            If you’re still deciding or want to ask about availability, you can browse current puppies
            or review upcoming litters.
          </p>

          <div className="ctaRow">
            <a className="brand-button" href="/available-puppies">
              View Available Puppies
            </a>
            <a className="text-link" href="/upcoming-litters">
              View Upcoming Litters
            </a>
            <a className="text-link" href="/contact">
              Contact
            </a>
          </div>
        </div>
      </div>

    </main>
  )
}

