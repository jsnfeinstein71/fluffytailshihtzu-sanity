import '../home.css'
import {client} from '@/sanity/lib/client'

type SiteSettings = {
  waitlistUrl?: string
}

const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  waitlistUrl
}`

export default async function TheBreedPage() {
  await client.fetch<SiteSettings>(siteSettingsQuery)

  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <a className="btn" href="/">Home</a>
        <a className="btn" href="/about">About</a>
        <a className="btn" href="/puppy-resources">Puppy Resources</a>
        <a className="btn" href="/pricing">Pricing</a>
        <a className="btn" href="/available-puppies">Available Puppies</a>
        <a className="btn" href="/upcoming-litters">Upcoming Litters</a>
        <a className="btn" href="/contact">Contact</a>
      </div>

      <div className="topbar">
        <div className="pill">
          <span className="dot"></span>
          Learn more about the breed
        </div>
      </div>

      <h1 className="h1">About the Shih Tzu Breed</h1>

      <p className="lead">
        Shih Tzus are known for their affectionate temperament, manageable size, and companion-first
        personality. They were bred to live closely with people, and that shows in how connected
        they tend to be with their families.
      </p>

      <div className="grid">
        <div className="card">
          <div className="pad">
            <div className="section" style={{marginTop: 0}}>
              <h2>Why families love Shih Tzus</h2>
              <p className="lead">
                Shih Tzus are friendly little companion dogs that often do well in family homes,
                apartments, and quieter households alike. Many people love them because they are
                small enough to be easy to manage while still having a lot of personality.
              </p>
              <p className="lead" style={{marginBottom: 0}}>
                They are usually happiest when they are near their people. For many families, that
                makes them a natural fit as an in-home companion rather than an outdoor or
                high-energy working dog.
              </p>
            </div>

            <div className="divider"></div>

            <div className="section">
              <h2>Temperament</h2>
              <div className="qa">
                <div>
                  <div className="q">Affectionate</div>
                  <div className="a">
                    Shih Tzus are generally known for being loving, people-oriented dogs that enjoy
                    attention and closeness.
                  </div>
                </div>
                <div>
                  <div className="q">Companion-minded</div>
                  <div className="a">
                    This breed was developed to be a companion, so many Shih Tzus naturally prefer
                    being with their family over roaming or independent outdoor activity.
                  </div>
                </div>
                <div>
                  <div className="q">Adaptable</div>
                  <div className="a">
                    They often adapt well to different home sizes and routines, as long as they get
                    attention, care, and regular structure.
                  </div>
                </div>
              </div>
            </div>

            <div className="divider"></div>

            <div className="section">
              <h2>Size and daily life</h2>
              <p className="lead">
                Shih Tzus are a toy breed, which is part of what makes them appealing for many
                homes. Their size makes them easier to carry, groom, and manage day to day than
                many larger breeds.
              </p>
              <p className="lead" style={{marginBottom: 0}}>
                They usually do not need extreme amounts of exercise, but they still benefit from
                daily attention, short walks, play, and regular interaction.
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="pad">
            <h2 className="panelTitle">At a glance</h2>
            <div className="meta">
              <span>🐶 Small companion breed</span>
              <span>🏠 Often well-suited to indoor family life</span>
              <span>💕 Known for affectionate temperament</span>
              <span>✂️ Regular grooming needed</span>
              <span>🚶 Moderate daily activity</span>
            </div>

            <div className="divider"></div>

            <p className="lead" style={{margin: 0}}>
              A Shih Tzu can be a wonderful fit for the right home, especially for families looking
              for a close, people-oriented companion.
            </p>
          </div>
        </div>
      </div>

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad">
          <h2 style={{marginTop: 0}}>Grooming and coat care</h2>
          <p className="lead">
            One of the most important things to understand about Shih Tzus is grooming. Their coat
            needs regular care to stay clean, comfortable, and manageable.
          </p>
          <div className="qa">
            <div>
              <div className="q">Regular brushing</div>
              <div className="a">
                Their coat can mat if it is neglected, so brushing and routine maintenance matter.
              </div>
            </div>
            <div>
              <div className="q">Professional grooming</div>
              <div className="a">
                Many families choose a practical trim and keep a regular grooming schedule.
              </div>
            </div>
            <div>
              <div className="q">Face and eye area</div>
              <div className="a">
                Because of the breed’s facial structure and coat, this area benefits from regular
                attention and cleanliness.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad">
          <h2 style={{marginTop: 0}}>Is a Shih Tzu a good fit for your home?</h2>
          <p className="lead">
            A Shih Tzu may be a good fit if you want a dog that is:
          </p>
          <div className="qa">
            <div>
              <div className="q">People-centered</div>
              <div className="a">
                They generally do best when they are treated as a real part of the household.
              </div>
            </div>
            <div>
              <div className="q">Small but sturdy</div>
              <div className="a">
                Their size is convenient, but they still have a real personality and presence.
              </div>
            </div>
            <div>
              <div className="q">Worth the coat upkeep</div>
              <div className="a">
                Families who understand the grooming commitment tend to be happier with the breed.
              </div>
            </div>
          </div>

          <div className="divider"></div>

          <p className="lead" style={{marginBottom: 0}}>
            If you are looking for a little dog that wants to live closely with its people, the
            Shih Tzu is easy to understand once you realize it is truly a companion breed first.
          </p>
        </div>
      </div>

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad">
          <h2 style={{marginTop: 0}}>Interested in a FluffyTail puppy?</h2>
          <p className="lead">
            If you think a Shih Tzu may be the right fit for your home, browse our available
            puppies or contact us with questions.
          </p>

          <div className="ctaRow">
            <a className="btn" href="/available-puppies">
              View Available Puppies
            </a>
            <a className="btn" href="/upcoming-litters">
              View Upcoming Litters
            </a>
            <a className="btn btnPrimary" href="/contact">
              Contact
            </a>
          </div>
        </div>
      </div>

      <div className="footer">
        © {new Date().getFullYear()} FluffyTail Shih Tzu • In-home raised as family pets
      </div>
    </main>
  )
}

