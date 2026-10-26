import {NextResponse} from 'next/server'
import {requireOperator} from '@/lib/operator-auth'
import {readRequestText} from '@/lib/request-body'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'
import {submitWorkspaceSms} from '@/sanity/lib/workspace-sms'
import {WorkspaceError} from '@/sanity/lib/workspace'
export const runtime='nodejs'
export const maxDuration=30
export async function POST(req:Request){
 const denied=requireOperator(req);if(denied)return denied
 const frozen=operationalWriteFreeze();if(frozen)return frozen
 const headers={'Cache-Control':'private, no-store'}
 if(!req.headers.get('content-type')?.startsWith('application/json'))return NextResponse.json({error:'Use a JSON request.'},{status:415,headers})
 try{return NextResponse.json(await submitWorkspaceSms(JSON.parse(await readRequestText(req,6000))),{headers})}catch(error){return NextResponse.json({error:error instanceof WorkspaceError?error.message:'Text submission could not be confirmed. Your draft is kept; review before retrying.'},{status:error instanceof WorkspaceError?error.status:503,headers})}
}
