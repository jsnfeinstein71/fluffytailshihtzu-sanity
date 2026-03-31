import '../home.css'
import {client} from '@/sanity/lib/client'
import WaitlistModal from '../components/WaitlistModal'

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

const littersQuery = `*[_type == "litter"] | order(birthDate desc){
  _id,
  title,
  birthDate,
  girlsCount,
  boysCount,
  summary,
  status,
  "groupPhotoUrl": groupPhoto.asset->url
}`

export default async function AvailablePuppiesPage() {
  const siteSettings = await client.fetch<SiteSettings>(siteSettingsQuery)
  const litters = await client.fetch<Litter[]>(littersQuery)

  const goodDogUrl =
    siteSettings?.goodDogUrl ||
    'https://www.gooddog.com/breeders/fluffytail-shih-tzu-alabama'

  const waitlistUrl = siteSettings?.waitlistUrl || '#'

  const currentLitter = litters.find((litter) => litter.status === 'current')
  const pastLitters = litters.filter((litter) => litter.status !== 'current')

  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <a className="btn" href="/">Home</a>
        <a className="btn" href="/about">About</a>
        <a className="btn" href="/upcoming-litters">Upcoming Litters</a>
        <a className="btn" href="/contact">Contact</a>
      </div>

      <div className="topbar">
        <div className="pill">
          <span className="dot"></span>
          {currentLitter?.birthDate
            ? `Current litter born ${formatShortDate(currentLitter.birthDate)}`
            : 'Waitlist open'}
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

      <h1 className="h1">Available Puppies</h1>

      <p className="lead">
        Current and recent litters from FluffyTail Shih Tzu. We update this page as litters arrive
        and as individual puppy photos become available.
      </p>

      {currentLitter ? (
        <div className="grid">
          <div className="card">
            <div className="photos">
              <div className="heroPhoto">
                {currentLitter.groupPhotoUrl ? (
                  <img
                    src={currentLitter.groupPhotoUrl}
                    alt={currentLitter.title || 'Current litter'}
                  />
                ) : null}
              </div>

              <div className="thumbs">
                <div className="thumb">
                  {currentLitter.groupPhotoUrl ? (
                    <img
                      src={currentLitter.groupPhotoUrl}
                      alt="Current litter thumbnail"
                    />
                  ) : null}
                </div>
                <div className="thumb">
                  {currentLitter.groupPhotoUrl ? (
                    <img
                      src={currentLitter.groupPhotoUrl}
                      alt="Current litter thumbnail"
                    />
                  ) : null}
                </div>
                <div className="thumb">
                  {currentLitter.groupPhotoUrl ? (
                    <img
                      src={currentLitter.groupPhotoUrl}
                      alt="Current litter thumbnail"
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="pad">
              <div className="ctaRow">
                <a className="btn btnPrimary" href={waitlistUrl} target="_blank" rel="noreferrer">
                  Join the Waitlist
                </a>
                <a className="btn" href={goodDogUrl} target="_blank" rel="noreferrer">
                  Request info
                </a>
                <span className="badge">Current litter</span>
              </div>

              <div className="divider"></div>

              <div className="section">
                <h2>{currentLitter.title || 'Current Litter'}</h2>
                <p className="lead">
                  Birth date: {formatLongDate(currentLitter.birthDate)}
                </p>
                <p className="lead">
                  {currentLitter.girlsCount ?? 0} girls • {currentLitter.boysCount ?? 0} boys
                </p>
                {currentLitter.summary ? (
                  <p className="lead" style={{marginBottom: 0}}>
                    {currentLitter.summary}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="pad">
              <h2 className="panelTitle">At a glance</h2>
              <div className="meta">
                <span>📍 Mobile, Alabama area</span>
                <span>🐶 {(currentLitter.girlsCount ?? 0) + (currentLitter.boysCount ?? 0)} puppies total</span>
                <span>♀️ {currentLitter.girlsCount ?? 0} girls</span>
                <span>♂️ {currentLitter.boysCount ?? 0} boys</span>
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
                Individual puppy photos and statuses will be added as they become available.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{marginTop: '16px'}}>
          <div className="pad">
            <h2 style={{marginTop: 0}}>No current litter listed</h2>
            <p className="lead" style={{marginBottom: 0}}>
              Join the waitlist for updates and first notice when puppies are expected or available.
            </p>
          </div>
        </div>
      )}

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad" style={{paddingBottom: 0}}>
          <h2 style={{margin: '0 0 6px'}}>Recent litters</h2>
          <p className="lead" style={{margin: 0}}>
            Past and recent litters from FluffyTail Shih Tzu.
          </p>
        </div>

        <div className="strip" aria-label="Recent litters">
          {(pastLitters.length > 0 ? pastLitters : litters).map((litter) => (
            <div className="tile" key={litter._id}>
              <div className="tileImg">
                {litter.groupPhotoUrl ? (
                  <img src={litter.groupPhotoUrl} alt={litter.title || 'Litter photo'} />
                ) : null}
              </div>
              <div className="tileMeta">
                <p className="tileName">{litter.title || 'Untitled litter'}</p>
                <p className="tileSub">{formatStatus(litter.status)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="footer">
        © {new Date().getFullYear()} FluffyTail Shih Tzu • In-home raised as family pets
      </div>
    </main>
  )
}

function formatShortDate(date?: string) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})
}

function formatLongDate(date?: string) {
  if (!date) return 'Unknown'
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})
}

function formatStatus(status?: string) {
  if (status === 'current') return 'Current'
  if (status === 'upcoming') return 'Upcoming'
  if (status === 'past') return 'Past'
  return 'Litter'
}

