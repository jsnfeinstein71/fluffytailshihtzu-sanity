import 'server-only'
import {randomBytes,randomUUID} from 'node:crypto'
import type Stripe from 'stripe'
import {litterReservationsEnabled,type LitterBoard,type LitterReservation} from '@/lib/litter-reservations'
import {requirePaymentTestConfiguration} from '@/lib/payment-test-mode'
import {getPricing} from '@/lib/pricing'
import {getOperatorClient} from './operator-client'
import {getStripe} from './stripe'
import {privateRecordId} from './private-records'
import {workspaceId} from './workspace'
import type {SavedFamily} from '@/app/inbox/workspace/persistence'
import type {PaymentRequest} from '@/app/inbox/workspace/email-model'

export class LitterError extends Error{constructor(message:string,public status=409){super(message)}}
type Litter={_id:string;_rev:string;_type:string;title:string;status:string;price:number;deposit:number;isVisible?:boolean;litterReservationTest?:boolean}
type Ledger={_id:string;_rev:string;_type:string;amountPaid:number;staffFamilyId:string;staffPaymentRequestId:string;litterReservationId:string;stripeCheckoutSessionId:string;webhookVerifiedAt:string;puppyId?:string}
const client=()=>getOperatorClient(),now=()=>new Date().toISOString()
export const litterRecordId=(kind:string,key:string)=>privateRecordId(kind,'review-v1:'+key)
const boardId=(id:string)=>litterRecordId('litterPlaces',id)
function enabled(){if(!litterReservationsEnabled())throw new LitterError('Litter reservations are not enabled in this environment.',404);requirePaymentTestConfiguration()}
async function litter(id:unknown){
 if(typeof id!=='string'||!id||id.length>150||/^(private|drafts|versions)\./.test(id))throw new LitterError('Choose a published litter.')
 const l=await client().getDocument<Litter>(id)
 if(!l||l._type!=='litter'||!l.litterReservationTest||l.isVisible===false||!['planned','upcoming','current','active'].includes(l.status))throw new LitterError('Choose a fictional upcoming or current test litter.')
 if(!Number.isFinite(l.price)||!Number.isFinite(l.deposit)||l.price<=0||l.deposit<=0||l.deposit>l.price)throw new LitterError('Configure this litter’s price and deposit before offering a place.')
 return l
}
async function family(id:string){const f=await client().getDocument<SavedFamily>(workspaceId(id));if(!f||f.workspace!=='review-v1'||!f.profile.paymentTestScenario||!f.profile.email.endsWith('@example.test'))throw new LitterError('Choose a fictional inquiry family.');return f}
async function reservation(id:string){const r=await client().getDocument<LitterReservation>(id);if(!r||r._type!=='litterReservation'||r.workspace!=='review-v1'||r._id!==litterRecordId('litterReservation',r.requestId))throw new LitterError('Reservation unavailable.',404);return r}
async function board(litterId:string,create=false){if(create)await client().createIfNotExists({_id:boardId(litterId),_type:'litterPlaces',workspace:'review-v1',litterId,places:[]});const b=await client().getDocument<LitterBoard>(boardId(litterId));if(b&&(b._type!=='litterPlaces'||b.workspace!=='review-v1'||b.litterId!==litterId||!Array.isArray(b.places)||b.places.some(p=>![1,2,3,4].includes(p.position)||!['pending','reserved'].includes(p.state))||new Set(b.places.map(p=>p.position)).size!==b.places.length))throw new LitterError('This litter’s positions require review. No availability was assumed.');return b}
const nextPlace=(b:LitterBoard|undefined)=>([1,2,3,4].find(n=>!b?.places.some(p=>p.position===n)))
const entry=(action:string,extra:Partial<LitterReservation['history'][number]>={})=>({_key:randomUUID(),action,at:now(),...extra})
function conflict(e:unknown){return (e as {statusCode?:number}).statusCode===409}
function preferences(value:unknown){if(typeof value!=='string'||value.length>2000)throw new LitterError('Use preferences up to 2,000 characters.',400);return value.trim()}
function uuid(value:unknown):asserts value is string{if(typeof value!=='string'||!/^[a-f\d-]{36}$/i.test(value))throw new LitterError('Use a valid action identifier.',400)}

