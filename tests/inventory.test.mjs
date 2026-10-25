import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {renderToStaticMarkup} from 'react-dom/server'
import {parse, evaluate} from 'groq-js'

const rules = await import('../lib/inventory.ts')
const queries = await import('../sanity/lib/inventory-queries.ts')
let dataset = []
globalThis.fixtureSanityFetch = async (query, params = {}) => (await evaluate(parse(query), {dataset, params})).get()
const {getInventory} = await import('../sanity/lib/inventory.ts')
const {default: Home} = await import('../app/page.tsx')
const {default: Available} = await import('../app/available-puppies/page.tsx')
const {default: Upcoming} = await import('../app/upcoming-litters/page.tsx')
const {default: Detail} = await import('../app/puppies/[slug]/page.tsx')
const render = async (Component, props = {}) => renderToStaticMarkup(await Component(props))
const litter = (id, status = 'current', extra = {}) => ({_id: id, _type: 'litter', title: id, status, birthDate: '2026-10-01', ...extra})
const puppy = (id, litterId, status = 'available', extra = {}) => ({_id: id, _type: 'puppy', name: id, slug: {current: id}, litter: {_ref: litterId}, status, sex: 'female', ...extra})

test('zero, one and three active litters render in oldest-first order, with only their own puppies', async () => {
  for (const size of [0, 1, 3]) {
    dataset = Array.from({length: size}, (_, i) => litter('l' + i, i % 2 ? 'active' : 'current', {birthDate: `2026-10-0${3 - i}`}))
    dataset.push(...Array.from({length: size}, (_, i) => puppy('p' + i, 'l' + i)))
    const inventory = await getInventory()
    assert.equal(rules.getLittersByStatus(inventory.litters, 'current').length, size)
    for (const Component of [Home, Available]) {
      const html = await render(Component)
      assert.equal((html.match(/data-litter-id=/g) || []).length, size)
      assert.equal((html.match(/data-puppy-id=/g) || []).length, size)
      if (!size) assert.match(html, /No active litters listed/)
      if (size === 3) assert.ok(html.indexOf('data-litter-id="l2"') < html.indexOf('data-litter-id="l0"'))
      for (let i = 0; i < size; i++) assert.match(html, new RegExp(`data-litter-id="l${i}"[\\s\\S]*?data-puppy-id="p${i}"`))
    }
  }
})

test('manual sort overrides the date, unnumbered litters stay oldest first, and no input is mutated', () => {
  const litters = [litter('new', 'current', {birthDate: '2026-10-20'}), litter('old', 'current', {birthDate: '2026-10-01'}), litter('manual', 'current', {birthDate: '2026-10-25', sortOrder: 0})]
  assert.deepEqual(rules.sortLitters(litters).map(x => x._id), ['manual', 'old', 'new'])
  assert.equal(litters[0]._id, 'new')
})

test('every puppy status stays once in its original litter; only available accepts an inquiry', async () => {
  for (const status of ['available', 'hold', 'reserved', 'sold', 'holdback', 'gone-home', 'unexpected', null]) {
    dataset = [litter('original'), puppy('puppy', 'original', status)]
    for (const Component of [Home, Available]) {
      const html = await render(Component)
      assert.equal((html.match(/data-puppy-id="puppy"/g) || []).length, 1)
      assert.match(html, /href="\/puppies\/puppy"/)
      assert.ok(html.includes(rules.formatPuppyStatus(status)))
      assert.doesNotMatch(html, /Matched Puppies/)
    }
    const detail = await render(Detail, {params: Promise.resolve({slug: 'puppy'})})
    assert.equal(detail.includes('Request Info About This Puppy'), status === 'available')
    if (status !== 'available') assert.match(detail, /not currently available for a new reservation/)
  }
})

test('reserved and gone-home puppies in past litters remain browsable without duplicate listings', async () => {
  dataset = [litter('old', 'past'), puppy('reserved', 'old', 'reserved'), puppy('home', 'old', 'gone-home')]
  const html = await render(Available)
  assert.match(html, /data-past-litter-id="old"/)
  assert.equal((html.match(/data-puppy-id=/g) || []).length, 2)
  assert.doesNotMatch(await render(Home), /data-puppy-id=/)
})

test('expected litter appears before birth with image/summary fallbacks, parents, and availability', async () => {
  dataset = [
    {_id: 'image', _type: 'sanity.imageAsset', url: '/fixture-photo.png'},
    {_id: 'sire', _type: 'dog', name: 'Sire Name', mainImage: {asset: {_ref: 'image'}}},
    {_id: 'dam', _type: 'dog', name: 'Dam Name'},
    litter('expected', 'planned', {birthDate: null, expectedBirthDate: '2026-11-12', heroImage: {asset: {_ref: 'image'}}, description: 'Expected summary', expectedAvailability: 'Ready early January', sire: {_ref: 'sire'}, dam: {_ref: 'dam'}}),
  ]
  const html = await render(Upcoming)
  for (const text of ['expected', 'Expected Nov 12', '/fixture-photo.png', 'Expected summary', 'Ready early January', 'Sire Name', 'Dam Name']) assert.ok(html.includes(text), text)
  assert.doesNotMatch(html, /Born Nov 12/)
  dataset.find(x => x._id === 'expected').status = 'current'
  dataset.find(x => x._id === 'expected').birthDate = '2026-11-10'
  assert.match(await render(Home), /data-litter-id="expected"/)
  assert.match(await render(Upcoming), /Born Nov 10/)
})

