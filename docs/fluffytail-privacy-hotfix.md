# Independent Privacy Hotfix Readiness

Date: 2026-10-25 (America/Chicago). Local branch: `codex/historical-sanity-privacy`.
Base: freshly fetched `main`, `96958dc2540afb6d17e3a0028ce091d2d514e96e`.
Status: publication and a separate draft PR are authorized for commit `2a590363c81b03087409eccf718363855711fcc0`, pending safe branch-specific preview isolation. NOT deployed, NOT permission to migrate. PR #2 remains draft at `9f71a693955eb1af68dfd4a57667b820eee49bd6`; none of its native form, layout, inventory, pricing, legal-copy or route-move changes are included.

## Exact Behavior Changes

- Inbox and `/pay/[token]` use a new `server-only` authenticated client, rejecting a missing `SANITY_API_WRITE_TOKEN` instead of falling back to anonymous reads. The public content client stays anonymous and unchanged. Reader API version remains the configured content-reader version with published perspective; existing writer clients retain their exact `2025-01-01` configuration and token behavior.
- All eight operational create sites now assign `private.<kind>.<sha256(randomUUID)>` IDs: inquiry, transactional operator alerts, inbound SMS, outbound SMS, deposit link, invoice and both webhook payment-record branches. Business fields and provider payloads are unchanged. No new provider-event deduplication or pricing behavior is smuggled into the ID change.
- Operational reads explicitly bypass Next's data cache. Inbox becomes request-rendered instead of ten-second revalidation; its existing Basic Auth proxy adds private/no-store to authorized HTML/RSC responses. Pay remains dynamic/no-store and remains public by bearer token; it is NOT placed behind Inbox Basic Auth.
- Studio removes operational creation templates and the Duplicate action for the five sensitive types. It also prevents Publish on root/unknown operational IDs, including template-less create intents; legacy root records therefore cannot be republished/updated via Studio until migration. Private operational IDs (including their drafts) retain normal publishing, and puppy/litter creation is unchanged. This is a necessary, narrow Studio workflow restriction, not a new datastore ACL: authorized direct API clients, history restore or unknown external writers can still violate the ID convention and must be included in cutover ownership/monitoring.
- A single **default-off** server-only switch, `FLUFFYTAIL_WRITE_FREEZE=1`, causes all nine mutation routes to return 503, `Retry-After: 60`, and no-store before body parsing, provider calls or persistence. Routes: inquiry; inbound/outbound SMS; image upload; deposit/manual-payment/invoice creation; Stripe webhook; Inbox deletion. Reads remain available. Other values/unset preserve the normal path. No endpoint exposes a way to toggle the switch; it is operator-managed Vercel configuration requiring approval and redeployment.
- Freeze is necessary because the legacy inbound handler catches Sanity errors and still acknowledges the sender. Do NOT freeze merely by revoking the Sanity token. 503 is not a guarantee of provider retries; retry/fallback/submission recovery must be verified before enabling it. The switch does not freeze Studio or direct API writers.

Unchanged: Stripe credentials/settings/object metadata, existing token strings, external URLs/callback paths, Twilio payloads/TwiML, Tally field parsing/consent, Inbox grouping/deletion logic, invoice credits, puppy statuses and payment amounts. No live messages/transactions were initiated, no customer records deleted and no Sanity subscription/visibility change made.
The old public operator API perimeter and unsigned Tally/Twilio callback behavior also remain unchanged; this is not a claim that the full Phase 1 security release is complete. Its scope is storage privacy, compatible reads and a safe maintenance barrier. PR #2 remains separate work for those existing risks.

**Important pricing boundary:** current `main` still has the legacy $300 Checkout/ledger behavior. This hotfix deliberately preserves it to avoid making a payment release under a privacy change. Sanity's configured $400 and PR #2's pricing correction remain separate, known release work. Do not treat privacy-hotfix approval as approval of the old pricing or the full Phase 1 release.

## Three Active Links And Historical Compatibility

Read-only, value-redacted production metadata inspection reconfirmed **three active deposit links**. Each has a nonempty token, HTTPS `checkout.stripe.com` URL and one puppy match, and lacks the newer quote/expiry fields. No token, customer value, Checkout URL or Stripe ID was displayed. The prior [54-record inventory](fluffytail-sanity-privacy-inventory.json) remains the redacted baseline; refresh it under the approved freeze.

