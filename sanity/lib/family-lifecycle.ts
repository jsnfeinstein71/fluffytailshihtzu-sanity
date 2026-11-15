import 'server-only'
import {createHash,randomUUID} from 'node:crypto'
import {privateRecordId} from './private-records'
import {getOperatorClient} from './operator-client'
import {requireWorkspace,validFamilyKey,workspaceId,WorkspaceError} from './workspace'
import {workspaceNamespace} from '@/lib/workspace-mode'
import type {SavedFamily} from '@/app/inbox/workspace/persistence'

type Linked={_id:string;_rev:string;_type:string;familyId?:string;staffFamilyId?:string;workspace?:string;filename?:string;kind?:string;contentType?:string;state?:string;status?:string;attempts?:unknown[];value?:{attachmentIds?:string[];body?:string;subject?:string};activeId?:string}
export type FamilyReview={familyId:string;name:string;archived:boolean;warnings:string[];blocked:string[];removals:string[];token:string;test:boolean;duplicate:boolean}
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
const conflict=(e:unknown)=>(e as {statusCode?:number})?.statusCode===409
export async function savedFamily(id:string){
 requireWorkspace()
 if(!validFamilyKey(id))throw new WorkspaceError('Choose a saved family.',404)
 const family=await getOperatorClient().getDocument<SavedFamily>(workspaceId(id))
 if(!family||family._type!=='staffFamily'||family.workspace!==workspaceNamespace()||family.familyKey!==id)throw new WorkspaceError('This family is no longer available. Refresh the list.',409)
 if(family.deletionUntil&&Date.parse(family.deletionUntil)>Date.now())throw new WorkspaceError('This family is being checked for deletion. Your message is kept. Refresh and retry shortly.',409)
 return family
}
// Every independently created family-owned record participates in the same
// revision boundary as deletion. A stale creator cannot leave an orphan.
export async function commitFamilyRecords(id:string,build:(tx:ReturnType<ReturnType<typeof getOperatorClient>['transaction']>)=>ReturnType<ReturnType<typeof getOperatorClient>['transaction']>){
 for(let n=0;n<3;n++){
  const family=await savedFamily(id)
  try{await build(getOperatorClient().transaction()).patch(family._id,p=>p.ifRevisionId(family._rev).set({activityRevision:randomUUID()})).commit({visibility:'sync'});return}catch(e){if(!conflict(e)||n===2)throw e}
 }
}
export async function persistInbound(record:{_id:string;_type:string;familyId?:string;[key:string]:unknown},receivedAt:string,genuine:boolean){
 const client=getOperatorClient()
 for(let n=0;n<4;n++){
  if(await client.getDocument(record._id))return false
  const family=record.familyId?await savedFamily(record.familyId):null
  const restore=family?.archivedAt&&genuine&&Date.parse(receivedAt)>Date.parse(family.archivedAt)
  let tx=client.transaction().create(record)
  if(family)tx=tx.patch(family._id,p=>p.ifRevisionId(family._rev).set({activityRevision:randomUUID(),...(restore?{archivedAt:null,'profile.unread':true}:{} )}))
  try{await tx.commit({visibility:'sync'});return true}catch(e){if(!conflict(e)||n===3)throw e}
 }
 return false
}
const labels:Record<string,string>={staffEmailDraft:'saved email drafts',staffAttachment:'private files',staffIncomingEmail:'received emails',staffOutgoingEmail:'unsent outgoing emails',staffEmailReview:'prepared email copies',staffMailCursor:'reply synchronization records',staffMailGuard:'send protection records',smsMessage:'text messages',puppyInquiry:'submitted inquiries'}
const related='(_id == $inquiry || _id in $systemIds || familyId == $key || staffFamilyId == $key || familyId == $id || staffFamilyId == $id || references($id) || (defined($email) && $email != "" && (lower(customerEmail) == $email || lower(email) == $email)) || (defined($phone) && $phone != "" && (customerPhone == $phone || from == $phone || to == $phone)))'
const sharedLinks='(references($ids) || count(value.attachmentIds[@ in $ids]) > 0 || count(attachmentIds[@ in $ids]) > 0 || count(attachments[id in $ids]) > 0 || replyToId in $ids || value.replyToId in $ids || matchedOutgoingId in $ids || reviewId in $ids || activeId in $ids)'
async function inspect(id:string,locked?:SavedFamily){
 const family=locked||await savedFamily(id),client=getOperatorClient()
 const systemIds=[privateRecordId('staffMailCursor',`${workspaceNamespace()}:${id}:INBOX`),privateRecordId('staffMailGuard',`${workspaceNamespace()}:${id}`)]
 const linked=await client.fetch<Linked[]>('*[_id != $id && '+related+'] [0...501]{_id,_rev,_type,familyId,staffFamilyId,workspace,filename,kind,contentType,state,status,attempts[0...1]{_key},value{body,subject,attachmentIds},activeId}',{id:family._id,key:id,systemIds,inquiry:family.profile.inquiryId||null,email:family.profile.email?.toLowerCase()||null,phone:family.profile.phone||null},{cache:'no-store'})
 const blocked:string[]=[],warnings:string[]=[]
 if(linked.length>500)blocked.push('More than 500 linked records need review. Archive this family instead.')
 if(family.profile.puppyId)warnings.push('A puppy is associated with this family. Any reservation and pickup arrangements stay unchanged.')
 if(family.profile.litterReservationId||linked.some(r=>/reservation|litterFamily/i.test(r._type)))warnings.push('This family has litter reservation history. Any active selection position stays unchanged.')
 if(linked.some(r=>r._type==='staffPaymentRequest'))warnings.push('This family has payment requests. Any outstanding request stays payable; archiving does not close it.')
 if(family.profile.records?.length||family.profile.litterReservationId||linked.some(r=>/payment|agreement|contract|reservation|litterFamily|litterCredit/i.test(r._type)))blocked.push('Payment records, payment requests, agreements or reservation history must be preserved. Archive this family instead.')
 if(family.profile.puppyId)blocked.push('A puppy is associated with this family. Archive it to preserve that relationship.')
 const removable=linked.filter(r=>{
  const owned=r.familyId===id&&r.workspace===workspaceNamespace()
  if(r._id===family.profile.inquiryId)return false // Original inquiries are retained; the deletion marker prevents re-import.
  if(!labels[r._type]||!owned){blocked.push('A linked or shared record cannot be safely removed. Archive this family instead.');return false}
  if(r._type==='staffAttachment'&&(r.kind!=='photo'||!r.contentType?.startsWith('image/'))){blocked.push('Saved documents may contain agreements or puppy records. Archive this family to keep its paperwork.');return false}
  if(['staffOutgoingEmail','staffEmailReview'].includes(r._type)||(r.attempts?.length||0)>0||['sending','uncertain','accepted','sent'].includes(r.state||r.status||'')||r.activeId){blocked.push('Prepared or sent email history, or an active/uncertain sending attempt, must be preserved. Archive this family instead.');return false}
  return true
 })
 const ids=[family._id,...removable.map(r=>r._id)]
 const shared=await client.fetch<{_id:string}[]>('*[!(_id in $ids) && '+sharedLinks+'][0...1]{_id}',{ids},{cache:'no-store'})
 if(shared.length)blocked.push('Another record refers to this family or its files/messages. Archive it so those links remain usable.')
 const duplicates=await client.fetch<{_id:string}[]>('*[_type == "staffFamily" && workspace == $workspace && _id != $id && lower(profile.email) == $email && profile.phone == $phone][0...2]{_id}',{workspace:workspaceNamespace(),id:family._id,email:family.profile.email.toLowerCase(),phone:family.profile.phone||''},{cache:'no-store'})
 const empty=!family.profile.messages?.length&&!family.notes.length&&!Object.values(family.drafts).some(Boolean)&&removable.every(r=>r._type==='staffEmailDraft'&&!r.value?.body&&!r.value?.subject&&!r.value?.attachmentIds?.length||['staffMailCursor','staffMailGuard'].includes(r._type))
 const test=family.managementKind==='test'||!!family.profile.paymentTestScenario
 if(!empty&&!test&&!duplicates.length)blocked.push('This family has correspondence or notes. Only empty records, verified duplicates or explicitly marked test families are eligible. Archive it, or mark it as a test only if it really is fictional.')
 const counts=new Map<string,number>()
 for(const r of removable)counts.set(labels[r._type],(counts.get(labels[r._type])||0)+1)
 const removals=['Family name, contact details and preferences',`${family.profile.messages?.length||0} saved inquiry/conversation entries`,`${family.notes.length} private notes`,`${Object.values(family.drafts).filter(Boolean).length} text/plain drafts`,...Array.from(counts,([label,n])=>`${n} ${label}`),...removable.filter(r=>r._type==='staffAttachment').map(r=>`Photo: ${r.filename||'unnamed file'}`),'Pickup checklist and saved family settings']
 const token=hash([family._rev,linked.map(r=>[r._id,r._rev]).sort(),duplicates.map(r=>r._id).sort()])
 return {family,removable,retained:linked.length-removable.length,review:{familyId:id,name:family.profile.name,archived:!!family.archivedAt,warnings,blocked:[...new Set(blocked)],removals,token,test,duplicate:!!duplicates.length} satisfies FamilyReview}
}
export async function reviewFamily(id:string){return (await inspect(id)).review}
export async function manageFamily(input:unknown){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new WorkspaceError('Choose a family action.')
 const d=input as Record<string,unknown>
 if(Object.keys(d).some(k=>!['action','familyId','token','name'].includes(k))||!['archive','restore','mark-test','delete'].includes(String(d.action))||!validFamilyKey(d.familyId))throw new WorkspaceError('Choose a valid family action.')
 const {family,removable,review}=await inspect(d.familyId)
 if(d.action==='mark-test'){
  if(d.name!==family.profile.name)throw new WorkspaceError('Enter the family name to mark this record as fictional.')
  await getOperatorClient().patch(family._id).ifRevisionId(family._rev).set({managementKind:'test'}).commit({visibility:'sync'});return
 }
 if(d.action==='archive'||d.action==='restore'){
  if(d.action==='archive'&&d.token!==review.token)throw new WorkspaceError('This family changed. Review the archive notice again; nothing was archived.',409)
  await getOperatorClient().patch(family._id).ifRevisionId(family._rev).set({archivedAt:d.action==='archive'?new Date().toISOString():null}).commit({visibility:'sync'});return
 }
 if(review.blocked.length)throw new WorkspaceError(review.blocked.join(' '),409)
 if(d.token!==review.token||d.name!==family.profile.name)throw new WorkspaceError('The family changed or its name did not match. Review deletion again; nothing was removed.',409)
 const client=getOperatorClient(),lock=randomUUID(),until=new Date(Date.now()+90000).toISOString()
 await client.patch(family._id).ifRevisionId(family._rev).set({deletionToken:lock,deletionUntil:until}).commit({visibility:'sync'})
 try{
  const locked=await client.getDocument<SavedFamily>(family._id)
  if(!locked||locked.deletionToken!==lock)throw new WorkspaceError('This family changed. Nothing was deleted.',409)
  const final=await inspect(d.familyId,locked)
  // The private lock closes the check/delete window to every application
  // writer. Queries are not used as transactional guards (Sanity's search
  // store is eventually consistent). Revisions guard each removed document.
  if(final.review.blocked.length||JSON.stringify(final.removable.map(r=>[r._id,r._rev]).sort())!==JSON.stringify(removable.map(r=>[r._id,r._rev]).sort())||Date.now()>=Date.parse(until))throw new WorkspaceError('Linked records changed during deletion review. Nothing was removed. Review again or archive.',409)
  let tx=client.transaction()
  for(const r of [...final.removable,locked])tx=tx.patch(r._id,p=>p.ifRevisionId(r._rev).set({deletionCheck:true})).delete(r._id)
  // An opaque marker prevents old inquiry projection from recreating personal
  // data. Original Inbox submissions remain outside this family-list action.
  tx=tx.create({_id:family._id,_type:'staffFamilyDeleted',workspace:workspaceNamespace(),deletedAt:new Date().toISOString()})
  await tx.commit({visibility:'sync'})
 }finally{
  const latest=await client.getDocument<SavedFamily>(family._id)
  if(latest?._type==='staffFamily'&&latest.deletionToken===lock)await client.patch(latest._id).ifRevisionId(latest._rev).set({deletionUntil:null,deletionToken:null}).commit({visibility:'sync'})
 }
}
