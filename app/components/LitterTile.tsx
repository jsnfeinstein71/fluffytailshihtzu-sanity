import {formatCurrency, formatDate, formatLitterStatus, getLitterDate, normalizeLitterStatus, type Litter, type Parent} from '@/lib/inventory'

import {tryPricing} from '@/lib/pricing'

export default function LitterTile({litter}: {litter: Litter}) {
  const pricing = tryPricing({litterPrice: litter.price, litterDeposit: litter.deposit})
  const expected = normalizeLitterStatus(litter.status) === 'planned'
  const date = formatDate(getLitterDate(litter), true)
  const parents: [string, Parent | null | undefined][] = [['Sire', litter.sire], ['Dam', litter.dam]]
  return (
    <div className="tile" data-litter-id={litter._id}>
      <div className="tileImg">{litter.groupPhotoUrl ? <img src={litter.groupPhotoUrl} alt={litter.title || 'Litter photo'} /> : null}</div>
      <div className="tileMeta">
        <p className="tileName">{litter.title || 'Untitled litter'}</p>
        <p className="tileSub">{formatLitterStatus(litter.status)}{date ? ` • ${expected ? 'Expected ' : 'Born '}${date}` : ''}</p>
        {parents.map(([role, parent]) => parent ? <div key={role}>
          {parent.name ? <p className="tileSub">{role}: {parent.name}</p> : null}
          {parent.photoUrl ? <img className="parentPhoto" src={parent.photoUrl} alt={`${role}: ${parent.name || 'Parent'}`} /> : null}
        </div> : null)}
        {litter.summary ? <p className="tileSub">{litter.summary}</p> : null}
        {expected && litter.expectedAvailability ? <p className="tileSub">{litter.expectedAvailability}</p> : null}
        {pricing ? <p className="tileSub" style={{marginTop: '4px'}}>Default puppy price: {formatCurrency(pricing.totalCents / 100)}{' • ' + formatCurrency(pricing.depositCents / 100) + ' deposit included'}</p> : null}
      </div>
    </div>
  )
}
