export type EmailAttachment={id:string;familyId:string;filename:string;contentType:string;size:number;sha256:string;kind:'photo'|'document';createdAt:string}
export type EmailAttachmentPart={filename:string;contentType:string;contentBase64:string}
export const attachmentLimits={fileBytes:2_500_000,totalBytes:7_500_000,count:5}
export const sameAttachments=(a:EmailAttachment[]|undefined,b:EmailAttachment[]|undefined)=>JSON.stringify((a||[]).map(f=>[f.id,f.familyId,f.filename,f.contentType,f.size,f.sha256,f.kind,f.createdAt]))===JSON.stringify((b||[]).map(f=>[f.id,f.familyId,f.filename,f.contentType,f.size,f.sha256,f.kind,f.createdAt]))
export const attachmentPath=(id:string)=>`/inbox/workspace/api/files?id=${encodeURIComponent(id)}`
