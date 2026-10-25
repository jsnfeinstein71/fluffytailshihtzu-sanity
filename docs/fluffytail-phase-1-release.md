# FluffyTail Phase 1 Pricing And Release

Status: implementation prepared for review; NOT approved for production.
Branch: codex/phase-1-pricing-reliability.
This supersedes the earlier inventory audit's pricing/auth findings for this branch only. Production parity must be verified after an approved deployment.

## Pricing Contract

- Sanity litter.deposit supplies the deposit. Read-only inspection found $400 deposits and $1,600 default totals on the current/expected litters.
- puppy.overridePrice wins over litter.price. Null/unset uses the litter default; zero, strings, negative, nonfinite and fractional-cent values are errors, not fallback signals.
- All payment creation validates integer USD cents server-side. Deposit cannot exceed total. Initial balance = total minus deposit; subsequent balance = total minus actual paid paymentRecord amounts.
- Missing/inconsistent pricing, ambiguous slugs, missing litter associations and recorded overpayments block creation. No arbitrary default is substituted.
- lib/pricing.ts is shared by pages and payment creation. Litter default prices are labeled; puppy overrides are included in the Pricing page range.
- Public inventory can be cached for up to 60 seconds. Payment creation and short-link validation bypass cache.
- The deposit is part of the puppy price, not an additional fee. Historical $300 payments remain $300 records; they are never rewritten to $400.
- Authenticated partial-payment amounts remain operator-selected, but are validated against the actual outstanding balance. Browser total/deposit/name/litter values do not determine puppy pricing or association.

## Behavior Changes

| Before | After on this branch |
| --- | --- |
| Public Stripe creation endpoints, hardcoded $300 deposit | Protected /inbox/api creation endpoints using Sanity pricing |
| Public SMS send/upload operator endpoints | /inbox/api/sms-send and /inbox/api/upload-image; old public paths removed |
| Proxy-only deletion protection | Proxy plus in-handler authentication |
| Missing Basic Auth configuration could leave protection ineffective | Fail closed with 503; invalid credentials receive 401; cross-origin mutations receive 403 |
| Inbox/short links use anonymous CMS reads | Server token, published perspective and no-store |
| Multiple deposit checkouts could be issued for one puppy | One conditional-revision claim per puppy, one-hour quote, Stripe idempotency on the token |
| Completed event could imply paid | Only signed paid sessions recorded; asynchronous success supported |
| Ledger deposit could disagree with Stripe | Actual amount_total/amount_paid recorded; quote and puppy/litter IDs checked |
| Success URL always claims payment | Server retrieves Stripe session; unpaid/missing/unavailable sessions do not claim success |
| Old short links redirect without checking prices | Only new unexpired, eligible, price-matching quotes redirect to checkout.stripe.com |

No live credentials changed; no migrations, real payments, real messages, production deployment or merge performed.
Old operator paths intentionally return 404. Update external operator automation to /inbox/api with existing Inbox Basic Auth.

## Operator API Review

- Deposit, manual payment, invoice, SMS/MMS, upload and deletion require requireOperator before parsing/provider calls. Proxy protects the entire Inbox and applies private/no-store.
- Upload accepts supported raster images up to 10 MB. Sanity CDN URLs remain shareable; authenticated upload does not make an asset private.
- Payment metadata contains server-selected puppy/litter IDs and names. Confirmation exposes no customer contact data.
- Stripe webhook remains public for Stripe, but requires its signature/secret. Recording is transactional with deterministic IDs; historical records are preserved.
- Tally inquiry and Twilio inbound are provider callbacks, NOT operator actions. Existing production handlers still lack signature validation/deduplication. Resolve this with provider configuration and a separately reviewed patch, or explicitly accept the risk, before approving production.
- Moving server reads does NOT protect documents that the Sanity dataset itself permits anonymously. Verify restrictive document-level read permissions or separate operational data. Do not make the dataset private blindly: public content currently uses anonymous reads.
- Changed operator/payment code avoids logging customer payloads. Existing provider callback logging/alerts are not comprehensively remediated.

