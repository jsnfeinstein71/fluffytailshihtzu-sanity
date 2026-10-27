import type {Channel, Family} from './model'

export type SavedNote = {_key:string; text:string; createdAt:string}
export type SavedFamily = {
  _id:string; _rev:string; _type:'staffFamily'; workspace:'review-v1'|'live-v1'; schemaVersion:1
  familyKey:string; textVersion?:number; profile:Omit<Family,'records'|'messages'|'checks'|'unread'> & Partial<Pick<Family,'records'|'messages'|'unread'>>; drafts:Record<Channel,string>; notes:SavedNote[]; checks:string[]
}
export type WorkspaceMutation =
  | {type:'test-sms-consent';familyId:string;acknowledged:true}
  | {type:'initialize'}
  | {type:'sync-inquiries'}
  | {type:'associate';familyId:string;puppyId:string}
  | {type:'draft'; familyId:string; channel:Channel; body:string; base:string}
  | {type:'note'; familyId:string; body:string; requestId:string}
  | {type:'check'; familyId:string; item:string; checked:boolean}
export type WorkspaceResult = {families:SavedFamily[]; error?:string; conflict?:{familyId:string; channel:Channel; saved:string}}
