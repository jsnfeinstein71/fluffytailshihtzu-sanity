import '../home.css'
import Link from 'next/link'
import InquiryForm from '../components/InquiryForm'

export const revalidate = 60
export const metadata = {title: 'Contact', alternates: {canonical: '/contact'}}
import {client} from '@/sanity/lib/client'

type SiteSettings = {
  goodDogUrl?: string
}

const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  goodDogUrl
}`

export default async function ContactPage() {
  const siteSettings = await client.fetch<SiteSettings>(siteSettingsQuery, {}, {perspective: 'published', next: {revalidate: 60}})

  const goodDogUrl =
    siteSettings?.goodDogUrl ||
    'https://my.gooddog.com/fluffytail-shih-tzu-alabama'

  const waitlistUrl = '/puppy-inquiry?interest=waitlist'
  const puppyInquiryUrl = '/puppy-inquiry'

  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <Link className="btn" href="/">Home</Link>
        <a className="btn" href="/about">About</a>
        <a className="btn" href="/available-puppies">Available Puppies</a>
        <a className="btn" href="/upcoming-litters">Upcoming Litters</a>
      </div>

      <div className="topbar">
        <div className="pill">
          <span className="dot"></span>
          Contact and waitlist
        </div>

        <div className="nav">
          {waitlistUrl ? (
            <a className="btn btnPrimary" href={waitlistUrl}>
              Open Waitlist
            </a>
          ) : null}
          <a className="btn" href={goodDogUrl} target="_blank" rel="noreferrer">
            View on GoodDog
          </a>
        </div>
      </div>

      <h1 className="h1">Contact FluffyTail Shih Tzu</h1>

      <p className="lead">
        For general future interest, the waitlist is the best first step. If you are asking about a
        specific puppy, please use that puppy’s individual inquiry button from its puppy page.
      </p>

      <div className="grid" style={{marginTop: '18px'}}>
        <div className="card">
          <div className="pad">
            <div className="section" style={{marginTop: 0}}>
              <h2>Join the waitlist</h2>
              <p className="lead">
                This is the best way to hear about future availability and upcoming litters directly
                from FluffyTail.
              </p>

              <div className="ctaRow">
                {waitlistUrl ? (
                  <a className="btn btnPrimary" href={waitlistUrl}>
                    Join the Waitlist
                  </a>
                ) : null}
                <a className="btn" href={goodDogUrl} target="_blank" rel="noreferrer">
                  Open GoodDog Profile
                </a>
              </div>
            </div>

            <div className="divider"></div>

            <div className="section">
              <h2>How to ask about a specific puppy</h2>
              <div className="qa">
                <div>
                  <div className="q">Use the puppy page button</div>
                  <div className="a">
                    Every puppy page should send you into the dedicated inquiry form with the puppy
                    and litter already included.
                  </div>
                </div>
                <div>
                  <div className="q">Keep waitlist and puppy inquiry separate</div>
                  <div className="a">
                    The waitlist is for general future interest. The puppy inquiry form is for a
                    specific puppy.
                  </div>
                </div>
                <div>
                  <div className="q">Cleaner follow-up</div>
                  <div className="a">
                    This helps FluffyTail know exactly which puppy you are asking about from the
                    start.
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
              <span>📍 Mobile, Alabama area</span>
              <span>📬 Direct waitlist updates</span>
              <span>🐶 Small home-based breeder</span>
              <span>🌎 Primarily Southeast, with broader reach</span>
            </div>

            <div className="ctaRow">
              {waitlistUrl ? (
                <a className="btn btnPrimary" href={waitlistUrl}>
                  Join the Waitlist
                </a>
              ) : null}
              <a className="btn" href={goodDogUrl} target="_blank" rel="noreferrer">
                Request info
              </a>
            </div>

            {puppyInquiryUrl ? (
              <>
                <div className="divider"></div>
                <p className="lead" style={{margin: 0}}>
                  Puppy-specific inquiries are handled from each puppy page so the correct puppy and
                  litter details can be passed into the form automatically.
                </p>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad">
          <h2 style={{marginTop: 0}}>Waitlist form</h2>

          <InquiryForm interest="waitlist" />
        </div>
      </div>

      <div className="footer">
        © {new Date().getFullYear()} FluffyTail Shih Tzu • In-home raised as family pets
      </div>
    </main>
  )
}
