import Link from 'next/link'
import '../../home.css'
import '../../content.css'

export default function PaymentLinkUnavailable() {
  return <div className="brand-site">
    <main className="wrap content-page">
      <header className="content-intro">
        <p className="eyebrow">FluffyTail Shih Tzu</p>
        <h1 className="h1">This payment link is unavailable</h1>
        <p className="lead">The link may have expired or may no longer apply. No payment has been taken by opening this link.</p>
      </header>
      <p>If you have already paid, check your receipt before trying again. Contact Jeanne to confirm the next step or request a current link.</p>
      <div className="ctaRow"><Link className="brand-button" href="/contact">Contact Jeanne</Link><Link className="text-link" href="/available-puppies">Meet our puppies</Link></div>
    </main>
  </div>
}
