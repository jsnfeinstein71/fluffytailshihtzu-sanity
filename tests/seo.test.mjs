import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {renderToStaticMarkup} from 'react-dom/server'
const {puppyMetadata, publicPageMetadata, puppyBreadcrumbs, organizationJsonLd, siteUrl} = await import('../lib/seo.ts')
const {default: StructuredData} = await import('../app/components/StructuredData.tsx')

const puppy = { _id: 'test', name: 'Girl 1', slug: 'girl-1', litterTitle: 'Autumn litter', birthDate: '2026-10-01', litterStatus: 'current', sex: 'female', color: 'Cream', status: 'available', photoUrl: 'https://cdn.sanity.io/images/example/production/photo.jpg' }

test('puppy metadata follows the public record and canonical path without inheriting the homepage', () => {
  const metadata = puppyMetadata(puppy, 'girl 1')
  assert.equal(metadata.alternates.canonical, `${siteUrl}/puppies/girl%201`)
  assert.equal(metadata.openGraph.url, metadata.alternates.canonical)
  assert.equal(metadata.openGraph.title, metadata.title.absolute)
  assert.equal(metadata.twitter.title, metadata.title.absolute)
  assert.equal(metadata.openGraph.description, metadata.description)
  for (const text of ['Girl 1', 'female Shih Tzu', 'Cream', 'Autumn litter', 'October 1, 2026', 'Available']) assert.ok(metadata.description.includes(text), text)
  assert.equal(metadata.openGraph.images[0].url, puppy.photoUrl)
  assert.notEqual(metadata.title.absolute, puppyMetadata({...puppy, litterTitle: 'Spring litter'}, 'spring-girl-1').title.absolute)
  assert.notEqual(metadata.description, puppyMetadata({...puppy, status: 'reserved'}, 'girl-1').description)
})

test('historical profiles remain indexable and distinguish recorded availability from a current offer', () => {
  const metadata = puppyMetadata({...puppy, litterStatus: 'past'}, 'girl-1')
  assert.match(metadata.description, /Past litter profile\. Recorded status: Available/)
  assert.equal(metadata.robots, undefined)
  assert.doesNotMatch(JSON.stringify(metadata), /Offer|Product|AggregateRating/)
})

test('puppy sharing uses the approved portrait only while its original photo still matches', () => {
  const approved = {...puppy, _id:'6e181ad7-3340-4b2f-ba61-91fbd9155ca0', photoUrl:'https://cdn.sanity.io/images/3glz6dkx/production/3cf72827d25286b55a40fd5b570c07a9e4b7db72-2048x1955.jpg'}
  assert.equal(puppyMetadata(approved, 'girl-1').openGraph.images[0].url, `${siteUrl}/puppies/elsie-girl1-profile.png`)
  assert.equal(puppyMetadata({...approved, photoUrl:puppy.photoUrl}, 'girl-1').openGraph.images[0].url, puppy.photoUrl)
  const absent = puppyMetadata({...puppy, photoUrl:null}, 'girl-1')
  assert.deepEqual(absent.openGraph.images, [])
  assert.deepEqual(absent.twitter.images, [])
  assert.equal(absent.twitter.card, 'summary')
})

test('missing optional puppy fields do not produce invented dates, availability or photos', () => {
  const metadata = puppyMetadata({_id:'empty'}, 'empty')
  assert.match(metadata.description, /Status pending/)
  assert.doesNotMatch(metadata.description, /undefined|null|Invalid Date|Born/)
  assert.deepEqual(metadata.openGraph.images, [])
})

test('all public static pages have matching social text and their own absolute canonical', async () => {
  for (const route of ['', 'about', 'available-puppies', 'contact', 'upcoming-litters', 'pricing', 'the-breed', 'puppy-resources', 'puppy-inquiry', 'privacy-policy', 'terms-and-conditions']) {
    const {metadata} = await import(`../app/${route ? route + '/' : ''}page.tsx`)
    const canonical = `${siteUrl}/${route}`
    assert.equal(metadata.alternates.canonical, canonical, route)
    assert.equal(metadata.openGraph.url, canonical, route)
    assert.equal(metadata.twitter.title, metadata.title.absolute, route)
    assert.equal(metadata.openGraph.description, metadata.description, route)
    assert.ok(metadata.openGraph.images[0].url.startsWith(siteUrl), route)
  }
  assert.equal(publicPageMetadata({title:'Contact', description:'Contact Jeanne', path:'/contact'}).title.absolute, 'Contact | FluffyTail Shih Tzu')
})

test('JSON-LD includes only verified organization fields and navigable puppy breadcrumbs, escaping CMS text', () => {
  assert.deepEqual(Object.keys(organizationJsonLd).sort(), ['@context','@id','@type','logo','name','url'].sort())
  const data = puppyBreadcrumbs({...puppy, name:'</script><script>alert(1)</script>'}, 'girl-1')
  assert.deepEqual(data.itemListElement.map(x => x.position), [1,2,3])
  assert.deepEqual(data.itemListElement.map(x => x.item), [`${siteUrl}/`, `${siteUrl}/available-puppies`, `${siteUrl}/puppies/girl-1`])
  const html = renderToStaticMarkup(StructuredData({data}))
  assert.equal((html.match(/<script/g) || []).length, 1)
  assert.equal((html.match(/<\/script>/g) || []).length, 1)
  const content = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]
  assert.deepEqual(JSON.parse(content), data)
})
