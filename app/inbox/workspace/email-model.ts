import {families,puppies} from './model'

export const jeanneEmail='jeanne@fluffytailshihtzu.com'
export type EmailValue={subject:string;body:string;replyToId:string|null;paymentRequestId:string|null}
export type EmailDraft={familyId:string;revision:string|null;value:EmailValue;updatedAt?:string}
export type MailMessage={id:string;familyId:string;from:string;to:string;subject:string;body:string;messageId:string;references:string[];direction:'in'|'out';time:string}
export type PaymentRequest={_id:string;_type:'staffPaymentRequest';workspace:'review-v1';requestId:string;familyId:string;puppyId:string;puppyName:string;kind:'deposit'|'balance';amountCents:number;totalCents:number;depositCents:number;paidCents:number;expiresAt:string;createdAt:string;testOnly:true}
export type EmailReview={_id:string;_type:'staffEmailReview';workspace:'review-v1';requestId:string;familyId:string;draftRevision:string;from:string;replyTo:string;to:string;subject:string;body:string;inReplyTo:string|null;references:string[];paymentRequestId:string|null;createdAt:string;status:'held';testOnly:true}
export type MailData={drafts:EmailDraft[];messages:MailMessage[];paymentRequests:PaymentRequest[];reviews:EmailReview[];sendingEnabled:false}
export type MailAction=
  |{type:'save';familyId:string;revision:string|null;value:EmailValue}
  |{type:'review';familyId:string;revision:string;requestId:string}
  |{type:'payment';familyId:string;puppyId:string;kind:'deposit'|'balance';requestId:string}
export type MailResult=MailData & {error?:string;conflict?:EmailDraft;preparedPaymentId?:string;reviewId?:string}
export const sameEmail=(a:EmailValue,b:EmailValue)=>a.subject===b.subject&&a.body===b.body&&a.replyToId===b.replyToId&&a.paymentRequestId===b.paymentRequestId
export const emptyEmail=(body=''):EmailValue=>({subject:'FluffyTail Shih Tzu inquiry',body,replyToId:null,paymentRequestId:null})
export const mailMessages:MailMessage[]=families.flatMap(f=>f.messages.filter(m=>m.channel==='Email').map(m=>({
  id:m.id,familyId:f.id,from:m.direction==='in'?f.email:jeanneEmail,to:m.direction==='in'?jeanneEmail:f.email,
  subject:f.puppyId?`${puppies.find(p=>p.id===f.puppyId)?.name} inquiry`:'Future puppies',body:m.body,
  messageId:`<review-v1.${m.id}@fluffytailshihtzu.example.test>`,references:m.id==='a2'?['<review-v1.a1@fluffytailshihtzu.example.test>']:[],direction:m.direction,time:m.time,
})))
export function paymentPreviewPath(requestId:string){return `/inbox/workspace/payment-preview/${encodeURIComponent(requestId)}`}
