import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {installAnalyticsNavigationBoundary, analyticsNavigationEvent} from '../lib/analytics-navigation.ts'

const origin = 'https://www.fluffytailshihtzu.com'
const publicPaths = new Set(['/', '/about', '/pricing', '/available-puppies', '/privacy-policy'])

function fixture(path = '/', initialTracking = true) {
  let url = new URL(path, origin)
  let tracking = initialTracking
  const log = []
  const listeners = new Map()
  const location = {
    get href() { return url.href },
    get pathname() { return url.pathname },
    assign(value) { log.push(['assign', value]); url = new URL(value, url) },
    replace(value) { log.push(['replace', value]); url = new URL(value, url) },
    reload() { log.push(['reload', url.href]) },
  }
  const history = {}
  for (const method of ['pushState', 'replaceState']) {
    history[method] = function (...args) {
      if (this !== history) throw new TypeError('Illegal invocation')
      const target = args[2] == null ? url : new URL(args[2], url)
      if (target.origin !== url.origin) throw new DOMException('Cross-origin history', 'SecurityError')
      log.push([method, ...args])
      url = target
    }
  }
  const originals = {...history}
  const win = {
    history, location,
    addEventListener(name, listener, capture) {
      const entries = listeners.get(name) || []
      entries.push({listener, capture})
      listeners.set(name, entries)
    },
    removeEventListener(name, listener, capture) {
      listeners.set(name, (listeners.get(name) || []).filter(entry => entry.listener !== listener || entry.capture !== capture))
    },
    dispatchEvent(event) {
      if (event.type === analyticsNavigationEvent) log.push(['revalidate', location.href])
      for (const {listener} of [...(listeners.get(event.type) || [])]) listener(event)
      return !event.defaultPrevented
    },
  }
  const stop = () => { log.push(['stop', location.href]); tracking = false }
  const cleanup = installAnalyticsNavigationBoundary(win, {isStaticPublicPath: path => publicPaths.has(path), stop, isTracking: () => tracking})
  function click(href, properties = {}) {
    const anchor = {
      tagName: 'A', target: properties.target || '',
      hasAttribute: name => name === 'download' && Boolean(properties.download),
      getAttribute: name => name === 'href' ? href : null,
    }
    const event = {
      type: 'click', button: 0, defaultPrevented: false,
      composedPath: () => [{tagName: 'svg'}, anchor, win],
      preventDefault() { this.defaultPrevented = true },
      stopImmediatePropagation() { this.propagationStopped = true },
      ...properties,
    }
    win.dispatchEvent(event)
    return event
  }
  return {win, log, click, cleanup, originals, setTracking: value => { tracking = value }, setUrl: value => { url = new URL(value, url) }, emit: (type, props = {}) => win.dispatchEvent({type, ...props}), listeners}
}

test('tracked public exit stops synchronously before native navigation to every excluded destination', () => {
  for (const path of ['/contact', '/puppy-inquiry?message=FICTIONAL_SECRET', '/inbox/workspace', '/studio', '/pay/FICTIONAL_TOKEN', '/payment-success', '/api/example', '/unknown', '/puppies/unknown-secret', '/puppies/girl-2-1']) {
    const f = fixture()
    const event = f.click(path)
    assert.equal(event.defaultPrevented, true, path)
    assert.equal(event.propagationStopped, true, path)
    assert.deepEqual(f.log, [['stop', origin + '/'], ['assign', origin + path]], path)
  }
})

test('clean static links retain SPA from static public pages or a tracked published puppy', () => {
  for (const [path, tracking] of [['/', true], ['/', false], ['/puppies/girl-2-1', true]]) {
    const f = fixture(path, tracking)
    assert.equal(f.click('/about').defaultPrevented, false)
    assert.deepEqual(f.log, [])
  }
})

test('untracked puppy and excluded routes enter static public pages with a new document', () => {
  for (const path of ['/puppies/girl-2-1', '/puppies/not-found', '/inbox/workspace', '/contact']) {
    const f = fixture(path, false)
    assert.equal(f.click('/about').defaultPrevented, true)
    assert.deepEqual(f.log.map(entry => entry[0]), ['stop', 'assign'])
  }
})

test('untracked private navigation is left to its existing handlers', () => {
  const f = fixture('/inbox/workspace', false)
  assert.equal(f.click('/inbox/mail').defaultPrevented, false)
  f.win.history.replaceState({auth: 'fictional'}, '', '/inbox/access')
  assert.deepEqual(f.log, [['replaceState', {auth: 'fictional'}, '', '/inbox/access']])
})

test('modified, new-tab, download, external and canceled clicks are untouched', () => {
  for (const props of [{ctrlKey: true}, {metaKey: true}, {shiftKey: true}, {altKey: true}, {button: 1}, {target: '_blank'}, {target: 'named-window'}, {download: true}, {defaultPrevented: true}]) {
    const f = fixture()
    f.click('/contact', props)
    assert.deepEqual(f.log, [], JSON.stringify(props))
  }
  for (const href of ['https://external.example/contact', 'mailto:hello@example.test', 'tel:5551234567', null]) {
    const f = fixture()
    f.click(href)
    assert.deepEqual(f.log, [], String(href))
  }
})

