import '../home.css'
import Link from 'next/link'
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
      <div className="nav" style={{marginBottom: '16px'}}>
        <Link className="btn" href="/">Home</Link>
        <Link className="btn" href="/available-puppies">Available Puppies</Link>
        <Link className="btn" href="/contact">Contact</Link>
      </div>
      <h1 className="h1">FluffyTail Shih Tzu Puppy Inquiry</h1>
      <p className="lead">
        Ask Jeanne about a puppy or future availability. Choose how you would like us to follow up.
      </p>
      <InquiryForm puppySlug={slug} puppyName={puppy?.name || ''} litterTitle={puppy?.litterTitle || ''} interest={interest} />
      <div className="footer">&copy; {new Date().getFullYear()} FluffyTail Shih Tzu - In-home raised as family pets</div>
    </main>
  )
}
