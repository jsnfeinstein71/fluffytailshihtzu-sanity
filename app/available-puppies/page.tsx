export const revalidate = 60

import '../home.css'
import {client} from '@/sanity/lib/client'
import WaitlistModal from '../components/WaitlistModal'

type SiteSettings = {
  goodDogUrl?: string
  waitlistUrl?: string
}

type Litter = {
  _id: string
  title?: string
  birthDate?: string
  girlsCount?: number
  boysCount?: number
  summary?: string
  status?: string
  price?: number
  deposit?: number
  groupPhotoUrl?: string
}

type Puppy = {
  _id: string
  name?: string
  slug?: string
  sex?: 'female' | 'male'
  status?: 'available' | 'hold' | 'reserved' | 'gone-home'
  notes?: string
  sortOrder?: number
  litterId?: string
  overridePrice?: number
  photoUrl?: string
}

const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  goodDogUrl,
  waitlistUrl
}`

const littersQuery = `*[_type == "litter"] | order(sortOrder asc, birthDate asc){
  _id,
  title,
  birthDate,
  girlsCount,
  boysCount,
  summary,
  status,
  price,
  deposit,
  "groupPhotoUrl": groupPhoto.asset->url
}`

const puppiesQuery = `*[_type == "puppy"] | order(sortOrder asc, name asc){
  _id,
  name,
  "slug": slug.current,
  sex,
  status,
  notes,
  sortOrder,
  "litterId": litter->_id,
  overridePrice,
  "photoUrl": photo.asset->url
}`

export default async function AvailablePuppiesPage() {
  const siteSettings = await client.fetch<SiteSettings>(siteSettingsQuery)
  const litters = await client.fetch<Litter[]>(littersQuery)
  const puppies = await client.fetch<Puppy[]>(puppiesQuery)

  const waitlistUrl = siteSettings?.waitlistUrl || '#'

  const activeLitters = litters.filter((litter) => litter.status === 'current' || litter.status === 'active')
  const pastLitters = litters.filter((litter) => litter.status !== 'current' && litter.status !== 'active')

  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <a className="btn" href="/">Home</a>
        <a className="btn" href="/about">About</a>
        <a className="btn" href="/upcoming-litters">Upcoming Litters</a>
        <a className="btn" href="/contact">Contact</a>
      </div>

      <div className="topbar">
        <div className="pill">
          <span className="dot"></span>
          {activeLitters.length > 0
            ? `${activeLitters.length} active litter${activeLitters.length === 1 ? '' : 's'}`
            : 'Waitlist open'}
        </div>

        <div className="nav">
          <WaitlistModal
            waitlistUrl={waitlistUrl}
            buttonLabel="Join the Waitlist"
            className="btn btnPrimary"
          />
        </div>
      </div>

      <h1 className="h1">Available Puppies</h1>

      <p className="lead">
        Current and recent litters from FluffyTail Shih Tzu. We update this page as litters arrive
        and as individual puppy photos become available.
      </p>

      {activeLitters.length > 0 ? (
        activeLitters.map((litter) => {
          const litterPuppies = puppies.filter((puppy) => puppy.litterId === litter._id)

          return (
            <div className="card section" style={{marginTop: '18px'}} key={litter._id}>
              <div className="pad" style={{paddingBottom: 0}}>
                <h2 style={{margin: '0 0 6px'}}>{litter.title || 'Active Litter'}</h2>
                <p className="lead" style={{margin: 0}}>
                  Born {formatLongDate(litter.birthDate)} • {litter.girlsCount ?? 0} girls •{' '}
                  {litter.boysCount ?? 0} boys
                </p>

                {litter.price ? (
                  <p className="lead" style={{marginTop: '10px', marginBottom: 0, fontWeight: 700}}>
                    {formatCurrency(litter.price)}
                    {litter.deposit ? `, including a ${formatCurrency(litter.deposit)} deposit` : ''}
                  </p>
                ) : null}

                {litter.summary ? (
                  <p className="lead" style={{marginTop: '10px', marginBottom: 0}}>
                    {litter.summary}
                  </p>
                ) : null}
              </div>

              <div className="pad">
                <div className="ctaRow" style={{marginTop: 0}}>
                  <WaitlistModal
                    waitlistUrl={waitlistUrl}
                    buttonLabel="Join the Waitlist"
                    className="btn btnPrimary"
                  />
                  <a className="btn" href="/contact">
                    Contact
                  </a>
                  <span className="badge">Active litter</span>
                </div>
              </div>

              <div className="pad" style={{paddingBottom: 0}}>
                <h3 style={{margin: '0 0 6px'}}>Puppies in this litter</h3>
                <p className="lead" style={{margin: 0}}>
                  {litterPuppies.length > 0
                    ? `Browse the puppies from ${litter.title || 'this litter'} below.`
                    : 'No puppies listed yet for this litter.'}
                </p>
              </div>

              <div className="puppyGrid">
                {litterPuppies.length > 0 ? (
                  litterPuppies.map((puppy) => {
                    const price = puppy.overridePrice ?? litter.price

                    return (
                      <a
                        className="puppyCard puppyCardLink"
                        key={puppy._id}
                        href={puppy.slug ? `/puppies/${puppy.slug}` : '/available-puppies'}
                      >
                        <div className="puppyImageWrap">
                          {puppy.photoUrl ? (
                            <img
                              className="puppyImage"
                              src={puppy.photoUrl}
                              alt={puppy.name || 'Puppy'}
                            />
                          ) : null}
                        </div>
                        <div className="puppyCardBody">
                          <div className="puppyCardTop">
                            <h3 className="puppyName">{puppy.name || 'Unnamed puppy'}</h3>
                            <span className={`statusBadge status-${puppy.status || 'available'}`}>
                              {formatPuppyStatus(puppy.status)}
                            </span>
                          </div>

                          <p className="puppyMetaLine">
                            {puppy.sex === 'female'
                              ? 'Female'
                              : puppy.sex === 'male'
                                ? 'Male'
                                : 'Puppy'}
                          </p>

                          {price ? (
                            <p className="puppyMetaLine" style={{fontWeight: 700}}>
                              {formatCurrency(price)}
                              {litter.deposit ? ` • ${formatCurrency(litter.deposit)} deposit included` : ''}
                            </p>
                          ) : null}

                          {puppy.notes ? <p className="puppyNotes">{puppy.notes}</p> : null}
                        </div>
                      </a>
                    )
                  })
                ) : (
                  <div style={{padding: '12px', color: '#5a6472'}}>
                    No puppies listed yet for this litter.
                  </div>
                )}
              </div>
            </div>
          )
        })
      ) : (
        <div className="card" style={{marginTop: '16px'}}>
          <div className="pad">
            <h2 style={{marginTop: 0}}>No active litters listed</h2>
            <p className="lead" style={{marginBottom: 0}}>
              Join the waitlist for updates and first notice when puppies are expected or available.
            </p>
          </div>
        </div>
      )}

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad" style={{paddingBottom: 0}}>
          <h2 style={{margin: '0 0 6px'}}>Recent litters</h2>
          <p className="lead" style={{margin: 0}}>
            Past and recent litters from FluffyTail Shih Tzu.
          </p>
        </div>

        <div className="strip" aria-label="Recent litters">
          {(pastLitters.length > 0 ? pastLitters : litters).map((litter) => (
            <div className="tile" key={litter._id}>
              <div className="tileImg">
                {litter.groupPhotoUrl ? (
                  <img src={litter.groupPhotoUrl} alt={litter.title || 'Litter photo'} />
                ) : null}
              </div>
              <div className="tileMeta">
                <p className="tileName">{litter.title || 'Untitled litter'}</p>
                <p className="tileSub">{formatStatus(litter.status)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="footer">
        © {new Date().getFullYear()} FluffyTail Shih Tzu • In-home raised as family pets
      </div>
    </main>
  )
}

function formatLongDate(date?: string) {
  if (!date) return 'Unknown'
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})
}

function formatStatus(status?: string) {
  if (status === 'active' || status === 'current') return 'Active'
  if (status === 'upcoming' || status === 'planned') return 'Upcoming'
  if (status === 'past') return 'Past'
  return 'Litter'
}

function formatPuppyStatus(status?: string) {
  if (status === 'available') return 'Available'
  if (status === 'hold') return 'Hold'
  if (status === 'reserved') return 'Reserved'
  if (status === 'gone-home') return 'Gone Home'
  return 'Available'
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}
