import '../home.css'
import './inquiry.css'
import {notFound} from 'next/navigation'
import Link from 'next/link'
import InquiryForm from '../components/InquiryForm'
import {legacyPuppySlug} from '@/lib/inquiry'
import {getPuppy} from '@/sanity/lib/inventory'
import {unavailablePuppyNotice} from '@/lib/public-copy'
import {canInquireAboutPuppy} from '@/lib/inventory'
import {getPuppyProfilePortrait} from '@/lib/puppy-portraits'

export const metadata = {
  alternates: {canonical: '/puppy-inquiry'},
  title: 'Puppy Inquiry',
  description: 'Submit a puppy inquiry to FluffyTail Shih Tzu.',
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function PuppyInquiryPage({searchParams}: {searchParams: SearchParams}) {
  const params = await searchParams
  const slug = legacyPuppySlug(params)
  const puppy = slug ? await getPuppy(slug) : null
  if (slug && !puppy) notFound()
  const unavailable = puppy && !canInquireAboutPuppy(puppy)
  const puppyPhotoUrl = puppy ? getPuppyProfilePortrait(puppy) || puppy.photoUrl || '' : ''
  const interest = slug ? 'puppy' : params.interest === 'waitlist' ? 'waitlist' : 'general'

  return (
    <main className="wrap inquiry-page">
      <div className="inquiry-page-inner">
      <header className="page-intro">
      <p className="eyebrow">A conversation with Jeanne</p>
      <h1 className="h1">{unavailable ? `${puppy.name || 'This puppy'} is ${puppy.status==='reserved'?'reserved':'unavailable'}.` : puppy ? `Ask Jeanne about ${puppy.name || 'this puppy'}.` : interest === 'waitlist' ? 'Let’s talk about a future puppy.' : 'Say hello to Jeanne.'}</h1>
      <p className="lead">{unavailable ? unavailablePuppyNotice(puppy.name || 'This puppy',puppy.status) : interest === 'waitlist' ? 'Tell Jeanne your timing and what you’re looking for. This starts a conversation; it doesn’t reserve a puppy or guarantee availability.' : puppy?'Tell Jeanne what you’d like to know about this puppy, and a little about the home you have in mind.':'Tell me what you’d like to know about our puppies or upcoming litters.'}</p>
      </header>
      {unavailable ? <div className="inquiry-confirmation">
        
        <div className="ctaRow"><Link className="brand-button" href="/available-puppies">See available puppies</Link><Link className="text-link" href="/puppy-inquiry?interest=waitlist">Ask about future puppies</Link></div>
      </div> : <InquiryForm puppySlug={slug} puppyName={puppy?.name || ''} puppyPhotoUrl={puppyPhotoUrl} litterTitle={puppy?.litterTitle || ''} interest={interest} />}
      </div>
    </main>
  )
}
