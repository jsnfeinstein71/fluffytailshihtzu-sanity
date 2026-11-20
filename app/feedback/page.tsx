import type {Metadata} from 'next'
import FeedbackForm from './FeedbackForm'
import FeedbackReviewNotice from '../components/FeedbackReviewNotice'
import './feedback.css'

export const metadata: Metadata = {
  title: 'Share your feedback',
  description: 'Share a little about life with your FluffyTail puppy.',
  robots: {index: false, follow: false},
  referrer: 'no-referrer',
}

export default function FeedbackPage() {
  return <main className="brand-container feedback-page">
    <FeedbackReviewNotice />
    <header className="page-intro">
      <p className="eyebrow">A note to Jeanne</p>
      <h1 className="h1">Share your feedback</h1>
      <p className="lead">I would love to hear about your experience with FluffyTail and how your puppy is doing.</p>
    </header>
    <FeedbackForm />
  </main>
}
