import {NextResponse} from 'next/server'
import {requireOperator} from '@/lib/operator-auth'
import {readRequestText} from '@/lib/request-body'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'
import {manageFamily,reviewFamily} from '@/sanity/lib/family-lifecycle'
import {listWorkspaceFamilies,WorkspaceError} from '@/sanity/lib/workspace'
import {refreshArchivedReplies} from '@/sanity/lib/email-workflow'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60
const headers={'Cache-Control':'private, no-store'}
function failure(error:unknown){return NextResponse.json({error:error instanceof WorkspaceError?error.message:(error as {statusCode?:number})?.statusCode===409?'This family changed. Refresh and review again; nothing was deleted.':'The family action could not be confirmed. Your saved records are kept; refresh and review before retrying.'},{status:error instanceof WorkspaceError?error.status:503,headers})}
export async function GET(req:Request){
 const denied=await requireOperator(req);if(denied)return denied
 try{return NextResponse.json({review:await reviewFamily(new URL(req.url).searchParams.get('family')||'')},{headers})}catch(e){return failure(e)}
}
export async function POST(req:Request){
 const denied=await requireOperator(req);if(denied)return denied
 const frozen=operationalWriteFreeze();if(frozen)return frozen
 if(!req.headers.get('content-type')?.startsWith('application/json'))return NextResponse.json({error:'Use a JSON family action.'},{status:415,headers})
 try{
  const data=JSON.parse(await readRequestText(req,4000))
  if(data?.action==='refresh-archived'&&Object.keys(data).length===1)await refreshArchivedReplies()
  else await manageFamily(data)
  return NextResponse.json({families:await listWorkspaceFamilies()},{headers})
 }catch(e){return failure(e)}
}
