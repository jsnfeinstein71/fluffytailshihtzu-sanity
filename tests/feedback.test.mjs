import './register-typescript.mjs'
import assert from 'node:assert/strict'
import {beforeEach,test} from 'node:test'
import {randomUUID} from 'node:crypto'
import sharp from 'sharp'
import {workspaceStoreFixture} from './workspace-store-fixture.mjs'
const service=await import('../sanity/lib/feedback.ts')
const {workspaceId}=await import('../sanity/lib/workspace.ts')
const {reviewFamily,manageFamily}=await import('../sanity/lib/family-lifecycle.ts')
const staff=await import('../app/inbox/workspace/api/feedback/route.ts')
const customer=await import('../app/api/feedback/route.ts')
const publicPhoto=await import('../app/api/feedback/photo/[id]/route.ts')
const privatePhoto=await import('../app/inbox/workspace/api/feedback/photo/[id]/route.ts')
const id='inquiry-'+'a'.repeat(64),other='inquiry-'+'b'.repeat(64),origin='http://localhost:3100'
const auth='Basic '+Buffer.from('fixture-operator:fixture-only-password').toString('base64')
const family=key=>({_id:workspaceId(key),_rev:'seed-'+key,_type:'staffFamily',schemaVersion:1,workspace:'review-v1',familyKey:key,profile:{id:key,name:'Fictional Morgan Family',initials:'FM',email:key+'@example.test',phone:'',preference:'Email',smsConsent:false,stage:'New inquiry',next:'Review',records:[],messages:[]},drafts:{Email:'Keep my unsent note',Text:''},notes:[],checks:[]})
let store
beforeEach(()=>{
 Object.assign(process.env,{VERCEL_ENV:'preview',NEXT_PUBLIC_SANITY_PROJECT_ID:'gu1xkpsg',NEXT_PUBLIC_SANITY_DATASET:'synthetic',INBOX_BASIC_AUTH_USER:'fixture-operator',INBOX_BASIC_AUTH_PASS:'fixture-only-password',FLUFFYTAIL_WRITE_FREEZE:'0',FLUFFYTAIL_FEEDBACK_ENABLED:'1',FEEDBACK_INVITATION_SECRET:'fixture-feedback-secret-for-local-tests-only-123456789',FEEDBACK_PUBLIC_ORIGIN:origin})
 for(const key of ['STAFF_PASSKEY_MODE','FLUFFYTAIL_LITTER_RESERVATIONS_ENABLED','FLUFFYTAIL_PAYMENT_TEST_WORKSPACE'])delete process.env[key]
 store=workspaceStoreFixture([family(id),family(other)]);globalThis.fixtureOperatorClient=store
 globalThis.fixtureSanityFetch=async(query,params)=>workspaceStoreFixture([...store.documents.values()].filter(d=>!d._id.includes('.'))).fetch(query,params)
})
const invitation=()=>service.createFeedbackInvitation(id,randomUUID())
const token=i=>new URL(i.link).hash.slice(1)
const req=(data,{privateApi=false,headers={}}={})=>new Request(origin+(privateApi?'/inbox/workspace/api/feedback':'/api/feedback'),{method:'POST',headers:{origin,'content-type':'application/json',...(privateApi?{authorization:auth}:{}),...headers},body:JSON.stringify(data)})
const submit=async(i,extra={})=>{assert.equal((await customer.POST(req({action:'submit',token:token(i),feedback:'Our puppy is settled and happy.',displayName:'Morgan F.',puppyName:'Fictional Fern',...extra}))).status,200);return (await service.listFeedback(id)).submissions[0]}
const publish=(s,extra={})=>service.manageFeedback({action:'publish',submissionId:s.id,publicText:s.originalText,displayName:s.displayName,puppyName:s.puppyName,featured:true,order:1,...extra},'jeanne')

test('manual invite uses hashed private credential, fragment bearer and conservative name; repeated creation converges',async()=>{
 const requestId=randomUUID(),a=await service.createFeedbackInvitation(id,requestId),b=await service.createFeedbackInvitation(id,requestId)
 assert.equal(a.link,b.link);assert.equal(new URL(a.link).pathname,'/feedback');assert.equal(new URL(a.link).search,'')
 const saved=store.documents.get(a.invitation.id);assert.equal(saved.tokenHash.length,64);assert.ok(!JSON.stringify(saved).includes(token(a)))
 assert.deepEqual(await service.feedbackStatus(token(a)),{status:'ready',displayName:'Fictional F.',puppyName:''})
 const results=await Promise.all([invitation(),invitation(),invitation()]);assert.ok(results.every(i=>i.link===a.link))
 assert.equal([...store.documents.values()].filter(d=>d._type==='feedbackInvitation').length,1)
 assert.equal(store.documents.get(workspaceId(id)).protectedHistory,true)
 assert.equal(store.documents.get(workspaceId(id)).drafts.Email,'Keep my unsent note')
})