The hotfix keeps the exact legacy query `_type == "depositLink" && token == $token` and `active && stripeCheckoutUrl` decision. It does not add quote-version, expiry or puppy-eligibility restrictions, derive an ID from the token, redirect inactive links or rewrite provider metadata. Tests invoke the actual Pay page for three legacy active shapes in root, mixed and fully migrated private namespaces and verify the original destinations. Inactive, missing and URL-less records retain 404 behavior. No real Stripe checkout was opened; actual provider session expiry/payability is not verified by a Sanity active flag.

The actual Inbox and invoice/webhook handlers are tested against root and private historical records. Session/invoice/SID/token/customer/puppy joins remain field-based; returned IDs stay opaque for patch/deletion. Webhook tests use offline SDK-generated Stripe signatures and confirm existing reservation/deactivation/invoice update and duplicate-lookup behavior. Existing provider metadata must remain unchanged during the data migration too.

## Verification Results

- Commit `2a59036`: **33 passing tests**, comprising 19 hotfix compatibility tests and 14 migration/backup tests. The review-verification follow-up adds one test (34 total): valid synthetic Stripe and Twilio callbacks return 503, never a success acknowledgement, without reads/writes/provider calls while frozen; explicit local redelivery after unfreeze succeeds. This does not prove provider retry settings. No PR #2 runtime code is needed. Independent review identified template-less Studio publishing and migration recheck draft/reference drift; both were reproduced, corrected and regression-tested.
- `npx next typegen` and `npm run typecheck`: pass.
- Scoped ESLint covering every changed runtime file, migration helper and all tests: pass with no warnings/errors.
- Full `npm run lint`: **eight pre-existing errors and fourteen warnings** on untouched `main` views (mostly old Home anchors and image recommendations). `node scripts/check-privacy-lint.mjs` compares each current diagnostic to ESLint results for its original source at the exact base above: **zero new diagnostics**. No unrelated navigation/layout fix or rule suppression is included. This is not a clean full-lint claim; the differential CI gate accepts only the inherited baseline, while repository-wide lint remains red until separately resolved/accepted.
- `npm ci --ignore-scripts --no-audit --no-fund`: clean install passes. `npm run build`: production build passes, including all routes and embedded Studio. Inbox and Pay are dynamic. Build used public Sanity configuration and explicitly fake Stripe/Twilio values needed by existing module-level SDK initialization; no live secrets or provider requests were used. Dependency lifecycle scripts were not executed by the clean-install check.
- `main`'s lockfile originally failed `npm ci` because declared Stripe/Twilio/Analytics and peers were absent/inconsistent. The minimal repair uses the already-CI-verified lockfile for the identical dependency declarations from commit `9f71a69`, not a branch merge. Package dependency declarations remain unchanged. A fresh resolver's broader peer upgrades were discarded; no app feature code was copied with the lockfile.
- The 54-record synthetic rehearsal preserves every business field/timestamp, rewrites only mapped internal references, preserves public query results, resolves historical payments and models anonymous count zero. Collision/revision/new-root/draft/outside-reference/size gates fail closed.
- AES-256-GCM backup rehearsal covers wrong-key/tamper rejection and encrypted exclusive-create file output followed by restoration in a separate Node process. Only synthetic data and an ephemeral test key were used; no plaintext backup was written. Temporary synthetic files were removed. No real encrypted customer backup/key escrow or Sanity-hosted mutation rehearsal exists yet.
- No browser access/permission workarounds, deployment, main push, migration, provider-setting changes, account changes or Phase 2 work occurred. The owner authorized Vercel access, and a metadata retry succeeded. The owner explicitly confirmed isolated preview settings are **not ready** and directed that publication remain blocked. The branch-specific environment metadata query returned no configured entries; no values were decrypted. No branch push, draft PR creation, remote CI or hotfix preview build has occurred. Do not infer isolation from missing branch overrides, since shared configuration may still apply.

### Review Verification Follow-Up Scope

