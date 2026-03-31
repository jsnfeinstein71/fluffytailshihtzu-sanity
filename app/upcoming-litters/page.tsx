import '../home.css'
import {client} from '@/sanity/lib/client'

type SiteSettings = {
  goodDogUrl?: string
  waitlistUrl?: string
}

type Litter = {
  _id: string
  title?: string
  birthDate?: string
  girlsCount?: number
  boysCount?: number
  summary?: string
  status?: string
  groupPhotoUrl?: string
}

const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  goodDogUrl,
  waitlistUrl
}`

const upcomingLittersQuery = `*[_type == "litter" && status in ["upcoming", "current"]] | order(birthDate desc){
  _id,
  title,
  birthDate,
  girlsCount,
  boysCount,
  summary,
  status,
  "groupPhotoUrl": groupPhoto.asset->url
}`

export default async function UpcomingLittersPage() {
  const siteSettings = await client.fetch<SiteSettings>(siteSettingsQuery)
  const litters = await client.fetch<Litter[]>(upcomingLittersQuery)

  const goodDogUrl =
    siteSettings?.goodDogUrl ||
    'https://www.gooddog.com/breeders/fluffytail-shih-tzu-alabama'

  const waitlistUrl = siteSettings?.waitlistUrl || '#'

  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <a className="btn" href="/">Home</a>
        <a className="btn" href="/about">About</a>
        <a className="btn" href="/available-puppies">Available Puppies</a>
        <a className="btn" href="/contact">Contact</a>
      </div>

      <div className="topbar">
        <div className="pill">
          <span className="dot"></span>
          Future updates and current litters
        </div>

        <div className="nav">
          <a className="btn btnPrimary" href={waitlistUrl} target="_blank" rel="noreferrer">
            Join the Waitlist
          </a>
          <a className="btn" href={goodDogUrl} target="_blank" rel="noreferrer">
            View on GoodDog
          </a>
        </div>
      </div>

      <h1 className="h1">Upcoming Litters</h1>

      <p className="lead">
        This is where FluffyTail shares current and upcoming litter information. Families on the
        waitlist hear first when timing is known and puppies become available.
      </p>

      <div className="grid">
        <div className="card">
          <div className="pad">
            <div className="section" style={{marginTop: 0}}>
              <h2>How the waitlist works</h2>
              <p className="lead">
                The waitlist is the easiest way to hear about future litters and new puppy
                availability directly from FluffyTail.
              </p>
              <p className="lead" style={{marginBottom: 0}}>
                We use it to share updates when timing is known and when puppies are ready to be
                shown.
              </p>
            </div>

            <div className="divider"></div>

            <div className="section">
              <h2>What to expect</h2>
              <div className="qa">
                <div>
                  <div className="q">Early notice</div>
                  <div className="a">
                    Families on the waitlist can hear about new litters before browsing casually.
                  </div>
                </div>
                <div>
                  <div className="q">Clear updates</div>
                  <div className="a">
                    As photos and details become available, we update the site and share more
                    information.
                  </div>
                </div>
                <div>
                  <div className="q">Simple process</div>
                  <div className="a">
                    The goal is to keep everything straightforward, personal, and easy to follow.
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
              <span>📬 Waitlist updates available</span>
              <span>🐶 Current and future litters</span>
              <span>🌎 Primarily Southeast, with broader reach</span>
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
              Check back here for updates on current and future litters as information becomes
              available.
            </p>
          </div>
        </div>
      </div>

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad" style={{paddingBottom: 0}}>
          <h2 style={{margin: '0 0 6px'}}>Current and upcoming litter updates</h2>
          <p className="lead" style={{margin: 0}}>
            Litters marked current or upcoming will appear here.
          </p>
        </div>

        <div className="strip" aria-label="Current and upcoming litters">
          {litters.length > 0 ? (
            litters.map((litter) => (
              <div className="tile" key={litter._id}>
                <div className="tileImg">
                  {litter.groupPhotoUrl ? (
                    <img src={litter.groupPhotoUrl} alt={litter.title || 'Litter photo'} />
                  ) : null}
                </div>
                <div className="tileMeta">
                  <p className="tileName">{litter.title || 'Untitled litter'}</p>
                  <p className="tileSub">
                    {formatStatus(litter.status)}
                    {litter.birthDate ? ` • ${formatShortDate(litter.birthDate)}` : ''}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div style={{padding: '16px 0 18px 16px', color: '#5a6472'}}>
              No current or upcoming litters listed yet.
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

function formatStatus(status?: string) {
  if (status === 'current') return 'Current'
  if (status === 'upcoming') return 'Upcoming'
  return 'Litter'
}

function formatShortDate(date?: string) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})
}