export async function publicLitterPlaces(id:string){
 enabled();await litter(id);const b=await board(id)
 // This is the only public projection: no family/operational IDs or history.
 return [1,2,3,4].map(position=>({position,status:b?.places.find(p=>p.position===position)?.state==='reserved'?'Reserved':b?.places.some(p=>p.position===position)?'Pending deposit':'Available'}))
}
export async function loadLitterReservations(){
 enabled();const [litters,reservations,boards]=await Promise.all([
 client().fetch<Litter[]>('*[_type=="litter" && litterReservationTest==true && !(_id in path("drafts.**"))][0...100]',{},{cache:'no-store'}),
 client().fetch<LitterReservation[]>('*[_type=="litterReservation" && workspace=="review-v1"][0...500]',{},{cache:'no-store'}),
 client().fetch<LitterBoard[]>('*[_type=="litterPlaces" && workspace=="review-v1"][0...100]',{},{cache:'no-store'})])
 const puppies=await client().fetch<{id:string;name:string;litterId:string;status:string}[]>('*[_type=="puppy" && defined(paymentTestScenario) && !(_id in path("drafts.**"))][0...200]{"id":_id,name,"litterId":litter._ref,status}',{},{cache:'no-store'})
 return {puppies,litters:litters.map(l=>({id:l._id,title:l.title,status:l.status,price:l.price,deposit:l.deposit})),reservations,boards}
}
export async function offerLitterPlace(input:{familyId:string;litterId:string;position:number;preferences:string;requestId:string}){
 enabled();uuid(input.requestId);const l=await litter(input.litterId),f=await family(input.familyId),quote=getPricing({litterPrice:l.price,litterDeposit:l.deposit})
 if(!['planned','upcoming'].includes(l.status))throw new LitterError('New litter places are offered before birth. Existing places remain accessible after birth.')
 const id=litterRecordId('litterReservation',input.requestId),prior=await client().getDocument<LitterReservation>(id)
 if(prior){if(prior.familyId!==input.familyId||prior.litterId!==input.litterId||prior.position!==input.position)throw new LitterError('That action belongs to another offer.');return await prepareLitterCheckout(prior._id)}
 const anchorId=litterRecordId('litterFamily',f.familyKey)
 await client().createIfNotExists({_id:anchorId,_type:'litterFamily',workspace:'review-v1',familyId:f.familyKey,reservationId:''})
 const anchor=await client().getDocument<{_rev:string;reservationId:string}>(anchorId),b=await board(l._id,true)
 if(anchor?.reservationId){const active=await reservation(anchor.reservationId);if(active.state!=='released')throw new LitterError('This family already has a litter deposit or place. Transfer its existing reservation instead.')}
 if(!b||nextPlace(b)!==input.position)throw new LitterError('The next available position changed. Refresh the four places before offering it.')
 const paymentRequestId=litterRecordId('staffPaymentRequest',input.requestId),token=randomBytes(24).toString('hex'),createdAt=now()
 const r:LitterReservation={_id:id,_rev:'',_type:'litterReservation',workspace:'review-v1',familyId:f.familyKey,litterId:l._id,litterTitle:l.title,position:input.position,state:'pending',preferences:preferences(input.preferences),requestId:input.requestId,paymentRequestId,depositCents:quote.depositCents,totalCents:quote.totalCents,history:[entry('offered',{toLitter:l._id,toPosition:input.position})]}
 const p:PaymentRequest={_id:paymentRequestId,_type:'staffPaymentRequest',workspace:'review-v1',testOnly:true,requestId:input.requestId,familyId:f.familyKey,puppyId:'',puppyName:l.title,kind:'deposit',amountCents:quote.depositCents,totalCents:quote.totalCents,depositCents:quote.depositCents,paidCents:0,createdAt,expiresAt:new Date(Date.now()+3600000).toISOString(),publicToken:token,litterReservationId:id,litterId:l._id,selectionPosition:input.position}
 const {_rev:unused,...document}=r;void unused
 try{await client().transaction().create(document).create(p).patch(b._id,p=>p.ifRevisionId(b._rev).set({places:[...b.places,{_key:String(input.position),position:input.position,reservationId:id,state:'pending'}]})).patch(anchorId,p=>p.ifRevisionId(anchor!._rev).set({reservationId:id})).patch(f._id,p=>p.ifRevisionId(f._rev).set({'profile.litterId':l._id,'profile.litterTitle':l.title})).commit({visibility:'sync'})}catch(e){if(conflict(e))throw new LitterError('Another offer claimed a place first. Nothing was charged; refresh the positions.');throw e}
 return await prepareLitterCheckout(id)
}
export async function prepareLitterCheckout(id:string){
 enabled();const origin=requirePaymentTestConfiguration(),r=await reservation(id),f=await family(r.familyId),p=await client().getDocument<PaymentRequest>(r.paymentRequestId)
 if(!p||r.state!=='pending')throw new LitterError('This place is not awaiting a deposit.')
 if(p.checkoutSessionId)return p
 // A durable hold precedes the provider call. Unknown outcomes retain the hold;
 // retries use the same Stripe idempotency key and the original quote.
 const s=await getStripe().checkout.sessions.create({mode:'payment',customer_email:f.profile.email,client_reference_id:r._id,expires_at:Math.floor(Date.parse(p.expiresAt)/1000),line_items:[{price_data:{currency:'usd',unit_amount:p.amountCents,product_data:{name:`TEST · ${r.position}${r.position===1?'st':r.position===2?'nd':r.position===3?'rd':'th'} pick · ${r.litterTitle}`,description:'Litter selection position only; no individual puppy, sex, color or litter size is guaranteed.'}},quantity:1}],success_url:origin+'/pay/'+p.publicToken,cancel_url:origin+'/pay/'+p.publicToken+'?result=canceled',metadata:{litterReservationId:r._id,staffPaymentRequestId:p._id,staffFamilyId:r.familyId,staffTestOnly:'1',customerPaymentToken:p.publicToken!,selectionPosition:String(r.position),litterId:r.litterId,depositCents:String(r.depositCents)}},{idempotencyKey:'litter-deposit:'+p._id})
 if(s.livemode!==false||!s.id.startsWith('cs_test_')||s.amount_total!==p.amountCents||s.currency!=='usd')throw new LitterError('The isolated checkout could not be verified. The hold remains for review.')
 await client().patch(p._id).set({checkoutSessionId:s.id,stripeCheckoutUrl:s.url,checkoutUrl:origin+'/pay/'+p.publicToken}).commit({visibility:'sync'})
 return await client().getDocument<PaymentRequest>(p._id)
}
async function sessionContext(sessionId:string){
 enabled();const s=await getStripe().checkout.sessions.retrieve(sessionId),m=s.metadata
 if(s.livemode!==false||!s.id.startsWith('cs_test_')||s.currency!=='usd'||m?.staffTestOnly!=='1'||!m.litterReservationId)throw new LitterError('This is not an isolated litter checkout.')
 const r=await reservation(m.litterReservationId),p=await client().getDocument<PaymentRequest>(r.paymentRequestId),f=await family(r.familyId)
 if(!p||p.checkoutSessionId!==s.id||p._id!==m.staffPaymentRequestId||m.staffFamilyId!==f.familyKey||s.client_reference_id!==r._id||s.amount_total!==r.depositCents||p.amountCents!==r.depositCents||m.customerPaymentToken!==p.publicToken||m.litterId!==p.litterId||m.selectionPosition!==String(p.selectionPosition)||m.depositCents!==String(p.depositCents)||s.customer_email?.toLowerCase()!==f.profile.email)throw new LitterError('The saved reservation and Stripe quote do not match.')
 return {s,r,p,f}
}
async function terminal(s:Stripe.Checkout.Session){
 if(s.payment_status==='paid'||s.status==='open')return false
 const id=typeof s.payment_intent==='string'?s.payment_intent:s.payment_intent?.id
 if(!id)return s.status==='expired'
 const pi=await getStripe().paymentIntents.retrieve(id)
 return pi.livemode===false&&['canceled','requires_payment_method'].includes(pi.status)&&(s.status==='expired'||s.status==='complete')
}
export async function reconcileLitterHold(id:string){
 enabled();const r=await reservation(id),p=await client().getDocument<PaymentRequest>(r.paymentRequestId)
 if(r.state!=='pending')return r
 if(!p?.checkoutSessionId)throw new LitterError('Checkout creation is uncertain. Retry this original offer; its position remains held.')
 const {s}=await sessionContext(p.checkoutSessionId)
 if(!await terminal(s))return r
 const b=await board(r.litterId);if(!b)throw new LitterError('The held position needs review.')
 try{await client().transaction().patch(r._id,p=>p.ifRevisionId(r._rev).set({state:'released',history:[...r.history,entry('hold-released',{note:'Stripe checkout definitively closed with no payment processing.'})]})).patch(b._id,p=>p.ifRevisionId(b._rev).set({places:b.places.filter(p=>p.reservationId!==r._id)})).patch(p._id,patch=>patch.ifRevisionId((p as PaymentRequest&{_rev:string})._rev).set({checkoutOutcome:s.status==='expired'?'expired':'failed'})).commit({visibility:'sync'})}catch(e){if(!conflict(e))throw e}
 return await reservation(id)
}
export async function closeLitterRequest(id:string){
 enabled();const r=await reservation(id),p=await client().getDocument<PaymentRequest>(r.paymentRequestId)
 if(!p?.checkoutSessionId)throw new LitterError('Checkout creation needs review. Retry the original checkout before closing it.')
 const {s}=await sessionContext(p.checkoutSessionId)
 if(s.status==='open')await getStripe().checkout.sessions.expire(s.id)
 return await reconcileLitterHold(id)
}
export async function applyLitterPayment(event:Stripe.Event){
 enabled();if(event.livemode!==false)throw new LitterError('Live payments are forbidden here.')
 const received=event.data.object as Stripe.Checkout.Session
 if(!received.metadata?.litterReservationId)return null
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired'].includes(event.type))return {ignored:true}
 // Re-read provider state: old failure/expiry events cannot undo a later success.
 for(let attempt=0;attempt<4;attempt++){
  const {s,r,p,f}=await sessionContext(received.id)
  const ledgerId=litterRecordId('litterPayment',s.id),prior=await client().getDocument<Ledger>(ledgerId)
  if(prior){if(prior.amountPaid!==p.amountCents/100||prior.staffFamilyId!==r.familyId||prior.litterReservationId!==r._id)throw new LitterError('A verified payment identity conflicts.');return {duplicate:true,litterReservation:true}}
  if(s.payment_status!=='paid'){await reconcileLitterHold(r._id);return {pending:true,litterReservation:true}}
  const b=await board(r.litterId),occupies=b?.places.some(x=>x.reservationId===r._id&&x.position===r.position),state=occupies&&r.state==='pending'?'reserved':'reconciliation',at=now()
  const tx=client().transaction().create({_id:ledgerId,_type:'paymentRecord',workspace:'review-v1',testOnly:true,paymentStatus:'paid',paymentType:'deposit',amountPaid:p.amountCents/100,litterReservationId:r._id,litterId:p.litterId,litterQuotedTotalCents:p.totalCents,quotedDepositCents:p.depositCents,staffFamilyId:r.familyId,staffPaymentRequestId:p._id,stripeCheckoutSessionId:s.id,stripePaymentIntentId:typeof s.payment_intent==='string'?s.payment_intent:'',stripeEventId:event.id,webhookVerifiedAt:at,createdAt:at,customerEmail:f.profile.email,customerName:f.profile.name})
  tx.patch(r._id,p=>p.ifRevisionId(r._rev).set({state,ledgerId,history:[...r.history,entry(state==='reserved'?'deposit-verified':'late-payment-review',{note:state==='reconciliation'?'Money recorded; no occupied place was reassigned.':''})]})).patch(p._id,patch=>patch.ifRevisionId((p as PaymentRequest&{_rev:string})._rev).set({webhookVerifiedAt:at,paymentVerification:'test-paid',stripeEventId:event.id}))
  if(occupies&&b)tx.patch(b._id,p=>p.ifRevisionId(b._rev).set({places:b.places.map(p=>p.reservationId===r._id?{...p,state:'reserved'}:p)}))
  try{await tx.commit({visibility:'sync'});return {recorded:true,litterReservation:true,reconciliation:state==='reconciliation'}}catch(e){if(!conflict(e))throw e}
 }
 throw new LitterError('This verified payment is being reconciled. Retry the signed event.',503)
}
export async function moveLitterReservation(input:{id:string;litterId:string;position:number;requestId:string;note:string}){
 enabled();uuid(input.requestId);const r=await reservation(input.id)
 if(r.history.some(h=>h._key===input.requestId))return r
 if(!['reserved','reconciliation'].includes(r.state)||!r.ledgerId||r.puppyId)throw new LitterError('Only a verified, unassigned deposit can move. Pending or selected-puppy reservations require review.')
 const l=await litter(input.litterId);if(!['planned','upcoming'].includes(l.status)||l._id===r.litterId&&r.state==='reserved')throw new LitterError('Choose another upcoming litter.')
 const destination=await board(l._id,true),source=await board(r.litterId),anchorId=litterRecordId('litterFamily',r.familyId),anchor=await client().getDocument<{_rev:string;reservationId:string}>(anchorId)
 if(!destination||nextPlace(destination)!==input.position||anchor?.reservationId!==r._id)throw new LitterError('The destination position or family’s deposit changed. Refresh and confirm the available place.')
 const tx=client().transaction().patch(destination._id,p=>p.ifRevisionId(destination._rev).set({places:[...destination.places,{_key:String(input.position),position:input.position,reservationId:r._id,state:'reserved'}]})).patch(r._id,p=>p.ifRevisionId(r._rev).set({state:'reserved',litterId:l._id,litterTitle:l.title,position:input.position,history:[...r.history,{...entry(r.state==='reconciliation'?'late-payment-placed':'transferred',{fromLitter:r.litterId,fromPosition:r.position,toLitter:l._id,toPosition:input.position,note:preferences(input.note)}),_key:input.requestId}]}))
 if(source&&source._id!==destination._id)tx.patch(source._id,p=>p.ifRevisionId(source._rev).set({places:source.places.filter(p=>p.reservationId!==r._id)}))
 await tx.commit({visibility:'sync'});return await reservation(r._id)
}
export async function assignLitterPuppy(input:{id:string;puppyId:string;requestId:string}){
 enabled();uuid(input.requestId);const r=await reservation(input.id)
 if(r.puppyId===input.puppyId)return r
 if(r.state!=='reserved'||!r.ledgerId||r.puppyId)throw new LitterError('A verified, unassigned reservation is required.')
 const [puppy,f,ledger,l]=await Promise.all([client().getDocument<{_id:string;_rev:string;_type:string;status:string;litter:{_ref:string};name:string;slug:{current:string};overridePrice?:number;paymentTestScenario?:string}>(input.puppyId),family(r.familyId),client().getDocument<Ledger>(r.ledgerId),litter(r.litterId)])
 if(!puppy||puppy._type!=='puppy'||!puppy.paymentTestScenario||puppy.litter?._ref!==r.litterId||!['current','active'].includes(l.status)||!['available','hold'].includes(puppy.status)||!ledger||ledger.puppyId||f.profile.puppyId)throw new LitterError('Choose an available fictional puppy in this born litter, with no prior family or deposit assignment.')
 const quote=getPricing({litterPrice:l.price,litterDeposit:l.deposit,overridePrice:puppy.overridePrice}),paidCents=Math.round(ledger.amountPaid*100)
 if(quote.totalCents<paidCents)throw new LitterError('This puppy costs less than the deposit credit. Jeanne must decide how to handle the excess before assignment.')
 const prior=await client().fetch<{_id:string}[]>('*[_type=="paymentRecord" && puppyId==$puppyId && paymentStatus=="paid"]{_id}',{puppyId:puppy._id},{cache:'no-store'});if(prior.length)throw new LitterError('This puppy already has a payment; reconcile it before assigning another deposit.')
 await client().transaction().create({_id:litterRecordId('litterCreditApplication',r.ledgerId),_type:'litterCreditApplication',workspace:'review-v1',reservationId:r._id,ledgerId:r.ledgerId,puppyId:puppy._id,amountCents:paidCents,totalCents:quote.totalCents,createdAt:now()}).patch(r._id,p=>p.ifRevisionId(r._rev).set({puppyId:puppy._id,history:[...r.history,{...entry('puppy-selected',{puppyId:puppy._id}),_key:input.requestId}]})).patch(puppy._id,p=>p.ifRevisionId(puppy._rev).set({status:'reserved',litterReservationId:r._id})).patch(ledger._id,p=>p.ifRevisionId(ledger._rev).set({puppyId:puppy._id,puppySlug:puppy.slug.current,puppyName:puppy.name,selectedLitterId:l._id,quotedTotalCents:quote.totalCents})).patch(f._id,p=>p.ifRevisionId(f._rev).set({'profile.puppyId':puppy._id,'profile.agreedTotalCents':quote.totalCents,'profile.stage':quote.totalCents===paidCents?'Paid in full — TEST':'Deposit applied — TEST','profile.litterId':l._id,'profile.litterTitle':l.title})).commit({visibility:'sync'})
 return await reservation(r._id)
}
export async function editLitterPreferences(id:string,value:unknown){enabled();const r=await reservation(id);await client().patch(id).ifRevisionId(r._rev).set({preferences:preferences(value)}).commit({visibility:'sync'})}
export async function markTestLitterBorn(id:string){enabled();const l=await litter(id);if(!['planned','upcoming'].includes(l.status))return;await client().patch(l._id).ifRevisionId(l._rev).set({status:'current'}).commit({visibility:'sync'})}
export async function customerLitterPayment(p:PaymentRequest){
 enabled();if(!p.checkoutSessionId||!p.litterReservationId)throw new LitterError('Payment unavailable.')
 const {s,r}=await sessionContext(p.checkoutSessionId),paid=!!p.webhookVerifiedAt,b=await board(r.litterId),held=b?.places.some(x=>x.reservationId===r._id)
 const state=r.state==='reconciliation'?'unavailable':paid?'confirmed':s.payment_status==='paid'||s.status==='complete'&&r.state==='pending'?'pending':r.state==='released'||s.status==='expired'?'expired':held?'ready':'unavailable'
 return {litterReservation:true as const,selectionPosition:r.position,litterTitle:r.litterTitle,puppyName:r.litterTitle,kind:p.kind,amountCents:p.amountCents,totalCents:p.totalCents,depositCents:p.depositCents,paidCents:paid?p.amountCents:0,remainingCents:p.totalCents-(paid?p.amountCents:0),reserved:r.state==='reserved',state,checkoutUrl:state==='ready'&&s.status==='open'?s.url:null,confirmation:'not-scheduled'}
}
