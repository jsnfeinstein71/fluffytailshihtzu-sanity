export const revalidate = 60

import './home.css'
import {client} from '@/sanity/lib/client'
import {getInventory} from '@/sanity/lib/inventory'
import {getLittersByStatus, shouldShowWaitlist} from '@/lib/inventory'
import LitterSection from './components/LitterSection'

export const metadata = {alternates: {canonical: '/'}}

type SiteSettings = {
  title?: string
  homepageHeadline?: string
  homepageIntro?: string
  serviceArea?: string
  heroImageUrl?: string
  heroThumb1Url?: string
  heroThumb2Url?: string
  heroThumb3Url?: string
}

const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  title,
  homepageHeadline,
  homepageIntro,
  serviceArea,
  "heroImageUrl": heroImage.asset->url,
  "heroThumb1Url": heroThumb1.asset->url,
  "heroThumb2Url": heroThumb2.asset->url,
  "heroThumb3Url": heroThumb3.asset->url
}`

export default async function HomePage() {
  const [siteSettings, {litters, puppies}] = await Promise.all([
    client.fetch<SiteSettings>(siteSettingsQuery, {}, {perspective: 'published', next: {revalidate: 60}}),
    getInventory(),
  ])
  const activeLitters = getLittersByStatus(litters, 'current')

  const heroImageUrl = siteSettings?.heroImageUrl || activeLitters[0]?.groupPhotoUrl
  const heroThumb1Url = siteSettings?.heroThumb1Url || activeLitters[0]?.groupPhotoUrl
  const heroThumb2Url = siteSettings?.heroThumb2Url || activeLitters[0]?.groupPhotoUrl
  const heroThumb3Url = siteSettings?.heroThumb3Url || activeLitters[0]?.groupPhotoUrl

  const showWaitlistIndicator = shouldShowWaitlist(litters, puppies)

  return (
    <main className="wrap">
      <div className="nav navPageLinks" style={{marginBottom: '16px'}}>
        <a className="btn" href="/about">About</a>
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
          {showWaitlistIndicator
            ? 'Waitlist open'
            : activeLitters.length > 0
              ? `${activeLitters.length} active litter${activeLitters.length === 1 ? '' : 's'} available`
              : 'Available puppies'}
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
          : 'Browse the site for breed information, puppy resources, and future litter updates.'}
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
              <a className="btn btnPrimary" href="/available-puppies">
                View Available Puppies
              </a>
              <a className="btn" href="/contact">
                Contact
              </a>
              <span className="badge">Home-raised • Family environment</span>
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
                  <div className="q">How do I get in touch?</div>
                  <div className="a">
                    Browse current puppies and use the contact page or puppy inquiry options for questions.
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
              <a className="btn btnPrimary" href="/available-puppies">
                Browse Puppies
              </a>
              <a className="btn" href="/contact">
                Contact
              </a>
            </div>

            <div className="divider"></div>

            <p className="lead" style={{margin: 0}}>
              Visit the contact page for questions, inquiry options, and next steps.
            </p>
          </div>
        </div>
      </div>

      <div className="section" style={{marginTop: '18px'}}>
        <h2 style={{margin: '0 0 10px'}}>Active Litters</h2>
      </div>

      {activeLitters.length > 0 ? (
        activeLitters.map((litter) => <LitterSection key={litter._id} litter={litter} puppies={puppies} />)
      ) : (
        <div className="card section" style={{marginTop: '18px'}}>
          <div className="pad">
            <h2 style={{marginTop: 0}}>No active litters listed</h2>
            <p className="lead" style={{marginBottom: 0}}>Browse the site for breed information, resources, and future litter updates.</p>
          </div>
        </div>
      )}

      <div className="footer">
        © {new Date().getFullYear()} FluffyTail Shih Tzu • In-home raised as family pets
      </div>
    </main>
  )
}

