import '../home.css'
import '../content.css'
import Link from 'next/link'
import {pageDescriptions} from '@/lib/public-copy'
export const revalidate = 60
export const metadata = {
  title: 'Meet Jeanne',
  description: pageDescriptions.about,
  alternates: {canonical: '/about'},
}
export default function AboutPage() {
  return (
    <main className="wrap content-page">
      <header className="content-intro">
        <p className="eyebrow">The person behind FluffyTail</p>
        <h1 className="h1">Hi, I’m Jeanne.</h1>
        <p className="lead">
          Before one of our puppies becomes part of your family, I’d like you to
          know a little about ours.
        </p>
      </header>
      <div className="grid content-has-photo">
        <figure className="content-photo jeanne-portrait">
          <img
            src="/brand/jeanne-portrait.webp"
            width={960}
            height={1200}
            alt="Jeanne smiling, wearing pink glasses and a teal shirt."
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          <figcaption>Jeanne · FluffyTail Shih Tzu</figcaption>
        </figure>
        <div className="card content-copy">
          <div className="pad">
            <div className="section">
              <h2>{'Our home, our dogs'}</h2>
              <p className="lead">
                {
                  'My husband, Jason, and I share our home in the Mobile, Alabama area with our Shih Tzus. They’re our family pets, and the puppies we raise start their lives as part of that household.'
                }
              </p>
              <p className="lead">
                {
                  'If you’ve been looking through our litters, you may already have met names like Elsie and Penny. Behind those names are our own dogs, and behind every puppy listing is a conversation you can have directly with me.'
                }
              </p>
            </div>
            <div className="divider" />
            <div className="section">
              <h2>{'You’ll be talking with me'}</h2>
              <p className="lead">
                {
                  'Choosing a puppy is personal. I want you to feel comfortable asking about the little one you’re interested in, what to expect before pickup, and what you’ll need at home.'
                }
              </p>
              <p className="lead">
                {
                  'You don’t need to have everything figured out before you get in touch. Tell me about your household, your timing, and the puppy who caught your eye. We can start there.'
                }
              </p>
            </div>
            <div className="divider" />
            <div className="section">
              <h2>{'A little piece of home goes with them'}</h2>
              <p className="lead">
                {
                  'We begin socialization and potty-training work while the puppies are with us. They’ll still need patience, practice, and a routine as they settle into your home.'
                }
              </p>
              <p className="lead">
                {
                  'At pickup, your puppy comes with written vaccination and deworming records, CKC registration papers, and a starter kit with food, treats, toys, and a blanket carrying the scent of mom and littermates. A little piece of their first home goes with them.'
                }
              </p>
            </div>
          </div>
        </div>
        <aside className="card content-aside">
          <div className="pad">
            <h2 className="panelTitle">At a glance</h2>
            <ul className="content-facts">
              <li>Mobile, Alabama area</li>
              <li>Puppies raised in our home</li>
              <li>Direct conversations with Jeanne</li>
              <li>Pickup arranged together</li>
            </ul>
          </div>
        </aside>
      </div>
      <section className="card section">
        <div className="pad">
          <h2>Let’s meet your next little companion</h2>
          <p className="lead">
            {
              'Have a look at our puppies, or send me a note if you’re planning ahead. I’d love to hear what you’re looking for.'
            }
          </p>
          <div className="ctaRow">
            <Link className="brand-button" href="/available-puppies">
              Meet our puppies
            </Link>
            <Link className="text-link" href="/contact">
              Send Jeanne a message
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
