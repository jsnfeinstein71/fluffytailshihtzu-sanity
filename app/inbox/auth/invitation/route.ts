import {NextResponse} from 'next/server'
import {adminOrigin,ownerKey,passkeyConfig,passkeyMode} from '@/lib/passkey-config'
import {invitationCookieName,limitAuth} from '@/sanity/lib/staff-auth'
export const runtime='nodejs'
export async function POST(req:Request){
  const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}
  try{
    const cfg=passkeyConfig()
    if(passkeyMode()!=='transition'||cfg.origin!==adminOrigin||new URL(req.url).origin!==adminOrigin||req.headers.get('origin')!=='https://www.fluffytailshihtzu.com'||req.headers.get('content-type')?.split(';')[0]!=='application/x-www-form-urlencoded')return NextResponse.json({error:'Use the owner enrollment screen.'},{status:403,headers})
    const text=await req.text();if(text.length>200)throw new Error()
    const input=new URLSearchParams(text),owner=input.get('owner'),invitation=input.get('invitation')||''
    if(!ownerKey(owner)||!/^[A-Za-z0-9_-]{43}$/.test(invitation))throw new Error()
    await limitAuth(req,'invitation-handoff')
    // This cookie is an enrollment capability only. The invitation still needs
    // server verification, a fresh UV ceremony and atomic one-use claiming.
    const response=NextResponse.redirect(new URL('/inbox/unlock?enroll='+owner,adminOrigin),303)
    for(const [key,value]of Object.entries(headers))response.headers.set(key,value)
    response.cookies.set(invitationCookieName(),owner+'.'+invitation,{secure:true,httpOnly:true,sameSite:'strict',path:'/',maxAge:1800})
    return response
  }catch{return NextResponse.json({error:'This invitation could not be opened. Return to the enrollment screen and try again.'},{status:400,headers})}
}
