import {requireOperator} from '@/lib/operator-auth'
import {privateFeedbackPhoto} from '@/sanity/lib/feedback'
import {WorkspaceError} from '@/sanity/lib/workspace'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const denied=await requireOperator(req);if(denied)return denied
 try{const original=new URL(req.url).searchParams.get('original')==='1',photo=await privateFeedbackPhoto((await params).id,original);return new Response(new Uint8Array(photo.bytes),{headers:{...headers,'Content-Type':photo.contentType,...(original?{'Content-Disposition':'attachment; filename="original-puppy-photo"'}:{})}})}catch(error){return new Response(null,{status:error instanceof WorkspaceError?error.status:503,headers})}
}
