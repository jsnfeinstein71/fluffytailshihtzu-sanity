import FamilyStories from '../components/FamilyStories'
import FeedbackReviewNotice from '../components/FeedbackReviewNotice'
import {listPublicStories} from '@/sanity/lib/feedback'
import {publicPageMetadata} from '@/lib/seo'

export const metadata = publicPageMetadata({
  title: 'Our Families',
  description: 'From our puppy families: stories of life with a FluffyTail Shih Tzu.',
  path: '/our-families',
})

export default async function OurFamiliesPage() {
  const stories = await listPublicStories()
  return <main className="brand-container our-families-page">
    <FeedbackReviewNotice />
    <header className="page-intro">
      <p className="eyebrow">Life with a FluffyTail puppy</p>
      <h1 className="h1">From our puppy families</h1>
      <p className="lead">Little paws become a big part of everyday life. Here, families share their experiences with FluffyTail and the puppies they brought home.</p>
    </header>
    <FamilyStories stories={stories} />
  </main>
}
