import {NextResponse} from 'next/server'
import {publicLitterPlaces,LitterError} from '@/sanity/lib/litter-reservations'
export const dynamic='force-dynamic'
export async function GET(req:Request){try{return NextResponse.json({places:await publicLitterPlaces(new URL(req.url).searchParams.get('litter')||'')},{headers:{'Cache-Control':'no-store'}})}catch(e){return NextResponse.json({error:'Please ask Jeanne to confirm the current positions.'},{status:e instanceof LitterError?e.status:503,headers:{'Cache-Control':'no-store'}})}}
