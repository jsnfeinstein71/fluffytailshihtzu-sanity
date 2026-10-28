import {startRegistration,startAuthentication} from '@simplewebauthn/browser'
export async function accessAction(action:string,input:Record<string,unknown>={}){
  const response=await fetch('/inbox/auth/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...input}),cache:'no-store'})
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Access could not be verified. Please try again.');return data
}
export async function createPasskey(input:Record<string,unknown>){const {options}=await accessAction('register-options',input);const response=await startRegistration({optionsJSON:options});return accessAction('register-verify',{response,label:input.label})}
export async function unlockPasskey(){const {options}=await accessAction('authenticate-options');const response=await startAuthentication({optionsJSON:options});return accessAction('authenticate-verify',{response})}
export function accessError(error:unknown){if(error instanceof Error){if(error.name==='NotAllowedError')return 'The passkey prompt was closed or timed out. Try again when you’re ready.';if(error.name==='InvalidStateError')return 'This device already has that passkey. Choose Unlock workspace.';if(error.name==='NotSupportedError')return 'Use an up-to-date browser with passkey support.';return error.message}return 'Access could not be verified. Please try again.'}
