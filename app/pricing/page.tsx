import '../home.css'
import Link from 'next/link'
import {getInventory} from '@/sanity/lib/inventory'
import {formatCurrency, normalizeLitterStatus} from '@/lib/inventory'
import {tryPricing} from '@/lib/pricing'

export const revalidate = 60

export const metadata = {title: 'Pricing & Process', alternates: {canonical: '/pricing'}}

export default async function PricingPage() {
  const {litters, puppies} = await getInventory()
  const offered = litters.filter(litter => ['current', 'planned'].includes(normalizeLitterStatus(litter.status) || ''))
  const quotes = offered.map(litter => tryPricing({litterPrice: litter.price, litterDeposit: litter.deposit}))
  quotes.push(...puppies.filter(puppy => offered.some(litter => litter._id === puppy.litterId)).map(tryPricing))
  const prices = quotes.flatMap(quote => quote ? [quote.totalCents / 100] : [])
  const range = prices.length ? [Math.min(...prices), Math.max(...prices)] : []
  const priceText = range.length ? range[0] === range[1] ? formatCurrency(range[0], true) : range.map(value => formatCurrency(value, true)).join(' to ') : 'Please contact FluffyTail to confirm pricing'
  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <Link className="btn" href="/">Home</Link>
        <a className="btn" href="/about">About</a>
        <a className="btn" href="/the-breed">The Breed</a>
        <a className="btn" href="/puppy-resources">Puppy Resources</a>
        <a className="btn" href="/available-puppies">Available Puppies</a>
        <a className="btn" href="/upcoming-litters">Upcoming Litters</a>
        <a className="btn" href="/contact">Contact</a>
      </div>

      <div className="topbar">
        <div className="pill">
          <span className="dot"></span>
          Pricing, deposits, and next steps
        </div>
      </div>

      <h1 className="h1">Pricing & Process</h1>

      <p className="lead">
        We want the process to feel straightforward. This page gives a general overview of pricing,
        deposits, and what to expect when you are interested in a FluffyTail puppy.
      </p>

      <div className="grid">
        <div className="card">
          <div className="pad">
            <div className="section" style={{marginTop: 0}}>
              <h2>General pricing</h2>
              <p className="lead">
                Current and upcoming litter pricing: <strong>{priceText}</strong>.
              </p>
              <p className="lead" style={{marginBottom: 0}}>
                Final pricing may vary by litter, timing, and individual puppy details.
              </p>
            </div>

            <div className="divider"></div>

            <div className="section">
              <h2>Deposit</h2>
              <p className="lead">
                The <strong>deposit shown on each puppy page</strong> is included as part of the overall puppy price.
              </p>
              <p className="lead" style={{marginBottom: 0}}>
                Once a puppy is marked reserved, that means a deposit has typically been placed for that puppy.
              </p>
            </div>

            <div className="divider"></div>

            <div className="section">
              <h2>How the process works</h2>
              <div className="qa">
                <div>
                  <div className="q">1. Browse or inquire</div>
                  <div className="a">
                    Start by browsing active litters and puppy pages, then request info if a puppy catches your eye.
                  </div>
                </div>
                <div>
                  <div className="q">2. Ask questions</div>
                  <div className="a">
                    We encourage families to ask about availability, timing, fit, and next steps before making a decision.
                  </div>
                </div>
                <div>
                  <div className="q">3. Reserve a puppy</div>
                  <div className="a">
                    When a puppy is selected and the deposit is placed, that puppy will be marked reserved on the site.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="pad">
            <h2 className="panelTitle">At a glance</h2>
            <div className="meta">
              <span>Current prices: {priceText}</span>
              <span>📌 Deposit: See the individual puppy page</span>
              <span>🐶 Reserved status shown on puppy listings</span>
              <span>📬 Questions welcome before committing</span>
            </div>

            <div className="divider"></div>

            <p className="lead" style={{margin: 0}}>
              If you are interested in a specific puppy, the best next step is to use that puppy’s inquiry button.
            </p>
          </div>
        </div>
      </div>

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad">
          <h2 style={{marginTop: 0}}>Ready to take the next step?</h2>
          <p className="lead">
            Browse current puppies, review active litters, or contact us with questions.
          </p>

          <div className="ctaRow">
            <a className="btn" href="/available-puppies">
              View Available Puppies
            </a>
            <a className="btn" href="/upcoming-litters">
              View Upcoming Litters
            </a>
            <a className="btn btnPrimary" href="/contact">
              Contact
            </a>
          </div>
        </div>
      </div>

      <div className="footer">
        © {new Date().getFullYear()} FluffyTail Shih Tzu • In-home raised as family pets
      </div>
    </main>
  )
}

