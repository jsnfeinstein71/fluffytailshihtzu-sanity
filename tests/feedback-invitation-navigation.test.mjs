import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {setImmediate} from 'node:timers/promises'

const {createInvitationSession} = await import('../app/feedback/invitation-session.ts')
const caseyToken = 'a'.repeat(64) + '.' + 'b'.repeat(43)
const robinToken = 'c'.repeat(64) + '.' + 'd'.repeat(43)
const response = result => ({ok: true, json: async () => result})

function browserAt(hash) {
  const events = new EventTarget()
  const storage = new Map()
  const browser = {
    location: {hash, pathname: '/feedback', search: ''},
    history: {state: {keep: 'browser-state'}, replaceState(state, unused, url) {
      assert.deepEqual(state, {keep: 'browser-state'})
      assert.equal(url, '/feedback')
      browser.location.hash = ''
    }},
    sessionStorage: {getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key)},
    addEventListener: (...args) => events.addEventListener(...args),
    removeEventListener: (...args) => events.removeEventListener(...args),
    navigate(hash) { browser.location.hash = hash; events.dispatchEvent(new Event('hashchange')) },
  }
  return browser
}

test('native fetch receives the browser receiver instead of the controller options object', async () => {
  const browser = browserAt('#' + caseyToken), statuses = []
  const session = createInvitationSession({browser, fetch: async function (url, options) {
    assert.equal(this, browser, 'Window.fetch throws Illegal invocation with another receiver')
    assert.equal(url, '/api/feedback')
    assert.equal(JSON.parse(options.body).token, caseyToken)
    return response({status: 'ready', displayName: 'Casey C.'})
  }, onChange: () => {}, onStatus: value => statuses.push(value), onDefaults: () => {}})
  await session.refresh()
  assert.equal(statuses.at(-1), 'ready')
  session.dispose()
})

test('opening another family invitation in the same tab replaces used confirmation and clears prior-family state', async () => {
  const browser = browserAt('#' + caseyToken), statuses = [], defaults = [], requests = []
  let changes = 0
  const session = createInvitationSession({browser, fetch: async (url, options) => {
    requests.push(JSON.parse(options.body).token)
    return response(requests.at(-1) === caseyToken ? {status: 'used'} : {status: 'ready', displayName: 'Robin R.', puppyName: 'Fern'})
  }, onChange: () => changes++, onStatus: value => statuses.push(value), onDefaults: value => defaults.push(value)})
  await session.refresh()
  assert.equal(statuses.at(-1), 'used')
  const previous = session.snapshot()
  browser.navigate('#' + robinToken)
  await setImmediate()
  assert.equal(browser.location.hash, '')
  assert.equal(changes, 2)
  assert.equal(statuses.at(-1), 'ready')
  assert.equal(defaults.at(-1).displayName, 'Robin R.')
  assert.deepEqual(requests, [caseyToken, robinToken])
  assert.equal(session.isCurrent(previous), false, 'late old-family submit results must be ignored')
  session.dispose()
})

test('late previous-family status response is aborted and cannot replace the new family', async () => {
  const browser = browserAt('#' + caseyToken), statuses = [], defaults = [], signals = []
  let finishCasey
  const session = createInvitationSession({browser, fetch: async (url, options) => {
    signals.push(options.signal)
    if (JSON.parse(options.body).token === caseyToken) return new Promise(resolve => {finishCasey = resolve})
    return response({status: 'ready', displayName: 'Robin R.'})
  }, onChange: () => {}, onStatus: value => statuses.push(value), onDefaults: value => defaults.push(value)})
  const first = session.refresh()
  browser.navigate('#' + robinToken)
  await setImmediate()
  assert.equal(signals[0].aborted, true)
  finishCasey(response({status: 'ready', displayName: 'Casey C.'}))
  await first
  assert.equal(statuses.at(-1), 'ready')
  assert.deepEqual(defaults.map(value => value.displayName), ['Robin R.'])
  session.dispose()
})

test('retry and skip-to-content retain the current draft while invalid replacement clears old invitation', async () => {
  const browser = browserAt('#' + caseyToken), statuses = []
  let changes = 0, requests = 0, draft = ''
  const session = createInvitationSession({browser, fetch: async () => {
    requests++
    if (requests === 2) throw new Error('offline')
    return response({status: 'ready', displayName: 'Casey C.'})
  }, onChange: () => { changes++; draft = '' }, onStatus: value => statuses.push(value), onDefaults: () => {}})
  await session.refresh()
  draft = 'Keep these personally written words and the attached photo.'
  browser.navigate('#site-content')
  await setImmediate()
  assert.equal(requests, 1)
  await session.refresh()
  assert.equal(statuses.at(-1), 'unavailable')
  await session.refresh()
  assert.equal(statuses.at(-1), 'ready')
  assert.equal(changes, 1)
  assert.equal(draft, 'Keep these personally written words and the attached photo.')
  browser.navigate('#broken-invitation')
  await setImmediate()
  assert.equal(changes, 2)
  assert.equal(draft, '')
  assert.equal(statuses.at(-1), 'invalid')
  assert.equal(session.snapshot().token, '')
  assert.equal(browser.location.hash, '')
  session.dispose()
  browser.navigate('#' + robinToken)
  await setImmediate()
  assert.equal(requests, 3, 'unmounted form must no longer handle hash changes')
})
