import '../home.css'
import '../content.css'
import '../puppy-inquiry/inquiry.css'
import {pageDescriptions} from '@/lib/public-copy'
import Link from 'next/link'
import InquiryForm from '../components/InquiryForm'
import {client} from '@/sanity/lib/client'

export const revalidate = 60
import {publicPageMetadata} from '@/lib/seo'
export const metadata = publicPageMetadata({title: 'Contact Jeanne', description:pageDescriptions.contact, path: '/contact'})

type SiteSettings = {goodDogUrl?: string}
const siteSettingsQuery = `*[_type == "siteSettings"][0]{goodDogUrl}`

export default async function ContactPage() {
  const siteSettings = await client.fetch<SiteSettings>(siteSettingsQuery, {}, {perspective: 'published', next: {revalidate: 60}})
  const goodDogUrl = siteSettings?.goodDogUrl || 'https://my.gooddog.com/fluffytail-shih-tzu-alabama'

  return <main className="wrap inquiry-page contact-page">
    <div className="inquiry-page-inner">
    <header className="page-intro"><p className="eyebrow">Let’s talk puppies</p><h1 className="h1">Contact Jeanne</h1><p className="lead">A puppy caught your eye? Wondering about a future litter? Tell me a little about what you’re looking for, and choose how you’d like me to reply.</p></header>
      <InquiryForm interest="general" />
      <section className="contact-followup"><h2>You will be talking directly with me.</h2><p>I handle FluffyTail’s puppy conversations here in the Mobile, Alabama area. Whether you’re ready to choose or just beginning to look, you’re welcome to ask.</p><div className="contact-link-list"><Link className="text-link" href="/available-puppies">Meet our puppies <span aria-hidden="true">&rarr;</span></Link><Link className="text-link" href="/puppy-inquiry?interest=waitlist">Ask about future litters <span aria-hidden="true">&rarr;</span></Link><a href={goodDogUrl} target="_blank" rel="noreferrer">FluffyTail on GoodDog <span aria-hidden="true">&#8599;</span></a></div></section>
    </div>
  </main>
}
