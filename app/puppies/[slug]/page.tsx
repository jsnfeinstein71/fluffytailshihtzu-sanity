export const revalidate = 60

import '../../home.css'
import Link from 'next/link'
import {tryPricing} from '@/lib/pricing'
import {notFound} from 'next/navigation'
import {getPuppy} from '@/sanity/lib/inventory'
import {buildPuppyInquiryUrl, canInquireAboutPuppy, formatCurrency, formatPuppyStatus, getAgeInWeeks, getReadyDate, puppyPath, puppyStatusClass} from '@/lib/inventory'

type Props = {params: Promise<{slug: string}>}

export async function generateMetadata({params}: Props) {
  const {slug} = await params
  const puppy = await getPuppy(slug)
  if (!puppy) notFound()
  return {title: puppy.name || 'Puppy', alternates: {canonical: puppyPath(slug)}}
}

export default async function PuppyDetailPage({
  params,
}: {
  params: Promise<{slug: string}>
}) {
  const {slug} = await params
  const puppy = await getPuppy(slug)

  if (!puppy) notFound()

  const canInquire = canInquireAboutPuppy(puppy)
  const puppyInquiryUrl = buildPuppyInquiryUrl(puppy)
  const age = getAgeInWeeks(puppy.birthDate)

  const pricing = tryPricing(puppy)
  const totalPrice = pricing ? pricing.totalCents / 100 : undefined
  const deposit = pricing ? pricing.depositCents / 100 : undefined
  const finalPayment = pricing ? pricing.remainingCents / 100 : undefined

  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <Link className="btn" href="/">Home</Link>
        <Link className="btn" href="/available-puppies">Available Puppies</Link>
        <Link className="btn" href="/contact">Contact</Link>
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
              <span className={`statusBadge ${puppyStatusClass(puppy.status)}`}>
                {formatPuppyStatus(puppy.status)}
              </span>

              {age !== null ? <span className="badge">{age} week{age === 1 ? '' : 's'} old</span> : null}

              <span className="badge">
                {puppy.sex === 'female' ? 'Female' : puppy.sex === 'male' ? 'Male' : 'Puppy'}
              </span>

              {puppy.color ? <span className="badge">{puppy.color}</span> : null}

              {canInquire && getReadyDate(puppy.birthDate) ? (
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
                      <span style={{fontWeight: 700}}>{formatCurrency(deposit, true)}</span>
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
                        {formatCurrency(finalPayment!, true)}
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
                        {formatCurrency(totalPrice, true)}
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
                      {formatCurrency(totalPrice, true)}
                    </span>
                  </div>
                )}
              </div>
            ) : null}

            <p className="lead">{pricing ? 'The deposit is applied toward the total puppy price, not added on top.' : 'Please contact FluffyTail to confirm pricing before payment.'}</p>

            {puppy.notes ? (
              <p className="lead" style={{marginBottom: 0}}>
                {puppy.notes}
              </p>
            ) : null}
          </div>
        </div>

        <div className="card">
          <div className="pad">
            <h2 className="panelTitle">{canInquire ? 'Interested in this puppy?' : formatPuppyStatus(puppy.status)}</h2>

            <p className="lead">
              {canInquire ? <>
                If you would like to ask about {puppy.name || 'this puppy'}, use the inquiry button below
                and your message will already include the puppy and litter details.
              </> : 'This puppy is not currently available for a new reservation. Contact us about other availability.'}
            </p>

            <div className="ctaRow">
              {canInquire ? (
                <Link
                  className="btn btnPrimary"
                  href={puppyInquiryUrl}
                >
                  Request Info About This Puppy
                </Link>
              ) : (
                <Link className="btn btnPrimary" href="/contact">
                  Contact FluffyTail
                </Link>
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

