import '../home.css'
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

  return <main className="wrap">
    <header className="page-intro"><p className="eyebrow">A conversation with Jeanne</p><h1 className="h1">Let us help you find your puppy.</h1><p className="lead">Have a question, or planning for a future litter? Tell Jeanne a little about yourself and how you would like to hear back.</p></header>
    <div className="inquiry-layout">
      <InquiryForm interest="waitlist" />
      <aside className="inquiry-aside"><h2>A personal hello.</h2><p>FluffyTail is a small, home-based breeder in the Mobile, Alabama area. You will be talking directly with Jeanne.</p><p>Interested in a particular puppy? Start with their page so the puppy and litter details travel with your inquiry.</p><p><Link className="text-link" href="/available-puppies">Meet our puppies <span aria-hidden="true">&rarr;</span></Link></p><p><Link className="text-link" href="/puppy-inquiry?interest=waitlist">Ask about future litters <span aria-hidden="true">&rarr;</span></Link></p><p><a href={goodDogUrl} target="_blank" rel="noreferrer">Visit FluffyTail on GoodDog <span aria-hidden="true">&#8599;</span></a></p></aside>
    </div>
  </main>
}
