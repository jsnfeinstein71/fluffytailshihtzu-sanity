import {NextResponse} from 'next/server'
import {publicLitterPlaces,LitterError} from '@/sanity/lib/litter-reservations'
import {publicReviewEnabled} from '@/lib/public-review'
import {reviewPlaces,reviewScenario} from '@/sanity/lib/public-review'
import {publishedPlaces} from '@/sanity/lib/public-places'
export const dynamic='force-dynamic'
export async function GET(req:Request){try{const id=new URL(req.url).searchParams.get('litter')||'';let places;if(publicReviewEnabled()){const s=await reviewScenario();if(s==='unknown')throw Error('Review failure');if(s!=='live'&&id!=='review-upcoming')return NextResponse.json({error:'Unknown review litter.'},{status:404});places=s==='live'?await publishedPlaces(id):reviewPlaces(s)}else places=await publicLitterPlaces(id);return NextResponse.json({places},{headers:{'Cache-Control':'no-store'}})}catch(e){return NextResponse.json({error:'Please ask Jeanne to confirm the current positions.'},{status:e instanceof LitterError?e.status:503,headers:{'Cache-Control':'no-store'}})}}
