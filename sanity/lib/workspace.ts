import {paymentTestWorkspaceEnabled} from '@/lib/payment-test-mode'
import {normalizePhone} from '@/lib/inquiry'
import {liveWorkspaceEnabled,workspaceNamespace} from '@/lib/workspace-mode'
import 'server-only'
import {families, pickupChecks} from '@/app/inbox/workspace/model'
import type {SavedFamily, WorkspaceMutation} from '@/app/inbox/workspace/persistence'
import {privateRecordId} from './private-records'
import {getOperatorClient} from '@/sanity/lib/operator-client'

export class WorkspaceError extends Error {
  constructor(message:string, public status=400, public conflict?:{familyId:string; channel:'Email'|'Text'; saved:string}) {super(message)}
}

// This phase can persist fictional review records only, never real customer data.
export function requireSyntheticWorkspace() {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== 'gu1xkpsg' || process.env.NEXT_PUBLIC_SANITY_DATASET !== 'synthetic') {
    throw new WorkspaceError('Saved workspace is available only in the isolated synthetic Preview.',503)
  }
}
export function requireWorkspace(){if(!liveWorkspaceEnabled())requireSyntheticWorkspace()}
export const workspaceId = (familyKey:string) => privateRecordId('staffFamily',`${workspaceNamespace()}:${familyKey}`)
export const validFamilyKey=(id:unknown):id is string=>typeof id==='string'&&((!liveWorkspaceEnabled()&&families.some(f=>f.id===id))||/^inquiry-[a-f0-9]{64}$/.test(id))
const query = '*[_type == "staffFamily" && workspace == $workspace && schemaVersion == 1] | order(_createdAt desc)[0...501]'

function checkedRecord(record:SavedFamily):SavedFamily {
  if (!record || !validFamilyKey(record.familyKey) || record._id!==workspaceId(record.familyKey) || record._type!=='staffFamily' || record.workspace!==workspaceNamespace() || record.schemaVersion!==1 || typeof record._rev!=='string' || !record._rev || record.profile?.id!==record.familyKey || !record.drafts || !['Email','Text'].every(channel=>typeof record.drafts[channel as 'Email'|'Text']==='string' && record.drafts[channel as 'Email'|'Text'].length<=10000) || !Array.isArray(record.notes) || record.notes.length>200 || record.notes.some(note=>!note || typeof note._key!=='string' || typeof note.text!=='string' || note.text.length>4000 || typeof note.createdAt!=='string') || !Array.isArray(record.checks) || record.checks.some(item=>!pickupChecks.includes(item)) || new Set(record.checks).size!==record.checks.length) {
    throw new WorkspaceError('A saved family record needs review. Its contents have not been replaced or repaired automatically.',503)
  }
  return record
}

