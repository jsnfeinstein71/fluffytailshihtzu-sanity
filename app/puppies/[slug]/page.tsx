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

export default async function PuppyDetailPage({params}: Props) {
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

  return <main className="wrap">
    <Link className="text-link" href="/available-puppies"><span aria-hidden="true">&larr;</span> Back to our puppies</Link>
    <div className="puppy-detail-layout">
      <div>{puppy.photoUrl ? <img className="puppy-detail-photo" src={puppy.photoUrl} alt={puppy.name || 'Puppy'} fetchPriority="high" /> : <div className="puppy-detail-photo" role="img" aria-label="Puppy photo to come" />}</div>
      <div className="puppy-detail-info">
        <span className={`statusBadge ${puppyStatusClass(puppy.status)}`}>{formatPuppyStatus(puppy.status)}</span>
        <h1 className="h1">{puppy.name || 'Unnamed puppy'}</h1>
        {puppy.litterTitle ? <p className="lead">Litter: {puppy.litterTitle}</p> : null}
        <ul className="puppy-facts">
          <li>{puppy.sex === 'female' ? 'Female' : puppy.sex === 'male' ? 'Male' : 'Puppy'}</li>
          {age !== null ? <li>{age} week{age === 1 ? '' : 's'} old</li> : null}
          {puppy.color ? <li>{puppy.color}</li> : null}
          {canInquire && getReadyDate(puppy.birthDate) ? <li>Ready {getReadyDate(puppy.birthDate)}</li> : null}
        </ul>
        {puppy.notes ? <p className="lead">{puppy.notes}</p> : null}

        {typeof totalPrice === 'number' ? <dl className="puppy-price">
          <div className="price-total"><dt>Total puppy price</dt><dd>{formatCurrency(totalPrice, true)}</dd></div>
          {typeof deposit === 'number' ? <>
            <div><dt>Deposit</dt><dd>{formatCurrency(deposit, true)}</dd></div>
            <div><dt>Final payment</dt><dd>{formatCurrency(finalPayment!, true)}</dd></div>
          </> : null}
        </dl> : null}
        <p className="lead">{pricing ? 'The deposit is applied toward the total puppy price, not added on top.' : 'Please contact FluffyTail to confirm pricing before payment.'}</p>
        {canInquire ? <Link className="brand-button" href={puppyInquiryUrl}>Request Info About This Puppy <span aria-hidden="true">&rarr;</span></Link> : <>
          <p className="lead">This puppy is not currently available for a new reservation. Contact us about other availability.</p>
          <Link className="brand-button" href="/contact">Contact FluffyTail</Link>
        </>}
      </div>
    </div>
  </main>
}
