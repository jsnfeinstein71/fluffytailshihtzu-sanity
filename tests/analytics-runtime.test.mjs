import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'

const {createPublicAnalyticsRuntime} = await import('../lib/analytics-runtime.ts')
const policy = await import('../lib/analytics-policy.ts')
const {analyticsOrigin: origin, measurementId, consentKey, consentRecord, staticAnalyticsPage, publishedPuppyAnalyticsPage} = policy
const disableKey = `ga-disable-${measurementId}`

// The fixture records provider boundaries, rather than implementing consent or
// route eligibility itself. All decisions come from the production controller.
function fixture({path = '/', referrer = '', production = true, stored, attribution, flags = false, storageFails = false} = {}) {
  let url = new URL(path, origin)
  let cookieText = ''
  const storage = new Map()
  if (stored !== undefined) storage.set(consentKey, stored)
  if (attribution !== undefined) storage.set('__va_attribution', attribution)
  const listeners = new Map()
  const log = []
  const scripts = []
  const cookieWrites = []
  const choices = []
  const injects = []
  const vercelCalls = []
  const vercelRequests = []
  const googleRequests = []
  const timers = new Map()
  let nextTimer = 0
  let googleCursor = 0
  let hasFlags = flags
  let failStorage = storageFails
  const location = {
    get href() { return url.href },
    get pathname() { return url.pathname },
    get search() { return url.search },
    get hash() { return url.hash },
    assign(value) { log.push(['assign', value, win[disableKey]]); url = new URL(value, url) },
    replace(value) { log.push(['replace', value, win[disableKey]]); url = new URL(value, url) },
    reload() { log.push(['reload', win[disableKey]]) },
  }
  const history = {}
  for (const method of ['pushState', 'replaceState']) {
    history[method] = function (...args) {
      if (this !== history) throw new TypeError('Illegal invocation')
      if (args[2] !== undefined && args[2] !== null) url = new URL(args[2], url)
    }
  }
  const document = {
    referrer,
    get cookie() { return cookieText },
    set cookie(value) { cookieWrites.push(value); cookieText = value },
    querySelector(selector) { return selector === '[data-flag-values]' && hasFlags ? {dataset: {flagValues: 'FICTIONAL_FLAG_SECRET'}} : null },
    createElement(tag) {
      assert.equal(tag, 'script')
      const script = {dataset: {}, removed: false, remove() { this.removed = true; log.push(['remove-script', win[disableKey]]) }}
      return script
    },
    head: {appendChild(script) { scripts.push(script); log.push(['append-script', win[disableKey]]) }},
  }
  const win = {
    location, history, document,
    setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, {callback, delay}); return id },
    clearTimeout(id) { timers.delete(id) },
    localStorage: {
      getItem(key) { if (failStorage) throw new Error('Storage unavailable'); return storage.get(key) ?? null },
      setItem(key, value) { if (failStorage) throw new Error('Storage unavailable'); storage.set(key, value) },
      removeItem(key) { if (failStorage) throw new Error('Storage unavailable'); storage.delete(key) },
    },
    addEventListener(type, listener, capture) {
      const entries = listeners.get(type) || []
      entries.push({listener, capture})
      listeners.set(type, entries)
    },
    removeEventListener(type, listener, capture) {
      listeners.set(type, (listeners.get(type) || []).filter(entry => entry.listener !== listener || entry.capture !== capture))
    },
    dispatchEvent(event) {
      for (const {listener} of [...(listeners.get(event.type) || [])]) listener(event)
      return !event.defaultPrevented
    },
  }
  const vercel = {
    inject(options) { injects.push(options) },
    pageview(options) {
      vercelCalls.push(options)
      const accepted = injects.at(-1)?.beforeSend({type: 'pageview', url: new URL(options.path, origin).href})
      if (accepted) vercelRequests.push(accepted)
    },
  }
  const runtime = createPublicAnalyticsRuntime(win, {production, vercel, onChoice: choice => choices.push(choice)})
  const googleCommands = () => (win.dataLayer || []).map(args => Array.from(args))
  // A deliberately delayed fake provider respects Google's documented disable
  // switch. This verifies the switch and queue order, not Google's network code.
  function flushGoogle() {
    const commands = googleCommands()
    for (; googleCursor < commands.length; googleCursor++) {
      const command = commands[googleCursor]
      if (!win[disableKey] && command[0] === 'event') googleRequests.push(command)
    }
  }
  const emit = (type, values = {}) => win.dispatchEvent({type, ...values})
  return {
    win, runtime, scripts, cookieWrites, choices, injects, vercelCalls, vercelRequests, googleRequests, googleCommands, flushGoogle, log, storage, listeners, emit, timers,
    runTimer(id = timers.keys().next().value) { const timer = timers.get(id); assert.ok(timer, 'expected a pending timer'); timers.delete(id); timer.callback() },
    setUrl(value) { url = new URL(value, url) },
    setFlags(value) { hasFlags = value },
    setStorageFailure(value) { failStorage = value },
    setPage(pathname = location.pathname) { runtime.setPage(staticAnalyticsPage(pathname)) },
  }
}

