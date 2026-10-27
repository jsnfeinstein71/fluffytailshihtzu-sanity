import {sameEmail,type EmailDraft,type EmailValue,type MailAction,type MailResult,type TransportAction} from './email-model'
import type {WorkspaceMutation} from './persistence'

export async function sendTextDraft(familyId:string,body:string,base:string,save:(action:WorkspaceMutation)=>Promise<boolean>,submit:(body:{familyId:string;body:string;confirmed:true})=>Promise<{status:string}>){
  if(!await save({type:'draft',familyId,channel:'Text',body,base}))return null
  const result=await submit({familyId,body,confirmed:true})
  const cleared=result.status==='accepted'&&await save({type:'draft',familyId,channel:'Text',body:'',base:body})
  return {state:result.status,cleared}
}

// The operator's one Send action uses the existing saved-version/claim workflow.
// A missing acknowledgement stops the sequence; it never guesses or resubmits.
export async function sendEmailDraft(familyId:string,draft:EmailDraft,requestId:string,request:(action:MailAction|TransportAction,clearFrom?:EmailValue)=>Promise<MailResult|null>){
  const saved=await request({type:'save',familyId,revision:draft.revision,value:draft.value})
  const version=saved?.drafts.find(d=>d.familyId===familyId)
  if(!version?.revision||!sameEmail(version.value,draft.value))return null
  const reviewed=await request({type:'review',familyId,revision:version.revision,requestId})
  if(!reviewed?.reviewId)return null
  const result=await request({type:'dispatch',reviewId:reviewed.reviewId,confirmed:true})
  const outgoing=result?.outgoing?.find(o=>o.familyId===familyId&&o.draftRevision===version.revision)
  if(!outgoing)return null
  if(outgoing.state==='accepted'){
    // CAS protects a draft edited in another tab. The client separately preserves
    // text typed while this snapshot was being submitted.
    const cleared=await request({type:'save',familyId,revision:version.revision,value:{...version.value,body:'',paymentRequestId:null,attachmentIds:[]}},version.value)
    return {state:outgoing.state,cleared:!!cleared}
  }
  return {state:outgoing.state,cleared:false}
}