export async function listWorkspaceFamilies():Promise<SavedFamily[]> {
  requireWorkspace()
  const records=await getOperatorClient().fetch<SavedFamily[]>(query,{workspace:workspaceNamespace()},{cache:'no-store'})
  if(records.length>500)throw new WorkspaceError('More than 500 families need paginated review. No records were discarded.',409)
  const checked=records.map(checkedRecord)
  if(paymentTestWorkspaceEnabled())return await Promise.all(checked.filter(record=>record.profile.paymentTestScenario).map(async record=>{
    const payments=await getOperatorClient().fetch<{paymentStatus:string;amountPaid:number;paymentType:string;createdAt:string;webhookVerifiedAt:string;quotedTotalCents:number}[]>('*[_type == "paymentRecord" && workspace == "review-v1" && testOnly == true && staffFamilyId == $familyId && puppyId == $puppyId && paymentStatus == "paid"] | order(createdAt asc){paymentStatus,amountPaid,paymentType,createdAt,webhookVerifiedAt,quotedTotalCents}',{familyId:record.familyKey,puppyId:record.profile.puppyId||null},{cache:'no-store'})
    return {...record,profile:{...record.profile,records:payments,agreedTotalCents:payments[0]?.quotedTotalCents}}
  }))
  if(!liveWorkspaceEnabled())return checked
  return await Promise.all(checked.map(async record=>{
    const profile={...record.profile}
    if(profile.phone){const sms=await getOperatorClient().fetch<{_id:string;body?:string;direction?:string;receivedAt:string;status?:string;delivery?:string;providerStatus?:string;signatureVerified?:boolean;optOutType?:string;familyId?:string;from?:string;to?:string}[]>('*[_type == "smsMessage" && (familyId == $familyId || source == "fluffytail")] | order(receivedAt desc)[0...1000]',{familyId:record.familyKey},{cache:'no-store'});const samePhone=checked.filter(f=>f.profile.phone===profile.phone).length;const optOut=sms.find(m=>{if(m.direction!=='inbound'||!m.signatureVerified)return false;try{return normalizePhone(m.from||'')===profile.phone&&(['STOP','START'].includes(m.optOutType||'')||/^(stop|stopall|unsubscribe|cancel|end|quit|start|unstop)$/i.test((m.body||'').trim()))}catch{return false}});if(optOut&&(optOut.optOutType==='STOP'||optOut.optOutType!=='START'&&!/^(start|unstop)$/i.test((optOut.body||'').trim())))profile.smsBlockedReason='This number has opted out of texts. Choose Email.';profile.messages=[...(profile.messages||[]),...sms.filter(m=>{if(m.familyId)return m.familyId===record.familyKey;if(samePhone!==1)return false;try{return normalizePhone(m.direction==='inbound'?m.from||'':m.to||'')===profile.phone}catch{return false}}).sort((a,b)=>a.receivedAt.localeCompare(b.receivedAt)).map(m=>({id:m._id,body:m.body||'',kind:'sms' as const,status:m.status,delivery:m.delivery||'unconfirmed',direction:m.direction==='inbound'?'in' as const:'out' as const,channel:'Text' as const,time:m.receivedAt}))]}
    const payments=await getOperatorClient().fetch<{paymentStatus:string;amountPaid:number;customerEmail?:string;customerPhone?:string;puppySlug?:string;quotedTotalCents?:number}[]>('*[_type == "paymentRecord" && paymentStatus == "paid"][0...1000]{paymentStatus,amountPaid,customerEmail,customerPhone,puppySlug,quotedTotalCents}',{},{cache:'no-store'})
    const matched=payments.filter(p=>{let phone='';try{phone=normalizePhone(p.customerPhone||'')}catch{};return (p.customerEmail?.trim().toLowerCase()===profile.email.toLowerCase()||!!profile.phone&&phone===profile.phone)&&(!profile.puppySlug||p.puppySlug===profile.puppySlug)})
    profile.records=matched.map(p=>({paymentStatus:p.paymentStatus,amountPaid:p.amountPaid}))
    profile.historicalBalanceNeedsReview=!!profile.puppyId&&matched.some(p=>!Number.isSafeInteger(p.quotedTotalCents))
    const totals=[...new Set(matched.map(p=>p.quotedTotalCents).filter((n):n is number=>Number.isSafeInteger(n)))];if(totals.length===1)profile.agreedTotalCents=totals[0];if(totals.length>1)profile.historicalBalanceNeedsReview=true

    return {...record,profile}
  }))
}

function text(value:unknown, limit:number, empty=false) {
  if (typeof value !== 'string' || value.length > limit || (!empty && !value.trim())) throw new WorkspaceError('Enter valid text within the allowed length.')
  return value
}
export function validateWorkspaceMutation(input:unknown):WorkspaceMutation {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new WorkspaceError('Invalid workspace action.')
  const data = input as Record<string,unknown>
  const allowed:Record<string,string[]> = {initialize:['type'],'sync-inquiries':['type'],draft:['type','familyId','channel','body','base'],note:['type','familyId','body','requestId'],check:['type','familyId','item','checked'],associate:['type','familyId','puppyId']}
  if (typeof data.type !== 'string' || !allowed[data.type] || Object.keys(data).some(key => !allowed[data.type as string].includes(key))) throw new WorkspaceError('Invalid workspace action.')
  if (data.type === 'initialize' || data.type === 'sync-inquiries') return {type:data.type}
  if (!validFamilyKey(data.familyId)) throw new WorkspaceError('Family was not found.',404)
  if(data.type==='associate'){if(typeof data.puppyId!=='string'||!/^[-a-zA-Z0-9_]{1,128}$/.test(data.puppyId))throw new WorkspaceError('Choose a published puppy.');return {type:'associate',familyId:data.familyId,puppyId:data.puppyId}}
  if (data.type === 'draft') {
    if (data.channel !== 'Email' && data.channel !== 'Text') throw new WorkspaceError('Choose email or text.')
    return {type:'draft',familyId:data.familyId,channel:data.channel,body:text(data.body,10000,true),base:text(data.base,10000,true)}
  }
  if (data.type === 'note') {
    if (typeof data.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.requestId)) throw new WorkspaceError('A valid note request ID is required.')
    return {type:'note',familyId:data.familyId,body:text(data.body,4000).trim(),requestId:data.requestId}
  }
  if (typeof data.item !== 'string' || !pickupChecks.includes(data.item) || typeof data.checked !== 'boolean') throw new WorkspaceError('Choose a valid pickup item.')
  return {type:'check',familyId:data.familyId,item:data.item,checked:data.checked}
}