function assertUnloaded(f) {
  assert.equal(f.win[disableKey], true)
  assert.equal(f.scripts.length, 0)
  assert.equal(f.injects.length, 0)
  assert.equal(f.vercelRequests.length, 0)
  assert.equal(f.win.dataLayer, undefined)
  assert.equal(f.win.gtag, undefined)
}

test('no choice, declined, expired and malformed consent never create a provider, script or cookie', () => {
  for (const stored of [undefined, consentRecord('declined'), '{bad json', consentRecord('accepted', Date.now() - policy.consentLifetime - 1), consentRecord('accepted', Date.now() + 60_000)]) {
    const f = fixture({stored})
    f.setPage()
    f.emit('pageshow', {persisted: false})
    assertUnloaded(f)
    assert.deepEqual(f.cookieWrites, [])
    f.runtime.dispose()
  }
})

test('only explicit acceptance or valid persisted acceptance loads public analytics', () => {
  const f = fixture()
  f.setPage()
  f.runtime.choose('invalid')
  assertUnloaded(f)
  f.runtime.choose('declined')
  assertUnloaded(f)
  assert.ok(f.cookieWrites.every(value => value.includes('Max-Age=0')))
  f.runtime.choose('accepted')
  assert.equal(policy.readAnalyticsChoice(f.storage.get(consentKey)), 'accepted')
  assert.equal(f.scripts.length, 1)
  assert.equal(f.injects.length, 1)
  assert.equal(f.win[disableKey], false)
  assert.deepEqual(f.choices, [null, 'declined', 'accepted'])
  const returning = fixture({stored: consentRecord('accepted')})
  returning.setPage('/about')
  assertUnloaded(returning)
  returning.setPage()
  assert.equal(returning.scripts.length, 1)
})

test('production and exact HTTPS hostname gate both providers even with explicit consent', () => {
  for (const options of [
    {production: false},
    {path: 'https://preview.example.vercel.app/'},
    {path: 'http://www.fluffytailshihtzu.com/'},
    {path: 'https://fluffytailshihtzu.com/'},
    {path: 'http://localhost:3000/'},
    {path: 'https://www.fluffytailshihtzu.net/'},
  ]) {
    const f = fixture(options)
    f.setPage()
    f.runtime.choose('accepted')
    assertUnloaded(f)
  }
})

test('excluded and unknown direct loads remain uninstrumented; published puppy registration is required', () => {
  for (const path of ['/contact', '/puppy-inquiry', '/inbox', '/inbox/workspace', '/studio', '/pay/FICTIONAL_TOKEN', '/payment-success', '/api/example', '/unknown', '/puppies/not-published']) {
    const f = fixture({path, stored: consentRecord('accepted')})
    f.setPage()
    f.runtime.setPage(null)
    assertUnloaded(f)
  }
  const f = fixture({path: '/puppies/girl-2-1', stored: consentRecord('accepted')})
  f.setPage()
  assertUnloaded(f)
  f.runtime.setPage(publishedPuppyAnalyticsPage('girl-2-1'))
  assert.equal(f.scripts.length, 1)
  assert.deepEqual(f.vercelCalls, [{path: '/puppies/girl-2-1', route: '/puppies/girl-2-1'}])
  const commands = f.googleCommands().filter(command => command[0] === 'event')
  assert.equal(commands[0][2].page_title, 'Shih Tzu puppy profile | FluffyTail Shih Tzu')
  for (const slug of ['', '../pay', 'girl?email=secret', 'girl#secret', '/inbox', 'a'.repeat(161)]) assert.equal(publishedPuppyAnalyticsPage(slug), null)
})

