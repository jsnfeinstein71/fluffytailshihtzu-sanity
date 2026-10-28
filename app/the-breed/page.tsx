import '../home.css'
import '../content.css'
import Link from 'next/link'
import {pageDescriptions} from '@/lib/public-copy'
import {getInventory} from '@/sanity/lib/inventory'
import {getLittersByStatus} from '@/lib/inventory'
export const revalidate = 60
import {publicPageMetadata} from '@/lib/seo'
export const metadata = publicPageMetadata({
  title: 'Life with a Shih Tzu',
  description: pageDescriptions.breed,
  path: '/the-breed',
})
export default async function TheBreedPage() {
  const {litters} = await getInventory()
  const photo = getLittersByStatus(litters, 'current').find(
    (l) => l.groupPhotoUrl,
  )?.groupPhotoUrl
  return (
    <main className="wrap content-page">
      <header className="content-intro">
        <p className="eyebrow">Getting to know the breed</p>
        <h1 className="h1">Life with a Shih Tzu</h1>
        <p className="lead">
          {
            'Small enough to fit beside you, with plenty of personality to fill the house. A Shih Tzu is a companion first — and bringing one home means making room in your daily life as well as on the sofa.'
          }
        </p>
      </header>
      <div className={`grid${photo ? ' content-has-photo' : ''}`}>
        {photo ? (
          <figure className="content-photo">
            <img
              src={photo}
              alt="A FluffyTail Shih Tzu"
              loading="eager"
              decoding="async"
            />
          </figure>
        ) : null}
        <div className="card content-copy">
          <div className="pad">
            <div className="section">
              <h2>{'Company matters'}</h2>
              <p className="lead">
                {
                  'Many Shih Tzus enjoy being close to their people. Think about your everyday routine and how much companionship you can offer. Every puppy has a personality of its own; a breed description is a starting point, not a promise about an individual dog.'
                }
              </p>
            </div>
            <div className="divider" />
            <div className="section">
              <h2>{'A small dog still needs a routine'}</h2>
              <p className="lead">
                {
                  'Make time for gentle play, short walks, and patient training. Use praise and rewards, and keep learning sessions manageable.'
                }
              </p>
            </div>
            <div className="divider" />
            <div className="section">
              <h2>{'Make room for grooming'}</h2>
              <p className="lead">
                {
                  'A long coat needs daily brushing. A shorter trim can make upkeep easier, but it still needs regular care. Talk with a groomer about a routine that suits your dog and your household.'
                }
              </p>
            </div>
            <div className="divider" />
            <div className="section">
              <h2>{'Take Alabama heat seriously'}</h2>
              <p className="lead">
                {
                  'Shih Tzus can struggle in heat and humidity. Choose cooler times for outdoor activity and give them a cool place to rest. Ask your veterinarian about your dog’s needs.'
                }
              </p>
            </div>
          </div>
        </div>
        <aside className="card content-aside">
          <div className="pad">
            <h2 className="panelTitle">Further reading</h2>
            <a
              className="text-link"
              href="https://www.akc.org/dog-breeds/shih-tzu/"
              target="_blank"
              rel="noopener noreferrer"
            >
              AKC’s Shih Tzu breed guide
            </a>
          </div>
        </aside>
      </div>
      <section className="card section">
        <div className="pad">
          <h2>Thinking about your first Shih Tzu?</h2>
          <p className="lead">
            {
              'Talk with Jeanne about the puppy you’re considering and read our guide to bringing one home.'
            }
          </p>
          <div className="ctaRow">
            <Link className="brand-button" href="/available-puppies">
              Meet our puppies
            </Link>
            <Link className="text-link" href="/puppy-resources">
              Getting ready for home
            </Link>
            <Link className="text-link" href="/contact">
              Ask Jeanne
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
