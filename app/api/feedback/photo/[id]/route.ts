import {publicFeedbackPhoto} from '@/sanity/lib/feedback'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 try{const bytes=await publicFeedbackPhoto((await params).id);return bytes?new Response(new Uint8Array(bytes),{headers:{...headers,'Content-Type':'image/jpeg'}}):new Response(null,{status:404,headers})}catch{return new Response(null,{status:503,headers})}
}
