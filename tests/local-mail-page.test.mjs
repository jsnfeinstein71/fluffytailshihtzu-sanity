import './register-typescript.mjs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
const {default:page}=await import('../app/inbox/mail/page.tsx')

test('the real-mail interface is local-companion only; hosting or a missing explicit local flag returns not-found',()=>{
  const previous={VERCEL:process.env.VERCEL,FLUFFYTAIL_LOCAL_MAIL_UI:process.env.FLUFFYTAIL_LOCAL_MAIL_UI}
  try{
    delete process.env.VERCEL;delete process.env.FLUFFYTAIL_LOCAL_MAIL_UI
    assert.throws(()=>page(),/NEXT_HTTP_ERROR_FALLBACK;404/)
    process.env.FLUFFYTAIL_LOCAL_MAIL_UI='1';assert.ok(page())
    process.env.VERCEL='1';assert.throws(()=>page(),/NEXT_HTTP_ERROR_FALLBACK;404/)
  }finally{for(const [key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value}}
})
