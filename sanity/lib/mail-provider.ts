import type {EmailAttachmentPart} from '@/lib/mail/attachment-model'
import {testCustomerContacts} from '@/lib/test-customer'
import {paymentTestWorkspaceEnabled} from '@/lib/payment-test-mode'
import {liveWorkspaceEnabled} from '@/lib/workspace-mode'
import 'server-only'
import {getOperatorClient} from '@/sanity/lib/operator-client'
import {privateRecordId} from './private-records'
import {requireSyntheticWorkspace} from './workspace'
import {createPairAdapter} from '@/lib/mail/pair-adapter.mjs'
import type {MailCapabilities,OutgoingEmail} from '@/app/inbox/workspace/email-model'
import {jeanneEmail} from '@/app/inbox/workspace/email-model'

export type ReplyEnvelope={uid:number;validity:string;messageId:string|null;from:string;to:string;subject:string;body:string;inReplyTo:string|null;references:string[];time:string}
export type Cursor={validity:string;lastUid:number}
export type SyncBatch={validity:string;lastUid:number;messages:ReplyEnvelope[];initialized?:boolean}
export type SendResult={outcome:'accepted'|'rejected'|'uncertain';code:string}
export type MailProvider={capabilities:MailCapabilities;send:(message:OutgoingEmail&{attachmentParts?:EmailAttachmentPart[]},scenario?:string)=>Promise<SendResult>;sync:(input:{cursor:Cursor;threads:OutgoingEmail[]})=>Promise<SyncBatch>}
export const ownerTestSubject='FluffyTail owner-only email test [FT-OWNER-EMAIL-001]'
export const ownerTestBody='Jeanne, this is the owner-only FluffyTail Inbox email test. Please reply with: Owner reply received. No puppy is being reserved and no payment is requested.'
export function ownerTestConfigured(){return process.env.FLUFFYTAIL_MAIL_MODE==='pair-owner-test'&&process.env.FLUFFYTAIL_MAIL_OWNER_TEST_APPROVAL==='FT-OWNER-EMAIL-001'}
export function emailRecipient(profileEmail:string){return ownerTestConfigured()?jeanneEmail:profileEmail}

export function getMailCapabilities():MailCapabilities{
  if(paymentTestWorkspaceEnabled()){const contacts=testCustomerContacts(),credentials=!!contacts&&process.env.FLUFFYTAIL_MAIL_MODE==='pair-test-customer'&&!!process.env.FLUFFYTAIL_TEST_PAIR_MAIL_PASSWORD;return {provider:credentials?'pair':'disabled',canDispatch:credentials&&process.env.FLUFFYTAIL_TEST_PAIR_SEND_ENABLED==='1',canSync:credentials&&process.env.FLUFFYTAIL_TEST_PAIR_READ_ENABLED==='1',...(contacts?{approvedTestEmail:contacts.email}:{})}}
  if(liveWorkspaceEnabled()&&process.env.FLUFFYTAIL_MAIL_MODE==='pair'){const credentials=!!process.env.FLUFFYTAIL_PAIR_MAIL_PASSWORD;return {provider:'pair',canDispatch:credentials&&process.env.FLUFFYTAIL_PAIR_SEND_ENABLED==='1',canSync:credentials&&process.env.FLUFFYTAIL_PAIR_READ_ENABLED==='1'}}
  if(process.env.FLUFFYTAIL_MAIL_MODE==='fictional'){
    requireSyntheticWorkspace()
    return {provider:'fictional',canDispatch:true,canSync:true}
  }
  if(ownerTestConfigured()){
    requireSyntheticWorkspace()
    const started=Date.parse(process.env.FLUFFYTAIL_MAIL_OWNER_TEST_STARTED_AT||'')
    const withinApprovedWindow=Number.isFinite(started)&&started<=Date.now()&&Date.now()<started+15*60*1000
    const credentials=!!process.env.FLUFFYTAIL_PAIR_MAIL_PASSWORD&&withinApprovedWindow
    return {provider:'pair',canDispatch:credentials&&process.env.FLUFFYTAIL_PAIR_SEND_ENABLED==='1',canSync:credentials&&process.env.FLUFFYTAIL_PAIR_READ_ENABLED==='1',ownerTestRecipient:jeanneEmail}
  }
  return {provider:'disabled',canDispatch:false,canSync:false}
}

