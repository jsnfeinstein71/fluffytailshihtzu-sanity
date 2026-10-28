import {workspaceNamespace} from '@/lib/workspace-mode'
import {NextResponse} from 'next/server'
import {createHash,randomBytes} from 'node:crypto'
import {requireOperator} from '@/lib/operator-auth'
import {requireWorkspace} from '@/sanity/lib/workspace'
import {getOperatorClient} from '@/sanity/lib/operator-client'
import {privateRecordId} from '@/sanity/lib/private-records'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'
import {passkeyMode} from '@/lib/passkey-config'
export const runtime='nodejs'
export async function POST(req:Request){
 if(passkeyMode()!=='off')return NextResponse.json({error:'Owner access links have been replaced by passkeys.'},{status:410})
 const denied = await requireOperator(req);if(denied)return denied
 const frozen=operationalWriteFreeze();if(frozen)return frozen
 try{requireWorkspace();const token=randomBytes(32).toString('base64url'),hash=createHash('sha256').update(token).digest('hex');await getOperatorClient().transaction().createIfNotExists({_id:privateRecordId('staffAccess',hash),_type:'staffAccess',workspace:workspaceNamespace(),expiresAt:Date.now()+10*60*1000,used:false}).commit({visibility:'sync'});return NextResponse.json({url:new URL('/inbox/access#'+token,req.url).href},{headers:{'Cache-Control':'private, no-store'}})}catch{return NextResponse.json({error:'Owner access link could not be created.'},{status:503})}
}
