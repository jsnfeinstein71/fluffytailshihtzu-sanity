import {NextResponse} from 'next/server'
import {requireOperator} from '@/lib/operator-auth'
import {readRequestText} from '@/lib/request-body'
import {InquiryError} from '@/lib/inquiry'
import {liveWorkspaceEnabled} from '@/lib/workspace-mode'
import {getStaffIdentity} from '@/sanity/lib/staff-auth'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'
import {WorkspaceError} from '@/sanity/lib/workspace'
import {listFeedback,manageFeedback} from '@/sanity/lib/feedback'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}
function failure(error:unknown){return NextResponse.json({error:error instanceof WorkspaceError||error instanceof InquiryError?error.message:(error as {statusCode?:number})?.statusCode===409?'This feedback changed. Refresh and review it before trying again.':'The feedback action could not be confirmed. Your saved records are kept; please refresh.'},{status:error instanceof WorkspaceError||error instanceof InquiryError?error.status:(error as {statusCode?:number})?.statusCode===409?409:503,headers})}
export async function GET(req:Request){
 const denied=await requireOperator(req);if(denied)return denied
 try{return NextResponse.json(await listFeedback(new URL(req.url).searchParams.get('familyId')||undefined),{headers})}catch(error){return failure(error)}
}
export async function POST(req:Request){
 const denied=await requireOperator(req);if(denied)return denied
 const frozen=operationalWriteFreeze();if(frozen)return frozen
 if(req.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return NextResponse.json({error:'Use a JSON feedback action.'},{status:415,headers})
 try{
  let data:unknown;try{data=JSON.parse(await readRequestText(req,16000))}catch(error){if(error instanceof InquiryError)throw error;throw new WorkspaceError('Please check the feedback action.')}
  if(!data||typeof data!=='object'||Array.isArray(data))throw new WorkspaceError('Choose a feedback action.')
  const identity=liveWorkspaceEnabled()?await getStaffIdentity(req):null
  if(liveWorkspaceEnabled()&&!identity)throw new WorkspaceError('Unlock the staff workspace to continue.',401)
  const result=await manageFeedback(data as Record<string,unknown>,identity?.owner.key||'preview-operator')
  return NextResponse.json({...await listFeedback(),...result},{headers})
 }catch(error){return failure(error)}
}
