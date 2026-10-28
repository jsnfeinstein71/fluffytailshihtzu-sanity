export const revalidate = 60

import '../../home.css'
import './puppy-detail.css'
import Link from 'next/link'
import {tryPricing} from '@/lib/pricing'
import {notFound} from 'next/navigation'
import {getPuppy} from '@/sanity/lib/inventory'
import {getPuppyProfilePortrait} from '@/lib/puppy-portraits'
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
  const ready = canInquire ? getReadyDate(puppy.birthDate) : ''
  const pricing = tryPricing(puppy)
  const totalPrice = pricing ? pricing.totalCents / 100 : undefined
  const deposit = pricing ? pricing.depositCents / 100 : undefined
  const finalPayment = pricing ? pricing.remainingCents / 100 : undefined
  const profilePortrait = getPuppyProfilePortrait(puppy)

  return <main className="wrap puppy-detail-page">
    <Link className="text-link" href="/available-puppies"><span aria-hidden="true">&larr;</span> Back to our puppies</Link>
    <div className="puppy-detail-layout">
      <header className="puppy-detail-heading">
        <div className="puppy-detail-title"><h1 className="h1">{puppy.name || 'Unnamed puppy'}</h1><span className={`statusBadge ${puppyStatusClass(puppy.status)}`}>{formatPuppyStatus(puppy.status)}</span></div>
        {puppy.litterTitle ? <p className="puppy-detail-litter">Litter: {puppy.litterTitle}</p> : null}
      </header>
      <figure className={`puppy-detail-portrait${profilePortrait ? ' puppy-detail-portrait-cutout' : ''}`}>
        {profilePortrait ? <>
          <span className="puppy-ground-shadow" aria-hidden="true" />
          <img className="puppy-detail-photo" src={profilePortrait} width={1254} height={1254} alt={`${puppy.name || 'Puppy'} held in caring hands`} loading="eager" fetchPriority="high" decoding="async" />
        </> : puppy.photoUrl ? <img className="puppy-detail-photo" src={puppy.photoUrl} alt={puppy.name || 'Puppy'} loading="eager" fetchPriority="high" decoding="async" /> : <div className="puppy-detail-photo puppy-photo-pending" role="img" aria-label="Puppy photo to come">Photo to come</div>}
      </figure>
      <div className="puppy-detail-info">
        <dl className="puppy-detail-facts">
          <div><dt>Sex</dt><dd>{puppy.sex === 'female' ? 'Female' : puppy.sex === 'male' ? 'Male' : 'To be confirmed'}</dd></div>
          {puppy.color ? <div><dt>Color</dt><dd>{puppy.color}</dd></div> : null}
          {age !== null ? <div><dt>Age</dt><dd>{age} week{age === 1 ? '' : 's'} old</dd></div> : null}
          {ready ? <div><dt>Ready from</dt><dd>{ready}</dd></div> : null}
        </dl>
        {puppy.notes?.trim() && puppy.notes.trim().toLowerCase() !== puppy.color?.trim().toLowerCase() ? <p className="puppy-detail-notes">{puppy.notes}</p> : null}

        {typeof totalPrice === 'number' ? <dl className="puppy-price">
          <div className="price-total"><dt>Total puppy price</dt><dd>{formatCurrency(totalPrice, true)}</dd></div>
          {typeof deposit === 'number' ? <>
            <div><dt>Deposit</dt><dd>{formatCurrency(deposit, true)}</dd></div>
            <div><dt>Final payment</dt><dd>{formatCurrency(finalPayment!, true)}</dd></div>
          </> : null}
        </dl> : null}
        <p className="puppy-detail-payment-note">{pricing ? 'The deposit is applied toward the total puppy price, not added on top.' : 'Please contact FluffyTail to confirm pricing before payment.'}</p>
        <div className="puppy-detail-action">{canInquire ? <Link className="brand-button" href={puppyInquiryUrl}>Request Info About This Puppy <span aria-hidden="true">&rarr;</span></Link> : <>
          <p>This puppy is not currently available for a new reservation. Contact us about other availability.</p>
          <Link className="brand-button" href="/contact">Contact FluffyTail</Link>
        </>}</div>
      </div>
    </div>
  </main>
}
