import '../home.css'
import {client} from '@/sanity/lib/client'

type SiteSettings = {
  goodDogUrl?: string
  waitlistUrl?: string
}

const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  goodDogUrl,
  waitlistUrl
}`

export default async function ContactPage() {
  const siteSettings = await client.fetch<SiteSettings>(siteSettingsQuery)

  const goodDogUrl =
    siteSettings?.goodDogUrl ||
    'https://www.gooddog.com/breeders/fluffytail-shih-tzu-alabama'

  const waitlistUrl = siteSettings?.waitlistUrl || ''

  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <a className="btn" href="/">Home</a>
        <a className="btn" href="/about">About</a>
        <a className="btn" href="/available-puppies">Available Puppies</a>
        <a className="btn" href="/upcoming-litters">Upcoming Litters</a>
      </div>

      <div className="topbar">
        <div className="pill">
          <span className="dot"></span>
          Waitlist open
        </div>

        <div className="nav">
          {waitlistUrl ? (
            <a className="btn btnPrimary" href={waitlistUrl} target="_blank" rel="noreferrer">
              Open Waitlist
            </a>
          ) : null}
          <a className="btn" href={goodDogUrl} target="_blank" rel="noreferrer">
            View on GoodDog
          </a>
        </div>
      </div>

      <h1 className="h1">Contact FluffyTail Shih Tzu</h1>

      <p className="lead">
        The best way to hear about future availability is to join the waitlist. You can also visit
        our GoodDog profile to browse more information and reach out there.
      </p>

      <div className="grid">
        <div className="card">
          <div className="pad">
            <div className="section" style={{marginTop: 0}}>
              <h2>Join the waitlist</h2>
              <p className="lead">
                We only reach out when puppies are expected or available. This is the best way to
                get first notice directly from FluffyTail.
              </p>

              <div className="ctaRow">
                {waitlistUrl ? (
                  <a className="btn btnPrimary" href={waitlistUrl} target="_blank" rel="noreferrer">
                    Open Waitlist in New Tab
                  </a>
                ) : null}
                <a className="btn" href={goodDogUrl} target="_blank" rel="noreferrer">
                  Open GoodDog Profile
                </a>
              </div>
            </div>

            <div className="divider"></div>

            <div className="section">
              <h2>Why use the waitlist?</h2>
              <div className="qa">
                <div>
                  <div className="q">Direct updates</div>
                  <div className="a">
                    You hear from us directly when litters are expected or puppies become
                    available.
                  </div>
                </div>
                <div>
                  <div className="q">Simple process</div>
                  <div className="a">
                    No pressure, no spam, and no need to keep checking multiple places.
                  </div>
                </div>
                <div>
                  <div className="q">Best first step</div>
                  <div className="a">
                    If you’re planning ahead, the waitlist is the easiest way to stay in the loop.
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
              <span>📬 Direct waitlist updates</span>
              <span>🐶 Small home-based breeder</span>
              <span>🌎 Primarily Southeast, with broader reach</span>
            </div>

            <div className="ctaRow">
              {waitlistUrl ? (
                <a className="btn btnPrimary" href={waitlistUrl} target="_blank" rel="noreferrer">
                  Join the Waitlist
                </a>
              ) : null}
              <a className="btn" href={goodDogUrl} target="_blank" rel="noreferrer">
                Request info
              </a>
            </div>

            <div className="divider"></div>

            <p className="lead" style={{margin: 0}}>
              Prefer to browse first? Our GoodDog profile includes listings, reviews, and
              additional buyer information.
            </p>
          </div>
        </div>
      </div>

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad">
          <h2 style={{marginTop: 0}}>Waitlist form</h2>

          {waitlistUrl ? (
            <iframe
              src={waitlistUrl}
              title="FluffyTail Shih Tzu Waitlist"
              style={{
                width: '100%',
                height: '760px',
                border: '0',
                borderRadius: '14px',
                background: '#fff',
              }}
            />
          ) : (
            <p className="lead" style={{marginBottom: 0}}>
              Add the Tally embed URL in Site Settings to display the form here.
            </p>
          )}
        </div>
      </div>

      <div className="footer">
        © {new Date().getFullYear()} FluffyTail Shih Tzu • In-home raised as family pets
      </div>
    </main>
  )
}

