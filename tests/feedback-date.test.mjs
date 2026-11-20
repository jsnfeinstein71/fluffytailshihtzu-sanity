import './register-typescript.mjs'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const {feedbackSourceDateLabel}=await import('../lib/feedback.ts')
const {default:FeedbackArea}=await import('../app/inbox/workspace/FeedbackArea.tsx')
const {FamilyStory}=await import('../app/components/FamilyStories.tsx')
const submission={id:'private.feedbackSubmission.fixture',originalText:'Original family wording.',displayName:'Avery R.',puppyName:'',receivedAt:'2026-11-20T18:00:00Z',state:'private',publicText:'Original family wording.',publicDisplayName:'Avery R.',publicPuppyName:'',featured:false,order:0,source:'import',publicationAllowed:true,history:[]}

test('staff and public source dates preserve November/August month precision in western timezones',()=>{
 const previous=process.env.TZ
 try{
  for(const zone of ['America/Chicago','Pacific/Honolulu']){
   process.env.TZ=zone
   for(const [originalDate,label] of [['2026-11','November 2026'],['2026-08','August 2026']]){
    assert.equal(feedbackSourceDateLabel(originalDate),label)
    const staff=renderToStaticMarkup(React.createElement(FeedbackArea,{feedback:{data:{invitations:[],submissions:[{...submission,originalDate}]},busy:false,error:''},families:[],outgoing:[],onPrepare:async()=>false,onOpenFamily:()=>{}}))
    const publicStory=renderToStaticMarkup(React.createElement(FamilyStory,{story:{id:'family-story-fixture',text:submission.originalText,displayName:submission.displayName,puppyName:'',originalDate,featured:false,order:0}}))
    assert.ok(staff.includes(label));assert.ok(publicStory.includes(label))
    assert.doesNotMatch(staff,/November 1,|August 1,|October 31|July 31/)
    assert.doesNotMatch(publicStory,/November 1,|August 1,|October 31|July 31/)
   }
  }
 }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous}
})
test('exact source days stay exact and unknown/ambiguous dates remain unknown',()=>{
 assert.equal(feedbackSourceDateLabel('2026-11-01'),'November 1, 2026')
 assert.equal(feedbackSourceDateLabel('2026-08-01'),'August 1, 2026')
 for(const value of [null,undefined,'','11/01/2026','2026-13','2026-02-29'])assert.equal(feedbackSourceDateLabel(value),'')
})
