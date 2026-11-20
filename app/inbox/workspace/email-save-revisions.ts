import {sameEmail,type EmailDraft,type EmailValue,type MailAction,type TransportAction} from './email-model'

// A queued save can wait behind this browser's autosave. Advance its expected
// revision only through writes this browser actually confirmed. Remote reads
// and conflicts never enter this map, so genuine concurrent edits still fail CAS.
export function createEmailSaveRevisions(){
 const families=new Map<string,Map<string|null,string>>()
 return {
  confirmed(action:MailAction|TransportAction|undefined,draft:EmailDraft|undefined){
   if(action?.type!=='save'||!draft?.revision||draft.familyId!==action.familyId||!sameEmail(action.value,draft.value)||action.revision===draft.revision)return
   const versions=families.get(action.familyId)||new Map<string|null,string>()
   versions.set(action.revision,draft.revision)
   while(versions.size>40)versions.delete(versions.keys().next().value!)
   families.set(action.familyId,versions)
  },
  advance(action:MailAction|TransportAction|undefined,clearFrom?:EmailValue):typeof action{
   if(action?.type!=='save')return action
   // Clearing a sent snapshot must not advance to a newer personal draft.
   if(clearFrom&&!sameEmail(action.value,clearFrom))return action
   const versions=families.get(action.familyId);let revision=action.revision
   const visited=new Set<string|null>()
   while(versions?.has(revision)&&!visited.has(revision)){visited.add(revision);revision=versions.get(revision)!}
   return revision===action.revision?action:{...action,revision}
  },
 }
}
