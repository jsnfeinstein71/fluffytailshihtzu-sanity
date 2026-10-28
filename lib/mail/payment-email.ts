// Shared, deterministic presentation only. Payment facts must be verified by the
// application before creating a confirmation. Never accept HTML from a browser.
export type PaymentEmailKind='deposit-request'|'balance-request'|'deposit-confirmation'|'paid-confirmation'
export type PaymentEmail={version:1|2;kind:PaymentEmailKind;name:string;message:string;puppyName:string;amountCents:number;totalCents:number;paidCents:number;depositCents:number;url:string;testOnly:boolean}
// Sanity may reorder object keys during storage; compare field values, not insertion order.
export const samePaymentEmail=(a:PaymentEmail|undefined,b:PaymentEmail|undefined)=>JSON.stringify(a,Object.keys(a||{}).sort())===JSON.stringify(b,Object.keys(b||{}).sort())
export const confirmationMessage='Thank you for your payment. Please reply if you have any questions about your puppy or pickup.'
export const paymentEmailLabels:Record<PaymentEmailKind,{title:string;button:string}>={
  'deposit-request':{title:'A little closer to bringing your puppy home',button:'View deposit request'},
  'balance-request':{title:'Your puppy’s final payment',button:'View final payment request'},
  'deposit-confirmation':{title:'Your deposit is confirmed',button:'View payment confirmation'},
  'paid-confirmation':{title:'Paid in full',button:'View payment confirmation'},
}
export function paymentRequestEmail(request:{publicToken?:string;checkoutUrl?:string;kind:'deposit'|'balance';puppyName:string;amountCents:number;totalCents:number;paidCents:number;depositCents:number;testOnly:boolean},name:string,message:string):PaymentEmail|null{
  if(!request.checkoutUrl||request.testOnly&&!request.publicToken)return null
  const url=new URL(request.checkoutUrl)
  if(!/^\/pay\/(?:[a-f0-9]{48}|cs_live_[A-Za-z0-9]+)$/.test(url.pathname))return null
  return {version:2,kind:request.kind==='deposit'?'deposit-request':'balance-request',name,message,puppyName:request.puppyName,amountCents:request.amountCents,totalCents:request.totalCents,paidCents:request.paidCents,depositCents:request.depositCents,url:request.checkoutUrl,testOnly:request.testOnly}
}
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
const money=(cents:number)=>'$'+(cents/100).toFixed(2)
function renderPaymentEmailV1(email:PaymentEmail){
  const url=new URL(email.url)
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!(email.testOnly?/^\/pay\/[a-f0-9]{48}$/:/^\/pay\/(?:[a-f0-9]{48}|cs_live_[A-Za-z0-9]+)$/).test(url.pathname))throw new Error('A customer-facing payment page is required for this email.')
  if(email.version!==1||!paymentEmailLabels[email.kind]||[email.amountCents,email.totalCents,email.paidCents,email.depositCents].some(n=>!Number.isSafeInteger(n)||n<0)||email.amountCents>email.totalCents||email.paidCents>email.totalCents)throw new Error('Invalid payment email summary.')
  const confirmation=email.kind.endsWith('confirmation'),deposit=email.kind.startsWith('deposit'),label=paymentEmailLabels[email.kind]
  const remaining=email.totalCents-email.paidCents
  if(!confirmation&&email.amountCents>remaining)throw new Error('The requested payment exceeds the balance.')
  const rows:[string,string][]=[['Puppy',email.puppyName],['Total puppy price',money(email.totalCents)],[confirmation?'This payment':deposit?'Deposit requested':'Final payment requested',money(email.amountCents)],['Total paid',money(email.paidCents)],[confirmation?'Remaining balance':'Balance after this payment',money(confirmation?remaining:remaining-email.amountCents)]]
  const terms=deposit?'The deposit is non-refundable and applies toward the total puppy price.':''
  const status=confirmation?(email.kind==='paid-confirmation'?'Paid in full. Pickup timing and location will be coordinated with Jeanne.':`${email.testOnly?'Your fictional puppy':'Your puppy'} is reserved. Jeanne will coordinate the remaining balance and pickup with you.`):'This request is not a payment confirmation. Payment and reservation status are verified separately.'
  // Preserve every typed character in the draft. Only the rendered email replaces
  // a legacy pasted payment URL with a readable link; the text part retains it.
  const personal=escape(email.message).replaceAll(escape(email.url),`<a href="${escape(email.url)}" style="color:#58493D;text-decoration:underline">View payment details</a>`).replace(/\r?\n/g,'<br>')
  const greeting=`Hello${email.name.trim()?` ${email.name.trim()}`:''},`
  const test='TEST — no real charges or inventory changes'
  const text=[...(email.testOnly?[test,'']:[]),greeting,'',email.message,'',...rows.map(([key,value])=>`${key}: ${value}`),'',terms,status,'',email.message.includes(email.url)?'':`${label.button}: ${email.url}`,'','Please reply with any questions.','Jeanne','FluffyTail Shih Tzu'].filter((v,i,a)=>v!==''||a[i-1]!=='').join('\n')
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${escape(label.button)} · FluffyTail</title><style>:root{color-scheme:light dark}body{margin:0;padding:0}a{word-break:break-word}@media(max-width:480px){.email-pad{padding:24px 20px!important}.email-frame{width:100%!important}}@media(prefers-color-scheme:dark){.email-outer{background-color:#241F1B!important}.email-card,.email-summary{background-color:#FFF9F1!important;color:#58493D!important}.email-button{background-color:#58493D!important;color:#FFFFFF!important}}</style></head><body class="email-outer" style="margin:0;padding:0;background-color:#F8F4ED;color:#58493D;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F8F4ED" class="email-outer"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="560" cellpadding="0" cellspacing="0" class="email-frame email-card" bgcolor="#FFF9F1" style="width:100%;max-width:560px;background-color:#FFF9F1;border:1px solid #D8BD9D;border-radius:8px;color:#58493D"><tr><td align="center" style="padding:20px 24px 15px;border-bottom:1px solid #D8BD9D"><img src="${escape(url.origin)}/brand/fluffytail-email-logo.png" width="80" height="80" alt="FluffyTail" style="display:block;width:80px;height:80px;border:0;margin:0 auto 8px"><div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#58493D">FluffyTail Shih Tzu</div></td></tr><tr><td class="email-pad" style="padding:28px 32px">${email.testOnly?`<p style="margin:0 0 20px;padding:9px 12px;background-color:#EAD9C5;color:#58493D;border:1px solid #D8BD9D;font-size:12px;font-weight:bold">${test}</p>`:''}<h1 style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:29px;font-weight:normal;line-height:1.2;color:#58493D">${escape(label.title)}</h1><p style="margin:0 0 14px;color:#58493D">${escape(greeting)}</p><p style="margin:0 0 24px;color:#58493D;overflow-wrap:anywhere">${personal}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFF9F1" class="email-summary" style="border-top:2px solid #D8BD9D;border-bottom:1px solid #D8BD9D">${rows.map(([key,value],i)=>`<tr><td style="padding:10px 8px 10px 0;vertical-align:top;font-size:14px;color:#58493D;${i===2?'font-weight:bold;':''}">${escape(key)}</td><td align="right" style="padding:10px 0 10px 8px;vertical-align:top;font-size:14px;color:#58493D;${i===2?'font-weight:bold;':''}">${escape(value)}</td></tr>`).join('')}</table>${terms?`<p style="margin:18px 0 0;font-size:13px;color:#58493D">${terms}</p>`:''}<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td bgcolor="#58493D" style="border-radius:5px;background-color:#58493D;text-align:center"><a class="email-button" href="${escape(email.url)}" style="display:inline-block;padding:14px 22px;border:1px solid #58493D;border-radius:5px;background-color:#58493D;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;line-height:1.4">${label.button}</a></td></tr></table><p style="margin:0 0 24px;font-size:13px;color:#58493D">${escape(status)}</p><p style="margin:0;color:#58493D">Please reply with any questions.<br><strong>Jeanne</strong><br>FluffyTail Shih Tzu</p></td></tr></table></td></tr></table></body></html>`
  return {html,text}
}


// Version one remains byte-for-byte available for immutable earlier attempts.
// New emails use the already-approved transparent white logo on a brown header.
export function renderPaymentEmail(email:PaymentEmail){
 if(email.version===1)return renderPaymentEmailV1(email)
 if(email.version!==2)throw new Error('Unsupported payment email version.')
 const rendered=renderPaymentEmailV1({...email,version:1})
 const invitation=/\breply\b/i.test(email.message)?'':'You can reply to this email.'
 const html=rendered.html.replace('/brand/fluffytail-email-logo.png','/brand/fluffytail-email-logo-transparent.png')
  .replace('<td align="center" style="padding:20px 24px 15px;border-bottom:1px solid #D8BD9D">','<td align="center" bgcolor="#58493D" style="padding:20px 24px 15px;border-bottom:1px solid #D8BD9D;background-color:#58493D;color:#FFF9F1">')
  .replace('font-size:24px;color:#58493D">FluffyTail Shih Tzu', 'font-size:24px;color:#FFF9F1">FluffyTail Shih Tzu')
  .replace('Please reply with any questions.<br><strong>Jeanne</strong>',`${invitation?invitation+'<br>':''}<strong>Jeanne</strong>`)
 const text=rendered.text.replace(/\n\nPlease reply with any questions\.\nJeanne\nFluffyTail Shih Tzu$/,`\n\n${invitation?invitation+'\n':''}Jeanne\nFluffyTail Shih Tzu`)
 return {html,text}
}