function isConflict(error:unknown) {
  if (!error || typeof error !== 'object') return false
  const e = error as {statusCode?:number; response?:{statusCode?:number}}
  return e.statusCode === 409 || e.response?.statusCode === 409
}

export async function mutateWorkspace(input:unknown) {
  requireWorkspace()
  const action = validateWorkspaceMutation(input)
  const client = getOperatorClient()
  if(action.type==='sync-inquiries'){await syncInquiryFamilies();return}
  if (action.type === 'initialize') {
    if(liveWorkspaceEnabled()){await syncInquiryFamilies();return}
    const transaction = client.transaction()
    for (const family of families) transaction.createIfNotExists({
      _id:workspaceId(family.id),_type:'staffFamily',workspace:workspaceNamespace(),schemaVersion:1,
      familyKey:family.id,profile:{id:family.id,name:family.name,initials:family.initials,location:family.location,email:family.email,phone:family.phone,preference:family.preference,smsConsent:family.smsConsent,stage:family.stage,next:family.next,...(family.puppyId?{puppyId:family.puppyId}:{}),...(family.pickup?{pickup:family.pickup}:{})},drafts:{Email:'',Text:''},notes:[],checks:[...family.checks],
    })
    await transaction.commit({visibility:'sync'})
    return
  }
  // Retry revision races only when the target field still matches the caller's base.
  // Never retry ambiguous provider/network errors or replace an entire family record.
  for (let attempt=0; attempt<3; attempt++) {
    const record = await client.getDocument<SavedFamily>(workspaceId(action.familyId))
    if (!record || record._type !== 'staffFamily' || record.workspace !== workspaceNamespace() || record.familyKey !== action.familyId) throw new WorkspaceError('Start the saved workspace before making changes.',409)
    checkedRecord(record)
    let patch = client.patch(record._id).ifRevisionId(record._rev)
    if(action.type==='associate'){const puppy=await client.getDocument<{_type:string;slug?:{current?:string}}>(action.puppyId);if(!puppy||puppy._type!=='puppy'||!puppy.slug?.current||/^(drafts|versions)\./.test(action.puppyId))throw new WorkspaceError('Choose a published puppy.',409);patch=patch.set({'profile.puppyId':action.puppyId,'profile.puppySlug':puppy.slug.current})
    }else if (action.type === 'draft') {
      const current = record.drafts[action.channel]
      if (current === action.body) return
      if (current !== action.base) throw new WorkspaceError('This draft changed in another tab. Your text is kept; compare the saved version before continuing.',409,{familyId:action.familyId,channel:action.channel,saved:current})
      patch = patch.set({[`drafts.${action.channel}`]:action.body,...(action.channel==='Text'?{textVersion:(record.textVersion||0)+1}:{})})
    } else if (action.type === 'note') {
      const existing = record.notes.find(n => n._key === action.requestId)
      if (existing) {
        if (existing.text !== action.body) throw new WorkspaceError('That note request belongs to different text. Refresh before trying again.',409)
        return
      }
      if (record.notes.length >= 200) throw new WorkspaceError('This review family has reached its note limit.',409)
      patch = patch.append('notes',[{_key:action.requestId,text:action.body,createdAt:new Date().toISOString()}])
    } else {
      const checks = record.checks || []
      if (checks.includes(action.item) === action.checked) return
      patch = patch.set({checks:action.checked ? [...checks,action.item] : checks.filter(item => item !== action.item)})
    }
    try {await patch.commit({visibility:'sync'}); return}
    catch (error) {if (!isConflict(error)) throw error}
  }
  throw new WorkspaceError('This family is being updated elsewhere. Your edits are kept. Try again after reviewing the saved record.',409)
}

