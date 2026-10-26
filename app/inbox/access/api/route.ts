import {liveWorkspaceEnabled,workspaceNamespace} from '@/lib/workspace-mode'
import {requireOperator} from '@/lib/operator-auth'
import {NextResponse} from 'next/server'
import {createHash} from 'node:crypto'
import {getOperatorClient} from '@/sanity/lib/operator-client'
import {privateRecordId} from '@/sanity/lib/private-records'
import {staffWorkspaceAvailable,makeStaffSession,staffCookie} from '@/lib/staff-session'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'
export const runtime='nodejs'
export async function POST(req:Request){
 const headers={'Cache-Control':'private, no-store'}
 if(!staffWorkspaceAvailable())return NextResponse.json({error:'Preview owner access is unavailable.'},{status:404,headers})
 const frozen=operationalWriteFreeze();if(frozen)return frozen
 if(req.headers.get('origin')!==new URL(req.url).origin||req.headers.get('sec-fetch-site')==='cross-site'||req.headers.get('content-type')?.split(';')[0]!=='application/json'||Number(req.headers.get('content-length')||0)>2000)return NextResponse.json({error:'Invalid owner access request.'},{status:403,headers})
 try{
  const text=await req.text();if(text.length>2000)throw new Error();const input=JSON.parse(text);const {token}=input;
  if(!token){if(typeof input.username!=='string'||typeof input.password!=='string'||input.username.length>200||input.password.length>500)throw new Error();const denied=requireOperator(new Request(req.url,{headers:{authorization:'Basic '+Buffer.from(input.username+':'+input.password).toString('base64')}}));if(denied)throw new Error();}else{
  if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))throw new Error()
  const hash=createHash('sha256').update(token).digest('hex'),client=getOperatorClient(),id=privateRecordId('staffAccess',hash)
  const record=await client.getDocument<{_rev:string;_type:string;workspace:string;expiresAt:number;used:boolean}>(id)
  if(!record||record._type!=='staffAccess'||record.workspace!==workspaceNamespace()||record.used||!Number.isFinite(record.expiresAt)||record.expiresAt<Date.now())throw new Error()
  await client.patch(id).ifRevisionId(record._rev).set({used:true,usedAt:new Date().toISOString()}).commit({visibility:'sync'})
  }
  const response=NextResponse.json({ok:true},{headers});response.cookies.set(staffCookie,makeStaffSession(new URL(req.url).origin),{httpOnly:true,secure:new URL(req.url).protocol==='https:',sameSite:'lax',path:liveWorkspaceEnabled()?'/inbox':'/inbox/workspace',maxAge:8*60*60});return response
 }catch{return NextResponse.json({error:'Sign-in could not be verified. Check your staff username and password, or use a fresh owner link.'},{status:401,headers})}
}
