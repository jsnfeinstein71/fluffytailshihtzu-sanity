export const feedbackInvitationCopy = 'We’d love to hear about your experience with FluffyTail! Tell us how your puppy is doing, and feel free to attach a picture—we always love seeing them grow.'
export const feedbackPhotoLimit = 2_500_000
export type FeedbackInvitationView = {id:string;familyId:string;createdAt:string;expiresAt:string;status:'open'|'expired'|'revoked'|'used';usedAt?:string;revokedAt?:string;submissionId?:string;link?:string;delivery?:{channel:'email'|'text';status:string;delivery?:string;at:string}[]}
export type FeedbackSubmissionView = {id:string;familyId?:string;invitationId?:string;originalText:string;displayName:string;puppyName:string;originalDate:string|null;receivedAt:string;state:'private'|'published';publicText:string;publicDisplayName:string;publicPuppyName:string;featured:boolean;order:number;photoUrl?:string;source:'invitation'|'import';provenance?:{source:string;sourceId:string;originalUrl?:string;attribution:string;permissionNote:string};publicationAllowed:boolean;history:{_key:string;action:string;actor:string;at:string}[]}
export type PublicStory = {id:string;text:string;displayName:string;puppyName:string;originalDate:string|null;photoUrl?:string;featured:boolean;order:number}
export type FeedbackStatus = {status:'ready'|'used'|'expired'|'revoked'|'invalid';displayName?:string;puppyName?:string}
export function conservativeDisplayName(name:string){const words=name.trim().split(/\s+/).filter(Boolean);return words.length>1?`${words[0]} ${Array.from(words.at(-1)!)[0]}.`:words[0]||''}

// Preserve the source's precision: a known month must never become an invented day.
export function feedbackDatePrecision(value:unknown):'month'|'day'|'instant'|null{
 if(typeof value!=='string'||! /^(?!0000)\d{4}-/.test(value))return null
 if(/^\d{4}-(0[1-9]|1[0-2])$/.test(value))return 'month'
 const date=value.slice(0,10)
 if(!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date))return null
 const parsed=new Date(date+'T00:00:00Z')
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)return null
 if(value===date)return 'day'
 return /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)&&Number.isFinite(Date.parse(value))?'instant':null
}
