import './feedback-review-notice.css'

export default function FeedbackReviewNotice() {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.FLUFFYTAIL_FEEDBACK_ENABLED !== '1') return null
  return <p className="feedback-review-notice"><strong>TEST PREVIEW</strong> — Fictional feedback for reviewing this feature. Please use fictional details only.</p>
}
