import {NextResponse} from 'next/server'
import {getBrowsingContext} from '@/sanity/lib/public-availability'
import {isReviewScenario,publicReviewEnabled} from '@/lib/public-review'
export const dynamic='force-dynamic'
export async function GET(req?:Request){const selected=req?new URL(req.url).searchParams.get('reviewScenario'):null;if(publicReviewEnabled()&&selected&&!isReviewScenario(selected))return NextResponse.json({error:'Unknown review scenario.'},{status:400});const requested=publicReviewEnabled()&&isReviewScenario(selected)?selected:undefined;const {availability}=await getBrowsingContext(requested);return NextResponse.json({availability},{headers:{'Cache-Control':'no-store'}})}
