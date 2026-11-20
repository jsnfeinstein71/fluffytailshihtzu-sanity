import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

const {default: FamilyStories, FamilyStory} = await import('../app/components/FamilyStories.tsx')
const {default: FeedbackPage, metadata} = await import('../app/feedback/page.tsx')
const story = {
  id: 'family-story-' + 'a'.repeat(64), text: 'Our fictional puppy settled in beautifully.\nA second paragraph.',
  displayName: 'Casey R.', puppyName: 'Clover', originalDate: '2026-11-10T12:00:00.000Z', featured: true, order: 1,
}

test('public story renders customer wording and date, omits private fields and links only to native collection', () => {
  const html = renderToStaticMarkup(React.createElement(FamilyStory, {
    story: {...story, familyId: 'private.family.secret', email: 'secret@example.test', originalText: 'PRIVATE-ORIGINAL', token: 'PRIVATE-TOKEN', provenance: {originalUrl: 'https://gooddog.com/private-source'}}, linkToCollection: true,
  }))
  assert.match(html, /Our fictional puppy settled in beautifully/)
  assert.match(html, /A second paragraph/)
  assert.match(html, /Casey R\./)
  assert.match(html, /With Clover/)
  assert.match(html, /November 10, 2026/)
  assert.match(html, /href="\/our-families#story-family-story-/)
  assert.doesNotMatch(html, /private\.family|secret@example|PRIVATE-ORIGINAL|PRIVATE-TOKEN|gooddog|verified|approved|rating|<img/i)
})

test('optional public photo has no private original URL and text is rendered safely', () => {
  const html = renderToStaticMarkup(React.createElement(FamilyStory, {story: {
    ...story, text: '<script>alert("never")</script>', originalDate: null,
    photoUrl: '/api/feedback/photo/' + story.id,
  }}))
  assert.match(html, /src="\/api\/feedback\/photo\/family-story-/)
  assert.match(html, /loading="lazy"/)
  assert.match(html, /&lt;script&gt;/)
  assert.doesNotMatch(html, /<script|<time|cloudfront|cdn\.sanity/)
})

test('empty public collection has no fabricated quote, rating or marketplace fallback', () => {
  const html = renderToStaticMarkup(React.createElement(FamilyStories, {stories: []}))
  assert.match(html, /This is where our families can share/)
  assert.match(html, /href="\/contact"/)
  assert.doesNotMatch(html, /blockquote|Good Dog|gooddog|selected|filtered|approved|verified|stars|rating/i)
})

test('invitation page sends no customer form or token in server-rendered HTML before validation', () => {
  const html = renderToStaticMarkup(React.createElement(FeedbackPage))
  assert.match(html, /Opening your invitation/)
  assert.doesNotMatch(html, /<form|<textarea|<input|private\.feedback|token/i)
  assert.equal(metadata.robots.index, false)
  assert.equal(metadata.robots.follow, false)
  assert.equal(metadata.referrer, 'no-referrer')
})
