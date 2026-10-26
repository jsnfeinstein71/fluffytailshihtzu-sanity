import {NextResponse} from 'next/server'
import {requireOperator} from '@/lib/operator-auth'
import {readRequestText} from '@/lib/request-body'
import {InquiryError} from '@/lib/inquiry'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'
import {WorkspaceError} from '@/sanity/lib/workspace'
import {EmailWorkflowError,loadMailbox,prepareEmailAction} from '@/sanity/lib/workspace-email'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}
function failure(error:unknown){
  if(error instanceof EmailWorkflowError)return NextResponse.json({error:error.message,conflict:error.conflict},{status:error.status,headers})
  if(error instanceof WorkspaceError||error instanceof InquiryError)return NextResponse.json({error:error.message},{status:error.status,headers})
  return NextResponse.json({error:'The email workspace could not confirm this action. Your draft is kept; review and retry after reconnecting.'},{status:503,headers})
}
export async function GET(req:Request){
  const denied=requireOperator(req);if(denied)return denied
  try{return NextResponse.json(await loadMailbox(),{headers})}catch(error){return failure(error)}
}
export async function POST(req:Request){
  const denied=requireOperator(req);if(denied)return denied
  const frozen=operationalWriteFreeze();if(frozen)return frozen
  if(req.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return NextResponse.json({error:'Use a JSON email request.'},{status:415,headers})
  try{
    const text=await readRequestText(req,100000)
    let data:unknown;try{data=JSON.parse(text)}catch{throw new EmailWorkflowError('Invalid email request.')}
    const result=await prepareEmailAction(data,new URL(req.url).origin)
    return NextResponse.json({...await loadMailbox(),...result},{headers})
  }catch(error){return failure(error)}
}
