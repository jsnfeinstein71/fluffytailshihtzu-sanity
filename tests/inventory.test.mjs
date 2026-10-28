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

test('homepage respects actual CMS headlines in every environment and uses manuscript fallback only when absent', async () => {
  const original=process.env.VERCEL_ENV
  try{
    for(const env of ['preview','production']){
      process.env.VERCEL_ENV=env;dataset=[{_id:'settings',_type:'siteSettings',homepageHeadline:'CMS-managed headline',homepageIntro:'An editable first paragraph.\n\nA second paragraph.'}]
      const html=await render(Home);assert.match(html,/<h2>CMS-managed headline<\/h2>/);assert.match(html,/<p>An editable first paragraph.<\/p><p>A second paragraph.<\/p>/);assert.match(html,/IMG_6731/)
    }
    dataset=[];assert.match(await render(Home),/<h2>From our home to yours.<\/h2>/)
  }finally{if(original===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=original}
})

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
      if (!size) assert.match(html, /Looking for our next litter\?/)
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

test('browsing keeps three current litters separate, with all statuses and server-managed default/override prices', async () => {
  dataset = [
    ...Array.from({length: 3}, (_, i) => litter('litter-' + i, i === 1 ? 'active' : 'current', {price: 1600 + i * 100, deposit: i === 1 ? 500 : 400})),
    ...Array.from({length: 3}, (_, i) => ['available', 'hold', 'reserved'].map(status => puppy(`${i}-${status}`, 'litter-' + i, status, {overridePrice: status === 'available' ? 2000 + i * 100 : null, color: 'Cream and White'}))).flat(),
    litter('old', 'past'), puppy('old-available', 'old'),
    litter('future', 'planned'), puppy('future-available', 'future'),
  ]
  const html = await render(Available)
  assert.match(html, /3 current litters/)
  assert.match(html, /3 available puppies/)
  const sections = [...html.matchAll(/<section class="available-litter"[^>]*data-litter-id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)]
  assert.equal(sections.length, 3)
  for (const [index, [, id, section]] of sections.entries()) {
    assert.equal(id, 'litter-' + index)
    for (const status of ['available', 'hold', 'reserved']) assert.equal((section.match(new RegExp(`data-puppy-id="${index}-${status}"`, 'g')) || []).length, 1)
    assert.equal((section.match(/View puppy/g) || []).length, 3)
    assert.match(section, /The deposit counts toward that total/)
    assert.match(section, /Estimated ready date: Nov 26/)
    assert.ok(section.includes(index === 1 ? '$500' : '$400'))
    assert.ok(section.includes(['$2,000', '$2,100', '$2,200'][index]))
  }
  assert.doesNotMatch(html, /data-puppy-id="future-available"/)
})

test('past litters retain photos, metadata and original puppy relationships in closed native disclosures', async () => {
  dataset = [
    {_id: 'archive-image', _type: 'sanity.imageAsset', url: '/original-archive.jpg'},
    litter('archive', 'past', {title: 'Historical litter', price: 1500, deposit: 300, summary: 'Historical summary', groupPhoto: {asset: {_ref: 'archive-image'}}}),
    puppy('past-reserved', 'archive', 'reserved'), puppy('past-home', 'archive', 'gone-home'),
  ]
  const html = await render(Available)
  assert.match(html, /<details class="available-past-litter"[^>]*data-past-litter-id="archive"/)
  assert.doesNotMatch(html, /<details[^>]*\bopen(?:=|\s|>)/)
  for (const text of ['/original-archive.jpg', 'Historical summary', '$1,500', '$300', 'Past litters']) assert.ok(html.includes(text), text)
  for (const id of ['past-reserved', 'past-home']) assert.equal((html.match(new RegExp(`data-puppy-id="${id}"`, 'g')) || []).length, 1)
  assert.doesNotMatch(html, /available-count/)
})

test('browsing handles empty litters and invalid pricing without invented dates or amounts', async () => {
  dataset = [litter('empty', 'current', {birthDate: null}), litter('invalid', 'current', {birthDate: null, price: 0, deposit: 400}), puppy('invalid-price', 'invalid')]
  const html = await render(Available)
  assert.match(html, /Individual puppy details will appear here when they’re added/)
  assert.match(html, /Birth date to be confirmed/)
  assert.match(html, /Ask Jeanne about pricing/)
  assert.match(html, /href="\/puppies\/invalid-price"/)
  assert.doesNotMatch(html, /\$0|\$400|Estimated ready date|Total puppy price/)
  dataset = [litter('exact-cents', 'current', {price: 1600.5, deposit: 400.25}), puppy('exact-cents-puppy', 'exact-cents')]
  const cents = await render(Available)
  assert.match(cents, /\$1,600\.50/)
  assert.match(cents, /\$400\.25/)
  dataset = []
  const empty = await render(Available)
  assert.match(empty, /Looking for our next litter\?/)
  assert.match(empty, /href="\/upcoming-litters"/)
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
    assert.equal(detail.includes('Ask Jeanne about'), status === 'available')
    if (status !== 'available') assert.match(detail, /is reserved|isn’t available for a new reservation/)
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
  for (const text of ['expected', 'Expected around', 'November 12, 2026', '/fixture-photo.png', 'Expected summary', 'Ready early January', 'Sire Name', 'Dam Name', 'Mother', 'Father']) assert.ok(html.includes(text), text)
  assert.doesNotMatch(html, /Born Nov 12/)
  dataset.find(x => x._id === 'expected').status = 'current'
  dataset.find(x => x._id === 'expected').birthDate = '2026-11-10'
  assert.match(await render(Home), /data-litter-id="expected"/)
  assert.match(await render(Upcoming), /Born Nov 10/)
})

test('legacy expected dates work, but are not treated as actual puppy birthdays', async () => {
  dataset = [litter('legacy', 'upcoming', {birthDate: '2026-11-12'}), puppy('not-born', 'legacy')]
  assert.match(await render(Upcoming), /Expected around[\s\S]*November 12, 2026/)
  const inventory = await getInventory()
  assert.equal(inventory.puppies[0].birthDate, null)
  assert.equal(rules.canInquireAboutPuppy(inventory.puppies[0]), false)
})

test('upcoming page features sorted expected litters before a separate active group and preserves image sources', async () => {
  dataset = [
    {_id: 'announcement', _type: 'sanity.imageAsset', url: '/original-announcement.png'},
    litter('late', 'planned', {birthDate: null, expectedBirthDate: '2026-12-01', heroImage: {asset: {_ref: 'announcement'}}}),
    litter('early', 'upcoming', {birthDate: '2026-11-01'}),
    litter('manual', 'planned', {expectedBirthDate: '2027-01-01', sortOrder: 0}),
    litter('born', 'current'), litter('born-legacy', 'active'), litter('past', 'past'),
    litter('hidden-expected', 'planned', {isVisible: false}), litter('drafts.expected', 'planned'),
  ]
  const html = await render(Upcoming)
  const expectedIds = [...html.matchAll(/<section class="expected-litter"[^>]*data-litter-id="([^"]+)"/g)].map(x => x[1])
  assert.deepEqual(expectedIds, ['manual', 'early', 'late'])
  assert.ok(html.indexOf('data-litter-id="late"') < html.indexOf('data-litter-id="born"'))
  assert.match(html, /class="upcoming-current"[^>]*aria-labelledby="current-litters-title"/)
  assert.match(html, /data-litter-id="born-legacy"/)
  assert.match(html, /src="\/original-announcement.png"/)
  assert.match(html, /<dt>Expected around<\/dt><dd>November 1, 2026<\/dd>/)
  assert.match(html, /Active/)
  assert.doesNotMatch(html, /data-litter-id="(?:past|hidden-expected|drafts.expected)"/)
})

test('upcoming missing content remains honest and inquiry links use the existing native waitlist', async () => {
  dataset = [litter('pending', 'planned', {birthDate: null, expectedBirthDate: null, price: 0, deposit: 400})]
  const html = await render(Upcoming)
  for (const text of ['Date to be confirmed', 'Announcement coming soon']) assert.ok(html.includes(text), text)
  assert.doesNotMatch(html, /class="expected-parents"|The parents|Parent details to come/)
  assert.match(html, /href="\/puppy-inquiry\?interest=waitlist"/)
  assert.doesNotMatch(html, /\$0|\$400|Ready |Default puppy price|<iframe|tally.so|class="upcoming-current"/)
  dataset = []
  const empty = await render(Upcoming)
  assert.match(empty, /Nothing announced just yet/)
  assert.match(empty, /href="\/puppy-inquiry\?interest=waitlist"/)
  dataset = [litter('current-only')]
  const currentOnly = await render(Upcoming)
  assert.match(currentOnly, /Nothing announced just yet/)
  assert.match(currentOnly, /Already here/)
  assert.match(currentOnly, /href="\/available-puppies"/)
})

test('upcoming pricing and partial parent details come from Sanity without invented availability', async () => {
  dataset = [
    {_id: 'mother', _type: 'dog', name: 'Synthetic Mother'},
    litter('quoted', 'planned', {price: 1800.5, deposit: 500.25, dam: {_ref: 'mother'}, expectedAvailability: 'Expected homecoming in February'}),
  ]
  const html = await render(Upcoming)
  for (const text of ['$1,800.50', '$500.25', 'The deposit counts toward that total.', 'Synthetic Mother', 'Expected homecoming in February']) assert.ok(html.includes(text), text)
  assert.doesNotMatch(html, /\$400|Parent details to come|Name to be confirmed|<dt>Father<\/dt>/)
  dataset[1].expectedAvailability = null
  assert.doesNotMatch(await render(Upcoming), /Expected homecoming in February/)
})

test('upcoming parent section renders only available names/photos and hides empty references', async () => {
  dataset = [
    {_id: 'parent-image', _type: 'sanity.imageAsset', url: '/original-parent.jpg'},
    {_id: 'parent', _type: 'dog', mainImage: {asset: {_ref: 'parent-image'}}},
    litter('parents', 'planned', {dam: {_ref: 'parent'}}),
  ]
  const photoOnly = await render(Upcoming)
  assert.match(photoOnly, /class="expected-parents"/)
  assert.match(photoOnly, /<dt>Mother<\/dt>/)
  assert.match(photoOnly, /src="\/original-parent.jpg"/)
  assert.match(photoOnly, /alt="Mother"/)
  assert.doesNotMatch(photoOnly, /Name to be confirmed|<dt>Father<\/dt>/)
  dataset[1].mainImage = null
  dataset[1].name = '   '
  assert.doesNotMatch(await render(Upcoming), /class="expected-parents"|The parents/)
  dataset[1].name = 'Synthetic Mother'
  const nameOnly = await render(Upcoming)
  assert.match(nameOnly, /class="expected-parents"/)
  assert.match(nameOnly, /Synthetic Mother/)
  assert.doesNotMatch(nameOnly, /Name to be confirmed|<dt>Father<\/dt>|original-parent.jpg/)
})

test('puppy detail presents original photo, labeled facts, exact override pricing and native inquiry context', async () => {
  dataset = [
    {_id: 'portrait', _type: 'sanity.imageAsset', url: '/original-puppy.jpg'},
    litter('detail-litter', 'current', {title: 'Synthetic litter', birthDate: '2026-10-17', price: 1600, deposit: 400}),
    puppy('detail-puppy', 'detail-litter', 'available', {name: 'Synthetic puppy', color: 'Cream and White', summary: 'A Sanity note.', overridePrice: 2000.5, mainImage: {asset: {_ref: 'portrait'}}}),
  ]
  const html = await render(Detail, {params: Promise.resolve({slug: 'detail-puppy'})})
  for (const text of ['Synthetic puppy', 'From Synthetic litter', '/original-puppy.jpg', 'A Sanity note.', '$2,000.50', '$400.00', '$1,600.50', 'The deposit is non-refundable and counts toward the total price.']) assert.ok(html.includes(text), text)
  assert.match(html, /<dt>Sex<\/dt><dd>Female<\/dd>/)
  assert.match(html, /<dt>Color<\/dt><dd>Cream and White<\/dd>/)
  assert.match(html, /<dt>Estimated ready date<\/dt><dd>Dec 12<\/dd>/)
  assert.match(html, /loading="eager" fetchPriority="high" decoding="async"/)
  const href = html.match(/href="([^\"]*\/puppy-inquiry\?[^\"]*)"/)[1].replaceAll('&amp;', '&')
  const query = new URL(href, 'https://example.test').searchParams
  assert.equal(query.get('puppySlug'), 'detail-puppy')
  assert.equal(query.get('puppy'), 'Synthetic puppy')
  assert.equal(query.get('litter'), 'Synthetic litter')
  assert.equal((html.match(/Ask Jeanne about/g) || []).length, 1)
})

test('puppy detail retains the reservation gate and does not invent missing facts or prices', async () => {
  dataset = [litter('detail-litter', 'current', {birthDate: null, price: 0, deposit: 400}), puppy('detail-puppy', 'detail-litter', 'reserved', {sex: null, name: null})]
  const html = await render(Detail, {params: Promise.resolve({slug: 'detail-puppy'})})
  for (const text of ['Reserved', 'Puppy details', 'Photo coming soon', 'To be confirmed', 'Ask Jeanne to confirm this puppy’s price and deposit before paying.', 'is reserved']) assert.ok(html.includes(text), text)
  assert.match(html, /href="\/puppy-inquiry\?interest=waitlist"/)
  assert.doesNotMatch(html, /Ask Jeanne about|Total puppy price|Final payment|\$0|\$400|<dt>Age<\/dt>|<dt>Estimated ready date<\/dt>|<dt>Color<\/dt>/)
  dataset[1].status = 'available'
  const available = await render(Detail, {params: Promise.resolve({slug: 'detail-puppy'})})
  assert.match(available, /Ask Jeanne about/)
  assert.doesNotMatch(available, /Total puppy price|\$0/)
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

test('homepage availability excludes past litters and reserved puppies', async () => {
  dataset = [litter('active'), litter('past', 'past'), puppy('girl', 'active'), puppy('boy', 'past', 'available', {sex: 'male'})]
  assert.match(await render(Home), /1 available puppy/)
  dataset.find(x => x._id === 'boy').litter._ref = 'active'
  assert.match(await render(Home), /2 available puppies/)
  dataset.find(x => x._id === 'boy').status = 'reserved'
  assert.match(await render(Home), /1 available puppy/)
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
    const html = await render(Page, path === 'puppy-inquiry' ? {searchParams: Promise.resolve({puppy: 'available', litter: 'current', puppyPageUrl: 'https://www.fluffytailshihtzu.com/puppies/available'})} : {})
    assert.match(html, /<main/)
    if (path === 'contact') {
      assert.match(html, /\/puppy-inquiry\?interest=waitlist/)
      assert.doesNotMatch(html, /<iframe|tally.so/)
      assert.match(html, /https:\/\/www.gooddog.com\/breeders\/fixture/)
    } else {
      assert.doesNotMatch(html, /href="https:\/\/www.gooddog.com|src="https:\/\/tally.so\/embed\/waitlist-fixture/)
    }
    if (path === 'puppy-inquiry') {
      assert.match(html, /aria-label="Puppy inquiry"/)
      assert.match(html, /Litter: current/)
      assert.match(html, /name="email"/)
      assert.doesNotMatch(html, /<iframe|tally.so/)
    }
  }
})

test('remaining editorial pages reuse published Sanity photography and handle empty inventory', async () => {
  const {default: Breed} = await import('../app/the-breed/page.tsx')
  const {default: Resources} = await import('../app/puppy-resources/page.tsx')
  dataset = [
    {_id: 'adult-image', _type: 'sanity.imageAsset', url: '/original-adult.jpg'},
    {_id: 'puppy-image', _type: 'sanity.imageAsset', url: '/original-puppy.jpg'},
    litter('current-photo', 'current', {groupPhoto: {asset: {_ref: 'adult-image'}}}),
    puppy('featured', 'current-photo', 'available', {mainImage: {asset: {_ref: 'puppy-image'}}}),
  ]
  for (const Page of [Breed]) {
    const html = await render(Page)
    assert.match(html, /class="content-photo"/)
    assert.match(html, /src="\/original-adult.jpg"/)
  }
  assert.match(await render(Resources), /src="\/original-puppy.jpg"/)
  dataset = []
  for (const Page of [Breed, Resources]) {
    const html = await render(Page)
    assert.match(html, /class="wrap content-page"/)
    assert.doesNotMatch(html, /class="content-photo"|src="undefined"/)
    assert.match(html, /href="\/(?:available-puppies|contact)"/)
  }
})

test('pricing overview retains Sanity ranges, puppy overrides and invalid-price fallback', async () => {
  const {default: Pricing} = await import('../app/pricing/page.tsx')
  dataset = [
    litter('current', 'current', {price: 1600, deposit: 400}),
    litter('expected', 'planned', {price: 1800, deposit: 500}),
    litter('past', 'past', {price: 9000, deposit: 300}),
    puppy('override', 'current', 'available', {overridePrice: 2100.25}),
  ]
  const html = await render(Pricing)
  assert.match(html, /\$1,600\.00 to \$2,100\.25/)
  assert.doesNotMatch(html, /\$9,000/)
  assert.match(html, /\$400\.00 to \$500\.00/)
  assert.match(html, /Your deposit is non-refundable and counts toward your puppy’s total price/)
  assert.doesNotMatch(html, /\$300/)
  assert.match(html, /<ol class="pricing-steps">/)
  dataset = [litter('invalid', 'current', {price: 0, deposit: 400})]
  const invalid = await render(Pricing)
  assert.match(invalid, /Please contact FluffyTail to confirm pricing/)
  assert.doesNotMatch(invalid, /\$0|\$400/)
  assert.match(invalid, /Please contact FluffyTail to confirm the deposit/)
})

test('pricing shows the configured litter deposit beside its price without hardcoded amounts', async () => {
  const {default: Pricing} = await import('../app/pricing/page.tsx')
  dataset = [litter('current', 'current', {price: 1600, deposit: 400})]
  const html = await render(Pricing)
  assert.match(html, /Your puppy’s price[\s\S]*\$1,600\.00[\s\S]*<h2>Your deposit<\/h2>[\s\S]*\$400\.00/)
  assert.equal((html.match(/<li><h3>/g) || []).length, 3)
  dataset = [litter('updated', 'current', {price: 1850.5, deposit: 450.25})]
  const updated = await render(Pricing)
  assert.match(updated, /\$1,850\.50/)
  assert.match(updated, /\$450\.25/)
  assert.doesNotMatch(updated, /\$1,600|\$400/)
})

test('Meet Jeanne uses her supplied portrait and introduction without duplicate browsing actions', async () => {
  const {default: About} = await import('../app/about/page.tsx')
  dataset = [
    {_id: 'photo', _type: 'sanity.imageAsset', url: '/unchanged-adult.jpg'},
    litter('current', 'current', {groupPhoto: {asset: {_ref: 'photo'}}}),
    {_id: 'settings', _type: 'siteSettings', homepageIntro: 'Redundant sidebar copy.', serviceArea: 'Synthetic service area'},
  ]
  const html = await render(About)
  assert.match(html, /Hi, I’m Jeanne/)
  assert.match(html, /My husband, Jason, and I share our home/)
  assert.doesNotMatch(html, /not a system|not about volume/)
  assert.match(html, /src="\/brand\/jeanne-portrait.webp"/)
  assert.doesNotMatch(html, /Synthetic service area|unchanged-adult.jpg/);assert.match(html,/wearing pink glasses and a teal shirt/)
  assert.match(html, /At a glance/)
  assert.doesNotMatch(html, /Redundant sidebar copy/)
  assert.equal((html.match(/href="\/available-puppies"/g) || []).length, 1)
})

test('homepage communicates actual availability for one sex and pluralizes litter counts', async () => {
  dataset = [litter('current', 'current', {girlsCount: 1, boysCount: 1}), puppy('only-girl', 'current')]
  const one = await render(Home)
  assert.match(one, /1 available puppy/)
  assert.match(one, /1 girl • 1 boy/)
  assert.doesNotMatch(one, /Waitlist open|1 girls|1 boys/)
  dataset.push(puppy('second-girl', 'current'))
  assert.match(await render(Home), /2 available puppies/)
  dataset.filter(doc => doc._type === 'puppy').forEach(doc => {doc.status = 'reserved'})
  assert.match(await render(Home), /Ask about future puppies/)
})

test('puppy detail omits a duplicate color note but retains distinct public notes and stored values', async () => {
  dataset = [litter('current'), puppy('p', 'current', 'available', {color: 'Cream and White', notes: ' cream and white '})]
  const renderDetail = () => render(Detail, {params: Promise.resolve({slug: 'p'})})
  assert.doesNotMatch(await renderDetail(), /class="puppy-detail-notes"/)
  assert.equal(dataset[1].notes, ' cream and white ')
  dataset[1].notes = 'Ask Jeanne about this puppy.'
  assert.match(await renderDetail(), /class="puppy-detail-notes">Ask Jeanne about this puppy\./)
})
