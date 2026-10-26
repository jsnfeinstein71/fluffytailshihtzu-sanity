import {NextResponse} from 'next/server'
import {requireOperator} from '@/lib/operator-auth'
import {readRequestText} from '@/lib/request-body'
import {InquiryError} from '@/lib/inquiry'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'
import {listWorkspaceFamilies, mutateWorkspace, WorkspaceError} from '@/sanity/lib/workspace'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = {'Cache-Control':'private, no-store'}

function failure(error:unknown) {
  if (error instanceof WorkspaceError) return NextResponse.json({error:error.message,conflict:error.conflict},{status:error.status,headers})
  if (error instanceof InquiryError) return NextResponse.json({error:error.message},{status:error.status,headers})
  return NextResponse.json({error:'Saved workspace is unavailable. Your unsaved text has not been cleared. Retry the connection before continuing.'},{status:503,headers})
}
export async function GET(req:Request) {
  const denied = requireOperator(req)
  if (denied) return denied
  try {return NextResponse.json({families:await listWorkspaceFamilies()},{headers})}
  catch (error) {return failure(error)}
}
export async function POST(req:Request) {
  const denied = requireOperator(req)
  if (denied) return denied
  const frozen = operationalWriteFreeze()
  if (frozen) return frozen
  if (req.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return NextResponse.json({error:'Use a JSON workspace request.'},{status:415,headers})
  try {
    const body = await readRequestText(req,150000)
    let data:unknown
    try {data=JSON.parse(body)} catch {throw new WorkspaceError('Invalid workspace request.')}
    await mutateWorkspace(data)
    return NextResponse.json({families:await listWorkspaceFamilies()},{headers})
  } catch (error) {return failure(error)}
}
