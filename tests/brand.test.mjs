import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {imageSources} from './image-source-helpers.mjs'
import {PathnameContext} from 'next/dist/shared/lib/hooks-client-context.shared-runtime.js'
const {default: SiteChrome} = await import('../app/components/SiteChrome.tsx')
const {default: PuppyCard} = await import('../app/components/PuppyCard.tsx')
const {default: HomeHero} = await import('../app/components/HomeHero.tsx')

const renderChrome = path => renderToStaticMarkup(createElement(PathnameContext.Provider, {value: path}, createElement(SiteChrome, {}, createElement('main', {}, 'Page content'))))

test('existing Adobe SVG exports remain byte-for-byte unchanged and contain no active or external content', () => {
  const expected = {
    'fluffytail-logo-one-color.svg': 'b07d0b270dfdcdeb38974c0c609fa97b6c7cb5d9e39eca59fe7be4949ecac06a',
    'fluffytail-logo-color.svg': 'ccba97c37d9c252936a82b00d3765df2742c82f115009eea8362f4d07ed720e8',
    'fluffytail-logo-white.svg': '9acd9032d5626f39cffe75ec416fcbcc6d5191267cb998924fd382b8e189043c',
  }
  for (const [name, digest] of Object.entries(expected)) {
    const bytes = readFileSync(new URL('../public/brand/' + name, import.meta.url))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), digest)
    assert.doesNotMatch(bytes.toString(), /<(script|foreignObject|image|text)\b|\bon\w+=|(?:href|src)\s*=/i)
  }
})

test('the public brand shell has one header/footer, accessible navigation and an active puppy route', () => {
  const html = renderChrome('/puppies/female-1')
  assert.equal((html.match(/<header/g) || []).length, 1)
  assert.equal((html.match(/<footer/g) || []).length, 1)
  assert.match(html, /Skip to content/)
  assert.match(html, /<a(?=[^>]*href="\/available-puppies")(?=[^>]*aria-current="page")[^>]*>/)
  assert.match(html, /<details/)
  assert.match(html, /Tiny Paws, Big Love/)
  for (const path of ['/inbox', '/inbox/messages', '/studio', '/studio/structure', '/pay/legacy-token']) {
    assert.equal(renderChrome(path), '<main>Page content</main>')
  }
})

test('puppy card displays the Sanity override price and keeps reserved detail links', () => {
  const html = renderToStaticMarkup(createElement(PuppyCard, {puppy: {
    _id: 'synthetic', slug: 'synthetic', name: 'Synthetic puppy', status: 'reserved',
    litterStatus: 'current', litterPrice: 1600, litterDeposit: 400, overridePrice: 2000,
  }}))
  assert.match(html, /\$2,000/)
  assert.match(html, /Reserved/)
  assert.match(html, /href="\/puppies\/synthetic"/)
  const invalid = renderToStaticMarkup(createElement(PuppyCard, {puppy: {_id: 'invalid', litterPrice: 0, litterDeposit: 400}}))
  assert.match(invalid, /Ask Jeanne about pricing/)
  assert.doesNotMatch(invalid, /\$0/)
})

test('browsing cards have one detail link, explicit total pricing and ready dates without changing home cards', () => {
  for (const status of ['available', 'hold', 'reserved']) {
    const puppy = {
      _id: 'synthetic', slug: 'synthetic', name: 'Synthetic puppy', status, sex: 'female',
      color: 'Cream and White', birthDate: '2026-10-17', photoUrl: '/original-photo.jpg',
      litterStatus: 'current', litterPrice: 1600, litterDeposit: 400, overridePrice: 1900,
    }
    const html = renderToStaticMarkup(createElement(PuppyCard, {puppy, browsing: true}))
    assert.equal((html.match(/<a\b/g) || []).length, 1)
    assert.match(html, /href="\/puppies\/synthetic"/)
    assert.match(html, /src="\/original-photo.jpg"/)
    for (const text of ['Synthetic puppy', 'Female', 'Cream and White', 'Estimated ready date: Dec 12', 'Total puppy price', '$1,900', 'View puppy']) assert.ok(html.includes(text), text)
    assert.doesNotMatch(html, /<button|\/puppy-inquiry/)
    const home = renderToStaticMarkup(createElement(PuppyCard, {puppy}))
    assert.match(home, /Meet Synthetic puppy/)
    assert.doesNotMatch(home, /Total puppy price|View puppy/)
    if (status === 'reserved') assert.doesNotMatch(home, /Estimated ready date: Dec 12/)
    const fractional = renderToStaticMarkup(createElement(PuppyCard, {puppy: {...puppy, overridePrice: 1900.5}, browsing: true}))
    assert.match(fractional, /\$1,900\.50/)
  }
})