No runtime changes beyond `2a59036`. Additional verification files are `.github/workflows/privacy-hotfix-verification.yml` and `scripts/check-privacy-lint.mjs`; the existing callback test file and this runbook are updated. The workflow uses Node 24, the existing lockfile, synthetic mocked operational tests, baseline-aware lint, type generation, TypeScript and a production build. It has read-only GitHub permissions, no deploy step and no provider or Sanity write credentials. Build-time public puppy/litter reads use the existing public content configuration; operational tests replace it with synthetic fixtures. It does not change PR #2's workflow or branch.

The real execution manifest is **not ready for authorization yet**: the committed 54-row inventory is redacted, not an executable ID/revision manifest. The offline planner and encrypted-backup/restore rehearsal are ready, but a reviewed execution/storage adapter, owner-only backup location, separately escrowed key, real encrypted backup/restore proof and freshly frozen revisions/digests remain required. Nothing in review publication authorizes those production actions.

## Exact Approval And Cutover Sequence

These are future steps, not actions performed. Preserve PR #2 as draft throughout this privacy-only release.

### A. Review And Isolated Rehearsal

1. **Publication/isolation authorized; configuration pending:** publish `2a59036` and the bounded verification follow-up as a separate draft PR against `main` only after confirming the correct Vercel project/team and non-production target. No production merge/promotion is authorized. A branch push can deploy automatically.
   Before the preview push, set branch-specific Preview `FLUFFYTAIL_WRITE_FREEZE=1` for `codex/historical-sanity-privacy`, use an approved synthetic-only dataset/token and remove inherited live provider credentials. Do not change shared Preview settings used by PR #2 or Production settings. This legacy-based hotfix does not inherit PR #2's preview guards. Do not submit the embedded Tally form: it can notify through the real Tally account even when the preview server is frozen. Public-content inspection does not authorize operational tests against production. An unfrozen hosted rehearsal requires confirmed isolated credentials and mocked provider effects first; a passing local test is not proof of hosted isolation.
2. Confirm the actual production Git SHA matches the intended base or reconcile drift before deployment. Confirm the production server token can read/create/patch/delete the required private IDs, without exposing the token. Confirm all known writers, Studio editors/direct API clients and callback recovery owners. Do not change Stripe settings or subscription.
3. **Approval/configuration required:** use an existing approved isolated Sanity dataset with synthetic data for a hosted API rehearsal. Configure only test-mode providers/stubs and no real alert recipients; do not invoke real/test payment creation or customer messaging as part of this task. Validate the private namespace, create timestamps, `_system` handling, strict atomic/revision/reference behavior and authenticated reads. Local mocks and a build cannot establish these provider permissions/semantics on their own.
4. Run the documented checks for the published commit in CI, and explicitly acknowledge the inherited full-lint baseline. The small privacy verification workflow is independent of PR #2 and does not deploy. No remote green check is claimed before it runs. Verify synthetic Inbox/Pay HTTP/RSC no-store headers and exact redirect behavior. No browser automation or permission workaround is authorized in this session; owner-supplied checks are acceptable. The synthetic tests cover callbacks without real provider sends.

### B. Authorize Hotfix Deployment And The Write Freeze

5. **Separate approval required:** deploy only this privacy hotfix, preferably initially with `FLUFFYTAIL_WRITE_FREEZE=1` if a coordinated migration window is ready. Deployment/freeze approval must specify the reviewed commit, project/team, production target, expected downtime and callback handling. No merge to main or production promotion occurs without that approval. If deploying unfrozen first, get a later explicit freeze/redeployment approval and repeat all drain checks; do not assume an environment edit affects already-running functions.
6. Before enabling freeze, verify Twilio HTTP-503 retry/fallback/manual message recovery and retained Tally submissions; verify Stripe event delivery recovery WITHOUT changing Stripe production settings or initiating payments. A 503/Retry-After header is only a signal, not guaranteed buffering. If any callback can be lost or cause duplicate customer texts on later replay, stop until the owner approves a safe recovery procedure. Capture event/submission cursors and pending events. Do not expire or replace the three active Stripe links.
7. Close Studio/editing sessions, stop operator actions/jobs/manual API writers and confirm no other credentials/automation are writing. After the freeze deployment is fully serving production, confirm the nine guarded paths reject before effects using approved non-customer probes and monitor pending/in-flight requests. Allow in-flight old-version calls to drain and compare authenticated source counts/revisions/last-update markers across repeated reads. Existing short links remain readable and payments may settle outside the website, so retain all deferred provider events for reconciliation. Keep the writer barrier until verification is complete; do not mutate/revoke the shared token as a substitute.
   Approved freeze probes should use deliberately invalid JSON bytes with `Content-Type: application/json` and no provider signatures, never well-formed empty inquiry data. These fail before side effects on the old handlers too if rollout is incomplete; the frozen version must return 503. Do not use a real customer request, card, phone or valid payment event as a maintenance probe.
