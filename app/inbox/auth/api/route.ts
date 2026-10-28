import {NextResponse} from 'next/server'
import {passkeyConfig} from '@/lib/passkey-config'
import {StaffAuthError,limitAuth,registrationOptions,register,authenticationOptions,authenticate,recover,securityStatus,manageAccess,staffCookieName,ceremonyCookieName,invitationCookieName} from '@/sanity/lib/staff-auth'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}
function denied(error:unknown){return NextResponse.json({error:error instanceof StaffAuthError?error.message:'Access could not be verified. Please try again.'},{status:error instanceof StaffAuthError?error.status:503,headers})}
function validHost(req:Request){if(new URL(req.url).origin!==passkeyConfig().origin)throw new StaffAuthError('Use the staff address to unlock the workspace.',403)}
export async function GET(req:Request){try{validHost(req);return NextResponse.json(await securityStatus(req),{headers})}catch(e){return denied(e)}}
export async function POST(req:Request){
  try{
    validHost(req);const cfg=passkeyConfig()
    if(req.headers.get('origin')!==cfg.origin||req.headers.get('sec-fetch-site')==='cross-site'||req.headers.get('content-type')?.split(';')[0]!=='application/json'||Number(req.headers.get('content-length')||0)>18000)throw new StaffAuthError('This access request must come from the staff screen.',403)
    const text=await req.text();if(text.length>18000)throw new StaffAuthError('Access request is too large.',413)
    const input=JSON.parse(text);if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.action!=='string')throw new StaffAuthError('Choose an available access action.',400)
    await limitAuth(req,input.action.startsWith('register')?'register':input.action.startsWith('authenticate')?'authenticate':input.action==='recover'?'recover':'manage')
    let result:Record<string,unknown>
    switch(input.action){
      case 'register-options':result=await registrationOptions(req,input);break
      case 'register-verify':result=await register(req,input);break
      case 'authenticate-options':result=await authenticationOptions();break
      case 'authenticate-verify':result=await authenticate(req,input);break
      case 'recover':result=await recover(input);break
      default:result=await manageAccess(req,input)
    }
    const {token,ceremony,...publicResult}=result,response=NextResponse.json(publicResult,{headers})
    const cookieOptions={httpOnly:true,secure:cfg.secure,sameSite:'strict' as const,path:'/'}
    if(typeof token==='string')response.cookies.set(staffCookieName(),token,{...cookieOptions,maxAge:30*86400})
    if(input.action==='register-verify')response.cookies.set(invitationCookieName(),'',{...cookieOptions,maxAge:0})
    if(typeof ceremony==='string')response.cookies.set(ceremonyCookieName(),ceremony,{...cookieOptions,maxAge:300})
    else if(input.action.endsWith('-verify'))response.cookies.set(ceremonyCookieName(),'',{...cookieOptions,maxAge:0})
    if(result.signedOut)response.cookies.set(staffCookieName(),'',{...cookieOptions,maxAge:0})
    return response
  }catch(e){return denied(e)}
}
