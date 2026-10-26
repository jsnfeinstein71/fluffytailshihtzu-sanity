import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {protectedMailStore} from '../scripts/mail/protected-state.mjs'

test('local correspondence store is Windows-user encrypted on disk and reopened without plaintext files',{skip:process.platform!=='win32'},async()=>{
  const previous=process.env.VERCEL_ENV
  delete process.env.VERCEL_ENV
  const directory=await mkdtemp(join(tmpdir(),'fluffytail-mail-state-'))
  const store=protectedMailStore(join(directory,'fictional.dpapi'))
  const data={drafts:[{body:'Fictional private draft — café 🐾'}],reviews:[]}
  try{
    assert.deepEqual(await store.read(),{drafts:[],reviews:[]})
    await store.write(data)
    const disk=await readFile(join(directory,'fictional.dpapi'),'utf8')
    assert.doesNotMatch(disk,/Fictional|private|café/)
    assert.deepEqual(await store.read(),data)
  }finally{await rm(directory,{recursive:true,force:true});if(previous===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=previous}
})
