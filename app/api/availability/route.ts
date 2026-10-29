import {NextResponse} from 'next/server'
import {getBrowsingContext} from '@/sanity/lib/public-availability'
export const dynamic='force-dynamic'
export async function GET(){const {availability}=await getBrowsingContext();return NextResponse.json({availability},{headers:{'Cache-Control':'no-store'}})}
