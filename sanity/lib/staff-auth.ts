import 'server-only'
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto'
import {generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse} from '@simplewebauthn/server'
import type {RegistrationResponseJSON,AuthenticationResponseJSON,AuthenticatorTransport} from '@simplewebauthn/server'
import {getOperatorClient} from './operator-client'
import {privateRecordId} from './private-records'
import {ownerNames,ownerKey,passkeyConfig,passkeyMode,type OwnerKey} from '@/lib/passkey-config'

const minute=60000,day=86400000
export const sessionCookie='__Host-fluffytail_staff',ceremonyCookie='__Host-fluffytail_ceremony'
export class StaffAuthError extends Error {constructor(message='Access could not be verified. Please try again.',public status=401){super(message)}}
type RecordBase={_id:string;_rev:string;_type:string;scope:string}
type Owner=RecordBase&{key:OwnerKey;handle:string;epoch:number;recoveryHashes:string[];recoveryConfirmedAt?:number;signInVerifiedAt?:number;enrolledAt?:number;disabled?:boolean}
type Credential=RecordBase&{owner:OwnerKey;credentialId:string;publicKey:string;counter:number;transports?:AuthenticatorTransport[];epoch:number;label:string;revokedAt?:number;createdAt:number;lastUsedAt?:number;backedUp:boolean}
type Session=RecordBase&{owner:OwnerKey;epoch:number;createdAt:number;expiresAt:number;seenAt:number;verifiedAt:number;assurance:'passkey'|'recovery';revokedAt?:number;credentialId?:string}
type Invitation=RecordBase&{owner:OwnerKey;expiresAt:number;usedAt?:number;version:number;tokenHash:string}
type Ceremony=RecordBase&{purpose:'register'|'authenticate';challenge:string;expiresAt:number;usedAt?:number;owner?:OwnerKey;sessionId?:string;invitationId?:string;invitationVersion?:number;origin:string}
export type StaffIdentity={session:Session;owner:Owner}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex')
const random=()=>randomBytes(32).toString('base64url')
const client=()=>getOperatorClient()
export const authId=(kind:string,key:string)=>privateRecordId(kind,passkeyConfig().scope+':'+key)
function valid<T extends RecordBase>(doc:T|undefined,type:string):T|undefined{return doc&&doc._type===type&&doc.scope===passkeyConfig().scope?doc:undefined}
async function get<T extends RecordBase>(id:string,type:string){return valid(await client().getDocument<T>(id),type)}
const base=(kind:string,key:string)=>({_id:authId(kind,key),_type:kind,scope:passkeyConfig().scope})
const signature=(body:string)=>createHmac('sha256',passkeyConfig().secret).update('staff-passkey-session-v1:'+body).digest('base64url')
export function readCookie(req:Request,name:string){return req.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1)||''}
export function staffCookieName(){return passkeyConfig().secure?sessionCookie:'fluffytail_staff_dev'}
export function ceremonyCookieName(){return passkeyConfig().secure?ceremonyCookie:'fluffytail_ceremony_dev'}
export function invitationCookieName(){return passkeyConfig().secure?'__Host-fluffytail_invitation':'fluffytail_invitation_dev'}
function tokenBody(value:string){
  if(value.length>150)return
  const [body,mac,...rest]=value.split('.')
  if(rest.length||!body||!mac||!/^[a-zA-Z0-9_-]{43}$/.test(body))return
  const a=Buffer.from(mac),b=Buffer.from(signature(body));if(a.length!==b.length||!timingSafeEqual(a,b))return
  return body
}
export async function getStaffIdentity(req:Request,{recovery=false,fresh=false}={},retried=false) : Promise<StaffIdentity|null> {
  const cfg=passkeyConfig();if(new URL(req.url).origin!==cfg.origin)return null
  const body=tokenBody(readCookie(req,staffCookieName()));if(!body)return null
  const session=await get<Session>(authId('staffSession',hash(body)),'staffSession'),now=Date.now()
  if(!session||session.revokedAt||session.expiresAt<=now||session.seenAt+7*day<=now||session.createdAt>now||!ownerKey(session.owner))return null
  const owner=await get<Owner>(authId('staffOwner',session.owner),'staffOwner')
  if(!owner||owner.disabled||owner.epoch!==session.epoch||!recovery&&session.assurance!=='passkey'||fresh&&session.verifiedAt+5*minute<=now)return null
  if(session.credentialId){const cred=await get<Credential>(authId('staffCredential',session.credentialId),'staffCredential');if(!cred||cred.revokedAt||cred.owner!==owner.key||cred.epoch!==owner.epoch)return null}
  if(!retried&&now-session.seenAt>60*minute){try{await client().patch(session._id).ifRevisionId(session._rev).set({seenAt:now}).commit({visibility:'sync'})}catch(e){
    // Concurrent workspace requests can refresh the same activity timestamp. A
    // revision race rechecks all authorization once; provider failures fail closed.
    if((e as {statusCode?:number}).statusCode===409)return getStaffIdentity(req,{recovery,fresh},true)
    return null
  }}
  return {session,owner}
}
export async function needIdentity(req:Request,opts={recovery:false,fresh:false}){
  const identity=await getStaffIdentity(req,{...opts,fresh:false})
  if(!identity)throw new StaffAuthError('Unlock the workspace to continue.')
  if(opts.fresh&&identity.session.verifiedAt+5*minute<=Date.now())throw new StaffAuthError(identity.session.assurance==='recovery'?'This recovery session expired. Start again with another unused recovery code.':'Unlock with your passkey again before changing access.')
  return identity
}
function newSession(owner:Owner,assurance:Session['assurance'],credentialId?:string){const token=random(),now=Date.now();return {token:token+'.'+signature(token),document:{...base('staffSession',hash(token)),owner:owner.key,epoch:owner.epoch,createdAt:now,seenAt:now,verifiedAt:now,expiresAt:now+30*day,assurance,...(credentialId?{credentialId}:{})}}}

