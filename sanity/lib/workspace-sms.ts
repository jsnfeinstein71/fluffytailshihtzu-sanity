import {approvedTestCustomer,testCustomerContacts,testSmsConsentText} from '@/lib/test-customer'
import 'server-only'
import {liveWorkspaceEnabled,workspaceNamespace} from '@/lib/workspace-mode'
import {getOperatorClient} from './operator-client'
import {requireWorkspace,validFamilyKey,workspaceId,WorkspaceError} from './workspace'
import {privateRecordId} from './private-records'
import {getTestCustomerTwilio,getTwilio} from './twilio'
import {normalizePhone} from '@/lib/inquiry'
import type {SavedFamily} from '@/app/inbox/workspace/persistence'

export async function refreshWorkspaceSms(familyId:string){
 requireWorkspace()
 if(!liveWorkspaceEnabled()){await refreshTestCustomerSms(familyId);return}
 const client=getOperatorClient()
 const records=await client.fetch<{_id:string;_rev:string;messageSid:string;from:string;to:string;statusCheckedAt?:number}[]>('*[_type == "smsMessage" && workspace == $workspace && familyId == $familyId && direction == "outbound" && status == "accepted" && delivery == "unconfirmed" && defined(messageSid)] | order(receivedAt desc)[0...5]',{workspace:workspaceNamespace(),familyId},{cache:'no-store'})
 for(const record of records){
  if(!/^(SM|MM)[a-f0-9]{32}$/i.test(record.messageSid)||Date.now()-(record.statusCheckedAt||0)<30000)continue
  try{await client.patch(record._id).ifRevisionId(record._rev).set({statusCheckedAt:Date.now()}).commit({visibility:'sync'})}catch{continue}
  // Read only this saved submission's status; never creates or retries a send.
  const message=await getTwilio().messages(record.messageSid).fetch()
  if(message.sid!==record.messageSid||message.from!==record.from||message.to!==record.to)throw new WorkspaceError('Text delivery identity needs review.',409)
  const delivery=message.status==='delivered'?'delivered':['failed','undelivered','canceled'].includes(message.status)?'failed':'unconfirmed'
  await client.patch(record._id).set({providerStatus:message.status,delivery}).commit({visibility:'sync'})
 }
}

