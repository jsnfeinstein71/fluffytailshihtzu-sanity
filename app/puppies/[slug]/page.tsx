export const revalidate = 60

import '../../home.css'
import './puppy-detail.css'
import {unavailablePuppyNotice} from '@/lib/public-copy'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {getPuppy} from '@/sanity/lib/inventory'
import {getPuppyProfilePortrait} from '@/lib/puppy-portraits'
import {buildPuppyInquiryUrl, canInquireAboutPuppy, formatPuppyStatus, getAgeInWeeks, getReadyDate, puppyStatusClass} from '@/lib/inventory'
import {puppyBreadcrumbs, puppyMetadata} from '@/lib/seo'
import StructuredData from '../../components/StructuredData'
import PublicImage from '../../components/PublicImage'
import PriceDetails from '../../components/PriceDetails'
import {getBrowsingContext} from '@/sanity/lib/public-availability'
import {AvailabilityScope,AvailabilityNotice} from '../../components/Availability'

type Props = {params: Promise<{slug: string}>}

export async function generateMetadata({params}: Props) {
  const {slug} = await params
  const puppy = await getPuppy(slug)
  if (!puppy) notFound()
  return puppyMetadata(puppy, slug)
}

export default async function PuppyDetailPage({params}: Props) {
  const {slug} = await params
  const puppy = await getPuppy(slug)
  if (!puppy) notFound()
  const canInquire = canInquireAboutPuppy(puppy)
  const puppyInquiryUrl = buildPuppyInquiryUrl(puppy)
  const age = getAgeInWeeks(puppy.birthDate)
  const ready = canInquire ? getReadyDate(puppy.birthDate) : ''
  const profilePortrait = getPuppyProfilePortrait(puppy)
  const {availability}=await getBrowsingContext()

  return <AvailabilityScope initial={availability}><main className="wrap puppy-detail-page">
    <StructuredData data={puppyBreadcrumbs(puppy, slug)} />
    <Link className="text-link" href="/available-puppies"><span aria-hidden="true">&larr;</span> Back to our puppies</Link>
    <div className="puppy-detail-layout">
      <header className="puppy-detail-heading">
        <div className="puppy-detail-title"><h1 className="h1">{puppy.name || 'Puppy details'}</h1><span className={`statusBadge ${puppyStatusClass(puppy.status)}`}>{formatPuppyStatus(puppy.status)}</span></div>
        {puppy.litterTitle ? <p className="puppy-detail-litter">From {puppy.litterTitle}</p> : null}
      </header>
      <figure className={`puppy-detail-portrait${profilePortrait ? ' puppy-detail-portrait-cutout' : ''}`}>
        {profilePortrait ? <>
          <span className="puppy-ground-shadow" aria-hidden="true" />
          <PublicImage className="puppy-detail-photo" src={profilePortrait} width={1254} height={1254} sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 820px) 600px, (max-width: 1160px) 50vw, 530px" alt={`${puppy.name || 'Puppy'} held in caring hands`} loading="eager" fetchPriority="high" />
        </> : puppy.photoUrl ? <PublicImage className="puppy-detail-photo" src={puppy.photoUrl} sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 820px) 600px, (max-width: 1160px) 50vw, 530px" alt={puppy.name || 'Puppy'} loading="eager" fetchPriority="high" /> : <div className="puppy-detail-photo puppy-photo-pending" role="img" aria-label="Photo coming soon">Photo coming soon</div>}
      </figure>
      <div className="puppy-detail-info">
        <dl className="puppy-detail-facts">
          <div><dt>Sex</dt><dd>{puppy.sex === 'female' ? 'Female' : puppy.sex === 'male' ? 'Male' : 'To be confirmed'}</dd></div>
          {puppy.color ? <div><dt>Color</dt><dd>{puppy.color}</dd></div> : null}
          {age !== null ? <div><dt>Age</dt><dd>{age} week{age === 1 ? '' : 's'} old</dd></div> : null}
          {ready ? <div><dt>Estimated ready date</dt><dd>{ready}</dd></div> : null}
        </dl>
        {puppy.notes?.trim() && puppy.notes.trim().toLowerCase() !== puppy.color?.trim().toLowerCase() ? <p className="puppy-detail-notes">{puppy.notes}</p> : null}

        <PriceDetails name={puppy.name || 'This puppy'} pricing={{overridePrice:puppy.overridePrice,litterPrice:puppy.litterPrice,litterDeposit:puppy.litterDeposit}} pricingStatus={puppy.litterPricingStatus} />
        <div className="puppy-detail-action">{canInquire ? <Link className="brand-button" href={puppyInquiryUrl}>Ask Jeanne about {puppy.name || 'this puppy'} <span aria-hidden="true">&rarr;</span></Link> : <>
          <p>{unavailablePuppyNotice(puppy.name || 'This puppy',puppy.status)}</p>
          <AvailabilityNotice/>
        </>}</div>
      </div>
    </div>
  </main></AvailabilityScope>
}
