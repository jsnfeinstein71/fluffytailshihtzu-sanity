export type StaffPaymentRecord={paymentStatus:string;amountPaid:number;paymentType?:string;createdAt?:string;webhookVerifiedAt?:string;testOnly?:boolean;workspace?:string;stripePaymentIntentId?:string;stripeCheckoutSessionId?:string;stripeInvoiceId?:string}
export function paymentRecordLabel(record:StaffPaymentRecord){
 const test=record.testOnly===true||record.workspace==='review-v1'
 const live=record.testOnly===false||record.workspace==='live-v1'
 return test?'Test payment confirmed':live&&record.webhookVerifiedAt?'Live payment confirmed':'Payment recorded'
}
export function stripeTransactionLink(record:StaffPaymentRecord){
 const test=record.testOnly===true||record.workspace==='review-v1'
 const live=record.testOnly===false||record.workspace==='live-v1'
 if(!test&&!live||test&&live)return null
 const prefix='https://dashboard.stripe.com/'+(test?'test/':'')
 if(/^pi_[A-Za-z0-9]+$/.test(record.stripePaymentIntentId||''))return prefix+'payments/'+record.stripePaymentIntentId
 if(/^in_[A-Za-z0-9]+$/.test(record.stripeInvoiceId||''))return prefix+'invoices/'+record.stripeInvoiceId
 return null
}
