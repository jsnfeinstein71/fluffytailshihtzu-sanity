import '../home.css'
import '../content.css'
import '../puppy-inquiry/inquiry.css'
import Link from 'next/link'
import InquiryForm from '../components/InquiryForm'
import {client} from '@/sanity/lib/client'

export const revalidate = 60
export const metadata = {title: 'Contact', alternates: {canonical: '/contact'}}

type SiteSettings = {goodDogUrl?: string}
const siteSettingsQuery = `*[_type == "siteSettings"][0]{goodDogUrl}`

export default async function ContactPage() {
  const siteSettings = await client.fetch<SiteSettings>(siteSettingsQuery, {}, {perspective: 'published', next: {revalidate: 60}})
  const goodDogUrl = siteSettings?.goodDogUrl || 'https://my.gooddog.com/fluffytail-shih-tzu-alabama'

  return <main className="wrap inquiry-page contact-page">
    <div className="inquiry-page-inner">
    <header className="page-intro"><p className="eyebrow">A conversation with Jeanne</p><h1 className="h1">Contact Jeanne</h1><p className="lead">Have a question, or planning for a future litter?</p></header>
      <InquiryForm interest="general" />
      <section className="contact-followup"><h2>A personal hello.</h2><p>FluffyTail is a small, home-based breeder in the Mobile, Alabama area. You will be talking directly with Jeanne.</p><div className="contact-link-list"><Link className="text-link" href="/available-puppies">Meet our puppies <span aria-hidden="true">&rarr;</span></Link><Link className="text-link" href="/puppy-inquiry?interest=waitlist">Ask about future litters <span aria-hidden="true">&rarr;</span></Link><a href={goodDogUrl} target="_blank" rel="noreferrer">Visit FluffyTail on GoodDog <span aria-hidden="true">&#8599;</span></a></div></section>
    </div>
  </main>
}
