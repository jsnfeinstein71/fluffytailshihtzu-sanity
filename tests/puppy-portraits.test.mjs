import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const {getPuppyProfilePortrait} = await import('../lib/puppy-portraits.ts')
const {default: PuppyCard} = await import('../app/components/PuppyCard.tsx')
const {default: PuppyDetailPage} = await import('../app/puppies/[slug]/page.tsx')
const {default: PuppyInquiryPage} = await import('../app/puppy-inquiry/page.tsx')

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

test('Girl 1 and Girl 3 keep their own portraits and Reserved status across all placements', async () => {
  const puppies = [
    {
      _id: '54a22bbc-7966-437e-8c0e-0fff6c4d1e8e', name: 'Girl 3', slug: 'girl-3-1',
      photoUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/a8be0cbcda43f32ec769ad6682f067d7b8bb2c93-2048x1778.jpg',
      expectedPortrait: '/puppies/elsie-girl3-profile.png',
    },
    {
      _id: '6e181ad7-3340-4b2f-ba61-91fbd9155ca0', name: 'Girl.1', slug: 'girl-1-1',
      photoUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/3cf72827d25286b55a40fd5b570c07a9e4b7db72-2048x1955.jpg',
      expectedPortrait: '/puppies/elsie-girl1-profile.png',
    },
  ]
  for (const values of puppies) {
    const puppy = {...values, status: 'reserved', litterStatus: 'current', litterPrice: 1600, litterDeposit: 400}
    assert.equal(getPuppyProfilePortrait(puppy), puppy.expectedPortrait)
    assert.equal(getPuppyProfilePortrait({...puppy, photoUrl: 'https://example.com/newer-photo.jpg'}), null)
    assert.equal(getPuppyProfilePortrait({...puppy, _id: 'another-puppy'}), null)
    globalThis.fixtureSanityFetch = async () => puppy
    const outputs = [
      ...[false, true].map(browsing => renderToStaticMarkup(createElement(PuppyCard, {puppy, browsing}))),
      renderToStaticMarkup(await PuppyDetailPage({params: Promise.resolve({slug: puppy.slug})})),
    ]
    for (const html of outputs) {
      assert.ok(html.includes(`src="${puppy.expectedPortrait}"`))
      assert.match(html, /class="puppy-ground-shadow" aria-hidden="true"/)
      assert.match(html, /Reserved/)
      assert.match(html, /\$1,600/)
      assert.doesNotMatch(html, /Request Info About This Puppy/)
    }
  }
})

test('the inquiry thumbnail matches the approved portrait and yields to a newer photo', async () => {
  const puppy = {
    _id: '136dcb97-3aaf-41dd-9a5d-b5fe194d629e',
    photoUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/3fa2bdd49dd9673a24c8a16ead795e9bb514b52b-2048x1984.jpg',
    slug: 'girl-2-1', name: 'Girl 2', status: 'available', litterStatus: 'current',
  }
  const renderInquiry = () => PuppyInquiryPage({searchParams: Promise.resolve({puppySlug: puppy.slug})}).then(renderToStaticMarkup)
  globalThis.fixtureSanityFetch = async () => puppy
  const html = await renderInquiry()
  assert.match(html, /src="\/puppies\/elsie-girl2-profile-v2.png"/)
  assert.doesNotMatch(html, /src="https:\/\/cdn.sanity.io/)
  assert.match(html, /aria-label="Puppy inquiry"/)

  globalThis.fixtureSanityFetch = async () => ({...puppy, photoUrl: 'https://example.com/newer-photo.jpg'})
  assert.match(await renderInquiry(), /src="https:\/\/example.com\/newer-photo.jpg"/)
  globalThis.fixtureSanityFetch = async () => ({...puppy, status: 'reserved'})
  const reserved = await renderInquiry()
  assert.match(reserved, /Girl 2 is unavailable/)
  assert.doesNotMatch(reserved, /aria-label="Puppy inquiry"/)
})
