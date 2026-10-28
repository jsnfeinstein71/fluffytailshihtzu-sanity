import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const {getPuppyProfilePortrait} = await import('../lib/puppy-portraits.ts')
const {default: PuppyCard} = await import('../app/components/PuppyCard.tsx')
const {default: PuppyDetailPage} = await import('../app/puppies/[slug]/page.tsx')

test('the first cutout only belongs to Elsie Girl 2 and yields to a newer CMS photo', () => {
  const puppy = {
    _id: '136dcb97-3aaf-41dd-9a5d-b5fe194d629e',
    photoUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/3fa2bdd49dd9673a24c8a16ead795e9bb514b52b-2048x1984.jpg',
  }
  assert.equal(getPuppyProfilePortrait(puppy), '/puppies/elsie-girl2-profile-v2.png')
  assert.equal(getPuppyProfilePortrait({...puppy, _id: 'a-different-girl-2'}), null)
  assert.equal(getPuppyProfilePortrait({...puppy, photoUrl: 'https://example.com/newer-photo.jpg'}), null)
  assert.equal(getPuppyProfilePortrait({...puppy, photoUrl: null}), null)
})

test('home cards, browsing cards and the detail page agree on the approved image and separate shadow', async () => {
  const puppy = {
    _id: '136dcb97-3aaf-41dd-9a5d-b5fe194d629e',
    photoUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/3fa2bdd49dd9673a24c8a16ead795e9bb514b52b-2048x1984.jpg',
    slug: 'girl-2-1', name: 'Girl 2', status: 'available', sex: 'female',
    litterStatus: 'current', litterPrice: 1600, litterDeposit: 400,
  }
  globalThis.fixtureSanityFetch = async () => puppy
  const html = [
    ...[false, true].map(browsing => renderToStaticMarkup(createElement(PuppyCard, {puppy, browsing}))),
    renderToStaticMarkup(await PuppyDetailPage({params: Promise.resolve({slug: puppy.slug})})),
  ]
  for (const output of html) {
    assert.match(output, /src="\/puppies\/elsie-girl2-profile-v2.png"/)
    assert.match(output, /width="1254" height="1254"/)
    assert.match(output, /class="puppy-ground-shadow" aria-hidden="true"/)
    assert.match(output, /Girl 2/)
    assert.match(output, /Available/)
    assert.match(output, /\$1,600/)
    assert.doesNotMatch(output, /src="https:\/\/cdn.sanity.io/)
  }
  const other = renderToStaticMarkup(createElement(PuppyCard, {puppy: {...puppy, _id: 'another-puppy'}}))
  assert.match(other, /src="https:\/\/cdn.sanity.io/)
  assert.doesNotMatch(other, /puppy-ground-shadow|puppyImageWrap-cutout/)
})
