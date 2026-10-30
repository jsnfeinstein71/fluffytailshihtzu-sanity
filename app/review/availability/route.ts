import {NextResponse} from 'next/server'
import {publicReviewEnabled,reviewCookie,reviewScenarios,isReviewScenario} from '@/lib/public-review'
export async function POST(req:Request){
 if(!publicReviewEnabled())return new NextResponse(null,{status:404})
 if(req.headers.get('origin')!==new URL(req.url).origin)return new NextResponse(null,{status:403})
 try{const body=await req.text();if(body.length>1000)return new NextResponse(null,{status:413});const {scenario}=JSON.parse(body);if(!isReviewScenario(scenario))return NextResponse.json({error:'Choose a review scenario.'},{status:400});const r=NextResponse.json({scenario},{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});r.cookies.set(reviewCookie,scenario,{httpOnly:true,secure:new URL(req.url).protocol==='https:',sameSite:'lax',path:'/',maxAge:86400});return r}catch{return NextResponse.json({error:'Choose a review scenario.'},{status:400})}
}
export async function GET(req:Request){if(!publicReviewEnabled())return new NextResponse(null,{status:404});const url=new URL(req.url),scenario=url.searchParams.get('scenario');if(!reviewScenarios.some(s=>s===scenario))return new NextResponse('Choose a review scenario.',{status:400});const r=NextResponse.redirect(new URL('/',url));r.cookies.set(reviewCookie,scenario!,{httpOnly:true,secure:url.protocol==='https:',sameSite:'lax',path:'/',maxAge:86400});r.headers.set('Cache-Control','no-store');r.headers.set('X-Robots-Tag','noindex, nofollow');return r}
