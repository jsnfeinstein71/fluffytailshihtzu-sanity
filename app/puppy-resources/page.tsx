import '../home.css'
import WaitlistModal from '../components/WaitlistModal'
import {client} from '@/sanity/lib/client'

type SiteSettings = {
  waitlistUrl?: string
}

const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  waitlistUrl
}`

export default async function PuppyResourcesPage() {
  const siteSettings = await client.fetch<SiteSettings>(siteSettingsQuery)
  const waitlistUrl = siteSettings?.waitlistUrl || '#'

  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <a className="btn" href="/">Home</a>
        <a className="btn" href="/about">About</a>
        <a className="btn" href="/the-breed">The Breed</a>
        <a className="btn" href="/available-puppies">Available Puppies</a>
        <a className="btn" href="/upcoming-litters">Upcoming Litters</a>
        <a className="btn" href="/contact">Contact</a>
      </div>

      <div className="topbar">
        <div className="pill">
          <span className="dot"></span>
          Helpful puppy information
        </div>

        <div className="nav">
          <WaitlistModal
            waitlistUrl={waitlistUrl}
            buttonLabel="Join the Waitlist"
            className="btn btnPrimary"
          />
        </div>
      </div>

      <h1 className="h1">Puppy Resources</h1>

      <p className="lead">
        Bringing home a puppy is exciting, and a little preparation goes a long way. This page is
        here to help families think through the basics before pickup and during the first days at home.
      </p>

      <div className="grid">
        <div className="card">
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

        <div className="card">
          <div className="pad">
            <h2 className="panelTitle">Quick checklist</h2>
            <div className="meta">
              <span>🛏️ Crate and bedding</span>
              <span>🍽️ Food and bowls</span>
              <span>🧸 Puppy-safe toys</span>
              <span>🪮 Brush and grooming basics</span>
              <span>🦴 Patience and routine</span>
            </div>

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
            If you’re still deciding or want to ask about availability, you can browse current puppies,
            review upcoming litters, or join the waitlist.
          </p>

          <div className="ctaRow">
            <a className="btn" href="/available-puppies">
              View Available Puppies
            </a>
            <a className="btn" href="/upcoming-litters">
              View Upcoming Litters
            </a>
            <WaitlistModal
              waitlistUrl={waitlistUrl}
              buttonLabel="Join the Waitlist"
              className="btn btnPrimary"
            />
          </div>
        </div>
      </div>

      <div className="footer">
        © {new Date().getFullYear()} FluffyTail Shih Tzu • In-home raised as family pets
      </div>
    </main>
  )
}