test('brand tokens and the development kit use only the approved colors and font families', () => {
  const css = readFileSync(new URL('../app/brand.css', import.meta.url), 'utf8')
  const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8')
  assert.match(css, /--brand-brown: #58493d/)
  assert.match(css, /--brand-champagne: #d8bd9d/)
  assert.match(css, /font-family: 'acumin-pro'/)
  assert.match(css, /font-family: 'cormorant-garamond'/)
  assert.match(css, /font-synthesis: none/)
  assert.match(layout, /https:\/\/use\.typekit\.net\/mun1gwi\.css/)
})

test('the hero preserves original JPEG bytes and requests responsive delivery eagerly', () => {
  const bytes = readFileSync(new URL('../public/design-preview/IMG_6731.JPEG', import.meta.url))
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'e0d9a68a5e4b67daf2e8f810b438a32b1f72f7e27ea2dc7cc9cd927c1e2ec62b')
  const html = renderToStaticMarkup(createElement(HomeHero, {imageUrl: 'https://example.com/cms.jpg', preview: true}))
  assert.match(html, /home-hero-proposal/)
  assert.deepEqual(imageSources(html), ['/design-preview/IMG_6731.JPEG'])
  assert.match(html, /width="2048" height="1536"/)
  for (const attribute of ['loading="eager"', 'fetchPriority="high"', 'decoding="async"', 'sizes="100vw"', 'srcSet="']) assert.ok(html.includes(attribute), attribute)
  assert.match(html, /Two cream-colored FluffyTail Shih Tzu puppies/)
  assert.doesNotMatch(html, /https:\/\/example.com\/cms.jpg/)
})

test('production publishes the approved hero and preserves future Sanity image selections', () => {
  const html = renderToStaticMarkup(createElement(HomeHero, {imageUrl: 'https://example.com/cms.jpg'}))
  assert.match(html, /src="https:\/\/example.com\/cms.jpg"/)
  assert.match(html, /home-hero-proposal/)
  assert.doesNotMatch(html, /IMG_6731/)
  const empty = renderToStaticMarkup(createElement(HomeHero))
  assert.deepEqual(imageSources(empty), ['/design-preview/IMG_6731.JPEG'])
  const legacy = renderToStaticMarkup(createElement(HomeHero, {imageUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/bd64e3600d604b26c9be93461487adc79922acb2-3787x2580.jpg'}))
  assert.deepEqual(imageSources(legacy), ['/design-preview/IMG_6731.JPEG'])
  assert.match(legacy, /home-hero-proposal/)
  assert.doesNotMatch(legacy, /brand-button-light/)
  assert.match(empty, /Meet our puppies/)
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8')
  assert.match(page, /process.env.NODE_ENV === 'development' \|\| process.env.VERCEL_ENV === 'preview'/)
  assert.match(page, /preview=\{designPreview\}/)
  assert.match(page, /"heroImageUrl": heroImage.asset->url/)
})

test('legal page bodies and links remain unchanged during the presentation-only pass', () => {
  const expected = {
    'privacy-policy': 'c67a8cf25855a7c902a4725a155f357b7cdbbc971d38fdf0dd120d7e09e7c557',
    'terms-and-conditions': '6190a3744da189ca6716fcc9374f1d0a42d30b8a9dfd04f567cba59772250473',
  }
  for (const [page, digest] of Object.entries(expected)) {
    const source = readFileSync(new URL(`../app/${page}/page.tsx`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
    const start = source.indexOf('<div className="card">')
    assert.ok(start > 0)
    assert.equal(createHash('sha256').update(source.slice(start)).digest('hex'), digest)
    assert.match(source, /className="wrap legal-page"/)
  }
})
