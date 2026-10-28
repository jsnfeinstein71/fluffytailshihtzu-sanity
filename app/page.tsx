export const revalidate = 60

import './home.css'
import {homepageHeadline,homepageIntro,pageDescriptions} from '@/lib/public-copy'
import {editorialSettings} from '@/sanity/lib/editorial-review'
import Link from 'next/link'
import {client} from '@/sanity/lib/client'
import {getInventory} from '@/sanity/lib/inventory'
import {canInquireAboutPuppy, getLittersByStatus} from '@/lib/inventory'
import LitterSection from './components/LitterSection'
import HomeHero from './components/HomeHero'

export const metadata = {description:pageDescriptions.home,alternates: {canonical: '/'}}


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
  const [publishedSettings, {litters, puppies}] = await Promise.all([
    client.fetch<SiteSettings>(siteSettingsQuery, {}, {perspective: 'published', next: {revalidate: 60}}),
    getInventory(),
  ])
  const siteSettings=editorialSettings(publishedSettings)
  const activeLitters = getLittersByStatus(litters, 'current')
  const heroImageUrl = siteSettings?.heroImageUrl || activeLitters[0]?.groupPhotoUrl
  const availableCount = puppies.filter(canInquireAboutPuppy).length
  const designPreview = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview'
  const introHeadline = siteSettings?.homepageHeadline || homepageHeadline

  return <main>
    <HomeHero imageUrl={heroImageUrl} preview={designPreview} />

    <section className="brand-container home-intro">
      <div><p className="eyebrow">Shih Tzu puppies in Mobile, Alabama</p><h2>{introHeadline}</h2></div>
      <div>
        {(siteSettings?.homepageIntro || homepageIntro).split(/\n\s*\n/).map((paragraph,index)=><p key={index}>{paragraph}</p>)}
        {siteSettings?.serviceArea ? <p>{siteSettings.serviceArea}</p> : null}
        <Link className="text-link" href="/pricing">How choosing a puppy works <span aria-hidden="true">&rarr;</span></Link>
      </div>
    </section>

    <section className="brand-container home-puppies" aria-labelledby="puppies-title">
      <div className="section-heading">
        <div><p className="eyebrow">Meet the little ones</p><h2 id="puppies-title">Our current litters</h2><p>See who’s here, who’s available, and who already has a family waiting.</p></div>
        <span className="pill"><span className="dot" />{availableCount ? `${availableCount} available ${availableCount === 1 ? 'puppy' : 'puppies'}` : 'Ask about future puppies'}</span>
      </div>
      {activeLitters.length ? activeLitters.map(litter => <LitterSection key={litter._id} litter={litter} puppies={puppies} />) : <div className="litter-section"><h3>Looking for our next litter?</h3><p>We don’t have a current litter listed here. See what’s coming up, or tell Jeanne when you hope to bring a puppy home.</p><Link className="text-link" href="/upcoming-litters">See upcoming litters <span aria-hidden="true">&rarr;</span></Link></div>}
    </section>

    <section className="home-next">
      <div className="brand-container home-next-inner"><div><p className="eyebrow">Not quite ready yet?</p><h2>Let’s talk about your timing.</h2><p>You can start a conversation before you’re ready to choose. See our upcoming litters and tell Jeanne what you have in mind.</p></div><Link className="brand-button" href="/upcoming-litters">See upcoming litters <span aria-hidden="true">&rarr;</span></Link></div>
    </section>
  </main>
}
