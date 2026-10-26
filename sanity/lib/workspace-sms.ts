import 'server-only'
import {liveWorkspaceEnabled,workspaceNamespace} from '@/lib/workspace-mode'
import {getOperatorClient} from './operator-client'
import {requireWorkspace,validFamilyKey,workspaceId,WorkspaceError} from './workspace'
import {privateRecordId} from './private-records'
import {getTwilio} from './twilio'
import {normalizePhone} from '@/lib/inquiry'
import type {SavedFamily} from '@/app/inbox/workspace/persistence'

export async function submitWorkspaceSms(input:unknown){
 requireWorkspace()
 if(!liveWorkspaceEnabled())throw new WorkspaceError('SMS sending is unavailable in Preview.',503)
 const data=input as {familyId?:string;body?:string;confirmed?:boolean}
 if(!data||Object.keys(data).some(k=>!['familyId','body','confirmed'].includes(k))||!validFamilyKey(data.familyId)||typeof data.body!=='string'||!data.body.trim()||data.body.length>1600||data.confirmed!==true)throw new WorkspaceError('Confirm a saved text message before sending.')
 const client=getOperatorClient(),family=await client.getDocument<SavedFamily>(workspaceId(data.familyId))
 if(!family||family.workspace!==workspaceNamespace()||family.drafts.Text!==data.body)throw new WorkspaceError('Save and review the current text draft before sending.',409)
 const to=normalizePhone(family.profile.phone)
 if(!to||!family.profile.smsConsent||family.profile.preference==='Email')throw new WorkspaceError('This family has not permitted SMS follow-up. Use email.',403)
 const inquiries=await client.fetch<{phone:string;smsConsent:boolean;preferredContactMethod:string}[]>('*[_type == "puppyInquiry" && source in ["fluffytail-native","fluffytail"] && defined(phone)] | order(submittedAt desc)[0...500]{phone,smsConsent,preferredContactMethod}',{},{cache:'no-store'})
 const latest=inquiries.find(i=>{try{return normalizePhone(i.phone)===to}catch{return false}})
 if(!latest?.smsConsent||latest.preferredContactMethod==='Email')throw new WorkspaceError('The latest inquiry does not permit SMS. Use email.',403)
 const optOut=await client.fetch<{body:string;optOutType?:string}|null>('*[_type == "smsMessage" && direction == "inbound" && signatureVerified == true && from == $to && (optOutType in ["STOP","START"] || lower(body) in ["stop","stopall","unsubscribe","cancel","end","quit","start","unstop"])] | order(receivedAt desc)[0]{body,optOutType}',{to},{cache:'no-store'})
 if(optOut&&(optOut.optOutType==='STOP'||!['start','unstop'].includes(optOut.body.trim().toLowerCase())&&optOut.optOutType!=='START'))throw new WorkspaceError('This number has opted out. Do not text it.',403)
 const twilio=getTwilio(),id=privateRecordId('staffSms',`${workspaceNamespace()}:${family.familyKey}:${family.textVersion||0}`)
 await client.transaction().createIfNotExists({_id:id,_type:'smsMessage',workspace:workspaceNamespace(),familyId:family.familyKey,from:process.env.TWILIO_FROM_NUMBER,to,body:data.body,direction:'outbound',source:'fluffytail',status:'prepared',delivery:'unconfirmed',receivedAt:new Date().toISOString()}).commit({visibility:'sync'})
 const blocked=await client.fetch<{_id:string}[]>('*[_type == "smsMessage" && workspace == $workspace && familyId == $familyId && status in ["sending","uncertain"]][0...1]',{workspace:workspaceNamespace(),familyId:family.familyKey},{cache:'no-store'});if(blocked.some(r=>r._id!==id))throw new WorkspaceError('This family has an uncertain text attempt. Review it before sending another draft.',409)
 const record=await client.getDocument<{_rev:string;status:string;body:string}>(id)
 if(!record||record.body!==data.body)throw new WorkspaceError('The saved text attempt needs review.',409)
 if(!['prepared','failed'].includes(record.status))return {status:record.status}
 try{await client.patch(id).ifRevisionId(record._rev).set({status:'sending'}).commit({visibility:'sync'})}catch{throw new WorkspaceError('This text attempt could not be claimed. Refresh before another action.',409)}
 try{
  const message=await twilio.messages.create({from:process.env.TWILIO_FROM_NUMBER!,to,body:data.body})
  if(!/^(SM|MM)[a-f0-9]{32}$/i.test(message.sid))throw new Error('Unconfirmed provider acknowledgement')
  await client.patch(id).set({status:'accepted',providerStatus:message.status||'accepted',messageSid:message.sid,delivery:'unconfirmed'}).commit({visibility:'sync'})
  return {status:'accepted'}
 }catch(error){
  const code=(error as {status?:number}).status,status=code&&code>=400&&code<500&&code!==408?'failed':'uncertain'
  try{await client.patch(id).set({status,delivery:'unconfirmed'}).commit({visibility:'sync'})}catch{/* A durable sending claim still prevents duplicate submission. */}
  throw new WorkspaceError(status==='failed'?'Twilio did not accept this text. Your saved draft is retained.':'The text outcome is uncertain. Do not resend; review the provider record first.',409)
 }
}
