import {NextResponse} from 'next/server'
import {publicLitterPlaces,LitterError} from '@/sanity/lib/litter-reservations'
import {publicReviewEnabled,isReviewScenario} from '@/lib/public-review'
import {reviewPlaces,reviewScenario} from '@/sanity/lib/public-review'
import {publishedPlaces} from '@/sanity/lib/public-places'
export const dynamic='force-dynamic'
export async function GET(req:Request){try{const url=new URL(req.url),id=url.searchParams.get('litter')||'',selected=url.searchParams.get('reviewScenario');let places;if(publicReviewEnabled()){if(selected&&!isReviewScenario(selected))return NextResponse.json({error:'Unknown review scenario.'},{status:400});const s=await reviewScenario(isReviewScenario(selected)?selected:undefined);if(s==='unknown')throw Error('Review failure');if(s!=='live'&&id!=='review-upcoming')return NextResponse.json({error:'Unknown review litter.'},{status:404});places=s==='live'?await publishedPlaces(id):reviewPlaces(s)}else places=await publicLitterPlaces(id);return NextResponse.json({places},{headers:{'Cache-Control':'no-store'}})}catch(e){return NextResponse.json({error:'Please ask Jeanne to confirm the current positions.'},{status:e instanceof LitterError?e.status:503,headers:{'Cache-Control':'no-store'}})}}
