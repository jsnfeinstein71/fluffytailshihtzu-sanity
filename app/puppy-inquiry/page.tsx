import '../home.css'
import './inquiry.css'
import {notFound} from 'next/navigation'
import InquiryForm from '../components/InquiryForm'
import {legacyPuppySlug} from '@/lib/inquiry'
import {getPuppy} from '@/sanity/lib/inventory'

export const metadata = {
  alternates: {canonical: '/puppy-inquiry'},
  title: 'Puppy Inquiry | FluffyTail Shih Tzu',
  description: 'Submit a puppy inquiry to FluffyTail Shih Tzu.',
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function PuppyInquiryPage({searchParams}: {searchParams: SearchParams}) {
  const params = await searchParams
  const slug = legacyPuppySlug(params)
  const puppy = slug ? await getPuppy(slug) : null
  if (slug && !puppy) notFound()
  const interest = slug ? 'puppy' : params.interest === 'waitlist' ? 'waitlist' : 'general'

  return (
    <main className="wrap inquiry-page">
      <div className="inquiry-page-inner">
      <header className="page-intro">
      <p className="eyebrow">A conversation with Jeanne</p>
      <h1 className="h1">{puppy ? `Ask about ${puppy.name || 'this puppy'}.` : interest === 'waitlist' ? 'Ask about future puppies.' : 'Say hello to Jeanne.'}</h1>
      <p className="lead">Jeanne is happy to answer your questions.</p>
      </header>
      <InquiryForm puppySlug={slug} puppyName={puppy?.name || ''} puppyPhotoUrl={puppy?.photoUrl || ''} litterTitle={puppy?.litterTitle || ''} interest={interest} />
      </div>
    </main>
  )
}
