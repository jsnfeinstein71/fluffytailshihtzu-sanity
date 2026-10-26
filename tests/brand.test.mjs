import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {PathnameContext} from 'next/dist/shared/lib/hooks-client-context.shared-runtime.js'
const {default: SiteChrome} = await import('../app/components/SiteChrome.tsx')
const {default: PuppyCard} = await import('../app/components/PuppyCard.tsx')

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
