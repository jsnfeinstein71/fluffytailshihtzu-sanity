import '../home.css'
import '../content.css'
import {getInventory} from '@/sanity/lib/inventory'
import {getLittersByStatus, getPuppiesForLitter} from '@/lib/inventory'

export const metadata = {title: 'Puppy Resources', alternates: {canonical: '/puppy-resources'}}

export default async function PuppyResourcesPage() {
  const {litters, puppies} = await getInventory()
  const current = getLittersByStatus(litters, 'current')[0]
  const members = current ? getPuppiesForLitter(puppies, current._id) : []
  const featured = members.find(puppy => puppy.status === 'available' && puppy.photoUrl) || members.find(puppy => puppy.photoUrl)
  return (
    <main className="wrap content-page">
      <header className="content-intro">
      <p className="eyebrow">A happy start at home</p>

      <h1 className="h1">Puppy Resources</h1>

      <p className="lead">
        Bringing home a puppy is exciting, and a little preparation goes a long way.
      </p>
      </header>

      <div className={`grid${featured?.photoUrl ? ' content-has-photo' : ''}`}>
        {featured?.photoUrl ? <figure className="content-photo"><img src={featured.photoUrl} alt={featured.name || 'A FluffyTail puppy'} loading="eager" decoding="async" /></figure> : null}
        <div className="card content-copy">
          <div className="pad">
            <div className="section" style={{marginTop: 0}}>
              <h2>Before your puppy comes home</h2>
              <div className="qa">
                <div>
                  <div className="q">Set up a safe space</div>
                  <div className="a">
                    Puppy-proof a small area, remove loose cords and unsafe objects, and provide
                    water and a comfortable place to rest. Introduce a crate gently with positive experiences.
                  </div>
                </div>
                <div>
                  <div className="q">Pick up basic supplies</div>
                  <div className="a">
                    Have bowls, a suitable collar or harness, leash, puppy-safe toys, cleaning
                    supplies, and grooming basics ready.
                  </div>
                </div>
                <div>
                  <div className="q">Plan food and travel</div>
                  <div className="a">
                    Ask which food your puppy currently eats and discuss any changes with your
                    veterinarian. Use a suitable carrier or restraint for the journey home.
                  </div>
                </div>
              </div>
            </div>

            <div className="divider"></div>

            <div className="section">
              <h2>First week at home</h2>
              <div className="qa">
                <div>
                  <div className="q">Arrange veterinary follow-up</div>
                  <div className="a">
                    Arrange a veterinary visit and bring any available vaccination and deworming
                    records. Your veterinarian can advise on feeding, preventive care, and safe activities.
                  </div>
                </div>
                <div>
                  <div className="q">Use a simple routine</div>
                  <div className="a">
                    Keep meals, potty breaks, rest, and gentle play predictable. Reward the behavior
                    you want and expect accidents while your puppy learns.
                  </div>
                </div>
                <div>
                  <div className="q">Go slow with introductions</div>
                  <div className="a">
                    Keep new experiences brief and positive. Ask your veterinarian how to balance
                    early socialization with vaccination status and local infection risks.
                  </div>
                </div>
              </div>
            </div>

            <div className="divider"></div>

            <div className="section">
              <h2>Grooming basics</h2>
              <p className="lead">
                Shih Tzu puppies benefit from early handling around the face, feet, coat, and brushing routine.
              </p>
              <p className="lead" style={{marginBottom: 0}}>
                Gentle, regular grooming habits are usually easier than waiting until the puppy is older
                and less used to it.
              </p>
            </div>
          </div>
        </div>

        <div className="card content-aside">
          <div className="pad">
            <h2 className="panelTitle">Quick checklist</h2>
            <ul className="content-facts">
              <li>Safe space and bedding</li>
              <li>Current food and bowls</li>
              <li>Safe travel carrier or restraint</li>
              <li>Health records and veterinary visit</li>
              <li>Grooming supplies and a calm routine</li>
            </ul>

            <div className="divider"></div>

            <p className="lead" style={{margin: 0}}>
              For more general guidance, see <a className="text-link" href="https://www.aaha.org/resources/what-to-do-when-you-first-bring-home-a-new-puppy/" target="_blank" rel="noopener noreferrer">AAHA’s advice for a new puppy’s first days</a>.
            </p>
          </div>
        </div>
      </div>

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad">
          <h2 style={{marginTop: 0}}>Questions before bringing a puppy home?</h2>
          <p className="lead">
            If you’re still deciding or want to ask about availability, you can browse current puppies
            or review upcoming litters.
          </p>

          <div className="ctaRow">
            <a className="brand-button" href="/available-puppies">
              View Available Puppies
            </a>
            <a className="text-link" href="/upcoming-litters">
              View Upcoming Litters
            </a>
            <a className="text-link" href="/contact">
              Contact
            </a>
          </div>
        </div>
      </div>

    </main>
  )
}

