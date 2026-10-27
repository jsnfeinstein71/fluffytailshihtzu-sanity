import {NextResponse} from 'next/server'
import {requireOperator} from '@/lib/operator-auth'
import {readRequestText} from '@/lib/request-body'
import {InquiryError} from '@/lib/inquiry'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'
import {readAttachment,saveAttachment} from '@/sanity/lib/workspace-attachments'
import {WorkspaceError} from '@/sanity/lib/workspace'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}
function failure(error:unknown){return NextResponse.json({error:error instanceof WorkspaceError||error instanceof InquiryError?error.message:'The file could not be confirmed. Your draft is kept; retry or select it from saved family files.'},{status:error instanceof WorkspaceError||error instanceof InquiryError?error.status:503,headers})}
export async function POST(req:Request){
 const denied=requireOperator(req);if(denied)return denied
 const frozen=operationalWriteFreeze();if(frozen)return frozen
 try{if(req.headers.get('content-type')?.split(';')[0]!=='application/json')throw new WorkspaceError('Choose a supported file.',415);let data;try{data=JSON.parse(await readRequestText(req,3_500_000))}catch(error){if(error instanceof InquiryError)throw error;throw new WorkspaceError('Invalid file upload.')};return NextResponse.json({attachment:await saveAttachment(data)},{headers})}catch(error){return failure(error)}
}
export async function GET(req:Request){
 const denied=requireOperator(req);if(denied)return denied
 try{const {file,bytes}=await readAttachment(new URL(req.url).searchParams.get('id')||'');return new Response(new Uint8Array(bytes),{headers:{...headers,'Content-Type':file.contentType,'Content-Length':String(bytes.length),'Content-Disposition':`${file.kind==='photo'?'inline':'attachment'}; filename="${file.filename.replace(/[^a-zA-Z0-9_. -]/g,'_')}"; filename*=UTF-8''${encodeURIComponent(file.filename).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())}`}})}catch(error){return failure(error)}
}
