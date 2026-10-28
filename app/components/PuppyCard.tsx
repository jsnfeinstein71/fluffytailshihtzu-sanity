import Link from 'next/link'
import {formatCurrency, formatPuppyStatus, getAgeInWeeks, getReadyDate, puppyPath, puppyStatusClass, type Puppy} from '@/lib/inventory'
import {tryPricing} from '@/lib/pricing'
import {getPuppyProfilePortrait} from '@/lib/puppy-portraits'
import {puppyCardSizes, puppyCutoutSizes} from '@/lib/responsive-images'
import PublicImage from './PublicImage'

export default function PuppyCard({puppy, browsing = false}: {puppy: Puppy; browsing?: boolean}) {
  const age = getAgeInWeeks(puppy.birthDate)
  const ready = getReadyDate(puppy.birthDate)
  const pricing = tryPricing(puppy)
  const profilePortrait = getPuppyProfilePortrait(puppy)
  const content = <>
    <div className={`puppyImageWrap${profilePortrait ? ' puppyImageWrap-cutout' : ''}`}>
      {profilePortrait ? <div className="puppy-cutout-stage">
        <span className="puppy-ground-shadow" aria-hidden="true" />
        <PublicImage className="puppyImage" src={profilePortrait} width={1254} height={1254} sizes={puppyCutoutSizes} alt={`${puppy.name || 'Puppy'} held in caring hands`} />
      </div> : puppy.photoUrl ? <PublicImage className="puppyImage" src={puppy.photoUrl} sizes={puppyCardSizes} alt={puppy.name || 'Puppy'} /> : <span className="puppyMetaLine">Photo coming soon</span>}
    </div>
    <div className="puppyCardBody">
      <div className="puppyCardTop">
        <h3 className="puppyName">{puppy.name || 'Puppy details'}</h3>
        <span className={`statusBadge ${puppyStatusClass(puppy.status)}`}>{formatPuppyStatus(puppy.status)}</span>
      </div>
      <p className="puppyMetaLine">
        {age !== null ? `${age} week${age === 1 ? '' : 's'} old • ` : ''}
        {puppy.sex === 'female' ? 'Female' : puppy.sex === 'male' ? 'Male' : 'Puppy'}
      </p>
      {puppy.color ? <p className="puppyNotes">{puppy.color}</p> : null}
      {ready && (browsing || puppy.status === 'available' || puppy.status === 'hold') ? <div style={{marginTop: '10px'}}><span className="badge">Estimated ready date: {ready}</span></div> : null}
      <div className="puppy-card-footer">
        <span>{browsing && pricing ? <span className="puppy-card-price-label">Total puppy price</span> : null}{pricing ? formatCurrency(pricing.totalCents / 100, browsing && pricing.totalCents % 100 !== 0) : 'Ask Jeanne about pricing'}</span>
        {puppy.slug ? <span>{browsing ? 'View puppy' : `Meet ${puppy.name || 'this puppy'}`} <span aria-hidden="true">&rarr;</span></span> : null}
      </div>
    </div>
  </>

  return puppy.slug
    ? <Link className="puppyCard puppyCardLink" href={puppyPath(puppy.slug)} data-puppy-id={puppy._id}>{content}</Link>
    : <div className="puppyCard" data-puppy-id={puppy._id}>{content}</div>
}