test('competing first invitations share one active invitation and replay recovers the same link',async()=>{
 const [a,b]=await Promise.all([invitation(),invitation()]);assert.equal(a.link,b.link)
 const list=await service.listFeedback(id);assert.equal(list.invitations.length,1);assert.equal(list.invitations[0].status,'open')
 assert.equal((await service.manageFeedback({action:'prepare',invitationId:a.invitation.id},'jason')).link,a.link)
})

test('invalid token is rejected before storage; revocation, expiry, deliberate reissue and cross-family message checks',async()=>{
 const i=await invitation(),reader=store.getDocument;let reads=0;store.getDocument=async(...a)=>{reads++;return reader(...a)}
 assert.deepEqual(await service.feedbackStatus('a'.repeat(64)+'.'+'b'.repeat(43)),{status:'invalid'});assert.equal(reads,0)
 await assert.rejects(service.invitationForMessage(other,i.invitation.id),/different family/)
 await assert.rejects(service.invitationInText(other,'Share: '+i.link),/different family/)
 assert.deepEqual(await service.invitationInText(id,'Share: '+i.link),{id:i.invitation.id})
 await service.manageFeedback({action:'revoke',invitationId:i.invitation.id},'jeanne')
 assert.deepEqual(await service.feedbackStatus(token(i)),{status:'revoked'})
 await assert.rejects(service.invitationForMessage(id,i.invitation.id),/expired or revoked/)
 assert.equal((await service.invitationForDraft(id,i.invitation.id)).status,'revoked')
 const next=await service.manageFeedback({action:'reissue',invitationId:i.invitation.id,requestId:randomUUID()},'jeanne')
 assert.notEqual(next.link,i.link);await store.patch(next.invitation.id).set({expiresAt:'2000-01-01T00:00:00Z'}).commit()
 assert.deepEqual(await service.feedbackStatus(token(next)),{status:'expired'})
 assert.equal((await customer.POST(req({action:'submit',token:token(next),feedback:'Keep',displayName:'Morgan'}))).status,410)
})

test('submission is atomic once only, preserves exact original and stays private; duplicate retry cannot replace it',async()=>{
 const i=await invitation(),original='  First line.\n\nOur puppy’s home.  '
 const responses=await Promise.all([customer.POST(req({action:'submit',token:token(i),feedback:original,displayName:'Morgan F.'})),customer.POST(req({action:'submit',token:token(i),feedback:original,displayName:'Morgan F.'}))])
 assert.deepEqual(responses.map(r=>r.status),[200,200]);const s=(await service.listFeedback(id)).submissions[0]
 assert.equal(s.originalText,original);assert.equal(s.state,'private');assert.equal(s.familyId,id)
 assert.equal((await service.listFeedback(id)).submissions.length,1);assert.deepEqual(await service.listPublicStories(),[])
 assert.deepEqual(await service.feedbackStatus(token(i)),{status:'used'})
 assert.equal((await customer.POST(req({action:'submit',token:token(i),feedback:'Overwrite',displayName:'Other'}))).status,200)
 assert.equal((await service.listFeedback(id)).submissions[0].originalText,original)
})

test('revocation winning a submission race prevents submission without losing the invitation history',async()=>{
 const i=await invitation();store.beforeNextPatch(async()=>{await store.patch(i.invitation.id).set({revokedAt:new Date().toISOString()}).commit()})
 const response=await customer.POST(req({action:'submit',token:token(i),feedback:'Not committed',displayName:'Morgan F.'}))
 assert.equal(response.status,409);assert.equal((await service.listFeedback(id)).submissions.length,0);assert.equal((await service.feedbackStatus(token(i))).status,'revoked')
})

test('publish edits only public copy, records named actor, features/reorders; archive never hides story; unpublish removes projection',async()=>{
 const i=await invitation(),s=await submit(i);await publish(s,{publicText:'Our puppy is happy.',order:3})
 const publicStories=await service.listPublicStories();assert.equal(publicStories.length,1);assert.equal(publicStories[0].text,'Our puppy is happy.');assert.equal(publicStories[0].featured,true)
 const raw=store.documents.get(publicStories[0].id);for(const field of ['familyId','invitationId','originalText','provenance','tokenHash','history','email','phone'])assert.ok(!(field in raw))
 const privateStory=(await service.listFeedback(id)).submissions[0];assert.equal(privateStory.originalText,s.originalText);assert.equal(privateStory.history[0].actor,'jeanne')
 await manageFamily({action:'archive',familyId:id,token:(await reviewFamily(id)).token});assert.equal((await service.listPublicStories()).length,1)
 const review=await reviewFamily(id);assert.ok(review.blocked.some(b=>/Feedback invitations/.test(b)));assert.equal(store.documents.get(workspaceId(id)).drafts.Email,'Keep my unsent note')
 await service.manageFeedback({action:'unpublish',submissionId:s.id},'jason');assert.deepEqual(await service.listPublicStories(),[])
 assert.equal((await service.listFeedback(id)).submissions[0].history.at(-1).actor,'jason');assert.equal(store.documents.has(raw._id),false)
})

