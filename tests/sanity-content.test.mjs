import test from 'node:test'
import assert from 'node:assert/strict'
import {preparePlan,applyPlan,readiness,target} from '../scripts/sanity-content.mjs'
function fixture(){
 const docs=new Map([['settings',{_id:'settings',_type:'siteSettings',_rev:'one',homepageIntro:'I am Jeanne. Old copy.',title:'Keep'}],['drafts.settings',{_id:'drafts.settings',_type:'siteSettings',_rev:'draft',homepageIntro:'Unrelated draft'}],['puppy',{_id:'puppy',_type:'puppy',_rev:'p',name:'Puppy',status:'reserved',overridePrice:1600}]])
 let commits=0
 const client={config:()=>({...target,token:'fictional',useCdn:false}),getDocument:async id=>structuredClone(docs.get(id)),transaction(){const changes=[];return {patch(id,fn){const change={id};const p={ifRevisionId(revision){change.revision=revision;return p},set(set){change.set=set;return p},unset(unset){change.unset=unset;return p}};fn(p);changes.push(change);return this},async commit(){for(const c of changes)assert.equal(docs.get(c.id)._rev,c.revision);for(const c of changes){const doc=docs.get(c.id);Object.assign(doc,c.set,{_rev:'new'});for(const k of c.unset)delete doc[k]}commits++}}},users:{getById:async()=>({id:'fixture-owner'})},projects:{getById:async()=>({members:[{id:'fixture-owner',roles:[{name:'administrator'}]}]})},fetch:async()=>[{_id:'settings',_rev:'one'}]}
 return {client,docs,commits:()=>commits}
}
test('content planning is read-only and shows exact old and proposed fields; application preserves everything else',async()=>{
 const f=fixture(),plan=await preparePlan(f.client,{updates:[{id:'settings',set:{homepageIntro:'I am Jeanne. Approved new copy.'}}]})
 assert.equal(f.commits(),0);assert.deepEqual(plan.documents[0].before,{homepageIntro:'I am Jeanne. Old copy.'});assert.equal(plan.documents[0].revision,'one')
 const before=structuredClone([...f.docs]);await applyPlan(f.client,plan,plan.digest);assert.equal(f.commits(),1);assert.equal(f.docs.get('settings').title,'Keep');assert.deepEqual(f.docs.get('drafts.settings'),before.find(([id])=>id==='drafts.settings')[1]);assert.equal(f.docs.get('puppy').status,'reserved');assert.equal(f.docs.get('puppy').overridePrice,1600)
})
test('unapproved fields, draft/private IDs, stale revisions and altered plans cannot write',async()=>{
 const f=fixture();for(const update of [{id:'puppy',set:{status:'available'}},{id:'puppy',set:{overridePrice:'1'}},{id:'drafts.settings',set:{homepageIntro:'Overwrite'}},{id:'private.family.id',set:{name:'Overwrite'}}])await assert.rejects(()=>preparePlan(f.client,{updates:[update]}))
 const plan=await preparePlan(f.client,{updates:[{id:'settings',set:{homepageIntro:'New'}}]});await assert.rejects(()=>applyPlan(f.client,plan,'wrong'));await assert.rejects(()=>applyPlan(f.client,{...plan,documents:[]},plan.digest));f.docs.get('settings')._rev='someone-else-edited';await assert.rejects(()=>applyPlan(f.client,plan,plan.digest));assert.equal(f.commits(),0)
})
test('permission evidence is explicitly distinct from testing a write',async()=>{const f=fixture(),r=await readiness(f.client);assert.equal(r.authenticatedReadVerified,true);assert.deepEqual(r.projectRoles,['administrator']);assert.equal(r.actualWriteTested,false);assert.equal(f.commits(),0)})