8. Read the protected Inbox and all three active tokens using authenticated server lookups; confirm their exact encrypted token-to-URL baseline without opening Stripe or charging anything. Verify ordinary public puppy/litter pages still read normally. The hotfix itself will NOT hide the 54 old roots; anonymous count remains 54 until migration.

### C. Secure Backup And Explicit Data-Move Authorization

9. **Backup execution/location approval required:** provision owner-only storage outside Git/sync/CI/chat and a separately escrowed random 256-bit backup key. Use a local read-only principal to capture the FULL frozen documents, source revisions, `_system`, relationships, old/new mapping, public-query fingerprints and exact plan digest directly into encrypted output. Verify Windows ACLs/disk protection, two encrypted copies and separate-process restore/key escrow. Do not print customer payloads or write plaintext temp files. The helper prepares the envelope; a reviewed local adapter/storage procedure still needs implementation/approval.
10. Refresh the entire known-operational ID set and incoming references/drafts/versions with the execution principal. Expect 5 inquiries, 26 SMS, 9 deposits, 14 invoices and zero payment/rate records; if changed, issue a new redacted manifest/backup and obtain approval for that exact scope. Pin `_rev`, check every destination absent, ensure no unknown outside references and validate payload size below 4,000,000 bytes.
11. **Separate explicit data-migration approval required:** present the project/dataset, backed-up count/type receipt, source revisions/ID-set digest, plan digest, byte size and verified recovery procedure. Approval of code, deployment or freeze is NOT approval to delete the historical root copies. Keep all data unchanged until this step is authorized.
12. Only after authorization: one `visibility=sync` transaction for the frozen 54-record manifest: 54 strict private creates, 54 pinned-revision guard patches and 54 exact-ID deletes, no purge. Retain the receipt encrypted. No public forwarding copy, ID-based provider metadata rewrite, price recalculation, normalization or provider API call. Full procedure is in [the migration plan](fluffytail-sanity-privacy-migration.md). The offline planner is not an executor and cannot perform this step.

### D. Propagation, Verification And Resume

