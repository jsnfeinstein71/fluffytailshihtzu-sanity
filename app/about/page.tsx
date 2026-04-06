import '../home.css'
import {client} from '@/sanity/lib/client'

type SiteSettings = {
  homepageIntro?: string
  serviceArea?: string
}

const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  homepageIntro,
  serviceArea
}`

export default async function AboutPage() {
  const siteSettings = await client.fetch<SiteSettings>(siteSettingsQuery)

  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <a className="btn" href="/">Home</a>
        <a className="btn" href="/the-breed">The Breed</a>
        <a className="btn" href="/puppy-resources">Puppy Resources</a>
        <a className="btn" href="/pricing">Pricing</a>
        <a className="btn" href="/available-puppies">Available Puppies</a>
        <a className="btn" href="/upcoming-litters">Upcoming Litters</a>
        <a className="btn" href="/contact">Contact</a>
      </div>

      <div className="topbar">
        <div className="pill">
          <span className="dot"></span>
          Small home-based breeder
        </div>
      </div>

      <h1 className="h1">About FluffyTail Shih Tzu</h1>

      <p className="lead">
        FluffyTail Shih Tzu is a small, home-based breeder in Alabama. Our dogs live with us as
        family pets, not in a kennel.
      </p>

      <p className="sublead">
        {siteSettings?.serviceArea ||
          'Primarily serving the Southeast, with approved homes beyond the region.'}
      </p>

      <div className="grid">
        <div className="card">
          <div className="pad">
            <div className="section" style={{marginTop: 0}}>
              <h2>Our approach</h2>
              <p className="lead">
                We raise our Shih Tzus in our home, where they are part of daily life from the
                beginning. We care about temperament, socialization, and giving families a clear,
                personal experience.
              </p>
              <p className="lead" style={{marginBottom: 0}}>
                We are intentionally small. That lets us stay hands-on and keep the process direct
                and personal.
              </p>
            </div>

            <div className="divider"></div>

            <div className="section">
              <h2>About Jeanne</h2>
              <p className="lead">
                Jeanne is at the heart of FluffyTail Shih Tzu. She cares deeply about the dogs,
                keeps them in the home as part of daily family life, and wants families to feel like
                they are working with a real person, not a system.
              </p>
              <p className="lead">
                Her goal is to keep the process straightforward, personal, and comfortable. That
                means clear communication, honest answers, and a home environment where the dogs are
                raised with daily attention and care.
              </p>
              <p className="lead" style={{marginBottom: 0}}>
                For Jeanne, this is not about volume. It is about raising well-loved Shih Tzus and
                placing them with families who truly value them.
              </p>
            </div>

            <div className="divider"></div>

            <div className="section">
              <h2>What matters to us</h2>
              <div className="qa">
                <div>
                  <div className="q">Home environment</div>
                  <div className="a">
                    Our dogs are raised in the home as family pets, with real daily interaction.
                  </div>
                </div>
                <div>
                  <div className="q">Straightforward communication</div>
                  <div className="a">
                    We want families to know what to expect and to feel comfortable asking
                    questions.
                  </div>
                </div>
                <div>
                  <div className="q">A personal process</div>
                  <div className="a">
                    FluffyTail is built around quality, care, and a direct connection with the
                    families we work with.
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
              <span>🏠 In-home raised</span>
              <span>🐶 Small breeder, not a kennel</span>
              <span>🌎 Southeast and beyond</span>
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
              {siteSettings?.homepageIntro ||
                'FluffyTail Shih Tzu is a small, home-based breeder in Alabama.'}
            </p>
          </div>
        </div>
      </div>

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad">
          <h2 style={{marginTop: 0}}>Next step</h2>
          <p className="lead">
            Browse current puppies, learn more about the breed, or use the contact page if you have
            questions.
          </p>
          <div className="ctaRow">
            <a className="btn btnPrimary" href="/available-puppies">
              View Available Puppies
            </a>
            <a className="btn" href="/the-breed">
              About the Breed
            </a>
            <a className="btn" href="/contact">
              Contact FluffyTail
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

