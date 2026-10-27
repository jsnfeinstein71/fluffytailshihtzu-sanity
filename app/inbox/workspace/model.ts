import {getBalance, getPricing} from '@/lib/pricing'
import type {SavedFamily} from './persistence'

export type Channel = 'Email' | 'Text'
export type Family = {
  paymentConfirmationMessage?:string; testCommunicationsAllowed?:boolean;testSmsAvailable?:boolean; paymentTestScenario?:string; smsBlockedReason?:string; historicalBalanceNeedsReview?:boolean; agreedTotalCents?:number; inquiryId?:string; interestPuppyId?:string; puppySlug?:string; source?:'inquiry'|'fixture'
  id: string; name: string; initials: string; location: string; email: string; phone: string
  preference: Channel | 'Either'; smsConsent: boolean; stage: string; puppyId?: string
  next: string; unread: boolean; pickup?: string; checks: string[]
  records: {paymentStatus: string; amountPaid: number;paymentType?:string;createdAt?:string;webhookVerifiedAt?:string}[]
  messages: {id: string; direction: 'in' | 'out'; channel: Channel; body: string; time: string;kind?:'inquiry'|'sms';status?:string;delivery?:string}[]
}
export const puppies = [
  {id: 'maple', name: 'Maple', sex: 'Girl', color: 'Cream & white', litter: 'Autumn litter', status: 'Reserved', price: 1600, deposit: 400},
  {id: 'clover', name: 'Clover', sex: 'Girl', color: 'Gold & white', litter: 'Autumn litter', status: 'Available', price: 1600, deposit: 400},
  {id: 'pippin', name: 'Pippin', sex: 'Boy', color: 'Cream', litter: 'Autumn litter', status: 'Reserved', price: 1600, deposit: 400},
] as const

export type WorkspacePuppy={id:string;name:string;sex:string;color:string;litter:string;status:string;price:number;deposit:number;slug?:string}
export function familyFromSaved(record:SavedFamily):Family {
  const fixture=families.find(f=>f.id===record.familyKey)
  return {...record.profile,unread:record.profile.unread??fixture?.unread??true,records:record.profile.records||fixture?.records||[],messages:record.profile.messages||fixture?.messages||[],checks:record.checks}
}

// Fictional review fixtures. Persistence is restricted to the isolated synthetic dataset.
export const families: Family[] = [
  {id:'avery', name:'Avery Brooks', initials:'AB', location:'Mobile, AL', email:'avery@example.test', phone:'+1 202-555-0101', preference:'Email', smsConsent:false, stage:'Deposit due', puppyId:'maple', next:'Review deposit request', unread:true, checks:[], records:[], messages:[
    {id:'a1', direction:'in', channel:'Email', body:'We loved meeting Maple. Could you let us know the next step to reserve her?', time:'Today · 9:42 AM'},
    {id:'a2', direction:'out', channel:'Email', body:'I’m glad you enjoyed meeting her! I’ll confirm the details with you before sending a deposit link.', time:'Today · 9:56 AM'},
  ]},
  {id:'morgan', name:'Morgan Lane', initials:'ML', location:'Pensacola, FL', email:'morgan@example.test', phone:'+1 202-555-0102', preference:'Either', smsConsent:true, stage:'Pickup planning', puppyId:'pippin', next:'Confirm pickup time', unread:true, pickup:'Pickup time to confirm · Mobile', checks:['Vet check','Vaccination & deworming record'], records:[{paymentStatus:'paid', amountPaid:400}], messages:[
    {id:'m1', direction:'in', channel:'Text', body:'Can we confirm a pickup time? We can come to Mobile.', time:'Today · 8:18 AM'},
  ]},
  {id:'riley', name:'Riley Harper', initials:'RH', location:'Birmingham, AL', email:'riley@example.test', phone:'+1 202-555-0103', preference:'Text', smsConsent:true, stage:'New inquiry', next:'Reply about available puppies', unread:true, checks:[], records:[], messages:[
    {id:'r1', direction:'in', channel:'Text', body:'Hello Jeanne! We’re looking for a Shih Tzu. Is Clover still available?', time:'Yesterday · 4:20 PM'},
  ]},
  {id:'jordan', name:'Jordan Ellis', initials:'JE', location:'New Orleans, LA', email:'jordan@example.test', phone:'+1 202-555-0104', preference:'Email', smsConsent:false, stage:'Future litter', next:'Discuss timing and preferences', unread:false, checks:[], records:[], messages:[
    {id:'j1', direction:'in', channel:'Email', body:'We’d love to hear about a future litter. We’re flexible on timing.', time:'Yesterday · 1:15 PM'},
  ]},
]