test('fragment jumps retain native accessibility behavior while stopping collection', () => {
  for (const href of ['#site-content', '/about#section', origin + '/about#section']) {
    const f = fixture('/about')
    assert.equal(f.click(href).defaultPrevented, false)
    assert.deepEqual(f.log, [['stop', origin + '/about']])
  }
})

test('query or cross-page fragment links use a full document and stop first', () => {
  for (const path of ['/about?email=fictional@example.test', '/about#FICTIONAL_TOKEN', '/?utm_campaign=FICTIONAL_SECRET']) {
    const f = fixture()
    assert.equal(f.click(path).defaultPrevented, true)
    assert.deepEqual(f.log.map(entry => entry[0]), ['stop', 'assign'])
  }
})

test('tracked history exits preempt URL mutation and preserve assign versus replace', () => {
  for (const method of ['pushState', 'replaceState']) {
    for (const path of ['/inbox/workspace', '/contact?message=FICTIONAL_SECRET', '/puppies/girl-2-1', '/missing', '/about?token=FICTIONAL_TOKEN', '/about#section']) {
      const f = fixture()
      f.win.history[method]({state: 'unchanged'}, 'title', path)
      assert.deepEqual(f.log, [['stop', origin + '/'], [method === 'pushState' ? 'assign' : 'replace', origin + path]], path)
    }
  }
})

test('clean static history mutations stop first, preserve all arguments and revalidate afterward', () => {
  for (const method of ['pushState', 'replaceState']) {
    const f = fixture()
    const state = {nextState: {value: 42}}
    const target = new URL('/about', origin)
    f.win.history[method](state, 'preserved title', target)
    assert.deepEqual(f.log, [['stop', origin + '/'], [method, state, 'preserved title', target], ['revalidate', origin + '/about']])
    assert.equal(f.log[1][1], state)
  }
})

test('same-URL state updates and absent URLs do not stop or generate duplicate views', () => {
  const f = fixture('/about')
  f.win.history.replaceState({one: 1}, '', '/about')
  f.win.history.pushState({two: 2}, '')
  f.win.history.replaceState({three: 3}, '', null)
  assert.deepEqual(f.log.map(entry => entry[0]), ['replaceState', 'pushState', 'replaceState'])
})

test('history preserves native receiver and cross-origin validation', () => {
  const f = fixture()
  assert.throws(() => f.win.history.pushState.call({}, {}, '', '/contact'), /Illegal invocation/)
  assert.throws(() => f.win.history.replaceState({}, '', 'https://external.example/'), {name: 'SecurityError'})
  assert.deepEqual(f.log, [])
})

test('pagehide, hash and bfcache restore stop collection with only relevant revalidation', () => {
  const f = fixture()
  f.emit('pagehide')
  f.emit('hashchange')
  f.emit('pageshow', {persisted: false})
  f.emit('pageshow', {persisted: true})
  assert.deepEqual(f.log.map(entry => entry[0]), ['stop', 'stop', 'revalidate', 'stop', 'revalidate'])
})

test('unexpected tracked back navigation to excluded or unverified puppy routes reloads after stop', () => {
  for (const path of ['/pay/FICTIONAL_TOKEN', '/puppies/unknown']) {
    const f = fixture()
    f.setUrl(path)
    f.emit('popstate')
    assert.deepEqual(f.log, [['stop', origin + path], ['reload', origin + path]])
  }
  const privateFlow = fixture('/inbox/access', false)
  privateFlow.emit('popstate')
  assert.deepEqual(privateFlow.log.map(entry => entry[0]), ['stop', 'revalidate'])
})

test('static back navigation stops and requests revalidation without a reload', () => {
  const f = fixture()
  f.setUrl('/about')
  f.emit('popstate')
  assert.deepEqual(f.log, [['stop', origin + '/about'], ['revalidate', origin + '/about']])
})

test('cleanup is idempotent, restores owned wrappers and removes every listener', () => {
  const f = fixture()
  f.cleanup()
  f.cleanup()
  assert.equal(f.win.history.pushState, f.originals.pushState)
  assert.equal(f.win.history.replaceState, f.originals.replaceState)
  assert.ok([...f.listeners.values()].every(entries => entries.length === 0))
  assert.deepEqual(f.log, [['stop', origin + '/']])
})

test('cleanup preserves a later owner and makes an embedded old wrapper inert', () => {
  const f = fixture()
  const installed = f.win.history.pushState
  const laterOwner = function (...args) { return Reflect.apply(installed, this, args) }
  f.win.history.pushState = laterOwner
  f.cleanup()
  f.setTracking(true)
  f.win.history.pushState({}, '', '/contact')
  assert.equal(f.win.history.pushState, laterOwner)
  assert.deepEqual(f.log.map(entry => entry[0]), ['stop', 'pushState'])
})
