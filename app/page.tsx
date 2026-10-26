export const revalidate = 60

import './home.css'
import Link from 'next/link'
import {client} from '@/sanity/lib/client'
import {getInventory} from '@/sanity/lib/inventory'
import {getLittersByStatus, shouldShowWaitlist} from '@/lib/inventory'
import LitterSection from './components/LitterSection'
import HomeHero from './components/HomeHero'

export const metadata = {alternates: {canonical: '/'}}

const approvedIntroHeadline = 'Raised With Love, Welcomed Into Your Family.'

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
  title, homepageHeadline, homepageIntro, serviceArea,
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
  const showWaitlistIndicator = shouldShowWaitlist(litters, puppies)
  const designPreview = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview'
  // Preview approved copy without publishing a change to the live CMS document.
  const introHeadline = designPreview
    ? approvedIntroHeadline
    : siteSettings?.homepageHeadline || approvedIntroHeadline

  return <main>
    <HomeHero imageUrl={heroImageUrl} preview={designPreview} />

    <section className="brand-container home-intro">
      <div><p className="eyebrow">Home-raised in Alabama</p><h2>{introHeadline}</h2></div>
      <div>
        <p>{siteSettings?.homepageIntro || 'FluffyTail Shih Tzu is a small, home-based breeder in Alabama. Our dogs live with us as family pets, and we work with families across the Southeast and beyond.'}</p>
        {siteSettings?.serviceArea ? <p>{siteSettings.serviceArea}</p> : null}
        <Link className="text-link" href="/pricing">Our process, from hello to home <span aria-hidden="true">&rarr;</span></Link>
      </div>
    </section>

    <section className="brand-container home-puppies" aria-labelledby="puppies-title">
      <div className="section-heading">
        <div><p className="eyebrow">Meet the little ones</p><h2 id="puppies-title">Our current litters</h2><p>Find a familiar face. Ask Jeanne about the puppy who catches your eye.</p></div>
        <span className="pill"><span className="dot" />{showWaitlistIndicator ? 'Waitlist open' : `${activeLitters.length} active litter${activeLitters.length === 1 ? '' : 's'}`}</span>
      </div>
      {activeLitters.length ? activeLitters.map(litter => <LitterSection key={litter._id} litter={litter} puppies={puppies} />) : <div className="litter-section"><h3>No active litters listed</h3><p>Visit our upcoming litters or contact Jeanne about future availability.</p><Link className="text-link" href="/upcoming-litters">See upcoming litters <span aria-hidden="true">&rarr;</span></Link></div>}
    </section>

    <section className="home-next">
      <div className="brand-container home-next-inner"><div><p className="eyebrow">Planning a little further ahead?</p><h2>Your next chapter can start here.</h2><p>See upcoming litters and let Jeanne know what you are looking for. There is no need to choose a puppy before saying hello.</p></div><Link className="brand-button" href="/upcoming-litters">Upcoming litters <span aria-hidden="true">&rarr;</span></Link></div>
    </section>
  </main>
}
