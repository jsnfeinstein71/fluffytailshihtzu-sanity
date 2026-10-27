import type {EmailAttachment} from '@/lib/mail/attachment-model'
import type {Family} from './model'
import type {MailData,OutgoingState} from './email-model'

export const emailStatus:Record<OutgoingState,string>={prepared:'Draft · not sent',sending:'Sending · do not retry',accepted:'Sent · SMTP accepted · delivery unconfirmed',failed:'Failed · not accepted · draft kept',uncertain:'Uncertain · review required · do not resend'}
export function textStatus(status?:string,delivery?:string){
 if(delivery==='delivered')return 'Delivered · confirmed by Twilio'
 if(delivery==='failed')return 'Delivery failed · review before resending'
 if(status==='accepted')return 'Sent · accepted by Twilio · delivery unconfirmed'
 if(status==='failed')return 'Failed · not accepted · draft kept'
 if(status==='uncertain'||status==='sending')return status==='sending'?'Sending · do not retry':'Uncertain · review required · do not resend'
 return status==='prepared'?'Draft · not sent':'Recorded · delivery unconfirmed'
}
export function conversationEvents(family:Family,data:MailData|null){
 const events=family.messages.map(m=>({...m,attachments:[] as EmailAttachment[],label:m.kind==='sms'?'Text':family.source==='inquiry'?'Website inquiry':m.channel,status:m.direction==='out'&&m.channel==='Text'?textStatus(m.status,m.delivery):'',subject:'',replyId:''}))
 const known=new Set(events.map(m=>m.id))
 for(const message of data?.messages||[])if(message.familyId===family.id&&!known.has(message.id)){
  known.add(message.id);events.push({...message,attachments:[] as EmailAttachment[],channel:'Email',label:'Email',status:'',subject:message.subject,replyId:message.direction==='in'&&message.messageId?message.id:''})
 }
 for(const message of data?.outgoing||[])if(message.familyId===family.id&&message.attempts.length){
  events.push({attachments:message.attachments||[],id:message._id,time:message.attempts[0].startedAt,body:message.body,direction:'out',channel:'Email',label:'Email',status:emailStatus[message.state],subject:message.subject,replyId:''})
 }
 for(const payment of data?.paymentRequests||[])if(payment.familyId===family.id){events.push({attachments:[],id:payment._id,time:payment.createdAt,body:`${payment.puppyName}: $${(payment.amountCents/100).toFixed(2)} ${payment.kind==='deposit'?'deposit':'final payment'} requested. A request is not payment.`,direction:'out',channel:'Email',label:'Payment request',status:'',subject:'',replyId:''});if(payment.webhookVerifiedAt)events.push({attachments:[],id:payment._id+':paid',time:payment.webhookVerifiedAt,body:`$${(payment.amountCents/100).toFixed(2)} payment confirmed for ${payment.puppyName}.`,direction:'in',channel:'Email',label:'Verified payment',status:'',subject:'',replyId:''})}
 return events.sort((a,b)=>{
  const at=Date.parse(a.time),bt=Date.parse(b.time)
  return (Number.isFinite(at)?at:0)-(Number.isFinite(bt)?bt:0)||a.id.localeCompare(b.id)
 })
}
