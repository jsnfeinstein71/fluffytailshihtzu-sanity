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
  status?: string
  price?: number
  deposit?: number
  groupPhotoUrl?: string
}

type Puppy = {
  _id: string
  name?: string
  slug?: string
  sex?: 'female' | 'male'
  status?: 'available' | 'hold' | 'reserved' | 'gone-home'
  color?: string
  notes?: string
  sortOrder?: number
  litterId?: string
  birthDate?: string
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

const activeLittersQuery = `*[_type == "litter" && status in ["active", "current"]] | order(sortOrder asc, birthDate asc){
  _id,
  title,
  birthDate,
  girlsCount,
  boysCount,
  summary,
  status,
  price,
  deposit,
  "groupPhotoUrl": groupPhoto.asset->url
}`

const puppiesQuery = `*[_type == "puppy"] | order(sortOrder asc, name asc){
  _id,
  name,
  "slug": slug.current,
  sex,
  status,
  color,
  notes,
  sortOrder,
  "litterId": litter->_id,
  "birthDate": litter->birthDate,
  "photoUrl": photo.asset->url
}`

export default async function HomePage() {
  const siteSettings = await client.fetch<SiteSettings>(siteSettingsQuery)
  const activeLitters = await client.fetch<Litter[]>(activeLittersQuery)
  const puppies = await client.fetch<Puppy[]>(puppiesQuery)

  const waitlistUrl = siteSettings?.waitlistUrl || '#'
  const heroImageUrl = siteSettings?.heroImageUrl || activeLitters[0]?.groupPhotoUrl
  const heroThumb1Url = siteSettings?.heroThumb1Url || activeLitters[0]?.groupPhotoUrl
  const heroThumb2Url = siteSettings?.heroThumb2Url || activeLitters[0]?.groupPhotoUrl
  const heroThumb3Url = siteSettings?.heroThumb3Url || activeLitters[0]?.groupPhotoUrl

  const matchedPuppies = puppies.filter((puppy) => puppy.status === 'reserved')

  return (
    <main className="wrap">
      <div className="nav navPageLinks" style={{marginBottom: '16px'}}>
        <a className="btn" href="/about">About</a>
        <a className="btn" href="/the-breed">The Breed</a>
        <a className="btn" href="/available-puppies">Available Puppies</a>
        <a className="btn" href="/upcoming-litters">Upcoming Litters</a>
        <a className="btn" href="/contact">Contact</a>
      </div>

      <div className="topbar">
        <div className="pill">
          <span className="dot"></span>
          {activeLitters.length > 0
            ? `${activeLitters.length} active litter${activeLitters.length === 1 ? '' : 's'} • Waitlist open`
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
        {activeLitters.length > 0
          ? `We currently have ${activeLitters.length} active litter${activeLitters.length === 1 ? '' : 's'} on the site. Browse the active litters and puppies below.`
          : 'Join the waitlist for updates and first notice when puppies are expected or available.'}
      </p>

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
              <span>📂 {activeLitters.length} active litter{activeLitters.length === 1 ? '' : 's'}</span>
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
              Visit the contact page for questions, waitlist info, and next steps.
            </p>
          </div>
        </div>
      </div>

      <div className="section" style={{marginTop: '18px'}}>
        <h2 style={{margin: '0 0 10px'}}>Active Litters</h2>
      </div>

      {activeLitters.length > 0 ? (
        activeLitters.map((litter) => {
          const litterPuppies = puppies.filter((puppy) => puppy.litterId === litter._id)
          const availableLitterPuppies = litterPuppies.filter((puppy) => puppy.status !== 'reserved')

          return (
            <div className="card section" style={{marginTop: '18px'}} key={litter._id}>
              <div className="pad" style={{paddingBottom: 0}}>
                <h2 style={{margin: '0 0 6px'}}>
                  {litter.title || 'Active litter'}
                </h2>
                <p className="lead" style={{margin: 0}}>
                  Born {formatLongDate(litter.birthDate)} • {litter.girlsCount ?? 0} girls • {litter.boysCount ?? 0} boys
                </p>

                {litter.price ? (
                  <p className="lead" style={{marginTop: '10px', marginBottom: 0, fontWeight: 700}}>
                    {formatCurrency(litter.price)}
                    {litter.deposit ? `, including a ${formatCurrency(litter.deposit)} deposit` : ''}
                  </p>
                ) : null}

                {litter.summary ? (
                  <p className="lead" style={{marginTop: '10px', marginBottom: 0}}>
                    {litter.summary}
                  </p>
                ) : null}
              </div>

              <div className="puppyGrid">
                {availableLitterPuppies.length > 0 ? (
                  availableLitterPuppies.map((puppy) => (
                    <a
                      className="puppyCard puppyCardLink"
                      key={puppy._id}
                      href={puppy.slug ? `/puppies/${puppy.slug}` : '/available-puppies'}
                    >
                      <div className="puppyImageWrap">
                        {puppy.photoUrl ? (
                          <img
                            className="puppyImage"
                            src={puppy.photoUrl}
                            alt={puppy.name || 'Puppy'}
                          />
                        ) : null}
                      </div>
                      <div className="puppyCardBody">
                        <div className="puppyCardTop">
                          <h3 className="puppyName">{puppy.name || 'Unnamed puppy'}</h3>
                          <span className={`statusBadge status-${puppy.status || 'available'}`}>
                            {formatPuppyStatus(puppy.status)}
                          </span>
                        </div>

                        <p className="puppyMetaLine">
                          {getAgeInWeeks(puppy.birthDate)} week
                          {getAgeInWeeks(puppy.birthDate) === 1 ? '' : 's'} old •{' '}
                          {puppy.sex === 'female' ? 'Female' : puppy.sex === 'male' ? 'Male' : 'Puppy'}
                        </p>

                        {puppy.color ? <p className="puppyNotes">{puppy.color}</p> : null}

                        {getReadyDate(puppy.birthDate) ? (
                          <div style={{marginTop: '10px'}}>
                            <span className="badge">{`Ready ${getReadyDate(puppy.birthDate)}`}</span>
                          </div>
                        ) : null}
                      </div>
                    </a>
                  ))
                ) : (
                  <div style={{padding: '12px', color: '#5a6472'}}>
                    No available puppies listed yet for this litter.
                  </div>
                )}
              </div>
            </div>
          )
        })
      ) : (
        <div className="card section" style={{marginTop: '18px'}}>
          <div className="pad">
            <h2 style={{marginTop: 0}}>No active litters listed</h2>
            <p className="lead" style={{marginBottom: 0}}>
              Join the waitlist for updates and first notice when puppies are expected or available.
            </p>
          </div>
        </div>
      )}

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad" style={{paddingBottom: 0}}>
          <h2 style={{margin: '0 0 6px'}}>Matched Puppies</h2>
          <p className="lead" style={{margin: 0}}>
            These puppies have been matched with their families.
          </p>
        </div>

        <div className="puppyGrid">
          {matchedPuppies.length > 0 ? (
            matchedPuppies.map((puppy) => (
              <a
                className="puppyCard puppyCardLink"
                key={puppy._id}
                href={puppy.slug ? `/puppies/${puppy.slug}` : '/available-puppies'}
              >
                <div className="puppyImageWrap">
                  {puppy.photoUrl ? (
                    <img
                      className="puppyImage"
                      src={puppy.photoUrl}
                      alt={puppy.name || 'Puppy'}
                    />
                  ) : null}
                </div>

                <div className="puppyCardBody">
                  <div className="puppyCardTop">
                    <h3 className="puppyName">{puppy.name || 'Unnamed puppy'}</h3>
                    <span className={`statusBadge status-${puppy.status || 'reserved'}`}>
                      Matched
                    </span>
                  </div>

                  <p className="puppyMetaLine">
                    {getAgeInWeeks(puppy.birthDate)} week
                    {getAgeInWeeks(puppy.birthDate) === 1 ? '' : 's'} old •{' '}
                    {puppy.sex === 'female' ? 'Female' : puppy.sex === 'male' ? 'Male' : 'Puppy'}
                  </p>

                  {puppy.color ? <p className="puppyNotes">{puppy.color}</p> : null}

                  {getReadyDate(puppy.birthDate) ? (
                    <div style={{marginTop: '10px'}}>
                      <span className="badge">{`Ready ${getReadyDate(puppy.birthDate)}`}</span>
                    </div>
                  ) : null}
                </div>
              </a>
            ))
          ) : (
            <div style={{padding: '12px', color: '#5a6472'}}>
              No matched puppies listed yet.
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

function formatLongDate(date?: string) {
  if (!date) return 'Unknown'
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

function getAgeInWeeks(birthDate?: string) {
  if (!birthDate) return 1

  const born = new Date(birthDate)
  const now = new Date()
  const diffMs = now.getTime() - born.getTime()
  const weeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7))

  return Math.max(1, weeks)
}

function getReadyDate(birthDate?: string) {
  if (!birthDate) return ''

  const born = new Date(birthDate)
  const ready = new Date(born)
  ready.setDate(ready.getDate() + 56)

  return ready.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
      }
