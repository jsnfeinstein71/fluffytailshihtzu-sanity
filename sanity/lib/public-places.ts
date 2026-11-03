import 'server-only'
import {validPlaces,type Place} from '@/lib/public-availability'
// Read the existing minimal public projection, never private payment records.
export async function publishedPlaces(id:string):Promise<Place[]>{
 if(!/^[a-zA-Z0-9_-]{1,150}$/.test(id))throw Error('Use a published litter ID')
 const r=await fetch('https://www.fluffytailshihtzu.com/api/litter-places?litter='+encodeURIComponent(id),{next:{revalidate:15},signal:AbortSignal.timeout(5000)})
 if(!r.ok)throw Error('Positions unavailable')
 const data=await r.json();if(!validPlaces(data.places))throw Error('Incomplete positions');return data.places
}