## Preview Isolation

- VERCEL_ENV=preview rejects live Stripe keys. Use test credentials and test webhook secret only.
- Operator data access rejects the production Sanity dataset in preview. Use synthetic content in a separate dataset and a token scoped only to it.
- Outbound SMS and both provider callbacks are disabled in preview, preventing inherited production settings from causing messages/provider writes.
- Read-only public production inventory may be used for layout inspection, but this does not enable payment testing. Never copy production customers/leads/messages/payments into preview.
- Generated preview payment URLs stay on the preview host, not an inherited production SITE_URL.
- Do not point live Tally/Twilio/Stripe webhooks at preview. A Stripe test endpoint may target preview after data isolation is configured.
- No credentials are added by this patch. Keep values out of docs/GitHub.

## Verified Locally

- 34 passing tests: original 11 inventory tests plus 23 payment/auth/preview tests.
- Actual TSX/GROQ execute against in-memory fixtures; all payment/operational mutations are mocked. Webhook tests generate/validate signatures offline with the Stripe SDK.
- Default/override pricing, $400 deposits, balance calculations, malformed inputs, browser forgery, puppy/litter associations, reservation eligibility, historical amounts, duplicate/async events, invoice credits, short-link checks, confirmation, CSRF and unauthorized routes covered.
- TypeScript and lint pass; ten image-optimization warnings remain.
- All ten registered Sanity schemas compile locally. This is not a Studio deployment or live content validation.
- npm ci --dry-run --ignore-scripts --offline succeeds after lock repair.
- Lockfile restores already-declared Stripe/Twilio/Analytics and missing peer/transitive records; five existing transitive resolutions align with the working installed tree. No package.json dependency declarations changed.
- Production build fails locally fetching the existing Geist/Geist Mono Google fonts. Do not replace fonts merely to hide this environmental failure.
- Full offline lock regeneration lacked an optional platform package in cache; network-enabled installation/build is mandatory.
- Browser access was previously denied. No desktop/mobile screenshots or live Checkout QA are claimed.

## Required Before Approval

1. Pass the GitHub Phase 1 Verification workflow: network-enabled npm ci, tests, lint, Next route types, TypeScript and production build. It uses no production secrets.
2. Confirm Vercel project/repo linkage and production branch main. Build this branch as Preview only; never promote or change production domains.
3. Inspect preview routes, real photos/fonts, missing puppy 404s and 390px/768px/desktop layouts. Reserved puppies must remain in their litter.
4. Check Inbox/operator endpoints: 401 unauthenticated, 503 unconfigured, 403 foreign origin; old public actions and /test-stripe are 404.
5. Configure isolated synthetic Sanity data, including $1,600/$400 and a puppy override. Exercise Stripe TEST Checkout/invoice, signed duplicate/async events and reservation state. Never initiate a real payment.
6. In production Stripe, inspect/expire obsolete unpaid $300 sessions and reconcile delayed/pending payments before replacements. Existing direct Stripe URLs cannot be revoked by a repo patch. Preserve paid historical records.
7. Verify webhook subscriptions: checkout.session.completed, checkout.session.async_payment_succeeded, invoice.paid; existing production secret, delivery retries and Sanity write permissions.
8. Confirm Inbox credentials/server token for each intended environment, production operational-data read permissions, and resolution/explicit acceptance of unsigned provider-callback risks.
9. Obtain explicit approval before merge to main or production deployment. After approval/deployment, verify pricing freshness, an authorized CMS publication and webhook reconciliation. Live transactions need separate authorization.

## Remaining Financial Risks

