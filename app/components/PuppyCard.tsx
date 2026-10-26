import Link from 'next/link'
import {formatCurrency, formatPuppyStatus, getAgeInWeeks, getReadyDate, puppyPath, puppyStatusClass, type Puppy} from '@/lib/inventory'
import {tryPricing} from '@/lib/pricing'

export default function PuppyCard({puppy}: {puppy: Puppy}) {
  const age = getAgeInWeeks(puppy.birthDate)
  const ready = getReadyDate(puppy.birthDate)
  const pricing = tryPricing(puppy)
  const content = <>
    <div className="puppyImageWrap">
      {puppy.photoUrl ? <img className="puppyImage" src={puppy.photoUrl} alt={puppy.name || 'Puppy'} /> : null}
    </div>
    <div className="puppyCardBody">
      <div className="puppyCardTop">
        <h3 className="puppyName">{puppy.name || 'Unnamed puppy'}</h3>
        <span className={`statusBadge ${puppyStatusClass(puppy.status)}`}>{formatPuppyStatus(puppy.status)}</span>
      </div>
      <p className="puppyMetaLine">
        {age !== null ? `${age} week${age === 1 ? '' : 's'} old • ` : ''}
        {puppy.sex === 'female' ? 'Female' : puppy.sex === 'male' ? 'Male' : 'Puppy'}
      </p>
      {puppy.color ? <p className="puppyNotes">{puppy.color}</p> : null}
      {ready && (puppy.status === 'available' || puppy.status === 'hold') ? <div style={{marginTop: '10px'}}><span className="badge">Ready {ready}</span></div> : null}
      <div className="puppy-card-footer">
        <span>{pricing ? formatCurrency(pricing.totalCents / 100) : 'Ask Jeanne about pricing'}</span>
        {puppy.slug ? <span>Meet {puppy.name || 'this puppy'} <span aria-hidden="true">&rarr;</span></span> : null}
      </div>
    </div>
  </>

  return puppy.slug
    ? <Link className="puppyCard puppyCardLink" href={puppyPath(puppy.slug)} data-puppy-id={puppy._id}>{content}</Link>
    : <div className="puppyCard" data-puppy-id={puppy._id}>{content}</div>
}
