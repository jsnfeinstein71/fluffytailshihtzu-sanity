import 'server-only'
import {createHash} from 'node:crypto'
import {getOperatorClient} from './operator-client'
import {requireWorkspace,validFamilyKey,workspaceId,WorkspaceError} from './workspace'
import {workspaceNamespace} from '@/lib/workspace-mode'
import {privateRecordId} from './private-records'
import {attachmentLimits,sameAttachments,type EmailAttachment,type EmailAttachmentPart} from '@/lib/mail/attachment-model'
import type {SavedFamily} from '@/app/inbox/workspace/persistence'

type AttachmentRecord=EmailAttachment&{_id:string;_type:'staffAttachment';workspace:string;contentBase64:string}
const idPattern=/^private\.staffAttachment\.[a-f0-9]{64}$/
const extensions:Record<string,string[]>={'image/jpeg':['jpg','jpeg'],'image/png':['png'],'image/webp':['webp'],'application/pdf':['pdf'],'text/plain':['txt']}
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex')
function validBytes(bytes:Buffer,type:string){
 if(type==='image/jpeg')return bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255
 if(type==='image/png')return bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
 if(type==='image/webp')return bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'
 if(type==='application/pdf')return bytes.subarray(0,5).toString()==='%PDF-'
 if(type==='text/plain'){try{const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);return !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)}catch{return false}}
 return false
}
const metadata=(record:AttachmentRecord):EmailAttachment=>({id:record._id,familyId:record.familyId,filename:record.filename,contentType:record.contentType,size:record.size,sha256:record.sha256,kind:record.kind,createdAt:record.createdAt})
async function family(id:string){
 requireWorkspace()
 if(!validFamilyKey(id))throw new WorkspaceError('Choose a saved family.',404)
 const record=await getOperatorClient().getDocument<SavedFamily>(workspaceId(id))
 if(!record||record.workspace!==workspaceNamespace()||record.familyKey!==id)throw new WorkspaceError('This family is not available.',404)
 return record
}
export async function saveAttachment(input:unknown){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new WorkspaceError('Choose a photo or document.')
 const data=input as Record<string,unknown>
 if(Object.keys(data).some(k=>!['familyId','uploadId','filename','contentType','contentBase64'].includes(k))||typeof data.familyId!=='string'||typeof data.uploadId!=='string'||!/^[-a-f0-9]{36}$/.test(data.uploadId)||typeof data.filename!=='string'||data.filename.length>120||!data.filename.trim()||/[\x00-\x1f\x7f/\\]/.test(data.filename)||typeof data.contentType!=='string'||!extensions[data.contentType]?.includes(data.filename.split('.').at(-1)!.toLowerCase())||typeof data.contentBase64!=='string'||data.contentBase64.length>Math.ceil(attachmentLimits.fileBytes/3)*4||! /^[A-Za-z0-9+/]*={0,2}$/.test(data.contentBase64)||data.contentBase64.length%4!==0)throw new WorkspaceError('Use JPG, PNG, WebP, PDF or UTF-8 TXT files, up to 2.5 MB each. File name and type must match.')
 await family(data.familyId)
 const bytes=Buffer.from(data.contentBase64,'base64')
 if(!bytes.length||bytes.length>attachmentLimits.fileBytes||!validBytes(bytes,data.contentType))throw new WorkspaceError('This file does not match a supported photo or document type, or exceeds 2.5 MB.')
 const client=getOperatorClient(),id=privateRecordId('staffAttachment',`${workspaceNamespace()}:${data.familyId}:${data.uploadId}`)
 const record:AttachmentRecord={_id:id,_type:'staffAttachment',workspace:workspaceNamespace(),id,familyId:data.familyId,filename:data.filename,contentType:data.contentType,size:bytes.length,sha256:digest(bytes),kind:data.contentType.startsWith('image/')?'photo':'document',contentBase64:data.contentBase64,createdAt:new Date().toISOString()}
 const existing=await client.getDocument<AttachmentRecord>(id)
 if(!existing){const count=await client.fetch<number>('count(*[_type == "staffAttachment" && workspace == $workspace && familyId == $familyId])',{workspace:workspaceNamespace(),familyId:data.familyId},{cache:'no-store'});if(count>=100)throw new WorkspaceError('This family has 100 saved files. Contact your site administrator before uploading more.',409);await client.transaction().createIfNotExists(record).commit({visibility:'sync'})}
 const stored=await client.getDocument<AttachmentRecord>(id)
 if(!stored||stored.familyId!==record.familyId||stored.sha256!==record.sha256||stored.filename!==record.filename||stored.contentType!==record.contentType)throw new WorkspaceError('This upload conflicts with another file. Your message is kept; choose the file again.',409)
 return metadata(stored)
}
export async function readAttachment(id:string,familyId?:string){
 requireWorkspace()
 if(!idPattern.test(id))throw new WorkspaceError('File not found.',404)
 const record=await getOperatorClient().getDocument<AttachmentRecord>(id)
 if(!record||record._type!=='staffAttachment'||record.workspace!==workspaceNamespace()||familyId&&record.familyId!==familyId)throw new WorkspaceError('This file does not belong to this family.',404)
 await family(record.familyId)
 const bytes=Buffer.from(record.contentBase64,'base64')
 if(!bytes.length||bytes.length!==record.size||bytes.length>attachmentLimits.fileBytes||digest(bytes)!==record.sha256||!validBytes(bytes,record.contentType))throw new WorkspaceError('This saved file needs review. It was not sent.',409)
 return {file:metadata(record),bytes}
}
const fileProjection='{"id":_id,familyId,filename,contentType,size,sha256,kind,createdAt}'
export async function checkedAttachments(ids:string[]|undefined,familyId:string){
 if(!ids?.length)return []
 requireWorkspace()
 if(ids.length>attachmentLimits.count||new Set(ids).size!==ids.length||ids.some(id=>!idPattern.test(id)))throw new WorkspaceError('Attach up to five different saved files.')
 await family(familyId)
 const records=await getOperatorClient().fetch<EmailAttachment[]>('*[_type == "staffAttachment" && workspace == $workspace && familyId == $familyId && _id in $ids]'+fileProjection,{workspace:workspaceNamespace(),familyId,ids},{cache:'no-store'})
 const files=ids.map(id=>records.find(f=>f.id===id))
 if(files.some(f=>!f))throw new WorkspaceError('An attachment is missing or belongs to another family. Your draft is kept.',409)
 const checked=files as EmailAttachment[]
 if(checked.some(f=>!Number.isSafeInteger(f.size)||f.size<=0||f.size>attachmentLimits.fileBytes)||checked.reduce((sum,file)=>sum+file.size,0)>attachmentLimits.totalBytes)throw new WorkspaceError('Keep attachments within 2.5 MB each and 7.5 MB combined.')
 return checked
}
export async function attachmentParts(files:EmailAttachment[]|undefined,familyId:string):Promise<EmailAttachmentPart[]>{
 if(!files?.length)return []
 if(files.length>attachmentLimits.count||files.reduce((sum,file)=>sum+file.size,0)>attachmentLimits.totalBytes)throw new WorkspaceError('Too many or oversized attachments.',409)
 return await Promise.all(files.map(async snapshot=>{
  const {file,bytes}=await readAttachment(snapshot.id,familyId)
  if(!sameAttachments([file],[snapshot]))throw new WorkspaceError('The saved attachment changed. Nothing was sent.',409)
  return {filename:file.filename,contentType:file.contentType,contentBase64:bytes.toString('base64')}
 }))
}
export async function listAttachments(familyIds:string[]):Promise<EmailAttachment[]>{
 requireWorkspace()
 return await getOperatorClient().fetch<EmailAttachment[]>('*[_type == "staffAttachment" && workspace == $workspace && familyId in $familyIds] | order(createdAt desc)[0...500]{"id":_id,familyId,filename,contentType,size,sha256,kind,createdAt}',{workspace:workspaceNamespace(),familyIds},{cache:'no-store'})
}
