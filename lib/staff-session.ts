import {createHmac,timingSafeEqual} from 'node:crypto'
import {liveWorkspaceEnabled} from './workspace-mode'

export const staffCookie='fluffytail_preview_staff'
export function isolatedStaffPreview(){return process.env.VERCEL_ENV==='preview'&&process.env.NEXT_PUBLIC_SANITY_PROJECT_ID==='gu1xkpsg'&&process.env.NEXT_PUBLIC_SANITY_DATASET==='synthetic'}
export function staffWorkspaceAvailable(){return isolatedStaffPreview()||liveWorkspaceEnabled()}
function signature(body:string){const key=process.env.INBOX_BASIC_AUTH_PASS;if(!key)throw new Error('Staff authentication unavailable.');return createHmac('sha256',key).update('preview-staff-v1:'+body).digest('base64url')}
export function makeStaffSession(origin:string){const body=Buffer.from(JSON.stringify({aud:origin,exp:Date.now()+8*60*60*1000})).toString('base64url');return body+'.'+signature(body)}
export function validStaffSession(req:Request){
 const path=new URL(req.url).pathname,base='/inbox'
 if(!staffWorkspaceAvailable()||!(path===base||path.startsWith(base+'/')))return false
 const raw=req.headers.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith(staffCookie+'='))?.slice(staffCookie.length+1)
 if(!raw||raw.length>1000)return false
 try{const [body,mac,...rest]=raw.split('.');if(rest.length||!body||!mac)return false;const expected=signature(body),a=Buffer.from(mac),b=Buffer.from(expected);if(a.length!==b.length||!timingSafeEqual(a,b))return false;const data=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));return data.aud===new URL(req.url).origin&&data.exp>Date.now()&&data.exp<=Date.now()+8*60*60*1000}catch{return false}
}
