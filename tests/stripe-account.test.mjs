import './register-typescript.mjs'
import {test,beforeEach} from 'node:test'
import assert from 'node:assert/strict'
const account=await import('../lib/stripe-account.ts')
const {getVerifiedStripe}=await import('../sanity/lib/stripe-merchant.ts')
beforeEach(()=>{
 for(const key of ['FLUFFYTAIL_PAYMENT_TEST_WORKSPACE','FLUFFYTAIL_STRIPE_ACCOUNT_MIGRATION','STRIPE_ACCOUNT_ID','STRIPE_LEGACY_LINKS_CLOSED','FLUFFYTAIL_STRIPE_TEST_ACCOUNT_ID','FLUFFYTAIL_JEANNE_STRIPE_SECRET_KEY','FLUFFYTAIL_JEANNE_STRIPE_WEBHOOK_SECRET'])delete process.env[key]
 process.env.VERCEL_ENV='production'
 globalThis.fixtureStripe={accounts:{retrieve:async()=>{throw new Error('Account should not be read in legacy mode')}}}
})

test('new credentials can be staged without changing legacy or Preview; cutover never falls back',()=>{
 Object.assign(process.env,{STRIPE_SECRET_KEY:'legacy-fixture',STRIPE_WEBHOOK_SECRET:'legacy-signature-fixture',FLUFFYTAIL_JEANNE_STRIPE_SECRET_KEY:'jeanne-fixture',FLUFFYTAIL_JEANNE_STRIPE_WEBHOOK_SECRET:'jeanne-signature-fixture'})
 assert.equal(account.stripeServerSecretKey(),'legacy-fixture');assert.equal(account.stripeWebhookSigningSecret(),'legacy-signature-fixture')
 process.env.FLUFFYTAIL_STRIPE_ACCOUNT_MIGRATION='1'
 assert.equal(account.stripeServerSecretKey(),'jeanne-fixture');assert.equal(account.stripeWebhookSigningSecret(),'jeanne-signature-fixture')
 delete process.env.FLUFFYTAIL_JEANNE_STRIPE_SECRET_KEY;delete process.env.FLUFFYTAIL_JEANNE_STRIPE_WEBHOOK_SECRET
 assert.equal(account.stripeServerSecretKey(),undefined);assert.equal(account.stripeWebhookSigningSecret(),undefined)
 process.env.VERCEL_ENV='preview'
 assert.equal(account.stripeServerSecretKey(),'legacy-fixture');assert.equal(account.stripeWebhookSigningSecret(),'legacy-signature-fixture')
})
test('merchant migration cannot activate with missing pins, Jason’s account, or an unclosed-link gate',()=>{
 process.env.FLUFFYTAIL_STRIPE_ACCOUNT_MIGRATION='1'
 for(const id of [undefined,'bad','acct_Other/path',account.previousFluffyTailStripeAccount,'acct_JeanneFixture']){
  if(id)process.env.STRIPE_ACCOUNT_ID=id;else delete process.env.STRIPE_ACCOUNT_ID
  assert.throws(()=>account.configuredStripeAccountId())
 }
 process.env.STRIPE_LEGACY_LINKS_CLOSED='1';assert.equal(account.configuredStripeAccountId(),'acct_JeanneFixture')
 assert.equal(account.retiredStripeRequest({workspace:'live-v1',testOnly:false}),true)
 assert.equal(account.retiredStripeRequest({workspace:'live-v1',testOnly:false,stripeAccountId:'acct_JeanneFixture'}),false)
 assert.throws(()=>account.requireStripeMetadataAccount({stripeAccountId:account.previousFluffyTailStripeAccount}))
})
test('Preview ignores an inherited production account and never relabels preserved mock history',async()=>{
 Object.assign(process.env,{VERCEL_ENV:'preview',FLUFFYTAIL_STRIPE_ACCOUNT_MIGRATION:'1',STRIPE_ACCOUNT_ID:'acct_JeanneFixture'})
 assert.equal(account.configuredStripeAccountId(),undefined);assert.deepEqual(account.stripeAccountMetadata(),{})
 assert.equal(account.retiredStripeRequest({workspace:'review-v1',testOnly:true}),false)
 assert.equal(await getVerifiedStripe(),globalThis.fixtureStripe)
 process.env.FLUFFYTAIL_STRIPE_TEST_ACCOUNT_ID='acct_IsolatedFixture'
 globalThis.fixtureStripe.accounts.retrieve=async()=>({id:'acct_IsolatedFixture',charges_enabled:false,payouts_enabled:false})
 assert.equal(await getVerifiedStripe(),globalThis.fixtureStripe)
 globalThis.fixtureStripe.accounts.retrieve=async()=>({id:'acct_JeanneFixture'})
 await assert.rejects(()=>getVerifiedStripe(),/credentials do not match/)
})
