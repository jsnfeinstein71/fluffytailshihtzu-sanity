import {formatCurrency, formatDate, formatLitterStatus, getLitterDate, normalizeLitterStatus, type Litter, type Parent} from '@/lib/inventory'

import {tryPricing} from '@/lib/pricing'
import PublicImage from './PublicImage'
import PriceDetails from './PriceDetails'
import {getParentPortrait} from '@/lib/parent-portraits'

export default function LitterTile({litter, photoSizes}: {litter: Litter; photoSizes?: string}) {
  const pricing = tryPricing({litterPrice: litter.price, litterDeposit: litter.deposit})
  const expected = normalizeLitterStatus(litter.status) === 'planned'
  const date = formatDate(getLitterDate(litter), true)
  const parents: [string, Parent | null | undefined][] = [['Father', litter.sire], ['Mother', litter.dam]]
  const parentPortrait = getParentPortrait(litter.groupPhotoUrl)
  return (
    <div className="tile" data-litter-id={litter._id}>
      <div className={`tileImg${parentPortrait ? ' tileImg-parent-portrait' : ''}`}>{litter.groupPhotoUrl ? parentPortrait
        ? <PublicImage src={litter.groupPhotoUrl} alt={`${parentPortrait.name}, one of Jeanne's Shih Tzus`} sizes={photoSizes || '(max-width: 600px) calc(100vw - 42px), 150px'} />
        : photoSizes
        ? <PublicImage src={litter.groupPhotoUrl} alt={litter.title || 'Litter photo'} sizes={photoSizes} />
        : <img src={litter.groupPhotoUrl} alt={litter.title || 'Litter photo'} /> : null}</div>
      <div className="tileMeta">
        <p className="tileName">{litter.title || 'Untitled litter'}</p>
        <p className="tileSub">{formatLitterStatus(litter.status)}{date ? ` • ${expected ? 'Expected around ' : 'Born '}${date}` : ''}</p>
        {parents.map(([role, parent]) => parent ? <div key={role}>
          {parent.name ? <p className="tileSub">{role}: {parent.name}</p> : null}
          {parent.photoUrl ? <img className="parentPhoto" src={parent.photoUrl} alt={`${role}: ${parent.name || 'Parent'}`} /> : null}
        </div> : null)}
        {litter.summary ? <p className="tileSub">{litter.summary}</p> : null}
        {expected && litter.expectedAvailability ? <p className="tileSub">{litter.expectedAvailability}</p> : null}
        {normalizeLitterStatus(litter.status)!=='past'?<PriceDetails name={litter.title || 'Litter'} pricing={{litterPrice:litter.price,litterDeposit:litter.deposit}} pricingStatus={litter.pricingStatus} context="litter" upcoming={expected} />:pricing?<p className="tileSub" style={{marginTop:'4px'}}>Litter price: {formatCurrency(pricing.totalCents/100)}{'. A '+formatCurrency(pricing.depositCents/100)+' deposit counts toward the total. See each puppy for its exact price.'}</p>:null}
      </div>
    </div>
  )
}
