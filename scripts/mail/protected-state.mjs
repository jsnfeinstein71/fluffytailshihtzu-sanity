import {execFile} from 'node:child_process'
import {readFile,writeFile,rename} from 'node:fs/promises'
import {requireLocalMailboxAccess} from './connection-check.mjs'

// Windows DPAPI protects correspondence drafts on disk, not only the password.
export function protectLocalState(value,decrypt=false){
  requireLocalMailboxAccess()
  const script=`$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; [Console]::InputEncoding=[Text.UTF8Encoding]::new($false); [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $value=[Console]::In.ReadToEnd(); $bytes=${decrypt?'[Convert]::FromBase64String($value)':'[Text.Encoding]::UTF8.GetBytes($value)'}; try {$result=[Security.Cryptography.ProtectedData]::${decrypt?'Unprotect':'Protect'}($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write(${decrypt?'[Text.Encoding]::UTF8.GetString($result)':'[Convert]::ToBase64String($result)'})} finally {if($bytes){[Array]::Clear($bytes,0,$bytes.Length)};if($result){[Array]::Clear($result,0,$result.Length)}}`
  return new Promise((resolve,reject)=>{
    const child=execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{encoding:null,windowsHide:true,timeout:15000,maxBuffer:5000000},(error,stdout)=>{if(error){stdout?.fill(0);reject(new Error('The encrypted local email store could not be opened or saved.'));return}const result=stdout.toString('utf8');stdout.fill(0);resolve(result)})
    child.stdin.on('error',()=>{});child.stdin.end(value)
  })
}
export function protectedMailStore(path){
  return {
    async read(){
      let encrypted
      try{encrypted=await readFile(path,'utf8')}catch(error){if(error.code==='ENOENT')return {drafts:[],reviews:[]};throw new Error('The saved local email store is unavailable.')}
      const state=JSON.parse(await protectLocalState(encrypted,true))
      if(!state||!Array.isArray(state.drafts)||!Array.isArray(state.reviews))throw new Error('The saved local email store is invalid; it will not be replaced.')
      return state
    },
    async write(state){const encrypted=await protectLocalState(JSON.stringify(state));await writeFile(path+'.pending',encrypted,{mode:0o600});await rename(path+'.pending',path)},
  }
}