// Persistent CAS counters protect across serverless workers. No raw IP is stored.
export async function limitAuth(req:Request,action:string){
  const ip=process.env.VERCEL?req.headers.get('x-vercel-forwarded-for')||'unknown':req.headers.get('x-forwarded-for')||'local'
  for(const [key,max]of [[`address:${ip}:${action}`,20],[`global:${action}`,200]] as const){
    const bucket=Math.floor(Date.now()/(10*minute)),id=authId('staffRate',hash(key)+':'+bucket)
    await client().createIfNotExists({...base('staffRate',hash(key)+':'+bucket),count:0,expiresAt:(bucket+2)*10*minute})
    let done=false
    for(let attempt=0;attempt<4;attempt++){
      const record=await get<RecordBase&{count:number}>(id,'staffRate');if(!record||record.count>=max)throw new StaffAuthError('Too many attempts. Please wait ten minutes before trying again.',429)
      try{await client().patch(id).ifRevisionId(record._rev).set({count:record.count+1}).commit({visibility:'sync'});done=true;break}catch(e){if((e as {statusCode?:number}).statusCode!==409)throw e}
    }
    if(!done)throw new StaffAuthError('Please wait a moment and try again.',429)
  }
}
export async function inviteOwner(key:OwnerKey){
  if(passkeyMode()!=='transition')throw new StaffAuthError('Initial enrollment has closed.',403)
  const owner=await get<Owner>(authId('staffOwner',key),'staffOwner');if(owner?.enrolledAt)throw new StaffAuthError('This owner is already enrolled. Use their passkey or recovery code.',409)
  const token=random(),id=authId('staffInvitation',key)
  await client().createIfNotExists({...base('staffInvitation',key),owner:key,version:0,expiresAt:0,tokenHash:''})
  const previous=await get<Invitation>(id,'staffInvitation');if(!previous)throw new StaffAuthError()
  await client().patch(id).ifRevisionId(previous._rev).set({tokenHash:hash(token),version:previous.version+1,expiresAt:Date.now()+30*minute,usedAt:0}).commit({visibility:'sync'})
  return {invitation:token,owner:ownerNames[key],expiresInMinutes:30,entry:passkeyConfig().origin+'/inbox/unlock'}
}
function freshCodes(){return Array.from({length:8},()=>randomBytes(16).toString('hex').match(/.{8}/g)!.join('-'))}
const codeHash=(key:OwnerKey,value:string)=>hash(passkeyConfig().scope+':recovery:'+key+':'+value.trim().toLowerCase())
async function ownerCredentials(key:OwnerKey){return client().fetch<Credential[]>('*[_type == "staffCredential" && scope == $scope && owner == $owner]',{scope:passkeyConfig().scope,owner:key},{cache:'no-store'})}
async function saveCeremony(document:Omit<Ceremony,'_id'|'_rev'|'_type'|'scope'|'expiresAt'>){const token=random();await client().create({...base('staffCeremony',hash(token)),...document,expiresAt:Date.now()+5*minute});return token}
async function consumeCeremony(req:Request,purpose:Ceremony['purpose']){
  const token=readCookie(req,ceremonyCookieName());if(!/^[a-zA-Z0-9_-]{43}$/.test(token))throw new StaffAuthError('This sign-in attempt expired. Please start again.')
  const doc=await get<Ceremony>(authId('staffCeremony',hash(token)),'staffCeremony')
  if(!doc||doc.usedAt||doc.expiresAt<=Date.now()||doc.purpose!==purpose||doc.origin!==passkeyConfig().origin)throw new StaffAuthError('This sign-in attempt expired. Please start again.')
  await client().patch(doc._id).ifRevisionId(doc._rev).set({usedAt:Date.now()}).commit({visibility:'sync'})
  return doc
}
function sameTopLevel(response:{response?:{clientDataJSON?:string}}){
  const raw=response?.response?.clientDataJSON;if(typeof raw!=='string'||raw.length>10000)throw new StaffAuthError()
  const data=JSON.parse(Buffer.from(raw,'base64url').toString('utf8'))
  if(data.crossOrigin===true||data.topOrigin!==undefined)throw new StaffAuthError('Open the staff address directly to use your passkey.',403)
}
export async function registrationOptions(req:Request,input:Record<string,unknown>){
  const cfg=passkeyConfig();let owner:Owner|undefined,invitation:Invitation|undefined,identity:StaffIdentity|null=null
  const pending=readCookie(req,invitationCookieName()).split('.')
  if(!input.invitation&&pending.length===2&&pending[0]===input.owner)input={...input,invitation:pending[1]}
  if(typeof input.invitation==='string'&&/^[A-Za-z0-9_-]{43}$/.test(input.invitation)&&ownerKey(input.owner)&&passkeyMode()==='transition'){
    invitation=await get<Invitation>(authId('staffInvitation',input.owner),'staffInvitation')
    if(!invitation||invitation.usedAt||invitation.expiresAt<=Date.now()||invitation.tokenHash!==hash(input.invitation))throw new StaffAuthError('The invitation is invalid or expired. Ask for a fresh invitation.')
    owner=await get<Owner>(authId('staffOwner',input.owner),'staffOwner');if(owner?.enrolledAt)throw new StaffAuthError('This owner is already enrolled.',409)
    if(!owner){await client().createIfNotExists({...base('staffOwner',input.owner),key:input.owner,handle:random(),epoch:1,recoveryHashes:[]});owner=await get<Owner>(authId('staffOwner',input.owner),'staffOwner')}
  }else{identity=await needIdentity(req,{recovery:true,fresh:true});owner=identity.owner}
  if(!owner||owner.disabled)throw new StaffAuthError()
  const credentials=(await ownerCredentials(owner.key)).filter(c=>!c.revokedAt&&c.epoch===owner.epoch)
  if(credentials.length>=10)throw new StaffAuthError('Remove an unused passkey before adding another.',409)
  const options=await generateRegistrationOptions({rpName:'FluffyTail staff',rpID:cfg.rpID,userName:ownerNames[owner.key],userDisplayName:ownerNames[owner.key],userID:Buffer.from(owner.handle,'base64url'),attestationType:'none',supportedAlgorithmIDs:[-7,-257],authenticatorSelection:{residentKey:'required',userVerification:'required'},excludeCredentials:credentials.map(c=>({id:c.credentialId,transports:c.transports})),timeout:120000})
  const ceremony=await saveCeremony({purpose:'register',challenge:options.challenge,owner:owner.key,origin:cfg.origin,...(invitation?{invitationId:invitation._id,invitationVersion:invitation.version}:{}),...(identity?{sessionId:identity.session._id}:{})})
  return {options,ceremony}
}
export async function register(req:Request,input:Record<string,unknown>){
  const cfg=passkeyConfig(),ceremony=await consumeCeremony(req,'register')
  if(!ceremony.owner)throw new StaffAuthError()
  const owner=await get<Owner>(authId('staffOwner',ceremony.owner),'staffOwner');if(!owner||owner.disabled)throw new StaffAuthError()
  let invitation:Invitation|undefined
  if(ceremony.invitationId){invitation=await get<Invitation>(ceremony.invitationId,'staffInvitation');if(passkeyMode()!=='transition'||!invitation||invitation.owner!==owner.key||invitation.usedAt||invitation.expiresAt<=Date.now()||invitation.version!==ceremony.invitationVersion||owner.enrolledAt)throw new StaffAuthError()}
  else{const identity=await needIdentity(req,{recovery:true,fresh:true});if(identity.session._id!==ceremony.sessionId||identity.owner.key!==owner.key)throw new StaffAuthError()}
  sameTopLevel(input.response as RegistrationResponseJSON)
  const verified=await verifyRegistrationResponse({response:input.response as RegistrationResponseJSON,expectedChallenge:ceremony.challenge,expectedOrigin:cfg.origin,expectedRPID:cfg.rpID,requireUserVerification:true,supportedAlgorithmIDs:[-7,-257]})
  if(!verified.verified)throw new StaffAuthError()
  const info=verified.registrationInfo,codes=!owner.recoveryHashes.length?freshCodes():undefined
  const session=newSession(owner,'passkey',info.credential.id),now=Date.now()
  const credential={...base('staffCredential',info.credential.id),owner:owner.key,epoch:owner.epoch,credentialId:info.credential.id,publicKey:Buffer.from(info.credential.publicKey).toString('base64url'),counter:info.credential.counter,transports:info.credential.transports||[],label:typeof input.label==='string'&&input.label.trim()?input.label.trim().slice(0,60):'My passkey',createdAt:now,backedUp:info.credentialBackedUp}
  const tx=client().transaction().create(credential).create(session.document).patch(owner._id,p=>p.ifRevisionId(owner._rev).set({enrolledAt:owner.enrolledAt||now,...(codes?{recoveryHashes:codes.map(c=>codeHash(owner.key,c)),recoveryConfirmedAt:0}:{})}))
  if(invitation)tx.patch(invitation._id,p=>p.ifRevisionId(invitation!._rev).set({usedAt:now}))
  await tx.commit({visibility:'sync'})
  return {token:session.token,codes,owner:ownerNames[owner.key]}
}
export async function authenticationOptions(){const cfg=passkeyConfig();const options=await generateAuthenticationOptions({rpID:cfg.rpID,userVerification:'required',timeout:120000});const ceremony=await saveCeremony({purpose:'authenticate',challenge:options.challenge,origin:cfg.origin});return {options,ceremony}}
export async function authenticate(req:Request,input:Record<string,unknown>){
  const cfg=passkeyConfig(),ceremony=await consumeCeremony(req,'authenticate'),response=input.response as AuthenticationResponseJSON
  if(!response||typeof response.id!=='string'||response.id.length>2000)throw new StaffAuthError()
  sameTopLevel(response)
  const cred=await get<Credential>(authId('staffCredential',response.id),'staffCredential');if(!cred||cred.revokedAt)throw new StaffAuthError()
  const owner=await get<Owner>(authId('staffOwner',cred.owner),'staffOwner');if(!owner||owner.disabled||owner.epoch!==cred.epoch||response.response.userHandle&&response.response.userHandle!==owner.handle)throw new StaffAuthError()
  const result=await verifyAuthenticationResponse({response,expectedChallenge:ceremony.challenge,expectedOrigin:cfg.origin,expectedRPID:cfg.rpID,credential:{id:cred.credentialId,publicKey:Buffer.from(cred.publicKey,'base64url'),counter:cred.counter,transports:cred.transports},requireUserVerification:true})
  if(!result.verified)throw new StaffAuthError()
  const now=Date.now(),session=newSession(owner,'passkey',cred.credentialId)
  await client().transaction().patch(cred._id,p=>p.ifRevisionId(cred._rev).set({counter:result.authenticationInfo.newCounter,lastUsedAt:now,backedUp:result.authenticationInfo.credentialBackedUp})).patch(owner._id,p=>p.ifRevisionId(owner._rev).set({signInVerifiedAt:now})).create(session.document).commit({visibility:'sync'})
  return {token:session.token,needsRecovery:!owner.recoveryConfirmedAt}
}
export async function recover(input:Record<string,unknown>){
  if(!ownerKey(input.owner)||typeof input.code!=='string'||input.code.length>100)throw new StaffAuthError()
  const owner=await get<Owner>(authId('staffOwner',input.owner),'staffOwner'),value=codeHash(input.owner,input.code)
  if(!owner||owner.disabled||!owner.recoveryHashes.includes(value))throw new StaffAuthError('Recovery could not be verified. Check the owner and unused code.')
  // A lost-phone recovery invalidates every previous session and credential epoch.
  const updated={...owner,epoch:owner.epoch+1,recoveryHashes:owner.recoveryHashes.filter(c=>c!==value)},session=newSession(updated,'recovery')
  await client().transaction().patch(owner._id,p=>p.ifRevisionId(owner._rev).set({epoch:updated.epoch,recoveryHashes:updated.recoveryHashes,signInVerifiedAt:0})).create(session.document).commit({visibility:'sync'})
  return {token:session.token}
}
export async function securityStatus(req:Request){
  const identity=await needIdentity(req,{recovery:true,fresh:false}),now=Date.now(),creds=await ownerCredentials(identity.owner.key)
  const sessions=await client().fetch<Session[]>('*[_type == "staffSession" && scope == $scope && owner == $owner && expiresAt > $now && !defined(revokedAt)] | order(createdAt desc)[0...50]',{scope:passkeyConfig().scope,owner:identity.owner.key,now},{cache:'no-store'})
  const owners=await client().fetch<Owner[]>('*[_type == "staffOwner" && scope == $scope]',{scope:passkeyConfig().scope},{cache:'no-store'})
  return {owner:ownerNames[identity.owner.key],key:identity.owner.key,recoveryOnly:identity.session.assurance==='recovery',recoveryConfirmed:!!identity.owner.recoveryConfirmedAt,recoveryRemaining:identity.owner.recoveryHashes.length,fresh:identity.session.verifiedAt+5*minute>now,credentials:creds.filter(c=>!c.revokedAt&&c.epoch===identity.owner.epoch).map(c=>({id:c._id,label:c.label,createdAt:c.createdAt,lastUsedAt:c.lastUsedAt,current:c.credentialId===identity.session.credentialId})),sessions:sessions.filter(s=>s.epoch===identity.owner.epoch).map(s=>({id:s._id,createdAt:s.createdAt,seenAt:s.seenAt,current:s._id===identity.session._id})),owners:Object.entries(ownerNames).map(([key,name])=>{const o=owners.find(o=>o.key===key);return {key,name,enrolled:!!o?.enrolledAt,signedIn:!!o?.signInVerifiedAt,recoveryVerified:!!o?.recoveryConfirmedAt}}),mode:passkeyMode()}
}
export async function manageAccess(req:Request,input:Record<string,unknown>){
  if(input.action==='logout'){const i=await getStaffIdentity(req,{recovery:true});if(i)await client().patch(i.session._id).ifRevisionId(i.session._rev).set({revokedAt:Date.now()}).commit({visibility:'sync'});return {signedOut:true}}
  const {owner,session}=await needIdentity(req,{recovery:true,fresh:true})
  if(input.action==='confirm-recovery'){
    if(session.assurance!=='passkey'||typeof input.code!=='string'||input.code.length>100)throw new StaffAuthError()
    const value=codeHash(owner.key,input.code);if(!owner.recoveryHashes.includes(value))throw new StaffAuthError('Enter one of your saved, unused recovery codes.')
    await client().patch(owner._id).ifRevisionId(owner._rev).set({recoveryConfirmedAt:Date.now(),recoveryHashes:owner.recoveryHashes.filter(c=>c!==value)}).commit({visibility:'sync'});return {ok:true}
  }
  if(input.action==='rotate-recovery'){
    if(session.assurance!=='passkey')throw new StaffAuthError()
    const codes=freshCodes();await client().patch(owner._id).ifRevisionId(owner._rev).set({recoveryHashes:codes.map(c=>codeHash(owner.key,c)),recoveryConfirmedAt:0}).commit({visibility:'sync'});return {codes}
  }
  if(input.action==='revoke-passkey'){
    const credentials=(await ownerCredentials(owner.key)).filter(c=>!c.revokedAt&&c.epoch===owner.epoch)
    const target=credentials.find(c=>c._id===input.id)
    if(session.assurance!=='passkey'||!target)throw new StaffAuthError()
    if(credentials.length<2)throw new StaffAuthError('Add a replacement passkey before removing your last one.',409)
    // The owner revision serializes concurrent last-key revocations.
    await client().transaction().patch(owner._id,p=>p.ifRevisionId(owner._rev).set({accessUpdatedAt:Date.now()})).patch(target._id,p=>p.ifRevisionId(target._rev).set({revokedAt:Date.now()})).commit({visibility:'sync'});return {ok:true,signedOut:target.credentialId===session.credentialId}
  }
  if(input.action==='revoke-session'){
    if(typeof input.id!=='string')throw new StaffAuthError()
    const target=await get<Session>(input.id,'staffSession');if(!target||target.owner!==owner.key)throw new StaffAuthError()
    await client().patch(target._id).ifRevisionId(target._rev).set({revokedAt:Date.now()}).commit({visibility:'sync'});return {ok:true,signedOut:target._id===session._id}
  }
  throw new StaffAuthError('Choose an available access action.',400)
}
