export const revalidate = 60

import './home.css'
import {homepageHeadline,homepageIntro,pageDescriptions} from '@/lib/public-copy'
import {editorialSettings} from '@/sanity/lib/editorial-review'
import Link from 'next/link'
import {client} from '@/sanity/lib/client'
import {getBrowsingContext} from '@/sanity/lib/public-availability'
import {AvailabilityScope,AvailabilityActions,AvailabilityInvitation} from './components/Availability'
import {canInquireAboutPuppy, getLittersByStatus} from '@/lib/inventory'
import LitterSection from './components/LitterSection'
import HomeHero from './components/HomeHero'
import StructuredData from './components/StructuredData'
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
  const [publishedSettings, {litters, puppies,availability,inventoryFailed}] = await Promise.all([
    client.fetch<SiteSettings>(siteSettingsQuery, {}, {perspective: 'published', next: {revalidate: 60}}).catch(()=>null),
    getBrowsingContext(),
  ])
  const siteSettings=editorialSettings(publishedSettings)
  const activeLitters = getLittersByStatus(litters, 'current')
  const heroImageUrl = siteSettings?.heroImageUrl || activeLitters[0]?.groupPhotoUrl
  const availableCount = puppies.filter(canInquireAboutPuppy).length
  const designPreview = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview'
  const introHeadline = siteSettings?.homepageHeadline || homepageHeadline

  return <AvailabilityScope initial={availability}><main>
    <StructuredData data={organizationJsonLd} />
    <HomeHero imageUrl={heroImageUrl} preview={designPreview} actions={<AvailabilityActions hero/>} />

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
        <div><p className="eyebrow">Meet the little ones</p><h2 id="puppies-title">Current litters</h2><p>See who’s here, who’s available, and who already has a family waiting.</p></div>
        <span className="pill"><span className="dot" />{inventoryFailed?'Availability to be confirmed':availableCount ? `${availableCount} available ${availableCount === 1 ? 'puppy' : 'puppies'}` : availability.allCurrentReserved?'Families waiting':'Ask about future puppies'}</span>
      </div>
      {activeLitters.length ? activeLitters.map(litter => <LitterSection key={litter._id} litter={litter} puppies={puppies} />) : inventoryFailed?<p role="status">The current puppy details could not be loaded. Please ask Jeanne to confirm availability.</p>:<div className="litter-section"><h3>Looking for the next litter?</h3><p>No current litter is listed here. Tell me when you hope to bring a puppy home.</p><Link className="text-link" href="/contact">Ask Jeanne <span aria-hidden="true">&rarr;</span></Link></div>}
    </section>

    <section className="home-next">
      <div className="brand-container home-next-inner"><AvailabilityInvitation/></div>
    </section>
  </main></AvailabilityScope>
}
