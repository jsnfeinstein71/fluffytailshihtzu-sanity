export const revalidate = 60

import '../../home.css'
import {client} from '@/sanity/lib/client'

type PuppyPageData = {
  name?: string
  slug?: string
  sex?: 'female' | 'male'
  status?: 'available' | 'hold' | 'reserved' | 'gone-home'
  color?: string
  notes?: string
  photoUrl?: string
  litterTitle?: string
  birthDate?: string
  overridePrice?: number
  litterPrice?: number
  litterDeposit?: number
}

type SiteSettings = {
  waitlistUrl?: string
  puppyInquiryUrl?: string
}

const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  waitlistUrl,
  puppyInquiryUrl
}`

const puppyQuery = `*[_type == "puppy" && slug.current == $slug][0]{
  name,
  "slug": slug.current,
  sex,
  status,
  color,
  notes,
  "photoUrl": mainImage.asset->url,
  "birthDate": litter->birthDate,
  overridePrice,
  "litterTitle": litter->title,
  "litterPrice": litter->price,
  "litterDeposit": litter->deposit
}`

export default async function PuppyDetailPage({
  params,
}: {
  params: Promise<{slug: string}>
}) {
  const {slug} = await params
  const siteSettings = await client.fetch<SiteSettings>(siteSettingsQuery)
  const puppy = await client.fetch<PuppyPageData>(puppyQuery, {slug})

  if (!puppy) {
    return (
      <main className="wrap">
        <h1 className="h1">Puppy not found</h1>
        <p className="lead">This puppy page could not be found.</p>
        <a className="btn" href="/available-puppies">Back to Available Puppies</a>
      </main>
    )
  }

  const puppyInquiryUrl = buildPuppyInquiryUrl({
    baseUrl: siteSettings?.puppyInquiryUrl,
    puppyName: puppy.name,
    litterTitle: puppy.litterTitle,
    slug: puppy.slug,
  })

  const totalPrice = puppy.overridePrice ?? puppy.litterPrice
  const deposit = puppy.litterDeposit
  const finalPayment =
    typeof totalPrice === 'number' && typeof deposit === 'number'
      ? Math.max(totalPrice - deposit, 0)
      : undefined

  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <a className="btn" href="/">Home</a>
        <a className="btn" href="/available-puppies">Available Puppies</a>
        <a className="btn" href="/contact">Contact</a>
      </div>

      <div className="grid">
        <div className="card">
          <div className="photos" style={{gridTemplateColumns: '1fr'}}>
            <div className="heroPhoto">
              {puppy.photoUrl ? (
                <img src={puppy.photoUrl} alt={puppy.name || 'Puppy'} />
              ) : null}
            </div>
          </div>

          <div className="pad">
            <h1 className="h1" style={{fontSize: '34px', marginBottom: '10px'}}>
              {puppy.name || 'Unnamed puppy'}
            </h1>

            <div className="ctaRow" style={{marginTop: 0, marginBottom: '14px'}}>
              <span className={`statusBadge status-${puppy.status || 'available'}`}>
                {formatPuppyStatus(puppy.status)}
              </span>

              <span className="badge">
                {getAgeInWeeks(puppy.birthDate)} week
                {getAgeInWeeks(puppy.birthDate) === 1 ? '' : 's'} old
              </span>

              <span className="badge">
                {puppy.sex === 'female' ? 'Female' : puppy.sex === 'male' ? 'Male' : 'Puppy'}
              </span>

              {puppy.color ? <span className="badge">{puppy.color}</span> : null}

              {getReadyDate(puppy.birthDate) ? (
                <span className="badge">{`Ready ${getReadyDate(puppy.birthDate)}`}</span>
              ) : null}
            </div>

            {puppy.litterTitle ? <p className="lead">Litter: {puppy.litterTitle}</p> : null}

            {typeof totalPrice === 'number' ? (
              <div
                style={{
                  marginTop: '14px',
                  marginBottom: '14px',
                  padding: '16px 18px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '18px',
                  background: 'rgba(0,0,0,0.02)',
                  maxWidth: '360px',
                }}
              >
                {typeof deposit === 'number' ? (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '8px',
                      }}
                    >
                      <span className="lead" style={{margin: 0}}>
                        Deposit
                      </span>
                      <span style={{fontWeight: 700}}>{formatCurrencyWithCents(deposit)}</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '12px',
                      }}
                    >
                      <span className="lead" style={{margin: 0}}>
                        Final payment
                      </span>
                      <span style={{fontWeight: 700}}>
                        {formatCurrencyWithCents(finalPayment ?? 0)}
                      </span>
                    </div>

                    <div
                      style={{
                        borderTop: '1px solid rgba(0,0,0,0.18)',
                        margin: '8px 0 12px',
                      }}
                    />

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <span style={{fontWeight: 800}}>Total</span>
                      <span style={{fontWeight: 800}}>
                        {formatCurrencyWithCents(totalPrice)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <span style={{fontWeight: 800}}>Total</span>
                    <span style={{fontWeight: 800}}>
                      {formatCurrencyWithCents(totalPrice)}
                    </span>
                  </div>
                )}
              </div>
            ) : null}

            {puppy.notes ? (
              <p className="lead" style={{marginBottom: 0}}>
                {puppy.notes}
              </p>
            ) : null}
          </div>
        </div>

        <div className="card">
          <div className="pad">
            <h2 className="panelTitle">Interested in this puppy?</h2>

            <p className="lead">
              If you would like to ask about {puppy.name || 'this puppy'}, use the inquiry button
              below and your message will already include the puppy and litter details.
            </p>

            <div className="ctaRow">
              {puppyInquiryUrl ? (
                <a
                  className="btn btnPrimary"
                  href={puppyInquiryUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Request Info About This Puppy
                </a>
              ) : (
                <a className="btn btnPrimary" href="/contact">
                  Contact About This Puppy
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="footer">
        © {new Date().getFullYear()} FluffyTail Shih Tzu • In-home raised as family pets
      </div>
    </main>
  )
}

function formatPuppyStatus(status?: string) {
  if (status === 'available') return 'Available'
  if (status === 'hold') return 'Hold'
  if (status === 'reserved') return 'Reserved'
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

function buildPuppyInquiryUrl({
  baseUrl,
  puppyName,
  litterTitle,
  slug,
}: {
  baseUrl?: string
  puppyName?: string
  litterTitle?: string
  slug?: string
}) {
  if (!baseUrl) return ''

  const message = buildPrefilledMessage(puppyName, litterTitle)
  const puppyPageUrl = slug
    ? `https://www.fluffytailshihtzu.com/puppies/${encodeURIComponent(slug)}`
    : 'https://www.fluffytailshihtzu.com/available-puppies'

  const separator = baseUrl.includes('?') ? '&' : '?'

  return (
    `${baseUrl}${separator}` +
    `puppy=${encodeURIComponent(puppyName || '')}` +
    `&litter=${encodeURIComponent(litterTitle || '')}` +
    `&puppyPageUrl=${encodeURIComponent(puppyPageUrl)}` +
    `&message=${encodeURIComponent(message)}`
  )
}

function buildPrefilledMessage(puppyName?: string, litterTitle?: string) {
  const puppyText = puppyName || 'this puppy'
  const litterText = litterTitle ? ` from the ${litterTitle} litter` : ''
  return `Hi, I’m interested in ${puppyText}${litterText}. Please send me more information.`
}

function formatCurrencyWithCents(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