test('photo is decoded, metadata stripped only in derivative, original stays private and unpublish removes photo access',async()=>{
 const bytes=await sharp({create:{width:30,height:20,channels:3,background:'#ccaa88'}}).jpeg().withMetadata({exif:{IFD0:{Artist:'Private photographer',ImageDescription:'Private metadata'}}}).toBuffer()
 const photo={contentBase64:bytes.toString('base64'),contentType:'image/jpeg',filename:'private-family-photo.jpg'},i=await invitation(),s=await submit(i,{photo})
 const stored=store.documents.get(s.id);assert.equal(stored.photo.originalBase64,photo.contentBase64);assert.ok((await sharp(bytes).metadata()).exif)
 assert.equal((await sharp(Buffer.from(stored.photo.derivativeBase64,'base64')).metadata()).exif,undefined)
 assert.equal(await service.publicFeedbackPhoto(stored.publicId),null)
 const context={params:Promise.resolve({id:s.id})};assert.equal((await privatePhoto.GET(new Request(origin+s.photoUrl),context)).status,401)
 const authenticated=await privatePhoto.GET(new Request(origin+s.photoUrl+'?original=1',{headers:{authorization:auth}}),context);assert.equal(authenticated.status,200);assert.equal(Buffer.from(await authenticated.arrayBuffer()).compare(bytes),0)
 await publish(s);const response=await publicPhoto.GET(new Request(origin+'/api/feedback/photo/'+stored.publicId),{params:Promise.resolve({id:stored.publicId})});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store')
 assert.equal(await service.publicFeedbackPhoto(s.id),null)
 await service.manageFeedback({action:'unpublish',submissionId:s.id},'jeanne');assert.equal((await publicPhoto.GET(new Request(origin),{params:Promise.resolve({id:stored.publicId})})).status,404)
 assert.equal(store.documents.get(s.id).photo.originalBase64,photo.contentBase64)
})

test('malformed, oversize and mismatched image types do not consume invitation',async()=>{
 const i=await invitation()
 for(const photo of [{contentType:'image/svg+xml',contentBase64:Buffer.from('<svg/>').toString('base64')},{contentType:'image/png',contentBase64:Buffer.from('not a photo').toString('base64')},{contentType:'image/jpeg',contentBase64:'A'.repeat(3_400_000)}]){
  const response=await customer.POST(req({action:'submit',token:token(i),feedback:'Keep my draft',displayName:'Morgan F.',photo}));assert.equal(response.status,400)
 }
 assert.equal((await service.feedbackStatus(token(i))).status,'ready');assert.equal((await service.listFeedback(id)).submissions.length,0)
})

test('imports are private and idempotent by provenance, preserve exact original/date and cannot publish without rights',async()=>{
 const input={source:'owner-permitted-export',sourceId:'source-42',originalUrl:'https://example.test/original',attribution:'Morgan F.',permissionNote:'Awaiting customer permission',publicationAllowed:false,originalText:' Exact source wording. ',originalDate:null,displayName:'Morgan F.'}
 const a=await service.importFeedback(input,'jeanne'),b=await service.importFeedback(input,'jeanne');assert.equal(a.id,b.id);assert.equal(a.originalDate,null);assert.equal(a.originalText,input.originalText);assert.equal(a.familyId,undefined)
 await assert.rejects(service.importFeedback({...input,originalText:'Edited original'},'jeanne'),/different original/)
 await assert.rejects(service.importFeedback({...input,sourceId:'bad-family',familyId:'inquiry-'+'c'.repeat(64)},'jeanne'),/no longer available/)
 await assert.rejects(service.importFeedback({...input,familyId:id},'jeanne'),/family association/)
 assert.equal((await service.importFeedback({...input,publicationAllowed:true,permissionNote:'Changed retry'},'jeanne')).publicationAllowed,false)
 await assert.rejects(publish(a),/permission/);assert.deepEqual(await service.listPublicStories(),[])
 assert.equal((await service.listFeedback()).submissions.length,1)
})

