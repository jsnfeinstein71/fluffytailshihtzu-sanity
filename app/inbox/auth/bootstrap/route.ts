import {NextResponse} from 'next/server'
import {requireOperator} from '@/lib/operator-auth'
import {passkeyMode,ownerKey} from '@/lib/passkey-config'
import {inviteOwner,limitAuth,StaffAuthError} from '@/sanity/lib/staff-auth'
export const runtime='nodejs'
export async function POST(req:Request){
  const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}
  try{
    // Legacy access can bootstrap only the two named owners, only during transition,
    // and only from the current public production hostname (never an alias).
    if(passkeyMode()!=='transition'||new URL(req.url).origin!=='https://www.fluffytailshihtzu.com')return NextResponse.json({error:'Initial owner enrollment is closed.'},{status:403,headers})
    const denied=await requireOperator(req);if(denied)return denied
    if(req.headers.get('origin')!==new URL(req.url).origin||req.headers.get('content-type')?.split(';')[0]!=='application/json')return NextResponse.json({error:'Use the enrollment screen.'},{status:403,headers})
    const text=await req.text();if(text.length>200)throw new StaffAuthError('Invalid owner.',400)
    const input=JSON.parse(text);if(!ownerKey(input.owner))throw new StaffAuthError('Choose Jeanne or Jason.',400)
    await limitAuth(req,'invitation');return NextResponse.json(await inviteOwner(input.owner),{headers})
  }catch(e){return NextResponse.json({error:e instanceof StaffAuthError?e.message:'The invitation could not be created.'},{status:e instanceof StaffAuthError?e.status:503,headers})}
}
