import './register-typescript.mjs'
import {test,beforeEach,afterEach} from 'node:test'
import assert from 'node:assert/strict'
const {finishLocalRegistration,checkLocalPasskey,accessError}=await import('../app/inbox/security/client.ts')
const original={navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator'),publicKey:Object.getOwnPropertyDescriptor(globalThis,'PublicKeyCredential'),fetch:globalThis.fetch}
let calls,attachment,failure,available
const options={rp:{id:'example.test',name:'Fixture staff'},user:{id:'AQIDBA',name:'Fixture owner',displayName:'Fixture owner'},challenge:'AQIDBA',pubKeyCredParams:[{type:'public-key',alg:-7}],authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'required',userVerification:'required'},hints:['client-device']}
beforeEach(()=>{
 calls=[];attachment='platform';failure=null;available=true
 class Credential {static async isUserVerifyingPlatformAuthenticatorAvailable(){return available}}
 Object.defineProperty(globalThis,'PublicKeyCredential',{configurable:true,value:Credential})
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{credentials:{create:async opts=>{calls.push({type:'native-create',options:opts});if(failure)throw failure;return {id:'AQIDBA',rawId:new Uint8Array([1,2,3,4]).buffer,type:'public-key',authenticatorAttachment:attachment,response:{clientDataJSON:new Uint8Array([1,2,3]).buffer,attestationObject:new Uint8Array([1,2,3]).buffer,getTransports:()=>['internal']},getClientExtensionResults:()=>({})}}}}})
 globalThis.fetch=async(url,init)=>{calls.push({type:'request',url,input:JSON.parse(init.body)});return Response.json({owner:'Jeanne',ownerKey:'jeanne'})}
})
afterEach(()=>{for(const [key,descriptor]of [['navigator',original.navigator],['PublicKeyCredential',original.publicKey]]){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}globalThis.fetch=original.fetch})
test('native registration runs immediately on the creation tap before any network request',async()=>{
 const pending=finishLocalRegistration(options,'Fixture phone');assert.equal(calls[0].type,'native-create');assert.equal(calls.length,1);const result=await pending;assert.equal(result.ownerKey,'jeanne');assert.equal(calls[0].options.publicKey.authenticatorSelection.authenticatorAttachment,'platform');assert.deepEqual(calls[0].options.publicKey.hints,['client-device']);assert.equal(calls[1].input.action,'register-verify');assert(!calls.some(c=>c.input?.action==='authenticate-options'))
})
test('a nearby-device response never gets submitted as local-device enrollment',async()=>{attachment='cross-platform';await assert.rejects(()=>finishLocalRegistration(options,'Fixture phone'),/another device/);assert.equal(calls.length,1)})
test('cancelled creation retains the invitation flow and does not call sign-in or verification',async()=>{failure=Object.assign(new Error('cancelled'),{name:'NotAllowedError'});await assert.rejects(()=>finishLocalRegistration(options,'Fixture phone'));assert.equal(calls.length,1);assert.match(accessError(failure,'register'),/does not mean you are enrolled/);assert.match(accessError(failure,'register'),/invitation/);assert.match(accessError(failure,'authenticate'),/does not create a passkey/)})
test('local capability detection reports only availability, not a particular browser provider or biometric',async()=>{assert.equal(await checkLocalPasskey(),true);available=false;assert.equal(await checkLocalPasskey(),false);assert.equal(calls.length,0)})