test('query, fragment and unsafe raw referrer suppress the entire document even after cleaning the location', () => {
  const privateMarker = 'FICTIONAL_EMAIL_TOKEN_MESSAGE'
  for (const options of [
    {path: `/?email=${privateMarker}`},
    {path: `/about#${privateMarker}`},
    {referrer: `${origin}/pay/${privateMarker}`},
    {referrer: `${origin}/contact?message=${privateMarker}`},
    {referrer: `https://search.example/results?q=${privateMarker}`},
    {referrer: `https://external.example/${privateMarker}`},
    {referrer: `https://external.example/#${privateMarker}`},
    {referrer: `https://${privateMarker}@external.example/`},
    {referrer: 'not a URL'},
  ]) {
    const f = fixture(options)
    f.setPage()
    f.runtime.choose('accepted')
    f.setUrl('/')
    f.win.document.referrer = ''
    f.setPage()
    assertUnloaded(f)
    assert.doesNotMatch(JSON.stringify([f.googleCommands(), f.vercelRequests, f.cookieWrites]), new RegExp(privateMarker))
  }
})

test('approved public static pages and safe referrers produce only fixed canonical context', () => {
  for (const path of ['/', '/available-puppies', '/upcoming-litters', '/about', '/pricing', '/the-breed', '/puppy-resources', '/privacy-policy', '/terms-and-conditions']) {
    const f = fixture({path, referrer: `${origin}/about`, stored: consentRecord('accepted')})
    f.setPage()
    assert.equal(f.scripts.length, 1, path)
    const event = f.googleCommands().find(command => command[0] === 'event')
    assert.equal(event[2].page_location, origin + path)
    assert.equal(event[2].page_referrer, '')
    assert.equal(event[2].page_title, staticAnalyticsPage(path).title)
    assert.deepEqual(f.vercelRequests, [{type: 'pageview', url: origin + path}])
  }
  assert.equal(policy.safeAnalyticsReferrer('https://search.example/'), 'https://search.example/')
})

