import assert from 'node:assert/strict'
import {test} from 'node:test'
import {execFile} from 'node:child_process'
import {openProtectedPassword} from '../scripts/mail/windows-credential.mjs'

test('Windows encrypted credential pipe preserves Unicode and whitespace without files or secret arguments',{skip:process.platform!=='win32'},async()=>{
  const previous=process.env.VERCEL_ENV
  delete process.env.VERCEL_ENV
  try{
    const fixture='offline-fixture-é-中-end '
    const command=`$ErrorActionPreference='Stop'; Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Security/Microsoft.PowerShell.Security.psd1') -ErrorAction Stop; [Console]::InputEncoding=[Text.UTF8Encoding]::new($false); $inputValue=[Console]::In.ReadToEnd(); $secure=ConvertTo-SecureString -String $inputValue -AsPlainText -Force; try {[Console]::Out.Write((ConvertFrom-SecureString -SecureString $secure))} finally {$secure.Dispose()}`
    const encrypted=await new Promise((resolve,reject)=>{
      const child=execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{windowsHide:true,encoding:'utf8',timeout:10000},(error,stdout)=>error?reject(new Error('Fixture encryption failed')):resolve(stdout))
      child.stdin.end(fixture)
    })
    const bytes=await openProtectedPassword(encrypted)
    try{assert.equal(bytes.toString('utf8'),fixture)}finally{bytes.fill(0)}
    assert.throws(()=>openProtectedPassword('not-an-encrypted-credential'),/invalid/)
  }finally{if(previous===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=previous}
})
