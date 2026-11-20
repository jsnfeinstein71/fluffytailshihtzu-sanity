export const revalidate = 3600

import './home.css'
import {homepageHeadline,homepageIntro,pageDescriptions} from '@/lib/public-copy'
import {editorialSettings} from '@/sanity/lib/editorial-review'
import Link from 'next/link'
import {client} from '@/sanity/lib/client'
import {getInventory} from '@/sanity/lib/inventory'
import {canInquireAboutPuppy, getLittersByStatus} from '@/lib/inventory'
import LitterSection from './components/LitterSection'
import HomeHero from './components/HomeHero'
import StructuredData from './components/StructuredData'
import FamilyStories from './components/FamilyStories'
import FeedbackReviewNotice from './components/FeedbackReviewNotice'
import {listPublicStories} from '@/sanity/lib/feedback'
import {homeTitle, organizationJsonLd, publicPageMetadata} from '@/lib/seo'

export const metadata = publicPageMetadata({title: homeTitle, description: pageDescriptions.home, path: '/'})


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
  const [publishedSettings, {litters, puppies}, stories] = await Promise.all([
    client.fetch<SiteSettings>(siteSettingsQuery, {}, {perspective: 'published', next: {revalidate: 3600}}),
    getInventory(),
    listPublicStories(),
  ])
  const siteSettings=editorialSettings(publishedSettings)
  const activeLitters = getLittersByStatus(litters, 'current')
  const heroImageUrl = siteSettings?.heroImageUrl || activeLitters[0]?.groupPhotoUrl
  const availableCount = puppies.filter(canInquireAboutPuppy).length
  const designPreview = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview'
  const introHeadline = siteSettings?.homepageHeadline || homepageHeadline
  const featuredStories = stories.filter(story => story.featured).slice(0, 3)

  return <main>
    <StructuredData data={organizationJsonLd} />
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
        <div><p className="eyebrow">Meet the little ones</p><h2 id="puppies-title">Current litters</h2><p>Meet the puppies who are currently available.</p></div>
        <span className="pill"><span className="dot" />{availableCount ? `${availableCount} available ${availableCount === 1 ? 'puppy' : 'puppies'}` : 'Ask about future puppies'}</span>
      </div>
      {activeLitters.length ? activeLitters.map(litter => <LitterSection key={litter._id} litter={litter} puppies={puppies} />) : <div className="litter-section"><h3>Looking for the next litter?</h3><p>No current litter is listed here. See what’s coming up, or tell me when you hope to bring a puppy home.</p><Link className="text-link" href="/upcoming-litters">See upcoming litters <span aria-hidden="true">&rarr;</span></Link></div>}
    </section>

    <section id="owner-stories" className="brand-container home-family-stories" aria-labelledby="family-stories-title">
      <FeedbackReviewNotice />
      <div className="family-stories-panel">
        <div>
          <p className="eyebrow">Their words, their experience</p>
          <h2 id="family-stories-title">From our puppy families</h2>
          <p className="family-stories-intro">Choosing a puppy is personal. Get to know FluffyTail through the experiences of families who have brought one of our little ones home.</p>
        </div>
        <div className="family-stories-action">
          <Link className="brand-button" href="/our-families">Meet our families <span aria-hidden="true">&rarr;</span></Link>
        </div>
      </div>
      {featuredStories.length ? <FamilyStories stories={featuredStories} home /> : stories.length ? null : <FamilyStories stories={[]} home />}
    </section>

    <section className="home-next">
      <div className="brand-container home-next-inner"><div><p className="eyebrow">Not quite ready yet?</p><h2>Let’s talk about your timing.</h2><p>You can start a conversation before you’re ready to choose. See the upcoming litters and tell me what you have in mind.</p></div><Link className="brand-button" href="/upcoming-litters">See upcoming litters <span aria-hidden="true">&rarr;</span></Link></div>
    </section>
  </main>
}