test('Google initialization sets denied defaults first, disables automatic pageviews and advertising, and has safe global context', () => {
  const f = fixture({path: '/about'})
  f.setPage()
  f.runtime.choose('accepted')
  const commands = f.googleCommands()
  assert.deepEqual(commands[0], ['consent', 'default', {analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'}])
  const consent = commands.find(command => command[0] === 'consent' && command[1] === 'update')[2]
  assert.deepEqual(consent, {analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'})
  assert.equal(Object.prototype.toString.call(f.win.dataLayer[0]), '[object Arguments]')
  for (const command of commands.filter(command => command[0] === 'set' || command[0] === 'config')) {
    const context = command[0] === 'set' ? command[1] : command[2]
    assert.equal(context.send_page_view, false)
    assert.equal(context.allow_google_signals, false)
    assert.equal(context.allow_ad_personalization_signals, false)
    assert.equal(context.ads_data_redaction, true)
    assert.equal(context.url_passthrough, false)
    assert.equal(context.cookie_domain, 'none')
    assert.equal(context.cookie_expires, 180 * 24 * 60 * 60)
    assert.equal(context.cookie_update, false)
    assert.equal(context.cookie_flags, 'SameSite=Lax;Secure')
    assert.equal(context.page_location, origin + '/about')
    assert.equal(context.page_referrer, '')
    for (const key of ['campaign_id', 'campaign_source', 'campaign_medium', 'campaign_name', 'campaign_term', 'campaign_content']) assert.equal(context[key], '')
  }
  assert.equal(f.scripts[0].src, `https://www.googletagmanager.com/gtag/js?id=${measurementId}`)
  assert.equal(f.scripts[0].referrerPolicy, 'no-referrer')
  assert.equal(f.scripts[0].async, true)
  assert.equal(f.injects[0].disableAutoTrack, true)
  assert.equal(f.injects[0].debug, false)
})

test('manual views deduplicate repeated registration but preserve A to B to A navigation', () => {
  const f = fixture({stored: consentRecord('accepted')})
  f.setPage()
  f.setPage()
  f.runtime.choose('accepted')
  f.win.history.pushState({}, '', '/about')
  f.setPage()
  f.setPage()
  f.win.history.pushState({}, '', '/')
  f.setPage()
  assert.equal(f.scripts.length, 1)
  assert.equal(f.injects.length, 1)
  assert.deepEqual(f.googleCommands().filter(command => command[0] === 'event').map(command => command[2].page_location), [origin + '/', origin + '/about', origin + '/'])
  assert.deepEqual(f.vercelRequests.map(event => event.url), [origin + '/', origin + '/about', origin + '/'])
})

test('Vercel beforeSend rejects custom, foreign and excluded events and strips all query/hash/extra fields', () => {
  const f = fixture({stored: consentRecord('accepted')})
  assert.equal(f.runtime.beforeSend({type: 'pageview', url: origin + '/'}), null)
  f.setPage()
  for (const event of [
    {type: 'event', url: origin + '/', name: 'FICTIONAL_CUSTOM_SECRET'},
    {type: 'pageview', url: 'https://external.example/'},
    {type: 'pageview', url: origin + '/pay/FICTIONAL_TOKEN'},
    {type: 'pageview', url: origin + '/contact'},
    {type: 'pageview', url: origin + '/about'},
    {type: 'pageview', url: 'invalid'},
  ]) assert.equal(f.runtime.beforeSend(event), null)
  assert.deepEqual(f.runtime.beforeSend({type: 'pageview', url: origin + '/?email=FICTIONAL_EMAIL#FICTIONAL_TOKEN', arbitrary: 'FICTIONAL_MESSAGE'}), {type: 'pageview', url: origin + '/'})
  f.runtime.stop()
  assert.equal(f.runtime.beforeSend({type: 'pageview', url: origin + '/'}), null)
})

test('unsafe Vercel attribution or data flags prevent injection and late changes reject every Vercel event', () => {
  for (const options of [{attribution: 'FICTIONAL_ATTRIBUTION_SECRET'}, {flags: true}]) {
    const f = fixture({...options, stored: consentRecord('accepted')})
    f.setPage()
    assert.equal(f.scripts.length, 1)
    assert.equal(f.injects.length, 0)
    assert.deepEqual(f.vercelRequests, [])
    assert.doesNotMatch(JSON.stringify(f.googleCommands()), /FICTIONAL_/)
  }
  const f = fixture({stored: consentRecord('accepted')})
  f.setPage()
  f.storage.set('__va_attribution', 'FICTIONAL_ATTRIBUTION_SECRET')
  assert.equal(f.runtime.beforeSend({type: 'pageview', url: origin + '/'}), null)
  f.storage.delete('__va_attribution')
  f.setFlags(true)
  assert.equal(f.runtime.beforeSend({type: 'pageview', url: origin + '/'}), null)
})

test('withdrawal disables synchronously, deletes only analytics cookies, removes script and reloads', () => {
  const f = fixture({stored: consentRecord('accepted')})
  f.setPage()
  f.log.length = 0
  f.runtime.choose('declined')
  assert.equal(f.win[disableKey], true)
  assert.equal(policy.readAnalyticsChoice(f.storage.get(consentKey)), 'declined')
  assert.equal(f.scripts[0].removed, true)
  assert.deepEqual(f.log, [['remove-script', true], ['reload', true]])
  const cookieNames = new Set(f.cookieWrites.map(value => value.split('=')[0]))
  assert.deepEqual(cookieNames, new Set(['_ga', `_ga_${measurementId.slice(2)}`]))
  assert.equal(f.cookieWrites.length, 10)
  assert.ok(f.cookieWrites.every(value => /Max-Age=0; Path=\/; SameSite=Lax; Secure/.test(value)))
  assert.equal(f.runtime.beforeSend({type: 'pageview', url: origin + '/'}), null)
  const views = f.googleCommands().filter(command => command[0] === 'event').length
  f.setPage()
  assert.equal(f.googleCommands().filter(command => command[0] === 'event').length, views)
})

test('cross-tab decline or cleared storage kills the active document; unrelated storage events do not', () => {
  for (const next of ['declined', null]) {
    const f = fixture({stored: consentRecord('accepted')})
    f.setPage()
    f.emit('storage', {key: 'unrelated'})
    assert.equal(f.win[disableKey], false)
    if (next === null) f.storage.clear()
    else f.storage.set(consentKey, consentRecord(next))
    f.emit('storage', {key: next === null ? null : consentKey})
    assert.equal(f.win[disableKey], true)
    assert.equal(f.choices.at(-1), next)
    assert.equal(f.scripts[0].removed, true)
    assert.deepEqual(f.log.at(-1), ['reload', true])
    assert.equal(f.runtime.beforeSend({type: 'pageview', url: origin + '/'}), null)
  }
})

test('delayed Google queue and Vercel callbacks cannot send after withdrawal or disposal', () => {
  for (const action of ['withdraw', 'dispose']) {
    const f = fixture({stored: consentRecord('accepted')})
    f.setPage()
    const callback = f.injects[0].beforeSend
    if (action === 'withdraw') f.runtime.choose('declined')
    else f.runtime.dispose()
    f.flushGoogle()
    assert.deepEqual(f.googleRequests, [])
    assert.equal(callback({type: 'pageview', url: origin + '/'}), null)
    assert.equal(f.scripts[0].removed, true)
  }
})

test('blocked storage prevents acceptance and a storage failure during withdrawal still stops collection', () => {
  const blocked = fixture({storageFails: true})
  blocked.setPage()
  blocked.runtime.choose('accepted')
  assertUnloaded(blocked)
  assert.equal(blocked.choices.at(-1), null)
  const f = fixture({stored: consentRecord('accepted')})
  f.setPage()
  f.setStorageFailure(true)
  f.runtime.choose('declined')
  assert.equal(f.win[disableKey], true)
  assert.equal(f.choices.at(-1), 'declined')
  assert.equal(f.scripts[0].removed, true)
  assert.deepEqual(f.log.at(-1), ['reload', true])
})

test('dirty location and bfcache restoration cannot resume a loaded tracking document', () => {
  const f = fixture({stored: consentRecord('accepted')})
  f.setPage()
  f.setUrl('/#FICTIONAL_PRIVATE_FRAGMENT')
  f.emit('hashchange')
  assert.equal(f.win[disableKey], true)
  f.setUrl('/')
  f.setPage()
  assert.equal(f.win[disableKey], true)
  assert.equal(f.googleCommands().filter(command => command[0] === 'event').length, 1)
  const restored = fixture({stored: consentRecord('accepted')})
  restored.setPage()
  restored.emit('pagehide')
  restored.emit('pageshow', {persisted: true})
  assert.equal(restored.win[disableKey], true)
  assert.deepEqual(restored.log.at(-1), ['reload', true])
  const restoredViews = restored.googleCommands().filter(command => command[0] === 'event').length
  // A real history traversal can dispatch popstate after restoring from bfcache,
  // while location.reload() is still pending. The old document must stay dead.
  restored.emit('popstate')
  restored.setPage()
  restored.flushGoogle()
  assert.equal(restored.win[disableKey], true)
  assert.equal(restored.runtime.beforeSend({type: 'pageview', url: origin + '/'}), null)
  assert.equal(restored.googleCommands().filter(command => command[0] === 'event').length, restoredViews)
  assert.deepEqual(restored.googleRequests, [])
})

test('same clean pathname popstate resumes eligible filtering without a duplicate view, while dirty history stays stopped', () => {
  for (const dirtyEvent of ['hashchange', 'popstate']) {
    const f = fixture({stored: consentRecord('accepted')})
    f.setPage()
    f.emit('popstate')
    assert.equal(f.win[disableKey], false, dirtyEvent)
    assert.deepEqual(f.runtime.beforeSend({type: 'pageview', url: origin + '/'}), {type: 'pageview', url: origin + '/'})
    assert.equal(f.googleCommands().filter(command => command[0] === 'event').length, 1)
    assert.equal(f.vercelRequests.length, 1)

    f.setUrl('/#FICTIONAL_PRIVATE_HISTORY_FRAGMENT')
    f.emit(dirtyEvent)
    assert.equal(f.win[disableKey], true)
    assert.equal(f.runtime.beforeSend({type: 'pageview', url: origin + '/'}), null)

    f.setUrl('/')
    f.emit('popstate')
    assert.equal(f.win[disableKey], true)
    assert.equal(f.runtime.beforeSend({type: 'pageview', url: origin + '/'}), null)
    assert.equal(f.googleCommands().filter(command => command[0] === 'event').length, 1)
    assert.equal(f.vercelRequests.length, 1)
    assert.doesNotMatch(JSON.stringify([f.googleCommands(), f.vercelRequests]), /FICTIONAL_PRIVATE_HISTORY_FRAGMENT/)
    f.runtime.dispose()
  }
})

test('consent expiry kills an already loaded document without waiting for a route change', () => {
  const realNow = Date.now
  let now = 1_800_000_000_000
  Date.now = () => now
  try {
    const f = fixture({stored: consentRecord('accepted', now - policy.consentLifetime + 20)})
    f.setPage()
    assert.equal(f.win[disableKey], false)
    assert.equal(f.timers.size, 1)
    assert.equal([...f.timers.values()][0].delay, 20)
    now += 10
    f.runTimer()
    assert.equal(f.win[disableKey], false)
    assert.equal(f.timers.size, 1)
    assert.equal([...f.timers.values()][0].delay, 10)
    now += 10
    f.runTimer()
    assert.equal(f.choices.at(-1), null)
    assert.equal(f.win[disableKey], true)
    assert.equal(f.scripts[0].removed, true)
    assert.equal(f.timers.size, 0)
    assert.deepEqual(f.log.at(-1), ['reload', true])
    f.flushGoogle()
    assert.deepEqual(f.googleRequests, [])
    assert.equal(f.runtime.beforeSend({type:'pageview', url:origin + '/'}), null)
  } finally { Date.now = realNow }
})

test('long consent lifetimes use bounded browser timers and disposal cancels the outstanding check', () => {
  const realNow = Date.now
  let now = 1_800_000_000_000
  Date.now = () => now
  try {
    const f = fixture({stored: consentRecord('accepted', now)})
    f.setPage()
    const firstDelay = [...f.timers.values()][0].delay
    assert.equal(firstDelay, 2_147_483_647)
    now += firstDelay
    f.runTimer()
    assert.equal(f.timers.size, 1)
    assert.ok([...f.timers.values()][0].delay > 0)
    assert.ok([...f.timers.values()][0].delay <= 2_147_483_647)
    assert.equal(f.win[disableKey], false)
    f.runtime.dispose()
    assert.equal(f.timers.size, 0)
    assert.equal(f.win[disableKey], true)
  } finally { Date.now = realNow }
})

test('application root gates the controller on Production and never mounts the former unconditional Analytics component', async () => {
  const {default: RootLayout, metadata} = await import('../app/layout.tsx')
  const {default: PublicAnalytics} = await import('../app/components/PublicAnalytics.tsx')
  const {default: SiteChrome} = await import('../app/components/SiteChrome.tsx')
  const original = process.env.VERCEL_ENV
  function elements(node) {
    if (!node || typeof node !== 'object') return []
    if (Array.isArray(node)) return node.flatMap(elements)
    return [node, ...elements(node.props?.children)]
  }
  try {
    for (const env of ['production', 'preview', 'development', undefined]) {
      if (env === undefined) delete process.env.VERCEL_ENV
      else process.env.VERCEL_ENV = env
      const child = {type: 'div', props: {children: 'Public page fixture'}}
      const tree = RootLayout({children: child})
      const nodes = elements(tree)
      const controllers = nodes.filter(node => node.type === PublicAnalytics)
      assert.equal(controllers.length, 1)
      assert.equal(controllers[0].props.production, env === 'production')
      assert.equal(controllers[0].props.children.type, SiteChrome)
      assert.equal(controllers[0].props.children.props.children, child)
      assert.equal(nodes.some(node => typeof node.type === 'function' && node.type.name === 'Analytics'), false)
    }
    assert.equal(metadata.referrer, 'no-referrer')
  } finally {
    if (original === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = original
  }
})

test('only a resolved published puppy page renders the registration marker and never passes record details to it', async () => {
  const {default: PuppyDetailPage} = await import('../app/puppies/[slug]/page.tsx')
  const {PublishedPuppyAnalytics} = await import('../app/components/PublicAnalytics.tsx')
  const priorFetch = globalThis.fixtureSanityFetch
  const fetches = []
  let record = {_id:'FICTIONAL_RECORD_ID', name:'FICTIONAL_NAME', notes:'FICTIONAL_NOTES', slug:'girl-2-1', status:'reserved', litterStatus:'current'}
  globalThis.fixtureSanityFetch = async (...args) => { fetches.push(args); return record }
  try {
    const tree = await PuppyDetailPage({params: Promise.resolve({slug:'girl-2-1'})})
    const marker = tree.props.children.find(child => child?.type === PublishedPuppyAnalytics)
    assert.ok(marker)
    assert.deepEqual(marker.props, {slug:'girl-2-1'})
    assert.equal(fetches[0][2].perspective, 'published')
    record = null
    await assert.rejects(() => PuppyDetailPage({params: Promise.resolve({slug:'does-not-exist'})}), error => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404')
  } finally {
    if (priorFetch === undefined) delete globalThis.fixtureSanityFetch
    else globalThis.fixtureSanityFetch = priorFetch
  }
})
