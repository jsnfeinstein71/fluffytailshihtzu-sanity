import '../home.css'
import '../content.css'
import Link from 'next/link'
import {pageDescriptions} from '@/lib/public-copy'
import {getInventory} from '@/sanity/lib/inventory'
import {getLittersByStatus, getPuppiesForLitter} from '@/lib/inventory'
export const revalidate = 60
import {publicPageMetadata} from '@/lib/seo'
export const metadata = publicPageMetadata({
  title: 'Getting ready for home',
  description: pageDescriptions.resources,
  path: '/puppy-resources',
})
export default async function PuppyResourcesPage() {
  const {litters, puppies} = await getInventory()
  const current = getLittersByStatus(litters, 'current')[0]
  const members = current ? getPuppiesForLitter(puppies, current._id) : []
  const featured =
    members.find((p) => p.status === 'available' && p.photoUrl) ||
    members.find((p) => p.photoUrl)
  return (
    <main className="wrap content-page">
      <header className="content-intro">
        <p className="eyebrow">Your puppy’s next chapter</p>
        <h1 className="h1">Getting ready for home</h1>
        <p className="lead">
          {
            'The bowls, the blanket, the first ride home — a little preparation lets you spend more time getting to know your puppy.'
          }
        </p>
      </header>
      <div className={`grid${featured?.photoUrl ? ' content-has-photo' : ''}`}>
        {featured?.photoUrl ? (
          <figure className="content-photo">
            <img
              src={featured.photoUrl}
              alt={featured.name || 'A FluffyTail puppy'}
              loading="eager"
              decoding="async"
            />
          </figure>
        ) : null}
        <div className="card content-copy">
          <div className="pad">
            <div className="section">
              <h2>{'Before pickup'}</h2>
              <div className="qa">
                <div>
                  <div className="q">{'Ask what your puppy is used to.'}</div>
                  <div className="a">
                    {
                      'Check with Jeanne about the food your puppy is eating and the routine to continue at home. Your starter kit includes food, so you’ll have some familiar things to begin with.'
                    }
                  </div>
                </div>
                <div>
                  <div className="q">{'Make a small, safe space.'}</div>
                  <div className="a">
                    {
                      'Move cords and chewable hazards out of reach. Have water, bedding, and a quiet resting place ready. Choose bowls, a suitable harness or collar, a leash, puppy-safe toys, and cleaning supplies.'
                    }
                  </div>
                </div>
                <div>
                  <div className="q">{'Plan the ride home.'}</div>
                  <div className="a">
                    {
                      'Confirm the meeting place and time with Jeanne. Bring a suitable carrier or restraint for the journey.'
                    }
                  </div>
                </div>
              </div>
            </div>
            <div className="divider" />
            <div className="section">
              <h2>{'In your puppy’s bag'}</h2>
              <p className="lead">
                {
                  'Your FluffyTail starter kit includes food, treats, toys, and a blanket with mom and littermates’ scent. You’ll also receive CKC registration papers and written vaccination and deworming records. Keep the health records ready for your veterinarian.'
                }
              </p>
            </div>
            <div className="divider" />
            <div className="section">
              <h2>{'The first few days'}</h2>
              <div className="qa">
                <div>
                  <div className="q">{'Give your puppy time.'}</div>
                  <div className="a">
                    {
                      'A new home is a lot to take in. Keep introductions calm and brief, with time to rest. If you use a crate, introduce it gently with positive experiences.'
                    }
                  </div>
                </div>
                <div>
                  <div className="q">
                    {'Build on the beginning I have made.'}
                  </div>
                  <div className="a">
                    {
                      'I start socialization and potty-training work before pickup. Continue with a predictable routine, patient practice, and rewards. Accidents are part of learning.'
                    }
                  </div>
                </div>
                <div>
                  <div className="q">{'Arrange veterinary follow-up.'}</div>
                  <div className="a">
                    {
                      'Bring the vaccination and deworming records to your puppy’s visit. Your veterinarian can plan further care and help you choose safe activities and introductions.'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <aside className="card content-aside">
          <div className="pad">
            <h2 className="panelTitle">Further reading</h2>
            <a
              className="text-link"
              href="https://www.aaha.org/resources/what-to-do-when-you-first-bring-home-a-new-puppy/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Bringing your puppy home — American Animal Hospital Association
            </a>
          </div>
        </aside>
      </div>
      <section className="card section">
        <div className="pad">
          <h2>Keep the practical details close</h2>
          <p className="lead">
            {
              'Before pickup, make sure you have the agreed meeting details, your puppy’s food information, and the care records. If a pickup detail is unclear, ask Jeanne before you travel.'
            }
          </p>
          <div className="ctaRow">
            <Link className="brand-button" href="/contact">
              Ask Jeanne a question
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
