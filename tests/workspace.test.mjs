import './register-typescript.mjs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
const {families, initialState, matchesFamily, paymentSummary, reviewReducer, workspaceAllowed, draftKey} = await import('../app/inbox/workspace/model.ts')
const {requireOperator} = await import('../lib/operator-auth.ts')
const {default: WorkspacePage} = await import('../app/inbox/workspace/page.tsx')

test('workspace is preview/development only and never enabled by production NODE_ENV alone', () => {
  assert.equal(workspaceAllowed('production','development'), false)
  assert.equal(workspaceAllowed('production','production'), false)
  assert.equal(workspaceAllowed(undefined,'production'), false)
  assert.equal(workspaceAllowed('preview','production'), true)
  assert.equal(workspaceAllowed(undefined,'development'), true)
})

test('actual workspace route refuses production and unconfigured optimized builds', () => {
  const previous = process.env.VERCEL_ENV
  try {
    process.env.VERCEL_ENV = 'production'
    assert.throws(() => WorkspacePage(), /NEXT_HTTP_ERROR_FALLBACK;404/)
    delete process.env.VERCEL_ENV
    assert.throws(() => WorkspacePage(), /NEXT_HTTP_ERROR_FALLBACK;404/)
    process.env.VERCEL_ENV = 'preview'
    assert.ok(WorkspacePage())
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = previous
  }
})

test('workspace requires existing operator authentication even though its review records are fictional', () => {
  const previous = [process.env.INBOX_BASIC_AUTH_USER,process.env.INBOX_BASIC_AUTH_PASS]
  try {
    process.env.INBOX_BASIC_AUTH_USER = 'fixture-operator'
    process.env.INBOX_BASIC_AUTH_PASS = 'fixture-only-password'
    const denied = requireOperator(new Request('http://localhost/inbox/workspace'))
    assert.equal(denied.status,401)
    assert.match(denied.headers.get('Cache-Control'),/no-store/)
    const authorization = `Basic ${Buffer.from('fixture-operator:fixture-only-password').toString('base64')}`
    assert.equal(requireOperator(new Request('http://localhost/inbox/workspace',{headers:{authorization}})),null)
  } finally {
    for (const [index,key] of ['INBOX_BASIC_AUTH_USER','INBOX_BASIC_AUTH_PASS'].entries()) {
      if (previous[index] === undefined) delete process.env[key]
      else process.env[key] = previous[index]
    }
  }
})

test('drafts are independent per family and channel; failed and ambiguous attempts retain them', () => {
  let state = initialState()
  state = reviewReducer(state,{type:'draft',familyId:'morgan',channel:'Email',body:'Email details'})
  state = reviewReducer(state,{type:'draft',familyId:'morgan',channel:'Text',body:'Pickup details'})
  state = reviewReducer(state,{type:'draft',familyId:'avery',channel:'Email',body:'Deposit details'})
  state = reviewReducer(state,{type:'attempt',familyId:'morgan',channel:'Text',outcome:'failed'})
  assert.equal(state.drafts[draftKey('morgan','Text')],'Pickup details')
  state = reviewReducer(state,{type:'attempt',familyId:'morgan',channel:'Text',outcome:'review'})
  assert.equal(state.attempts.length,2)
  const blocked = reviewReducer(state,{type:'attempt',familyId:'morgan',channel:'Text',outcome:'simulated'})
  assert.equal(blocked.attempts.length,2)
  assert.match(blocked.error,/already/)
  assert.equal(blocked.drafts[draftKey('morgan','Text')],'Pickup details')
  assert.equal(blocked.drafts[draftKey('morgan','Email')],'Email details')
  assert.equal(blocked.drafts[draftKey('avery','Email')],'Deposit details')
})

test('SMS without consent is rejected by workflow logic and retains the draft', () => {
  const state = reviewReducer(initialState(),{type:'draft',familyId:'avery',channel:'Text',body:'Not permitted'})
  const blocked = reviewReducer(state,{type:'attempt',familyId:'avery',channel:'Text',outcome:'simulated'})
  assert.equal(blocked.attempts.length,0)
  assert.match(blocked.error,/consent/)
  assert.equal(blocked.drafts[draftKey('avery','Text')],'Not permitted')
})

test('search finds a puppy mentioned in an inquiry before the family is associated with that puppy', () => {
  const riley = families.find(f => f.id === 'riley')
  assert.equal(riley.puppyId,undefined)
  assert.equal(matchesFamily(riley,'  clover '),true)
  assert.equal(matchesFamily(riley,'no such puppy'),false)
  assert.equal(matchesFamily(families.find(f => f.id === 'morgan'),'PIPPIN'),true)
})

test('switching context clears a stale delivery error without losing drafts or attempt history', () => {
  let state = reviewReducer(initialState(),{type:'draft',familyId:'avery',channel:'Text',body:'Keep this draft'})
  state = reviewReducer(state,{type:'attempt',familyId:'avery',channel:'Text',outcome:'simulated'})
  assert.match(state.error,/consent/)
  const next = reviewReducer(state,{type:'clear-error'})
  assert.equal(next.error,'')
  assert.deepEqual(next.drafts,state.drafts)
  assert.deepEqual(next.attempts,state.attempts)
})

test('a successful simulation clears only its draft and cannot duplicate or change financial records', () => {
  const family = families.find(f => f.id === 'morgan')
  const original = structuredClone(families)
  const financial = paymentSummary(family)
  let state = reviewReducer(initialState(),{type:'draft',familyId:'morgan',channel:'Email',body:'Here are the details'})
  state = reviewReducer(state,{type:'attempt',familyId:'morgan',channel:'Email',outcome:'simulated'})
  assert.equal(state.drafts[draftKey('morgan','Email')],'')
  assert.equal(state.attempts.length,1)
  state = reviewReducer(state,{type:'draft',familyId:'morgan',channel:'Email',body:'Here are the details'})
  state = reviewReducer(state,{type:'attempt',familyId:'morgan',channel:'Email',outcome:'simulated'})
  assert.equal(state.attempts.length,1)
  assert.deepEqual(paymentSummary(family),financial)
  assert.deepEqual(families,original)
})

test('payment review uses confirmed amounts, preserves individual prices and flags overpayment', () => {
  const family = families.find(f => f.id === 'morgan')
  assert.equal(paymentSummary(family).remainingCents,120000)
  assert.equal(paymentSummary({...family,records:[...family.records,{paymentStatus:'pending',amountPaid:1200}]}).remainingCents,120000)
  assert.equal(paymentSummary(families.find(f => f.id === 'jordan')),null)
  assert.throws(() => paymentSummary({...family,records:[{paymentStatus:'paid',amountPaid:1800}]}),/exceed/)
})

test('pickup checklists and notes stay local, family-specific, immutable and resettable', () => {
  const original = initialState()
  let next = reviewReducer(original,{type:'check',familyId:'avery',item:'CKC registration papers'})
  next = reviewReducer(next,{type:'note',familyId:'avery',body:'  Confirm timing together.  '})
  assert.deepEqual(original.checks.avery,[])
  assert.deepEqual(next.checks.avery,['CKC registration papers'])
  assert.deepEqual(next.checks.morgan,original.checks.morgan)
  assert.deepEqual(next.notes.avery,['Confirm timing together.'])
  assert.equal(next.notes.morgan,undefined)
  assert.equal(reviewReducer(next,{type:'check',familyId:'avery',item:'Unsupported medical schedule'}),next)
  assert.deepEqual(reviewReducer(next,{type:'reset'}),initialState())
})