13. Direct authenticated document reads must show all old IDs absent and all mapped IDs present with identical business data/timestamps, plus preserved original provenance in backup. Recheck counts, exact three active token redirects, invoice/session/SID/contact/puppy joins and before/after public query fingerprints. Do not accept duplicated roots/private copies or changed totals. Read-only checks must not trigger payment/message endpoints.
14. Fresh anonymous queries for ALL six known operational types must return zero through both `api.sanity.io` and `apicdn.sanity.io`, with no Authorization/cookies. Also check anonymous old/new document lookups cannot return bodies. Use raw perspective for the zero count; do not infer privacy from CORS, Studio auth or a filtered app response.
15. **Do not equate sync commit with global cache closure.** Direct document reads, GROQ indexes, Sanity API CDN and application/RSC/browser caches are separate. Poll counts/receipts with bounded backoff (for example 1, 2, 4, 8, then 15 seconds up to a ten-minute operational deadline); accept success only when required surfaces converge and repeated samples remain zero. If the deadline expires, stop/reschedule and investigate with Sanity/Vercel; do not declare victory, rerun the migration, weaken authentication or blindly wait a fixed TTL. Sanity documents stale CDN serving during backend outages, so an origin zero alone is insufficient. Application Inbox/Pay are dynamic/no-store on the new deployment; explicitly verify/invalidate any old sensitive data/HTML/RSC cache under the approved release. Previously downloaded information cannot be recalled. [Sanity transactions](https://www.sanity.io/docs/content-lake/transactions), [API CDN](https://www.sanity.io/docs/content-lake/api-cdn).
16. **Resume approval required:** remove/set freeze to `0`, redeploy the same reviewed privacy code with the validated production configuration, and confirm all serving versions have switched. Resume Studio/operator access deliberately. Reconcile retained provider events/submissions under the approved recovery procedure; do not blindly replay alerts/acknowledgements or initiate transactions. Verify first legitimate new records are private, historical counts/joins remain sound, and the anonymous count stays zero immediately and later that day/next day. Follow-up checks require owner action or separate authorization; no automation is created here.

## Failure And Recovery

- Before or failed atomic commit: keep freeze on, direct-read the exact source/destination sets and classify state. Originals unchanged/destinations absent means no move occurred; do not update expected revisions automatically. A timeout can still mean committed: consult transaction receipt/direct reads, never blind retry.
- After commit but before successful verification: keep authenticated readers/private writers deployed and freeze on. Stop on mixed state, unexpected new public records, changed payloads or cache results that do not converge. Prefer guarded forward repair/restoration under mapped private IDs from the verified encrypted backup. Preserve any newly delivered legitimate financial/message state; never overwrite it with an old snapshot.
- Do not roll back to anonymous readers after moving data. Full ID reversal recreates public exposure, requires separate emergency authorization, a new frozen backup/revision audit and a single guarded reverse transaction. The synthetic reversal test demonstrates that it restores anonymous count 54; it is not the normal recovery.
- Freeze failure before commit: leave data unchanged, restore service only with explicit approval/known callback recovery and fix the barrier before rescheduling. Do not let the legacy inbound handler falsely acknowledge a write freeze enforced only at the database.
- No changes to Stripe objects/settings, payments, customer messages, puppy statuses or subscription are part of data recovery. No history purge. No new service/database/queue.

## Readiness Decision

**GO for code review and approval of the next isolated verification stage. NO-GO for production migration now.** Remaining evidence is hosted private-ID/permissions behavior, real encrypted backup/restore/key escrow, deployed-SHA/configuration and callback recovery, approved write freeze, fresh manifest and separate deployment/data-move/resume authorizations. The full-lint baseline is explicitly not green.

Current public exposure is not fixed by these un-deployed changes. This focused release can resolve it independently of PR #2 once the owner authorizes and verifies the staged sequence. Keep Phase 2 on hold.

## Exact Hotfix Manifest

The following 26-file manifest was verified exactly against commit `2a59036`. The four-file review-verification follow-up is listed separately above; it adds no runtime behavior.

Modified existing files:

- `app/api/fluffytail/inquiry/route.ts`
- `app/api/fluffytail/sms/inbound/route.ts`
- `app/api/fluffytail/sms/send/route.ts`
- `app/api/fluffytail/upload-image/route.ts`
- `app/api/stripe/create-deposit-session/route.ts`
- `app/api/stripe/create-invoice/route.ts`
- `app/api/stripe/create-payment-link/route.ts`
- `app/api/stripe/webhook/route.ts`
- `app/inbox/api/delete-conversation/route.ts`
- `app/inbox/page.tsx`
- `app/pay/[token]/page.tsx`
- `package.json`
- `package-lock.json`
- `proxy.ts`
- `sanity.config.ts`

Added (including the previously local planning artifacts, now adapted to `main`):

- `docs/fluffytail-privacy-hotfix.md`
- `docs/fluffytail-sanity-privacy-inventory.json`
- `docs/fluffytail-sanity-privacy-migration.md`
- `sanity/lib/operational-client.ts`
- `sanity/lib/private-records.ts`
- `sanity/lib/write-freeze.ts`
- `scripts/sanity-privacy-migration.mjs`
- `tests/register-typescript.mjs`
- `tests/privacy-test-helpers.mjs`
- `tests/privacy-hotfix.test.mjs`
- `tests/sanity-privacy-migration.test.mjs`

No removed files, schema field changes, UI assets/CSS changes, secret/env files or Vercel metadata. No application feature merge from PR #2; only the necessary matching dependency lock is reused.
