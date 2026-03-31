export const revalidate = 60

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
  heroImageUrl?: string
  heroThumb1Url?: string
  heroThumb2Url?: string
  heroThumb3Url?: string
}

type Litter = {
  _id: string
  title?: string
  birthDate?: string
  girlsCount?: number
  boysCount?: number
  summary?: string
  groupPhotoUrl?: string
}

type Puppy = {
  _id: string
  name?: string
  sex?: 'female' | 'male'
  status?: 'available' | 'hold' | 'reserved' | 'gone-home'
  notes?: string
  sortOrder?: number
  litterId?: string
  photoUrl?: string
}

const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  title,
  homepageHeadline,
  homepageIntro,
  goodDogUrl,
  waitlistUrl,
  serviceArea,
  "heroImageUrl": heroImage.asset->url,
  "heroThumb1Url": heroThumb1.asset->url,
  "heroThumb2Url": heroThumb2.asset->url,
  "heroThumb3Url": heroThumb3.asset->url
}`

const featuredLitterQuery = `*[_type == "litter" && featured == true][0]{
  _id,
  title,
  birthDate,
  girlsCount,
  boysCount,
  summary,
  "groupPhotoUrl": groupPhoto.asset->url
}`

const puppiesQuery = `*[_type == "puppy"] | order(sortOrder asc, name asc){
  _id,
  name,
  sex,
  status,
  notes,
  sortOrder,
  "litterId": litter->_id,
  "photoUrl": photo.asset->url
}`

export default async function HomePage() {
  const siteSettings = await client.fetch<SiteSettings>(siteSettingsQuery)
  const featuredLitter = await client.fetch<Litter>(featuredLitterQuery)
  const puppies = await client.fetch<Puppy[]>(puppiesQuery)

  const waitlistUrl = siteSettings?.waitlistUrl || '#'
  const heroImageUrl = siteSettings?.heroImageUrl || featuredLitter?.groupPhotoUrl
  const heroThumb1Url = siteSettings?.heroThumb1Url || featuredLitter?.groupPhotoUrl
  const heroThumb2Url = siteSettings?.heroThumb2Url || featuredLitter?.groupPhotoUrl
  const heroThumb3Url = siteSettings?.heroThumb3Url || featuredLitter?.groupPhotoUrl

  const featuredPuppies = featuredLitter
    ? puppies.filter((puppy) => puppy.litterId === featuredLitter._id)
    : []

  return (
    <main className="wrap">
      <div className="nav navPageLinks" style={{marginBottom: '16px'}}>
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

        <div className="nav navActions">
          <WaitlistModal
            waitlistUrl={waitlistUrl}
            buttonLabel="Join the Waitlist"
            className="btn btnPrimary"
          />
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

      {featuredLitter ? (
        <div className="grid">
          <div className="card">
            <div className="photos photosHome">
              <div className="heroPhoto">
                {heroImageUrl ? (
                  <img
                    src={heroImageUrl}
                    alt="FluffyTail Shih Tzu homepage hero image"
                  />
                ) : null}
              </div>

              <div className="thumbs thumbsHome">
                <div className="thumb">
                  {heroThumb1Url ? (
                    <img
                      src={heroThumb1Url}
                      alt="FluffyTail Shih Tzu homepage thumb 1"
                    />
                  ) : null}
                </div>
                <div className="thumb">
                  {heroThumb2Url ? (
                    <img
                      src={heroThumb2Url}
                      alt="FluffyTail Shih Tzu homepage thumb 2"
                    />
                  ) : null}
                </div>
                <div className="thumb">
                  {heroThumb3Url ? (
                    <img
                      src={heroThumb3Url}
                      alt="FluffyTail Shih Tzu homepage thumb 3"
                    />
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
                <a className="btn" href="/contact">
                  Contact
                </a>
              </div>

              <div className="divider"></div>

              <p className="lead" style={{margin: 0}}>
                Prefer to browse first? Visit the contact page for questions, waitlist info, and next steps.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{marginTop: '16px'}}>
          <div className="pad">
            <h2 style={{marginTop: 0}}>No featured litter listed</h2>
            <p className="lead" style={{marginBottom: 0}}>
              Join the waitlist for updates and first notice when puppies are expected or available.
            </p>
          </div>
        </div>
      )}

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad" style={{paddingBottom: 0}}>
          <h2 style={{margin: '0 0 6px'}}>Current litter and puppies</h2>
          <p className="lead" style={{margin: 0}}>
            {featuredLitter
              ? `Our newest litter was born ${formatLongDate(
                  featuredLitter.birthDate
                )}. Meet the puppies below.`
              : 'Current puppies will appear here.'}
          </p>
        </div>

        <div className="strip" aria-label="Current puppies">
          {featuredPuppies.length > 0 ? (
            featuredPuppies.map((puppy) => (
              <div className="tile" key={puppy._id}>
                <div className="tileImg">
                  {puppy.photoUrl ? (
                    <img src={puppy.photoUrl} alt={puppy.name || 'Puppy'} />
                  ) : null}
                </div>
                <div className="tileMeta">
                  <p className="tileName">{puppy.name || 'Unnamed puppy'}</p>
                  <p className="tileSub">{formatPuppyStatus(puppy.status)}</p>
                </div>
              </div>
            ))
          ) : (
            <div style={{padding: '14px 16px 18px', color: '#5a6472'}}>
              No puppies listed yet.
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

function formatPuppyStatus(status?: string) {
  if (status === 'available') return 'Available'
  if (status === 'hold') return 'Hold'
  if (status === 'reserved') return 'Reserved'
  if (status === 'gone-home') return 'Gone Home'
  return 'Available'
}

