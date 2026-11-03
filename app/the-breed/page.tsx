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
  const {litters} = await getInventory().catch(()=>({litters:[],puppies:[]}))
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
              <p className="lead">Before choosing, think about who will be home during the day, where a puppy can rest undisturbed, and how everyone will share feeding, grooming and training. Children need calm, supervised introductions and help handling a small dog gently. Other pets need their own space and gradual introductions.</p>
            </div>
            <div className="divider" />
            <div className="section">
              <h2>{'A small dog still needs a routine'}</h2>
              <p className="lead">
                {
                  'Make time for gentle play, short walks, and patient training. Use praise and rewards, and keep learning sessions manageable.'
                }
              </p>
              <p className="lead">Small size does not remove a dog’s need to explore, learn and spend time with people. Plan short activities with rest between them, and build up alone time gradually. Choose a routine you can keep on ordinary workdays as well as weekends.</p>
            </div>
            <div className="divider" />
            <div className="section">
              <h2>{'Make room for grooming'}</h2>
              <p className="lead">
                {
                  'A long coat needs daily brushing. A shorter trim can make upkeep easier, but it still needs regular care. Talk with a groomer about a routine that suits your dog and your household.'
                }
              </p>
              <p className="lead">Check for tangles where the coat rubs, including behind the ears and around the legs. Keep grooming gentle and manageable rather than pulling at a mat. Ask a groomer or veterinarian for help with painful tangles, irritated skin or discharge around the eyes.</p>
            </div>
            <div className="divider" />
            <div className="section">
              <h2>{'Take Alabama heat seriously'}</h2>
              <p className="lead">
                {
                  'Shih Tzus can struggle in heat and humidity. Choose cooler times for outdoor activity and give them a cool place to rest. Ask your veterinarian about your dog’s needs.'
                }
              </p>
              <p className="lead">Plan walks for cooler hours, offer water and shade, and be careful with hot pavement. Noisy or difficult breathing, unusual weakness or collapse needs prompt veterinary attention. A short muzzle is a reason to pay attention to breathing and comfort, not a reason to dismiss distress as normal for the breed.</p>
            </div>
            <div className="divider" />
            <div className="section"><h2>Everyday health habits</h2><p className="lead">Make gentle handling part of the routine so checking the coat, paws and mouth becomes familiar. Talk with your veterinarian about toothbrushing, safe chews and dental care. A change in appetite, energy or comfort deserves attention rather than waiting for the next grooming visit.</p><p className="sublead">These are general care pointers. Your veterinarian can help adapt them to your individual dog.</p></div>
          </div>
        </div>
      </div>
      <section className="card section">
        <div className="pad">
          <h2>Thinking about your first Shih Tzu?</h2>
          <p className="lead">
            {
              'Tell me about your household and timing. We can talk through current puppies or plans for a future litter, then you can read about preparing your home and the first few days together.'
            }
          </p>
          <div className="ctaRow">
            <Link className="brand-button" href="/available-puppies">
              Meet our puppies
            </Link>
            <Link className="text-link" href="/puppy-resources">
              Getting ready for home
            </Link>
            <Link className="text-link" href="/pricing">Choosing a FluffyTail puppy</Link>
            <Link className="text-link" href="/contact">
              Ask Jeanne
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
