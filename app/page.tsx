import './home.css'
import {client} from '@/sanity/lib/client'
import WaitlistModal from './components/WaitlistModal'

type SiteSettings = {
  title?: string
  homepageHeadline?: string
  homepageIntro?: string
  goodDogUrl?: string
  waitlistUrl?: string
  serviceArea?: string
}

type Litter = {
  title?: string
  birthDate?: string
  girlsCount?: number
  boysCount?: number
  summary?: string
  groupPhotoUrl?: string
}

const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  title,
  homepageHeadline,
  homepageIntro,
  goodDogUrl,
  waitlistUrl,
  serviceArea
}`

const featuredLitterQuery = `*[_type == "litter" && featured == true][0]{
  title,
  birthDate,
  girlsCount,
  boysCount,
  summary,
  "groupPhotoUrl": groupPhoto.asset->url
}`

export default async function HomePage() {
  const siteSettings = await client.fetch<SiteSettings>(siteSettingsQuery)
  const featuredLitter = await client.fetch<Litter>(featuredLitterQuery)

  const goodDogUrl =
    siteSettings?.goodDogUrl ||
    'https://www.gooddog.com/breeders/fluffytail-shih-tzu-alabama'

  const waitlistUrl = siteSettings?.waitlistUrl || '#'

  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <a className="btn" href="/about">About</a>
        <a className="btn" href="/available-puppies">Available Puppies</a>
        <a className="btn" href="/upcoming-litters">Upcoming Litters</a>
        <a className="btn" href="/contact">Contact</a>
      </div>

      <div className="topbar">
        <div className="pill">
          <span className="dot"></span>
          {featuredLitter?.birthDate
            ? `New litter born ${formatShortDate(featuredLitter.birthDate)} • Waitlist open`
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

      <h1 className="h1 h1Home">
        {siteSettings?.homepageHeadline ||
          'Home-Raised Shih Tzu Puppies from FluffyTail Shih Tzu'}
      </h1>

      <p className="lead">
        {siteSettings?.homepageIntro ||
          'FluffyTail Shih Tzu is a small, home-based breeder in Alabama. Our dogs live with us as family pets, and we work with families across the Southeast and beyond.'}
      </p>

      <p className="sublead">
        {featuredLitter
          ? `New litter born ${formatLongDate(featuredLitter.birthDate)}: ${featuredLitter.girlsCount ?? 0} girls and ${featuredLitter.boysCount ?? 0} boys. Individual photos coming soon.`
          : 'Join the waitlist for updates and first notice when puppies are expected or available.'}
      </p>

      <div className="grid">
        <div className="card">
          <div className="photos">
            <div className="heroPhoto">
              {featuredLitter?.groupPhotoUrl ? (
                <img
                  src={featuredLitter.groupPhotoUrl}
                  alt={featuredLitter.title || 'Featured litter'}
                />
              ) : null}
            </div>

            <div className="thumbs">
              <div className="thumb">
                {featuredLitter?.groupPhotoUrl ? (
                  <img src={featuredLitter.groupPhotoUrl} alt="Featured litter thumbnail" />
                ) : null}
              </div>
              <div className="thumb">
                {featuredLitter?.groupPhotoUrl ? (
                  <img src={featuredLitter.groupPhotoUrl} alt="Featured litter thumbnail" />
                ) : null}
              </div>
              <div className="thumb">
                {featuredLitter?.groupPhotoUrl ? (
                  <img src={featuredLitter.groupPhotoUrl} alt="Featured litter thumbnail" />
                ) : null}
              </div>
            </div>
          </div>

          <div className="pad">
            <div className="ctaRow">
              <WaitlistModal
                waitlistUrl={waitlistUrl}
                buttonLabel="Join the Waitlist"
                className="btn btnPrimary"
              />
              <a className="btn" href={goodDogUrl} target="_blank" rel="noreferrer">
                GoodDog profile
              </a>
              <span className="badge">No spam • No pressure</span>
            </div>

            <div className="divider"></div>

            <div className="section">
              <h2>About FluffyTail</h2>
              <p className="lead" style={{marginBottom: 0}}>
                We raise our Shih Tzus in our home in Alabama, where they are part of the family
                from day one. We focus on temperament, socialization, and a straightforward
                experience for families looking for a well-loved companion.
              </p>

              <div className="qa">
                <div>
                  <div className="q">Where do your breeding dogs live?</div>
                  <div className="a">They live in our home with us as family pets.</div>
                </div>
                <div>
                  <div className="q">What makes FluffyTail different?</div>
                  <div className="a">
                    We are a small, home-based breeder with a personal process, direct
                    communication, and dogs raised in a real family environment.
                  </div>
                </div>
                <div>
                  <div className="q">How do I hear about new puppies first?</div>
                  <div className="a">
                    Join the waitlist and we will reach out when puppies are expected or available.
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
              <span>🏠 Home-raised, family environment</span>
              <span>🐶 Small breeder, not a kennel</span>
              <span>🌎 Primarily Southeast, with broader reach</span>
            </div>

            <div className="ctaRow">
              <WaitlistModal
                waitlistUrl={waitlistUrl}
                buttonLabel="Join the Waitlist"
                className="btn btnPrimary"
              />
              <a className="btn" href={goodDogUrl} target="_blank" rel="noreferrer">
                Request info
              </a>
            </div>

            <div className="divider"></div>

            <p className="lead" style={{margin: 0}}>
              Prefer to browse first? Our GoodDog profile includes past listings, reviews, and
              additional buyer information.
            </p>
          </div>
        </div>
      </div>

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad" style={{paddingBottom: 0}}>
          <h2 style={{margin: '0 0 6px'}}>Current litter and past puppies</h2>
          <p className="lead" style={{margin: 0}}>
            {featuredLitter
              ? `Our newest litter was born ${formatLongDate(
                  featuredLitter.birthDate
                )}. Individual puppy photos are coming soon. Below are a few past puppies as well.`
              : 'Past puppies and upcoming litters will appear here.'}
          </p>
        </div>

        <div className="strip" aria-label="Past puppies">
          <div className="tile">
            <div className="tileImg">
              {featuredLitter?.groupPhotoUrl ? (
                <img src={featuredLitter.groupPhotoUrl} alt="FluffyTail Shih Tzu puppy preview" />
              ) : null}
            </div>
            <div className="tileMeta">
              <p className="tileName">Girl 1</p>
              <p className="tileSub">Coming soon</p>
            </div>
          </div>

          <div className="tile">
            <div className="tileImg">
              {featuredLitter?.groupPhotoUrl ? (
                <img src={featuredLitter.groupPhotoUrl} alt="FluffyTail Shih Tzu puppy preview" />
              ) : null}
            </div>
            <div className="tileMeta">
              <p className="tileName">Girl 2</p>
              <p className="tileSub">Coming soon</p>
            </div>
          </div>

          <div className="tile">
            <div className="tileImg">
              {featuredLitter?.groupPhotoUrl ? (
                <img src={featuredLitter.groupPhotoUrl} alt="FluffyTail Shih Tzu puppy preview" />
              ) : null}
            </div>
            <div className="tileMeta">
              <p className="tileName">Boy 1</p>
              <p className="tileSub">Coming soon</p>
            </div>
          </div>

          <div className="tile">
            <div className="tileImg">
              {featuredLitter?.groupPhotoUrl ? (
                <img src={featuredLitter.groupPhotoUrl} alt="FluffyTail Shih Tzu puppy preview" />
              ) : null}
            </div>
            <div className="tileMeta">
              <p className="tileName">Boy 2</p>
              <p className="tileSub">Coming soon</p>
            </div>
          </div>

          <div className="tile">
            <div className="tileImg">
              {featuredLitter?.groupPhotoUrl ? (
                <img src={featuredLitter.groupPhotoUrl} alt="FluffyTail Shih Tzu puppy preview" />
              ) : null}
            </div>
            <div className="tileMeta">
              <p className="tileName">Boy 3</p>
              <p className="tileSub">Coming soon</p>
            </div>
          </div>
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
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})
}

