import {NextResponse} from 'next/server'
import {requireOperator} from '@/lib/operator-auth'
import {readRequestText} from '@/lib/request-body'
import {InquiryError} from '@/lib/inquiry'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'
import {paymentTestWorkspaceEnabled} from '@/lib/payment-test-mode'
import {WorkspaceError} from '@/sanity/lib/workspace'
import {EmailWorkflowError,prepareEmailAction} from '@/sanity/lib/workspace-email'
import {ensureOutgoing,loadEmailWorkflow,performTransportAction} from '@/sanity/lib/email-workflow'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60
const headers={'Cache-Control':'private, no-store'}
function failure(error:unknown){
  if(error instanceof EmailWorkflowError)return NextResponse.json({error:error.message,conflict:error.conflict},{status:error.status,headers})
  if(error instanceof WorkspaceError||error instanceof InquiryError)return NextResponse.json({error:error.message},{status:error.status,headers})
  if(error&&typeof error==='object'&&'type' in error&&error.type==='StripeRateLimitError'){
    const claimRequired=paymentTestWorkspaceEnabled()&&'message' in error&&typeof error.message==='string'&&error.message.includes('Claimable sandbox request rate limit exceeded')
    return NextResponse.json({error:claimRequired?'Stripe’s unclaimed test environment has reached its request limit. An owner must claim the existing sandbox before this link can be prepared. Your original request, draft and payments are kept.':'Stripe is temporarily limiting checkout preparation. Your existing request and draft are kept. Wait before trying this same request again.'},{status:429,headers})
  }
  // Diagnose provider failures without logging personal messages, addresses,
  // tokens, request bodies or the provider's potentially sensitive message.
  if(error&&typeof error==='object'){
    const fields=error as Record<string,unknown>,safe=(key:string)=>typeof fields[key]==='string'&&/^[A-Za-z0-9_.-]{1,100}$/.test(fields[key] as string)?fields[key]:undefined
    console.error('Staff email action failed',{name:safe('name'),type:safe('type'),code:safe('code'),param:safe('param')})
  }
  return NextResponse.json({error:'The email workspace could not confirm this action. Your draft is kept; review and retry after reconnecting.'},{status:503,headers})
}
export async function GET(req:Request){
  const denied = await requireOperator(req);if(denied)return denied
  try{return NextResponse.json(await loadEmailWorkflow(),{headers})}catch(error){return failure(error)}
}
export async function POST(req:Request){
  const denied = await requireOperator(req);if(denied)return denied
  const frozen=operationalWriteFreeze();if(frozen)return frozen
  if(req.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return NextResponse.json({error:'Use a JSON email request.'},{status:415,headers})
  try{
    const text=await readRequestText(req,100000)
    let data:unknown;try{data=JSON.parse(text)}catch{throw new EmailWorkflowError('Invalid email request.')}
    const origin=new URL(req.url).origin
    const type=(data as {type?:string})?.type
    const result=['dispatch','sync','refresh','reconcile','resolve'].includes(type||'')?await performTransportAction(data,origin):await prepareEmailAction(data,origin)
    if('reviewId' in result&&typeof result.reviewId==='string')await ensureOutgoing(result.reviewId,origin)
    return NextResponse.json({...await loadEmailWorkflow(),...result},{headers})
  }catch(error){return failure(error)}
}