export function getMailProvider():MailProvider{
  const capabilities=getMailCapabilities()
  if(capabilities.provider==='pair'){
    if(paymentTestWorkspaceEnabled()){const contacts=testCustomerContacts();if(!contacts)throw new Error('Test recipient unavailable');const adapter=createPairAdapter({password:process.env.FLUFFYTAIL_TEST_PAIR_MAIL_PASSWORD,sendEnabled:capabilities.canDispatch,readEnabled:capabilities.canSync,recipientAllowlist:[contacts.email]});return {capabilities,send:async message=>await adapter.send(message) as SendResult,sync:async input=>await adapter.sync(input) as SyncBatch}}
    const adapter=createPairAdapter({password:process.env.FLUFFYTAIL_PAIR_MAIL_PASSWORD,sendEnabled:capabilities.canDispatch,readEnabled:capabilities.canSync,recipientAllowlist:[jeanneEmail]})
    return {capabilities,send:async message=>await (liveWorkspaceEnabled()?createPairAdapter({password:process.env.FLUFFYTAIL_PAIR_MAIL_PASSWORD,sendEnabled:capabilities.canDispatch,readEnabled:capabilities.canSync,recipientAllowlist:[message.to]}):adapter).send(message) as SendResult,sync:async input=>await (liveWorkspaceEnabled()?createPairAdapter({password:process.env.FLUFFYTAIL_PAIR_MAIL_PASSWORD,sendEnabled:false,readEnabled:capabilities.canSync,recipientAllowlist:[...new Set(input.threads.map(t=>t.to))]}):adapter).sync(input) as SyncBatch}
  }
  return {
    capabilities,
    async send(message,scenario='accepted'){
      if(capabilities.provider!=='fictional')throw new Error('Real sending is disabled.')
      if(!message.to.endsWith('@example.test'))throw new Error('Fictional provider requires a test recipient.')
      if(scenario==='rejected')return {outcome:'rejected',code:'FICTIONAL_SMTP_REJECTED'}
      const id=privateRecordId('fixtureMailReceipt',message.messageId)
      await getOperatorClient().transaction().createIfNotExists({_id:id,_type:'fixtureMailReceipt',workspace:'review-v1',messageId:message.messageId,to:message.to,createdAt:new Date().toISOString()}).commit({visibility:'sync'})
      return scenario==='uncertain'?{outcome:'uncertain',code:'FICTIONAL_ACK_LOST'}:{outcome:'accepted',code:'FICTIONAL_SMTP_ACCEPTED'}
    },
    async sync({threads}){
      if(capabilities.provider!=='fictional')throw new Error('Real mailbox reads are disabled.')
      const receipts=await getOperatorClient().fetch<{messageId:string;to:string;createdAt:string}[]>('*[_type == "fixtureMailReceipt" && workspace == "review-v1"] | order(createdAt asc)[0...100]',{},{cache:'no-store'})
      return {validity:'fictional-v1',lastUid:receipts.length,messages:receipts.filter(r=>threads.some(t=>t.messageId===r.messageId)).map((r,index)=>({uid:index+1,validity:'fictional-v1',messageId:`<reply.${r.messageId.slice(1)}`,from:r.to,to:'jeanne@fluffytailshihtzu.com',subject:'Re: '+(threads.find(t=>t.messageId===r.messageId)?.subject||'FluffyTail inquiry'),body:'Fictional reply: thank you, Jeanne. We received your message and will coordinate the next step with you.',inReplyTo:r.messageId,references:[r.messageId],time:r.createdAt}))}
    },
  }
}

// Exported adapter factory is shared by hosted activation and offline contract
// tests. It requires explicit server send/read permissions and recipient scope;
// this release does not select or configure it for real operations.
export {createPairAdapter}
