import {execFile} from 'node:child_process'
import {requireLocalMailboxAccess} from './connection-check.mjs'

export function openProtectedPassword(protectedPassword){
  requireLocalMailboxAccess()
  if(typeof protectedPassword!=='string'||!/^01000000[a-f0-9]{100,}$/i.test(protectedPassword))throw new Error('The encrypted mailbox credential is invalid. Use the secure local setup window.')
  const command=`$ErrorActionPreference='Stop'; Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Security/Microsoft.PowerShell.Security.psd1') -ErrorAction Stop; [Console]::InputEncoding=[Text.UTF8Encoding]::new($false); [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $encrypted=[Console]::In.ReadToEnd(); $secure=ConvertTo-SecureString -String $encrypted; $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure); try {[Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer))} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer); $secure.Dispose()}`
  return new Promise((resolve,reject)=>{
    const child=execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{encoding:null,windowsHide:true,timeout:10000,maxBuffer:16000},(error,stdout)=>{
      if(error){stdout?.fill(0);reject(new Error('The encrypted mailbox credential could not be opened by this Windows user.'));return}
      resolve(stdout)
    })
    child.stdin.on('error',()=>{})
    child.stdin.end(protectedPassword)
  })
}