export async function submitWorkspaceSms(input:unknown){
 requireWorkspace()
 if(!liveWorkspaceEnabled()&&(!testCustomerContacts()||process.env.FLUFFYTAIL_TEST_SMS_ENABLED!=='1'))throw new WorkspaceError('SMS sending is unavailable in Preview.',503)
 const data=input as {familyId?:string;body?:string;confirmed?:boolean}
 if(!data||Object.keys(data).some(k=>!['familyId','body','confirmed'].includes(k))||!validFamilyKey(data.familyId)||typeof data.body!=='string'||!data.body.trim()||data.body.length>1600||data.confirmed!==true)throw new WorkspaceError('Confirm a saved text message before sending.')
 const client=getOperatorClient(),family=await client.getDocument<SavedFamily>(workspaceId(data.familyId))
 if(!family||family.workspace!==workspaceNamespace()||family.drafts.Text!==data.body)throw new WorkspaceError('Save and review the current text draft before sending.',409)
 if(!liveWorkspaceEnabled()&&!approvedTestCustomer(family.profile))throw new WorkspaceError('Only the approved test family can receive texts.',403)
 const to=normalizePhone(family.profile.phone)
 if(!to||!family.profile.smsConsent||family.profile.preference==='Email')throw new WorkspaceError('This family has not permitted SMS follow-up. Use email.',403)
 const inquiries=await client.fetch<{phone:string;smsConsent:boolean;preferredContactMethod:string}[]>('*[_type == "puppyInquiry" && source in ["fluffytail-native","fluffytail"] && defined(phone)] | order(submittedAt desc)[0...500]{phone,smsConsent,preferredContactMethod}',{},{cache:'no-store'})
 const latest=inquiries.find(i=>{try{return normalizePhone(i.phone)===to}catch{return false}})
 if(!latest?.smsConsent||latest.preferredContactMethod==='Email')throw new WorkspaceError('The latest inquiry does not permit SMS. Use email.',403)
 const optOut=await client.fetch<{body:string;optOutType?:string}|null>('*[_type == "smsMessage" && direction == "inbound" && (signatureVerified == true || providerVerified == true) && from == $to && (optOutType in ["STOP","START"] || lower(body) in ["stop","stopall","unsubscribe","cancel","end","quit","start","unstop"])] | order(receivedAt desc)[0]{body,optOutType}',{to},{cache:'no-store'})
 if(optOut&&(optOut.optOutType==='STOP'||!['start','unstop'].includes(optOut.body.trim().toLowerCase())&&optOut.optOutType!=='START'))throw new WorkspaceError('This number has opted out. Do not text it.',403)
 if(!liveWorkspaceEnabled())await refreshTestCustomerSms(family.familyKey)
 const twilio=liveWorkspaceEnabled()?getTwilio():getTestCustomerTwilio(),id=privateRecordId('staffSms',`${workspaceNamespace()}:${family.familyKey}:${family.textVersion||0}`)
 await client.transaction().createIfNotExists({_id:id,_type:'smsMessage',workspace:workspaceNamespace(),familyId:family.familyKey,from:liveWorkspaceEnabled()?process.env.TWILIO_FROM_NUMBER:process.env.FLUFFYTAIL_TEST_TWILIO_FROM_NUMBER,to,body:data.body,direction:'outbound',source:'fluffytail',status:'prepared',delivery:'unconfirmed',receivedAt:new Date().toISOString()}).commit({visibility:'sync'})
 const blocked=await client.fetch<{_id:string}[]>('*[_type == "smsMessage" && workspace == $workspace && familyId == $familyId && status in ["sending","uncertain"]][0...1]',{workspace:workspaceNamespace(),familyId:family.familyKey},{cache:'no-store'});if(blocked.some(r=>r._id!==id))throw new WorkspaceError('This family has an uncertain text attempt. Review it before sending another draft.',409)
 const record=await client.getDocument<{_rev:string;status:string;body:string}>(id)
 if(!record||record.body!==data.body)throw new WorkspaceError('The saved text attempt needs review.',409)
 if(!['prepared','failed'].includes(record.status))return {status:record.status}
 try{await client.patch(id).ifRevisionId(record._rev).set({status:'sending'}).commit({visibility:'sync'})}catch{throw new WorkspaceError('This text attempt could not be claimed. Refresh before another action.',409)}
 try{
  if(!liveWorkspaceEnabled()){const stops=await client.fetch<{body:string}|null>('*[_type == \"smsMessage\" && workspace == \"review-v1\" && familyId == $familyId && direction == \"inbound\" && providerVerified == true && lower(body) in [\"stop\",\"stopall\",\"unsubscribe\",\"cancel\",\"end\",\"quit\",\"start\",\"unstop\"]] | order(receivedAt desc)[0]{body}',{familyId:family.familyKey},{cache:'no-store'});if(stops&&!/^(start|unstop)$/i.test(stops.body.trim()))throw Object.assign(new Error('Opted out'),{status:403})}
  const message=await twilio.messages.create({from:liveWorkspaceEnabled()?process.env.TWILIO_FROM_NUMBER:process.env.FLUFFYTAIL_TEST_TWILIO_FROM_NUMBER!,to,body:data.body})
  if(!/^(SM|MM)[a-f0-9]{32}$/i.test(message.sid))throw new Error('Unconfirmed provider acknowledgement')
  await client.patch(id).set({status:'accepted',providerStatus:message.status||'accepted',messageSid:message.sid,delivery:'unconfirmed'}).commit({visibility:'sync'})
  return {status:'accepted'}
 }catch(error){
  const code=(error as {status?:number}).status,status=code&&code>=400&&code<500&&code!==408?'failed':'uncertain'
  try{await client.patch(id).set({status,delivery:'unconfirmed'}).commit({visibility:'sync'})}catch{/* A durable sending claim still prevents duplicate submission. */}
  if(!liveWorkspaceEnabled()&&(error as {code?:number}).code===21610)throw new WorkspaceError('Twilio reports this number has opted out. Use email, or have the recipient text START before trying again. Your draft is kept.',403)
  throw new WorkspaceError(status==='failed'?'Twilio did not accept this text. Your saved draft is retained.':'The text outcome is uncertain. Do not resend; review the provider record first.',409)
 }
}

