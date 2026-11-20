import {NextResponse} from 'next/server'
import {readRequestText} from '@/lib/request-body'
import {InquiryError} from '@/lib/inquiry'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'
import {WorkspaceError} from '@/sanity/lib/workspace'
import {feedbackStatus,submitFeedback} from '@/sanity/lib/feedback'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}
export async function POST(req:Request){
 // Bearer invitations are sent only in the body, never an access-log URL.
 if(req.headers.get('origin')!==new URL(req.url).origin||req.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Open the invitation on FluffyTail to continue.'},{status:403,headers})
 if(req.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return NextResponse.json({error:'Use the feedback form to continue.'},{status:415,headers})
 try{
  let data:unknown;try{data=JSON.parse(await readRequestText(req,3_500_000))}catch(error){if(error instanceof InquiryError)throw error;throw new WorkspaceError('Please check the feedback form.')}
  if(!data||typeof data!=='object'||Array.isArray(data))throw new WorkspaceError('Please check the feedback form.')
  const input=data as Record<string,unknown>
  if(input.action==='status')return NextResponse.json(await feedbackStatus(input.token),{headers})
  if(input.action!=='submit')throw new WorkspaceError('Use the feedback form to continue.')
  const frozen=operationalWriteFreeze();if(frozen)return frozen
  return NextResponse.json(await submitFeedback(input),{headers})
 }catch(error){return NextResponse.json({error:error instanceof WorkspaceError||error instanceof InquiryError?error.message:'Your feedback could not be confirmed. Your entries are kept; please try again shortly.'},{status:error instanceof WorkspaceError||error instanceof InquiryError?error.status:503,headers})}
}