test('legacy expected dates work, but are not treated as actual puppy birthdays', async () => {
  dataset = [litter('legacy', 'upcoming', {birthDate: '2026-11-12'}), puppy('not-born', 'legacy')]
  assert.match(await render(Upcoming), /Expected Nov 12/)
  const inventory = await getInventory()
  assert.equal(inventory.puppies[0].birthDate, null)
  assert.equal(rules.canInquireAboutPuppy(inventory.puppies[0]), false)
})

test('published queries hide drafts, releases, explicitly hidden records and hidden/unpublished parents', async () => {
  dataset = [litter('public'), litter('hidden', 'current', {isVisible: false}), litter('drafts.draft'), litter('versions.release.litter'), puppy('ok', 'public'), puppy('hidden-puppy', 'public', 'available', {isVisible: false}), puppy('drafts.puppy', 'public'), puppy('versions.release.puppy', 'public'), puppy('hidden-parent', 'hidden'), puppy('draft-parent', 'drafts.draft'), puppy('orphan', 'missing')]
  const inventory = await getInventory()
  assert.deepEqual(inventory.litters.map(x => x._id), ['public'])
  assert.deepEqual(inventory.puppies.map(x => x._id), ['ok'])
  const sitemap = await globalThis.fixtureSanityFetch(queries.puppySitemapQuery)
  assert.deepEqual(sitemap.map(x => x.slug), ['ok'])
  for (const slug of ['hidden-puppy', 'hidden-parent', 'draft-parent', 'orphan', 'missing']) {
    await assert.rejects(() => render(Detail, {params: Promise.resolve({slug})}), error => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404')
  }
})

test('waitlist only counts available males/females belonging to active litters', async () => {
  dataset = [litter('active'), litter('past', 'past'), puppy('girl', 'active'), puppy('boy', 'past', 'available', {sex: 'male'})]
  assert.match(await render(Home), /Waitlist open/)
  dataset.find(x => x._id === 'boy').litter._ref = 'active'
  assert.doesNotMatch(await render(Home), /Waitlist open/)
  dataset.find(x => x._id === 'boy').status = 'reserved'
  assert.match(await render(Home), /Waitlist open/)
})

test('inquiry URL retains puppy, litter and canonical detail URL including encoded characters', () => {
  const url = new URL(rules.buildPuppyInquiryUrl({name: 'A & B', litterTitle: 'Fall & Winter', slug: 'a/b'}), 'https://example.test')
  assert.equal(url.searchParams.get('puppy'), 'A & B')
  assert.equal(url.searchParams.get('litter'), 'Fall & Winter')
  assert.equal(url.searchParams.get('puppyPageUrl'), 'https://www.fluffytailshihtzu.com/puppies/a%2Fb')
})

test('dates are timezone-stable and unknown/future dates do not fabricate puppy ages', () => {
  assert.equal(rules.formatDate('2026-10-01'), 'October 1, 2026')
  assert.equal(rules.getAgeInWeeks(null), null)
  assert.equal(rules.getAgeInWeeks('invalid'), null)
  assert.equal(rules.getAgeInWeeks('2030-01-01', new Date('2026-10-25')), null)
  assert.equal(rules.getAgeInWeeks('2026-10-17', new Date('2026-10-25')), 1)
  assert.equal(rules.getReadyDate('2026-10-17'), 'Dec 12')
})

test('public routes render and only Contact offers waitlist and GoodDog actions', async () => {
  dataset = [litter('current'), puppy('available', 'current'), {
    _id: 'settings', _type: 'siteSettings',
    waitlistUrl: 'https://tally.so/embed/waitlist-fixture',
    goodDogUrl: 'https://www.gooddog.com/breeders/fixture',
  }]
  for (const path of ['about', 'the-breed', 'puppy-resources', 'pricing', 'available-puppies', 'upcoming-litters', 'contact', 'privacy-policy', 'terms-and-conditions', 'puppy-inquiry', 'payment-success']) {
    const {default: Page} = await import(`../app/${path}/page.tsx`)
    const html = await render(Page, path === 'puppy-inquiry' ? {searchParams: Promise.resolve({puppy: 'Pup', litter: 'Litter', puppyPageUrl: 'https://www.fluffytailshihtzu.com/puppies/pup'})} : {})
    assert.match(html, /<main/)
    if (path === 'contact') {
      assert.match(html, /https:\/\/tally.so\/embed\/waitlist-fixture/)
      assert.match(html, /https:\/\/www.gooddog.com\/breeders\/fixture/)
    } else {
      assert.doesNotMatch(html, /href="https:\/\/www.gooddog.com|src="https:\/\/tally.so\/embed\/waitlist-fixture/)
    }
    if (path === 'puppy-inquiry') {
      assert.match(html, /tally.so\/embed\/1Av6Dl/)
      assert.match(html, /puppy=Pup/)
      assert.match(html, /litter=Litter/)
      assert.match(html, /privacy-policy/)
      assert.match(html, /terms-and-conditions/)
    }
  }
})
