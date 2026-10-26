import '../home.css'
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
    <main className="wrap">
      <header className="page-intro">
      <p className="eyebrow">A conversation with Jeanne</p>
      <h1 className="h1">{puppy ? `Ask about ${puppy.name || 'this puppy'}.` : 'Let us get to know you.'}</h1>
      <p className="lead">
        Ask Jeanne about a puppy or future availability. Choose how you would like us to follow up.
      </p>
      </header>
      <div className="inquiry-layout">
      <InquiryForm puppySlug={slug} puppyName={puppy?.name || ''} litterTitle={puppy?.litterTitle || ''} interest={interest} />
      <aside className="inquiry-aside"><h2>Small breeder. Personal connection.</h2><p>Jeanne can answer your questions about timing, temperament and life with a Shih Tzu.</p><p>Email is always an option. Choose Text or Either only if you would like SMS follow-up.</p></aside>
      </div>
    </main>
  )
}