export const pickupChecks = ['Vet check','Vaccination & deworming record','CKC registration papers','Starter kit packed','Pickup details confirmed']
export type Attempt = {id: number; familyId: string; channel: Channel; body: string; outcome: 'simulated' | 'failed' | 'review'}
export type ReviewState = {drafts: Record<string, string>; attempts: Attempt[]; checks: Record<string, string[]>; notes: Record<string, string[]>; error: string}
export function initialState(): ReviewState {
  return {drafts:{}, attempts:[], checks:Object.fromEntries(families.map(f => [f.id,[...f.checks]])), notes:{}, error:''}
}
export function draftKey(id: string, channel: Channel) {return `${id}:${channel}`}
export function matchesFamily(family: Family, search: string) {
  const puppy = puppies.find(p => p.id === family.puppyId)
  return `${family.name} ${family.location} ${family.stage} ${puppy?.name || ''} ${family.messages.map(m => m.body).join(' ')}`.toLowerCase().includes(search.trim().toLowerCase())
}
export function paymentSummary(family: Family, inventory:readonly WorkspacePuppy[]=puppies) {
  const puppy = inventory.find(p => p.id === family.puppyId)
  if (!puppy||family.historicalBalanceNeedsReview) return null
  const pricing = getPricing({litterPrice:family.agreedTotalCents? family.agreedTotalCents/100:puppy.price, litterDeposit:puppy.deposit})
  return {...pricing, ...getBalance(pricing.totalCents, family.records)}
}
export function money(cents: number) {return new Intl.NumberFormat('en-US', {style:'currency', currency:'USD', maximumFractionDigits:2}).format(cents / 100)}
export function workspaceAllowed(environment: string | undefined, nodeEnvironment: string | undefined) {
  return environment === 'preview' || (!environment && nodeEnvironment === 'development')
}
export type Action =
  | {type:'draft'; familyId:string; channel:Channel; body:string}
  | {type:'sent-text';familyId:string;body:string}
  | {type:'attempt'; familyId:string; channel:Channel; outcome:Attempt['outcome']}
  | {type:'check'; familyId:string; item:string}
  | {type:'note'; familyId:string; body:string}
  | {type:'clear-error'}
  | {type:'restore'; families:SavedFamily[]; loadDrafts:boolean}
  | {type:'reset-attempts'}
  | {type:'reset'}

export function reviewReducer(state: ReviewState, action: Action): ReviewState {
  if (action.type === 'reset') return initialState()
  if (action.type === 'reset-attempts') return {...state,attempts:[],error:''}
  if (action.type === 'restore') {
    const next={...state,drafts:{...state.drafts},notes:{...state.notes},checks:{...state.checks}}
    for(const record of action.families){
      next.notes[record.familyKey]=record.notes.map(note=>note.text)
      next.checks[record.familyKey]=[...record.checks]
      if(action.loadDrafts)for(const channel of ['Email','Text'] as const)next.drafts[draftKey(record.familyKey,channel)]=record.drafts[channel]
    }
    return next
  }
  if (action.type === 'clear-error') return {...state,error:''}
  const family = families.find(f => f.id === action.familyId) || (/^inquiry-[a-f0-9]{64}$/.test(action.familyId)?{id:action.familyId,smsConsent:false}:undefined)
  if (!family) return {...state, error:'Choose a family before continuing.'}
  if(action.type==='sent-text'){const key=draftKey(action.familyId,'Text');return state.drafts[key]===action.body?{...state,drafts:{...state.drafts,[key]:''}}:state}
  if (action.type === 'draft') return {...state, error:'', drafts:{...state.drafts,[draftKey(family.id, action.channel)]:action.body}}
  if (action.type === 'check') {
    if (!pickupChecks.includes(action.item)) return state
    const current = state.checks[family.id] || []
    return {...state, checks:{...state.checks,[family.id]:current.includes(action.item) ? current.filter(i => i !== action.item) : [...current,action.item]}}
  }
  if (action.type === 'note') {
    const body = action.body.trim()
    return body ? {...state, notes:{...state.notes,[family.id]:[...(state.notes[family.id] || []),body]}} : state
  }
  const key = draftKey(family.id, action.channel)
  const body = (state.drafts[key] || '').trim()
  if (!body) return {...state, error:'Write a message first.'}
  if (action.channel === 'Text' && !family.smsConsent) return {...state, error:'Text is unavailable: this family has not given SMS consent.'}
  if (state.attempts.some(a => a.familyId === family.id && a.channel === action.channel && a.body === body && a.outcome !== 'failed')) {
    return {...state, error:'This draft already has a simulated or uncertain attempt. Review its activity before trying again.'}
  }
  const attempt: Attempt = {id:state.attempts.length + 1, familyId:family.id, channel:action.channel, body, outcome:action.outcome}
  // Failed/ambiguous sends retain their drafts. Simulation never changes financial records.
  return {...state, error:'', drafts:action.outcome === 'simulated' ? {...state.drafts,[key]:''} : state.drafts, attempts:[...state.attempts,attempt]}
}
