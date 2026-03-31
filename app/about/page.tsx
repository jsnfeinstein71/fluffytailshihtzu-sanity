import '../home.css'
import {client} from '@/sanity/lib/client'
import WaitlistModal from '../components/WaitlistModal'

type SiteSettings = {
  goodDogUrl?: string
  waitlistUrl?: string
  homepageIntro?: string
  serviceArea?: string
}

const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  goodDogUrl,
  waitlistUrl,
  homepageIntro,
  serviceArea
}`

export default async function AboutPage() {
  const siteSettings = await client.fetch<SiteSettings>(siteSettingsQuery)

  const goodDogUrl =
    siteSettings?.goodDogUrl ||
    'https://www.gooddog.com/breeders/fluffytail-shih-tzu-alabama'

  const waitlistUrl = siteSettings?.waitlistUrl || '#'

  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <a className="btn" href="/">Home</a>
        <a className="btn" href="/available-puppies">Available Puppies</a>
        <a className="btn" href="/upcoming-litters">Upcoming Litters</a>
        <a className="btn" href="/contact">Contact</a>
      </div>

      <div className="topbar">
        <div className="pill">
          <span className="dot"></span>
          Small home-based breeder
        </div>

        <div className="nav">
          <WaitlistModal
  waitlistUrl={waitlistUrl}
  buttonLabel="Join the Waitlist"
  className="btn btnPrimary"
/>
          <a className="btn" href={goodDogUrl} target="_blank" rel="noreferrer">
            View on GoodDog
          </a>
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
              <a className="btn btnPrimary" href={waitlistUrl} target="_blank" rel="noreferrer">
                Join the Waitlist
              </a>
              <a className="btn" href={goodDogUrl} target="_blank" rel="noreferrer">
                GoodDog profile
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
            The best way to hear about future puppies is to join the waitlist or check the
            Available Puppies page for updates.
          </p>
          <div className="ctaRow">
            <a className="btn btnPrimary" href="/available-puppies">
              View Available Puppies
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

