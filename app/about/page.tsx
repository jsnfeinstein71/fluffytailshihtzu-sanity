import '../home.css'
import '../content.css'
import {getInventory} from '@/sanity/lib/inventory'
import {getLittersByStatus} from '@/lib/inventory'

export const revalidate = 60
export const metadata = {title: 'About', alternates: {canonical: '/about'}}
import {client} from '@/sanity/lib/client'

type SiteSettings = {
  serviceArea?: string
}

const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  serviceArea
}`

export default async function AboutPage() {
  const [siteSettings, {litters}] = await Promise.all([
    client.fetch<SiteSettings>(siteSettingsQuery, {}, {perspective: 'published', next: {revalidate: 60}}),
    getInventory(),
  ])
  const photo = getLittersByStatus(litters, 'current').find(litter => litter.groupPhotoUrl)?.groupPhotoUrl

  return (
    <main className="wrap content-page">

      <header className="content-intro">
      <p className="eyebrow">Small home-based breeder</p>
      <h1 className="h1">About FluffyTail Shih Tzu</h1>

      <p className="lead">
        FluffyTail Shih Tzu is a small, home-based breeder in Alabama. Our dogs live with us as
        family pets, not in a kennel.
      </p>

      <p className="sublead">
        {siteSettings?.serviceArea ||
          'Primarily serving the Southeast, with approved homes beyond the region.'}
      </p>

      </header>
      <div className={`grid${photo ? ' content-has-photo' : ''}`}>
        {photo ? <figure className="content-photo"><img src={photo} alt="A FluffyTail Shih Tzu" loading="eager" decoding="async" /><figcaption>From our FluffyTail family.</figcaption></figure> : null}
        <div className="card content-copy">
          <div className="pad">
            <div className="section" style={{marginTop: 0}}>
              <h2>Our approach</h2>
              <p className="lead">
                We work directly with families who are considering a puppy and welcome questions
                about availability, timing, and next steps.
              </p>
              <p className="lead" style={{marginBottom: 0}}>
                Browse each puppy’s details, then contact Jeanne about the puppy or future litter
                you are interested in.
              </p>
            </div>

            <div className="divider"></div>

            <div className="section">
              <h2>About Jeanne</h2>
              <p className="lead">
                Jeanne is the breeder behind FluffyTail Shih Tzu in the Mobile, Alabama area.
                Her breeding dogs live in her home.
              </p>
              <p className="lead">
                She is your point of contact for questions about current puppies and upcoming litters.
              </p>
            </div>

            <div className="divider"></div>

            <div className="section">
              <h2>What matters to us</h2>
              <div className="qa">
                <div>
                  <div className="q">Daily life</div>
                  <div className="a">
                    Our dogs are part of the household.
                  </div>
                </div>
                <div>
                  <div className="q">Questions welcome</div>
                  <div className="a">
                    Ask about a puppy’s availability and the next step before making a decision.
                  </div>
                </div>
                <div>
                  <div className="q">Planning ahead</div>
                  <div className="a">
                    You can ask about future litters even if you are not choosing a puppy today.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card content-aside">
          <div className="pad">
            <h2 className="panelTitle">At a glance</h2>
            <ul className="content-facts">
              <li>Mobile, Alabama area</li>
              <li>In-home raised</li>
              <li>Small breeder, not a kennel</li>
              <li>Southeast and beyond</li>
            </ul>

          </div>
        </div>
      </div>

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad">
          <h2 style={{marginTop: 0}}>Next step</h2>
          <p className="lead">
            Browse current puppies, learn more about the breed, or use the contact page if you have
            questions.
          </p>
          <div className="ctaRow">
            <a className="brand-button" href="/available-puppies">
              View Available Puppies
            </a>
            <a className="text-link" href="/the-breed">
              About the Breed
            </a>
            <a className="text-link" href="/contact">
              Contact FluffyTail
            </a>
          </div>
        </div>
      </div>

    </main>
  )
}

