import PuppyCard from './PuppyCard'
import {tryPricing} from '@/lib/pricing'
import {formatCurrency, formatDate, getPuppiesForLitter, type Litter, type Puppy} from '@/lib/inventory'

export default function LitterSection({litter, puppies}: {litter: Litter; puppies: Puppy[]}) {
  const members = getPuppiesForLitter(puppies, litter._id)
  const pricing = tryPricing({litterPrice: litter.price, litterDeposit: litter.deposit})
  const born = formatDate(litter.birthDate)
  return (
    <section className="litter-section" data-litter-id={litter._id}>
      <div>
        <h2>{litter.title || 'Current litter'}</h2>
        <p className="lead" style={{margin: 0}}>
          {born ? `Born ${born}` : 'Birth date to be confirmed'}
          {typeof litter.girlsCount === 'number' ? ` • ${litter.girlsCount} ${litter.girlsCount === 1 ? 'girl' : 'girls'}` : ''}
          {typeof litter.boysCount === 'number' ? ` • ${litter.boysCount} ${litter.boysCount === 1 ? 'boy' : 'boys'}` : ''}
        </p>
        {pricing ? <p className="litter-price">
          Litter price: {formatCurrency(pricing.totalCents / 100)}
          {'. A ' + formatCurrency(pricing.depositCents / 100) + ' deposit counts toward the total. See each puppy for its exact price.'}
        </p> : null}
        {litter.summary ? <p className="lead" style={{marginTop: '10px', marginBottom: 0}}>{litter.summary}</p> : null}
      </div>
      <div className="puppyGrid">
        {members.length ? members.map((puppy) => <PuppyCard key={puppy._id} puppy={puppy} />) : <p className="puppyMetaLine" style={{padding: '12px'}}>Individual puppy details will appear here when they’re added. You can ask Jeanne about this litter in the meantime.</p>}
      </div>
    </section>
  )
}
