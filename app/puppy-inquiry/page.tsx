import '../home.css'
import './inquiry.css'
import {notFound} from 'next/navigation'
import Link from 'next/link'
import InquiryForm from '../components/InquiryForm'
import {legacyPuppySlug} from '@/lib/inquiry'
import {getPuppy} from '@/sanity/lib/inventory'
import {canInquireAboutPuppy, formatPuppyStatus} from '@/lib/inventory'
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
      <h1 className="h1">{unavailable ? `${puppy.name || 'This puppy'} is unavailable.` : puppy ? `Ask about ${puppy.name || 'this puppy'}.` : interest === 'waitlist' ? 'Ask about future puppies.' : 'Say hello to Jeanne.'}</h1>
      <p className="lead">{unavailable ? `${puppy.name || 'This puppy'} is not currently available for a new reservation. Status: ${formatPuppyStatus(puppy.status)}.` : interest === 'waitlist' ? 'Tell Jeanne what you are looking for. An inquiry does not reserve a puppy or guarantee future availability.' : 'Jeanne is happy to answer your questions.'}</p>
      </header>
      {unavailable ? <div className="inquiry-confirmation">
        <p>Browse current puppies or ask Jeanne about other availability.</p>
        <div className="ctaRow"><Link className="brand-button" href="/available-puppies">Meet our puppies</Link><Link className="text-link" href="/contact">Contact Jeanne</Link></div>
      </div> : <InquiryForm puppySlug={slug} puppyName={puppy?.name || ''} puppyPhotoUrl={puppyPhotoUrl} litterTitle={puppy?.litterTitle || ''} interest={interest} />}
      </div>
    </main>
  )
}