// Application projection only in the isolated Preview; unrelated historical migration stays paused.
export async function syncInquiryFamilies(){
  requireWorkspace()
  const client=getOperatorClient()
  const inquiries=await client.fetch<InquiryFamilySource[]>(liveWorkspaceEnabled()?'*[_type == "puppyInquiry" && source in ["fluffytail-native","fluffytail"] && !(_id in path("drafts.**")) && !(_id in path("versions.**"))] | order(submittedAt desc)[0...501]':'*[_type == "puppyInquiry" && source == "fluffytail-native" && _id in path("private.inquiry.**")] | order(submittedAt desc)[0...501]',{},{cache:'no-store'})
  if(inquiries.length>500)throw new WorkspaceError('More than 500 inquiries require paginated review.',409)
  for(const inquiry of inquiries)await projectInquiryFamily(inquiry)
}
export type InquiryFamilySource={_id:string;name:string;email:string;phone?:string;preferredContactMethod:'Email'|'Text'|'Either';message:string;smsConsent:boolean;submittedAt:string;puppyId?:string;source:string}
export async function projectInquiryFamily(inquiry:InquiryFamilySource){
  requireWorkspace()
  // No real customer identities or existing mail may enter the synthetic test namespace.
  if(liveWorkspaceEnabled()?(!['fluffytail-native','fluffytail'].includes(inquiry.source)||/^(drafts|versions)\./.test(inquiry._id)):(!/^private\.inquiry\.[a-f0-9]{64}$/.test(inquiry._id)||inquiry.source!=='fluffytail-native'||!inquiry.email?.toLowerCase().endsWith('@example.test')))return
  if(!['Email','Text','Either'].includes(inquiry.preferredContactMethod))inquiry={...inquiry,preferredContactMethod:'Email'}
  if(typeof inquiry.email!=='string'||!inquiry.email.includes('@'))return
  if(!inquiry.name?.trim()||typeof inquiry.message!=='string'||inquiry.message.length>4000||!Number.isFinite(Date.parse(inquiry.submittedAt))||!['Email','Text','Either'].includes(inquiry.preferredContactMethod))throw new WorkspaceError('An inquiry needs review before creating its family record.',409)
  if(liveWorkspaceEnabled()){let phone='';try{phone=normalizePhone(inquiry.phone||'')}catch{/* Email follow-up remains available if a legacy number needs correction. */}inquiry={...inquiry,email:inquiry.email.trim().toLowerCase(),phone}}
  const identity=liveWorkspaceEnabled()?privateRecordId('familyIdentity',JSON.stringify([inquiry.email.trim().toLowerCase(),inquiry.phone||'',inquiry.name.trim().replace(/\s+/g,' ').toLowerCase()])):inquiry._id
  const familyKey='inquiry-'+identity.split('.').at(-1)
  const record={_id:workspaceId(familyKey),_type:'staffFamily',workspace:workspaceNamespace(),schemaVersion:1,familyKey,profile:{id:familyKey,inquiryId:inquiry._id,source:'inquiry',name:inquiry.name,initials:inquiry.name.trim().split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase(),email:inquiry.email.toLowerCase(),phone:inquiry.phone||'',location:'Location not yet recorded',preference:inquiry.preferredContactMethod,smsConsent:inquiry.smsConsent===true,stage:'New inquiry',next:'Review inquiry and respond',unread:true,records:[],messages:[{id:inquiry._id,direction:'in',channel:inquiry.preferredContactMethod==='Text'?'Text':'Email',body:inquiry.message,time:inquiry.submittedAt}],...(inquiry.puppyId?{interestPuppyId:inquiry.puppyId}:{})},drafts:{Email:'',Text:''},notes:[],checks:[]}
  await getOperatorClient().transaction().createIfNotExists(record).commit({visibility:'sync'})
  if(liveWorkspaceEnabled()){for(let n=0;n<3;n++){const current=await getOperatorClient().getDocument<SavedFamily>(record._id);if(!current||current.profile.messages?.some(m=>m.id===inquiry._id))break;try{await getOperatorClient().patch(record._id).ifRevisionId(current._rev).set({'profile.messages':[...(current.profile.messages||[]),record.profile.messages[0]].sort((a,b)=>a.time.localeCompare(b.time)),...(inquiry.submittedAt>=(current.profile.messages||[]).reduce((latest,m)=>m.time>latest?m.time:latest,'')?{'profile.smsConsent':inquiry.smsConsent===true,'profile.preference':inquiry.preferredContactMethod}:{})}).commit({visibility:'sync'});break}catch(error){if(!isConflict(error))throw error}}}
  // Repeated projection never overwrites staff drafts, notes, identity or payment association.
}
