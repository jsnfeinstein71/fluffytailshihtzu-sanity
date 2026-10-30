import {createClient} from '@sanity/client'
import {readFile,writeFile} from 'node:fs/promises'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'

export const target={projectId:'3glz6dkx',dataset:'production'}
const fields={siteSettings:['homepageHeadline','homepageIntro','serviceArea'],puppy:['name','notes','summary'],litter:['title','summary','description'],dog:['name','bio'],faq:['question','answer']}
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
function idCheck(id){if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,150}$/.test(id))throw Error('Use an explicit published content ID.')}
function docCheck(doc){if(!doc||!fields[doc._type])throw Error('Only existing public content documents are supported.');idCheck(doc._id)}
function changeCheck(type,set,unset){if(!set||typeof set!=='object'||Array.isArray(set)||!Array.isArray(unset)||Object.keys(set).length+unset.length===0)throw Error('Specify exact fields.');if(new Set(unset).size!==unset.length||unset.some(k=>Object.hasOwn(set,k)))throw Error('Fields cannot be both set and unset.');for(const k of [...Object.keys(set),...unset])if(!fields[type]?.includes(k))throw Error('Field outside the public-copy allowlist.');for(const v of Object.values(set))if(typeof v!=='string')throw Error('Copy fields must be strings.')}
export async function contentClient({cliLogin=false}={}){
 let token=process.env.SANITY_CONTENT_TOKEN||process.env.SANITY_API_WRITE_TOKEN||process.env.SANITY_AUTH_TOKEN
 if(!token&&cliLogin){const config=JSON.parse(await readFile(join(homedir(),'.config','sanity','config.json'),'utf8'));token=config.authToken||config.token}
 if(!token)throw Error('Use a secure environment token or the existing Sanity CLI login.')
 return createClient({...target,apiVersion:'2025-01-01',token,useCdn:false,perspective:'raw'})
}
export async function preparePlan(client,input){
 if(!Array.isArray(input.updates)||!input.updates.length||input.updates.length>20)throw Error('Plan one to twenty explicit records.')
 const documents=[],seen=new Set()
 for(const update of input.updates){idCheck(update.id);if(seen.has(update.id))throw Error('Duplicate record.');seen.add(update.id);const doc=await client.getDocument(update.id);docCheck(doc);const set=update.set||{},unset=update.unset||[];changeCheck(doc._type,set,unset);const before=Object.fromEntries([...Object.keys(set),...unset].map(k=>[k,doc[k]??null]));documents.push({id:doc._id,type:doc._type,revision:doc._rev,before,set,unset})}
 const plan={...target,createdAt:new Date().toISOString(),documents};return {...plan,digest:digest(plan)}
}
export async function applyPlan(client,plan,approval){
 const {digest:hash,...core}=plan
 if(core.projectId!==target.projectId||core.dataset!==target.dataset||hash!==digest(core)||approval!==hash)throw Error('Review the exact plan and approve its digest.')
 if(!Array.isArray(core.documents)||!core.documents.length||core.documents.length>20)throw Error('Invalid plan.')
 const config=client.config();if(config.projectId!==target.projectId||config.dataset!==target.dataset||!config.token||config.useCdn)throw Error('Wrong authenticated target.')
 let transaction=client.transaction();const ids=new Set()
 for(const d of core.documents){idCheck(d.id);if(ids.has(d.id))throw Error('Duplicate record.');ids.add(d.id);const current=await client.getDocument(d.id);docCheck(current);changeCheck(current._type,d.set,d.unset);if(current._type!==d.type||current._rev!==d.revision)throw Error('A record changed; prepare a fresh plan.');transaction=transaction.patch(d.id,p=>p.ifRevisionId(d.revision).set(d.set).unset(d.unset))}
 await transaction.commit({visibility:'sync'})
 const results=[];for(const d of core.documents){const doc=await client.getDocument(d.id);for(const [k,v]of Object.entries(d.set))if(doc[k]!==v)throw Error('Readback differs; inspect before retrying.');for(const k of d.unset)if(Object.hasOwn(doc,k))throw Error('Readback differs; inspect before retrying.');results.push({id:d.id,revision:doc._rev,fields:Object.fromEntries(Object.keys(d.set).map(k=>[k,doc[k]]))})}return results
}
export async function readiness(client){
 const [me,project,docs]=await Promise.all([client.users.getById('me'),client.projects.getById(target.projectId),client.fetch('*[_type=="siteSettings" && !(_id in path("drafts.**"))][0...10]{_id,_rev}')])
 const membership=project.members?.find(m=>m.id===me.id)
 const roles=membership?.roles?.map(r=>typeof r==='string'?r:r.name)||[membership?.role].filter(Boolean)
 return {...target,authenticatedReadVerified:true,publishedSettingsCount:docs.length,projectRoles:roles,writePermissionEvidence:roles.includes('administrator')?'Existing authenticated project administrator role grants dataset read/write; no write attempted.':'Role not sufficient to conclude write access from this check.',actualWriteTested:false}
}
async function main(){
 const args=process.argv.slice(2),command=args.shift(),get=key=>args.includes(key)?args[args.indexOf(key)+1]:undefined,client=await contentClient({cliLogin:args.includes('--cli-login')})
 if(command==='check')return console.log(JSON.stringify(await readiness(client),null,2))
 if(command==='read'){const id=get('--id');idCheck(id);const doc=await client.getDocument(id);docCheck(doc);return console.log(JSON.stringify(doc,null,2))}
 if(command==='list'){const type=get('--type');if(!fields[type])throw Error('Choose a public content type.');return console.log(JSON.stringify(await client.fetch('*[_type==$type && !(_id in path("drafts.**")) && !(_id in path("versions.**"))][0...100]{_id,_rev,_type,name,title}',{type}),null,2))}
 if(command==='plan'){const input=JSON.parse(await readFile(get('--input'),'utf8')),plan=await preparePlan(client,input);await writeFile(get('--out'),JSON.stringify(plan,null,2),{flag:'wx'});return console.log(JSON.stringify(plan,null,2))}
 if(command==='apply'){const plan=JSON.parse(await readFile(get('--plan'),'utf8'));return console.log(JSON.stringify(await applyPlan(client,plan,get('--approve')),null,2))}
 throw Error('Use check, read, list, plan or apply.')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Sanity content command failed. Check secure credentials, the target, allowed fields and current plan revisions. No automatic retry was made.');process.exitCode=1})