- Issued Stripe sessions/invoices are price snapshots. CMS edits cannot rewrite them. Short-link validation and one-hour expiry reduce exposure; direct Stripe links need dashboard expiry/reissue.
- Multiple distinct partial links/invoices may still be issued before any settles. Avoid overlapping outstanding links; retire old ones and reconcile the ledger before replacements.
- Delayed payments can settle after quote expiry. Review pending sessions before reissuing; reconcile late/duplicate payments.
- Refunds, disputes, out-of-band payments, changed legacy slugs and manual records require operator reconciliation. No migration/refund engine is introduced.
- Stripe success followed by Sanity/network failure may need event retry or manual invoice-record reconciliation. Deposit retries are idempotent; invoice/manual-link retry behavior remains operator-driven.
- New validation does not repair invalid live content; audit before publication. Past litters need not be migrated just for display.

## Phase 2 Handoff (Not Implemented)

After Phase 1 verification/approval: "FluffyTail Website - Brand Integration & UX Redesign".
Use the existing Shih Tzu silhouette logo; Warm Brown #58493D; Champagne #D8BD9D; Cormorant Garamond SemiBold headings; Acumin Pro Regular body; "Tiny Paws, Big Love"; real FluffyTail photography; mobile-first layouts; simpler navigation and direct inquiry. No visual redesign is included now.

## Exact Release Files

Includes the preceding authorized inventory work and this pricing/security follow-up.

### Added (23)

- .github/workflows/phase-1-verification.yml
- app/components/LitterSection.tsx
- app/components/LitterTile.tsx
- app/components/PuppyCard.tsx
- app/inbox/api/create-deposit-session/route.ts
- app/inbox/api/create-invoice/route.ts
- app/inbox/api/create-payment-link/route.ts
- app/inbox/api/sms-send/route.ts
- app/inbox/api/upload-image/route.ts
- docs/fluffytail-phase-1-release.md
- docs/fluffytail-reliability-audit.md
- lib/inventory.ts
- lib/operator-auth.ts
- lib/pricing.ts
- sanity/lib/inventory-queries.ts
- sanity/lib/inventory.ts
- sanity/lib/operator-client.ts
- sanity/lib/payment-context.ts
- sanity/schemaTypes/dog.ts
- scripts/preview-inventory.mjs
- tests/inventory.test.mjs
- tests/payments.test.mjs
- tests/register-typescript.mjs

### Modified (35)

- app/about/page.tsx
- app/api/fluffytail/inquiry/route.ts
- app/api/fluffytail/sms/inbound/route.ts
- app/api/stripe/webhook/route.ts
- app/available-puppies/page.tsx
- app/contact/page.tsx
- app/home.css
- app/inbox/InboxClient.tsx
- app/inbox/api/delete-conversation/route.ts
- app/inbox/page.tsx
- app/layout.tsx
- app/page.tsx
- app/pay/[token]/page.tsx
- app/payment-success/page.tsx
- app/pricing/page.tsx
- app/privacy-policy/page.tsx
- app/puppies/[slug]/page.tsx
- app/puppy-inquiry/page.tsx
- app/puppy-resources/page.tsx
- app/sitemap.ts
- app/terms-and-conditions/page.tsx
- app/the-breed/page.tsx
- app/upcoming-litters/page.tsx
- docs/fluffytail-codex-ops.md
- docs/fluffytail-system-map.md
- package-lock.json
- package.json
- proxy.ts
- sanity/lib/stripe.ts
- sanity/schemaTypes/depositLink.ts
- sanity/schemaTypes/index.ts
- sanity/schemaTypes/invoiceRecord.ts
- sanity/schemaTypes/litter.ts
- sanity/schemaTypes/paymentRecord.ts
- sanity/schemaTypes/puppy.ts

### Removed (5)

- app/api/fluffytail/sms/send/route.ts
- app/api/fluffytail/upload-image/route.ts
- app/api/stripe/create-deposit-session/route.ts
- app/api/stripe/create-invoice/route.ts
- app/api/stripe/create-payment-link/route.ts

## Publishing Blocker And Commands

GitHub create-tree was refused because the tool requires approval and this session has approval_policy=never. Local .git is read-only. No remote tree, commit, branch, PR or Vercel preview was created. The Vercel plugin installation was confirmed, but deployment tools were not exposed in this running session. The workflow above has not run remotely.