test('staff APIs require authentication and same-origin; customer cannot publish; feature guards and freeze fail closed',async()=>{
 assert.equal((await staff.GET(new Request(origin+'/inbox/workspace/api/feedback'))).status,401)
 assert.equal((await staff.POST(req({action:'invite',familyId:id,requestId:randomUUID()},{privateApi:true,headers:{origin:'https://hostile.example'}}))).status,403)
 assert.equal((await customer.POST(req({action:'publish'}))).status,400)
 assert.equal((await customer.POST(req({action:'status',token:'x'},{headers:{origin:'https://hostile.example'}}))).status,403)
 process.env.FLUFFYTAIL_WRITE_FREEZE='1';assert.equal((await staff.POST(req({action:'invite',familyId:id,requestId:randomUUID()},{privateApi:true}))).status,503)
 process.env.FLUFFYTAIL_WRITE_FREEZE='0';process.env.FLUFFYTAIL_FEEDBACK_ENABLED='0';assert.equal((await customer.POST(req({action:'status',token:'x'}))).status,503)
 process.env.FLUFFYTAIL_FEEDBACK_ENABLED='1';process.env.NEXT_PUBLIC_SANITY_PROJECT_ID='3glz6dkx';assert.equal((await customer.POST(req({action:'status',token:'x'}))).status,503);assert.deepEqual(await service.listPublicStories(),[])
})

test('import preserves known date precision and rejects ambiguous or nonexistent calendar dates',async()=>{
 const base={source:'owner-export',attribution:'Morgan F.',permissionNote:'Owner has written permission',publicationAllowed:true,originalText:'Exact source words.',displayName:'Morgan F.'}
 for(const date of [null,'2025-09','2024-02-29','2025-09-18T14:30:00.000Z','2025-09-18T14:30:00-05:00']){
  const s=await service.importFeedback({...base,sourceId:randomUUID(),originalDate:date},'jeanne');assert.equal(s.originalDate,date);await publish(s);assert.equal((await service.listPublicStories()).find(p=>p.text===s.originalText&&p.originalDate===date)?.originalDate,date)
 }
 for(const date of ['09/10/2025','September 2025','2025','2025-13','2025-02-29','2025-09-18T14:30:00','2025-02-29T14:30:00Z','2025-09-18T24:00:00Z'])await assert.rejects(service.importFeedback({...base,sourceId:randomUUID(),originalDate:date},'jeanne'),/known source month/)
})

test('owner permission is a separate audited idempotent action that preserves originals, private photos and publication state',async()=>{
 const input={source:'Good Dog',sourceId:'fictional-gooddog-story',attribution:'Fictional Morgan F.',permissionNote:'Initial private import; publication authorization not yet recorded.',publicationAllowed:false,originalText:' Exact original customer wording. ',originalDate:'2025-09',displayName:'Morgan F.'}
 const s=await service.importFeedback(input,'jason'),photo={originalBase64:'cHJpdmF0ZS1vcmlnaW5hbA==',derivativeBase64:'cHJpdmF0ZS1kZXJpdmF0aXZl',filename:'private-original.jpg',contentType:'image/jpeg',sha256:'unchanged'}
 await store.patch(s.id).set({photo}).commit();const before=structuredClone(store.documents.get(s.id))
 const note='Owner authorizes use of these customer communications for FluffyTail stories. This records owner approval, not Good Dog approval or customer-specific written consent.'
 const [a,b]=await Promise.all([service.recordImportedFeedbackPermission(s.id,note,'jason'),service.recordImportedFeedbackPermission(s.id,note,'jason')])
 assert.equal(a.publicationAllowed,true);assert.equal(b.publicationAllowed,true)
 const after=store.documents.get(s.id)
 for(const field of ['originalText','displayName','puppyName','originalDate','provenance','publicText','publicDisplayName','publicPuppyName','photo','state','publicId','featured','order','receivedAt'])assert.deepEqual(after[field],before[field],field+' must stay unchanged')
 assert.equal(after.state,'private');assert.equal(after.publicationPermission.basis,'owner-authorization');assert.equal(after.publicationPermission.actor,'jason');assert.equal(after.publicationPermission.note,note)
 assert.equal(after.history.filter(h=>h.action==='owner-publication-authorized').length,1);assert.equal(after.history.at(-1).note,note)
 assert.equal(store.documents.has(after.publicId),false);assert.deepEqual(await service.listPublicStories(),[])
 const revision=after._rev;await service.recordImportedFeedbackPermission(s.id,note,'jason');assert.equal(store.documents.get(s.id)._rev,revision)
 assert.equal((await service.listFeedback()).submissions[0].publicationPermission.note,note)
 for(const actor of ['', 'customer', 'Good Dog', 'preview-operator'])await assert.rejects(service.recordImportedFeedbackPermission(s.id,note,actor),/named FluffyTail owner/)
 await assert.rejects(service.recordImportedFeedbackPermission(s.id,'   ','jeanne'),/check your feedback/)
 const own=await submit(await invitation());await assert.rejects(service.recordImportedFeedbackPermission(own.id,note,'jeanne'),/only to imported feedback/)
})