export async function loadTestSmsProfile(record:SavedFamily){
 const allowed=approvedTestCustomer(record.profile)
 const messages=await getOperatorClient().fetch<{_id:string;body:string;direction:string;receivedAt:string;status:string;delivery:string;providerVerified?:boolean}[]>('*[_type == "smsMessage" && workspace == "review-v1" && familyId == $familyId] | order(receivedAt asc)[0...500]',{familyId:record.familyKey},{cache:'no-store'})
 const opt=messages.filter(m=>m.direction==='inbound'&&m.providerVerified&&/^(stop|stopall|unsubscribe|cancel|end|quit|start|unstop)$/i.test(m.body.trim())).at(-1)
 return {...record.profile,testCommunicationsAllowed:allowed,testSmsAvailable:allowed&&process.env.FLUFFYTAIL_TEST_SMS_ENABLED==='1',smsBlockedReason:!allowed?'Only the approved test recipient can receive texts.':process.env.FLUFFYTAIL_TEST_SMS_ENABLED!=='1'?'Test texts are paused because replies currently reach the live Inbox. Use email for this isolated test.':opt&&!/^(start|unstop)$/i.test(opt.body.trim())?'This number has opted out. Choose Email.':undefined,messages:[...(record.profile.messages||[]),...messages.map(m=>({id:m._id,body:m.body,kind:'sms' as const,status:m.status,delivery:m.delivery||'unconfirmed',direction:m.direction==='inbound'?'in' as const:'out' as const,channel:'Text' as const,time:m.receivedAt}))]}
}
export async function saveTestSmsConsent(familyId:string){
 const client=getOperatorClient(),family=await client.getDocument<SavedFamily>(workspaceId(familyId))
 if(!family||!approvedTestCustomer(family.profile)||!family.profile.inquiryId)throw new WorkspaceError('Only the owner-controlled test recipient can provide this consent.',403)
 const at=new Date().toISOString()
 await client.transaction().patch(family._id,p=>p.ifRevisionId(family._rev).set({'profile.smsConsent':true,'profile.preference':'Either','profile.testSmsConsentAt':at,'profile.testSmsConsentText':testSmsConsentText})).patch(family.profile.inquiryId,{set:{smsConsent:true,preferredContactMethod:'Either',smsConsentAt:at,smsConsentText:testSmsConsentText}}).commit({visibility:'sync'})
}
async function refreshTestCustomerSms(familyId:string){
 if(!testCustomerContacts()||process.env.FLUFFYTAIL_TEST_SMS_ENABLED!=='1')return
 const client=getOperatorClient(),family=await client.getDocument<SavedFamily>(workspaceId(familyId))
 if(!family||!approvedTestCustomer(family.profile))return
 const records=await client.fetch<{_id:string;_rev:string;messageSid:string;from:string;to:string;statusCheckedAt?:number;receivedAt:string}[]>('*[_type == "smsMessage" && workspace == "review-v1" && familyId == $familyId && direction == "outbound" && defined(messageSid)] | order(receivedAt asc)[0...100]',{familyId},{cache:'no-store'})
 if(!records.length)return // No provider reads before the owner's first send.
 const twilio=getTestCustomerTwilio(),from=process.env.FLUFFYTAIL_TEST_TWILIO_FROM_NUMBER!,to=testCustomerContacts()!.phone
 for(const record of records.slice(-5)){
  if(Date.now()-(record.statusCheckedAt||0)<30000)continue
  try{await client.patch(record._id).ifRevisionId(record._rev).set({statusCheckedAt:Date.now()}).commit({visibility:'sync'})}catch{continue}
  const message=await twilio.messages(record.messageSid).fetch()
  if(message.sid!==record.messageSid||message.from!==from||message.to!==to)throw new WorkspaceError('Test text identity needs review.',409)
  await client.patch(record._id).set({providerStatus:message.status,delivery:message.status==='delivered'?'delivered':['failed','undelivered','canceled'].includes(message.status)?'failed':'unconfirmed'}).commit({visibility:'sync'})
 }
 const incoming=await twilio.messages.list({from:to,to:from,dateSentAfter:new Date(records[0].receivedAt),limit:50})
 for(const message of incoming){
  const time=message.dateSent||message.dateCreated
  if(message.from!==to||message.to!==from||!time||time.getTime()<Date.parse(records[0].receivedAt)||!/^SM[a-f0-9]{32}$/i.test(message.sid))continue
  const id=privateRecordId('testSmsIncoming','review-v1:'+message.sid)
  await client.transaction().createIfNotExists({_id:id,_type:'smsMessage',workspace:'review-v1',testOnly:true,familyId,from:to,to:from,body:message.body||'',direction:'inbound',source:'fluffytail-test',providerVerified:true,messageSid:message.sid,receivedAt:time.toISOString(),status:'received'}).commit({visibility:'sync'})
 }
}
