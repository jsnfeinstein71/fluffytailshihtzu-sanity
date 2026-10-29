import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {imageSources} from './image-source-helpers.mjs'
const {getSanityImageProps} = await import('../lib/responsive-images.ts')
const {default: PublicImage} = await import('../app/components/PublicImage.tsx')
const {default: LitterTile} = await import('../app/components/LitterTile.tsx')

const original = 'https://cdn.sanity.io/images/3glz6dkx/production/3fa2bdd49dd9673a24c8a16ead795e9bb514b52b-2048x1984.jpg'

test('responsive Sanity variants preserve source identity and aspect ratio without crops, backgrounds or upscaling', () => {
  for (const source of [original, original.replace('2048x1984.jpg', '500x480.png'), original.replace('2048x1984.jpg', '40x30.webp')]) {
    const props = getSanityImageProps(source)
    assert.ok(props)
    const candidates = props.srcSet.split(', ')
    assert.ok(candidates.length > 0)
    for (const candidate of candidates) {
      const [rawUrl, descriptor] = candidate.split(' ')
      const url = new URL(rawUrl)
      assert.equal(url.origin + url.pathname, source)
      assert.deepEqual([...url.searchParams.keys()], ['w', 'fit', 'auto'])
      assert.equal(url.searchParams.get('fit'), 'max')
      assert.equal(url.searchParams.get('auto'), 'format')
      assert.equal(descriptor, `${url.searchParams.get('w')}w`)
      assert.ok(Number(url.searchParams.get('w')) <= props.width)
    }
    assert.equal(new Set(candidates).size, candidates.length)
  }
})

test('custom transforms and unknown image providers retain their original URLs', () => {
  for (const source of [original + '?rect=0,0,400,300', original + '#fragment', original.replace('https:', 'http:'), original.replace('cdn.sanity.io', 'cdn.sanity.io.example.com'), '/new-photo.jpg', 'not a URL']) {
    assert.equal(getSanityImageProps(source), null)
  }
  const src = 'https://example.com/future-photo.jpg?crop=approved'
  const html = renderToStaticMarkup(createElement(PublicImage, {src, alt: 'Future puppy photo', sizes: '100vw'}))
  assert.deepEqual(imageSources(html), [src])
  assert.doesNotMatch(html, /srcSet=/)
})

test('approved transparent local PNG keeps its identity and dimensions while offering a responsive srcset', () => {
  const src = '/puppies/elsie-girl2-profile-v2.png'
  const html = renderToStaticMarkup(createElement(PublicImage, {src, alt: 'Girl 2', width: 1254, height: 1254, sizes: '(max-width: 600px) 75vw, 263px'}))
  assert.deepEqual(imageSources(html), [src])
  assert.match(html, /srcSet="[^"]+\d+w/)
  assert.match(html, /sizes="\(max-width: 600px\) 75vw, 263px"/)
  assert.match(html, /width="1254" height="1254"/)
  assert.match(html, /loading="lazy"/)
})

test('non-square CMS photos retain the existing CSS-controlled stage dimensions', () => {
  const html = renderToStaticMarkup(createElement(PublicImage, {src: original, alt: 'Puppy', className: 'puppy-detail-photo', sizes: '100vw', loading: 'eager'}))
  assert.match(html, /srcSet=/)
  assert.doesNotMatch(html, /\s(?:width|height)="/)
  assert.match(html, /class="puppy-detail-photo"/)
})

test('historical litter images avoid eager React preloads without changing shared tile content or default callers', () => {
  const litter = {_id: 'historical', title: 'Historical litter', status: 'past', birthDate: '2025-03-23', summary: 'Original litter summary.', groupPhotoUrl: original}
  const before = renderToStaticMarkup(createElement(LitterTile, {litter}))
  const after = renderToStaticMarkup(createElement(LitterTile, {litter, photoSizes: '(max-width: 380px) calc(100vw - 42px), 338px'}))
  assert.match(before, /<link[^>]+rel="preload"[^>]+as="image"/)
  assert.doesNotMatch(after, /<link[^>]+rel="preload"/)
  assert.match(after, /loading="lazy"/)
  assert.match(after, /srcSet=/)
  assert.deepEqual(imageSources(after).map(src => {const url = new URL(src); return url.origin + url.pathname}), [original])
  assert.doesNotMatch(after, /\s(?:width|height)="/)
  const surroundingMarkup = html => html.replace(/<link\b[^>]*>/g, '').replace(/<img\b[^>]*>/g, '<img/>')
  assert.equal(surroundingMarkup(after), surroundingMarkup(before))
  // Only the historical listing opts in. Shared current/upcoming callers retain
  // their original source, loading behavior and CSS-controlled dimensions.
  assert.doesNotMatch(before, /loading=|srcSet=|sizes=/)
})