After reviewing the files, run these in a normal authorized terminal with GitHub push access. The list is scoped to this prepared release, rather than staging every unrelated future change.

```powershell
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) { throw 'Review existing staged changes before proceeding.' }
git switch -c codex/phase-1-pricing-reliability
if ($LASTEXITCODE -ne 0) { throw 'Branch creation failed; do not continue on main.' }
$files = @(
  'app/about/page.tsx',
  'app/api/fluffytail/inquiry/route.ts',
  'app/api/fluffytail/sms/inbound/route.ts',
  'app/api/fluffytail/sms/send/route.ts',
  'app/api/fluffytail/upload-image/route.ts',
  'app/api/stripe/create-deposit-session/route.ts',
  'app/api/stripe/create-invoice/route.ts',
  'app/api/stripe/create-payment-link/route.ts',
  'app/api/stripe/webhook/route.ts',
  'app/available-puppies/page.tsx',
  'app/contact/page.tsx',
  'app/home.css',
  'app/inbox/InboxClient.tsx',
  'app/inbox/api/delete-conversation/route.ts',
  'app/inbox/page.tsx',
  'app/layout.tsx',
  'app/page.tsx',
  'app/pay/[token]/page.tsx',
  'app/payment-success/page.tsx',
  'app/pricing/page.tsx',
  'app/privacy-policy/page.tsx',
  'app/puppies/[slug]/page.tsx',
  'app/puppy-inquiry/page.tsx',
  'app/puppy-resources/page.tsx',
  'app/sitemap.ts',
  'app/terms-and-conditions/page.tsx',
  'app/the-breed/page.tsx',
  'app/upcoming-litters/page.tsx',
  'docs/fluffytail-codex-ops.md',
  'docs/fluffytail-system-map.md',
  'package-lock.json',
  'package.json',
  'proxy.ts',
  'sanity/lib/stripe.ts',
  'sanity/schemaTypes/depositLink.ts',
  'sanity/schemaTypes/index.ts',
  'sanity/schemaTypes/invoiceRecord.ts',
  'sanity/schemaTypes/litter.ts',
  'sanity/schemaTypes/paymentRecord.ts',
  'sanity/schemaTypes/puppy.ts',
  '.github/workflows/phase-1-verification.yml',
  'app/components/LitterSection.tsx',
  'app/components/LitterTile.tsx',
  'app/components/PuppyCard.tsx',
  'app/inbox/api/create-deposit-session/route.ts',
  'app/inbox/api/create-invoice/route.ts',
  'app/inbox/api/create-payment-link/route.ts',
  'app/inbox/api/sms-send/route.ts',
  'app/inbox/api/upload-image/route.ts',
  'docs/fluffytail-phase-1-release.md',
  'docs/fluffytail-reliability-audit.md',
  'lib/inventory.ts',
  'lib/operator-auth.ts',
  'lib/pricing.ts',
  'sanity/lib/inventory-queries.ts',
  'sanity/lib/inventory.ts',
  'sanity/lib/operator-client.ts',
  'sanity/lib/payment-context.ts',
  'sanity/schemaTypes/dog.ts',
  'scripts/preview-inventory.mjs',
  'tests/inventory.test.mjs',
  'tests/payments.test.mjs',
  'tests/register-typescript.mjs'
)
git --literal-pathspecs add -- $files
if ($LASTEXITCODE -ne 0) { throw 'Staging failed.' }
git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Fix staged whitespace errors before committing.' }
git diff --cached --stat
git commit -m "Prepare Phase 1 Sanity pricing and operator safety release"
if ($LASTEXITCODE -ne 0) { throw 'Commit failed; do not push.' }
git push -u origin codex/phase-1-pricing-reliability
```

Open a DRAFT pull request against main, allow CI to run, then deploy this branch to Vercel Preview only after confirming project/preview environment isolation. Do not merge/promote until all gates pass and the owner explicitly approves the release.
