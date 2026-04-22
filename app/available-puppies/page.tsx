export const revalidate = 60

import '../home.css'
import {client} from '@/sanity/lib/client'

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
  status?: 'available' | 'hold' | 'reserved' | 'sold' | 'holdback' | 'gone-home'
  color?: string
  notes?: string
  sortOrder?: number
  litterId?: string
  birthDate?: string
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
  color,
  notes,
  sortOrder,
  "litterId": litter->_id,
  "birthDate": litter->birthDate,
  "photoUrl": mainImage.asset->url
}`

export default async function AvailablePuppiesPage() {
  const siteSettings = await client.fetch<SiteSettings>(siteSettingsQuery)
  const litters = await client.fetch<Litter[]>(littersQuery)
  const puppies = await client.fetch<Puppy[]>(puppiesQuery)

  const activeLitters = litters.filter(
    (litter) => litter.status === 'current' || litter.status === 'active'
  )
  const pastLitters = litters.filter(
    (litter) => litter.status !== 'current' && litter.status !== 'active'
  )

  const matchedPuppies = puppies.filter((puppy) => puppy.status === 'reserved')

  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <a className="btn" href="/">Home</a>
        <a className="btn" href="/about">About</a>
        <a className="btn" href="/the-breed">The Breed</a>
        <a className="btn" href="/puppy-resources">Puppy Resources</a>
        <a className="btn" href="/pricing">Pricing</a>
        <a className="btn" href="/upcoming-litters">Upcoming Litters</a>
        <a className="btn" href="/contact">Contact</a>
      </div>

      <div className="topbar">
        <div className="pill">
          <span className="dot"></span>
          {activeLitters.length > 0
            ? `${activeLitters.length} active litter${activeLitters.length === 1 ? '' : 's'}`
            : 'No active litters listed'}
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
          const availableLitterPuppies = litterPuppies.filter((puppy) => puppy.status !== 'reserved')

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
                  <a className="btn btnPrimary" href="/contact">
                    Contact About This Litter
                  </a>
                  <span className="badge">Active litter</span>
                </div>
              </div>

              <div className="pad" style={{paddingBottom: 0}}>
                <h3 style={{margin: '0 0 6px'}}>Puppies in this litter</h3>
                <p className="lead" style={{margin: 0}}>
                  {availableLitterPuppies.length > 0
                    ? `Browse the available puppies from ${litter.title || 'this litter'} below.`
                    : 'No available puppies are listed right now for this litter.'}
                </p>
              </div>

              <div className="puppyGrid">
                {availableLitterPuppies.length > 0 ? (
                  availableLitterPuppies.map((puppy) => (
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
                          {getAgeInWeeks(puppy.birthDate)} week
                          {getAgeInWeeks(puppy.birthDate) === 1 ? '' : 's'} old •{' '}
                          {puppy.sex === 'female'
                            ? 'Female'
                            : puppy.sex === 'male'
                              ? 'Male'
                              : 'Puppy'}
                        </p>

                        {puppy.color ? <p className="puppyNotes">{puppy.color}</p> : null}

                        {getReadyDate(puppy.birthDate) ? (
                          <div style={{marginTop: '10px'}}>
                            <span className="badge">{`Ready ${getReadyDate(puppy.birthDate)}`}</span>
                          </div>
                        ) : null}
                      </div>
                    </a>
                  ))
                ) : (
                  <div style={{padding: '12px', color: '#5a6472'}}>
                    No available puppies listed yet for this litter.
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
              Check back soon or use the contact page if you have questions.
            </p>
          </div>
        </div>
      )}

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad" style={{paddingBottom: 0}}>
          <h2 style={{margin: '0 0 6px'}}>Matched Puppies</h2>
          <p className="lead" style={{margin: 0}}>
            These puppies have been matched with their families.
          </p>
        </div>

        <div className="puppyGrid">
          {matchedPuppies.length > 0 ? (
            matchedPuppies.map((puppy) => (
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
                    <span className={`statusBadge status-${puppy.status || 'reserved'}`}>
                      {formatPuppyStatus(puppy.status)}
                    </span>
                  </div>

                  <p className="puppyMetaLine">
                    {getAgeInWeeks(puppy.birthDate)} week
                    {getAgeInWeeks(puppy.birthDate) === 1 ? '' : 's'} old •{' '}
                    {puppy.sex === 'female'
                      ? 'Female'
                      : puppy.sex === 'male'
                        ? 'Male'
                        : 'Puppy'}
                  </p>

                  {puppy.color ? <p className="puppyNotes">{puppy.color}</p> : null}

                  {getReadyDate(puppy.birthDate) ? (
                    <div style={{marginTop: '10px'}}>
                      <span className="badge">{`Ready ${getReadyDate(puppy.birthDate)}`}</span>
                    </div>
                  ) : null}
                </div>
              </a>
            ))
          ) : (
            <div style={{padding: '12px', color: '#5a6472'}}>
              No matched puppies listed yet.
            </div>
          )}
        </div>
      </div>

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
  if (status === 'reserved') return 'Matched'
  if (status === 'sold') return 'Sold'
  if (status === 'holdback') return 'Holdback'
  if (status === 'gone-home') return 'Gone Home'
  return 'Available'
}

function getAgeInWeeks(birthDate?: string) {
  if (!birthDate) return 1

  const born = new Date(birthDate)
  const now = new Date()
  const diffMs = now.getTime() - born.getTime()
  const weeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7))

  return Math.max(1, weeks)
}

function getReadyDate(birthDate?: string) {
  if (!birthDate) return ''

  const born = new Date(birthDate)
  const ready = new Date(born)
  ready.setDate(ready.getDate() + 56)

  return ready.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

