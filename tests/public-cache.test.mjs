import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const {default:sitemap,revalidate}=await import('../app/sitemap.ts')
test('public cache interval is one hour across page and shared fetch dependencies',()=>{
 for(const file of ['app/page.tsx','app/available-puppies/page.tsx','app/upcoming-litters/page.tsx','app/puppies/[slug]/page.tsx','app/contact/page.tsx','sanity/lib/inventory.ts']){
  const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');assert.doesNotMatch(source,/revalidate\s*[:=]\s*60\b/);assert.match(source,/revalidate\s*[:=]\s*3600\b/)
 }
 assert.equal(revalidate,3600)
})
test('sitemap is deterministic and preserves actual puppy modification times',async()=>{
 globalThis.fixtureSanityFetch=async()=>[{slug:'fixture',_updatedAt:'2026-11-01T12:00:00Z'}]
 const a=await sitemap(),b=await sitemap();assert.deepEqual(a,b)
 assert.ok(a.filter(x=>!x.url.includes('/puppies/')).every(x=>x.lastModified===undefined))
 assert.equal(a.at(-1).lastModified.toISOString(),'2026-11-01T12:00:00.000Z')
})
