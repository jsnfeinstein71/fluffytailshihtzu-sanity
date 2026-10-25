# Historical Sanity Privacy Migration Plan

Date: 2026-10-25 (America/Chicago). Scope: existing operational documents in project `3glz6dkx`, dataset `production`.
Independent implementation update: draft PR #3 has a frozen isolated Preview; a hosted 54-record migration, encrypted restoration and fresh re-migration were completed only in `gu1xkpsg/synthetic`. See [hotfix readiness and exact cutover sequence](fluffytail-privacy-hotfix.md) and the [redacted hosted receipt](fluffytail-privacy-rehearsal.json). This document's inventory and initial planning results below are historical, not new production access; the current backup/manifest procedure and outstanding production approvals are in that readiness document.
The prepared hotfix blocks Studio publishing of root-level operational records until they are migrated, including template-less create intents. Private operational records retain publishing. The default-off write-freeze switch and guarded raw-state rechecks are documented in the current runbook; none is active in production.
Decision: **GO for this bounded migration design; NO-GO for production execution now.** Production writes need a separate explicit authorization after the gates below. No subscription, database, production code, data, provider settings or PR state has changed.

We can retain the current public dataset and move only operational documents to the established authenticated-only ID namespace. We do not need a dataset-visibility change or an architectural redesign. However, moving the documents while keeping anonymous operational readers and public-ID writers active would break lookups and allow recurrence. We must address that narrow compatibility prerequisite independently of releasing PR #2.

## Verified Inventory

Authenticated, projection-only MCP inspection confirmed dataset `production`, authenticated identity, 54 operational records, no operational drafts/release versions and no existing `private.*` operational records. A separate anonymous direct-API count also returned **54**, confirming the exposure is still present. Customer names, contact details, messages, payment URLs/tokens, Stripe IDs and raw operational IDs were not displayed or saved to these repo artifacts.

| Type | Count | Report aliases | Relationship evidence |
| --- | ---: | --- | --- |
| `puppyInquiry` | 5 | I01-I05 | Each resolves to one public puppy through its existing canonical puppy URL |
| `smsMessage` | 26 | S01-S26 | All have message SIDs; exact phone/email equality edges are recorded without values |
| `paymentRecord` | 0 | None | Migration and tests still support this type; do not manufacture missing payments |
| `depositLink` | 9 | D01-D09 | Each resolves to one public puppy; all have unique tokens; three active flags |
| `invoiceRecord` | 14 | V01-V14 | Each resolves to one public puppy; all have unique invoice IDs |
| `inquiryRate` | 0 | None | Included in the zero-exposure verification set for future records |

Exact redacted record-by-record inventory: [fluffytail-sanity-privacy-inventory.json](fluffytail-sanity-privacy-inventory.json). Aliases are local to this report; the actual ID/revision mapping belongs only in the encrypted backup/execution manifest.

- The 28 inquiry/deposit/invoice records resolve to five public puppies in three litters. These public content identities and references remain untouched.
- Separate anonymous read-only execution of the actual committed public GROQ returned **7 litters, 23 puppies and 23 puppy sitemap entries**. Only counts/digests were displayed, not payloads. Capture fresh order-independent content fingerprints under the approved freeze for the actual before/after comparison; this planning-time observation is not a production post-migration verification.
- No incoming Sanity `references()` edges to any of the 54 records were found across the connector's authenticated readable dataset. No schema-defined cross-document operational references were found in the inspected code. Repeat the authenticated reference audit with the execution principal before cutover; do not assume an incomplete-permission audit proves absence.
- 52 records have at least one exact phone/email equality relationship to another operational record. The inventory records alias edges only. These are existing lookup correlations, not proof of customer identity; formatting variants may create additional matches in Inbox. Preserve every contact value verbatim rather than normalizing/reassigning historical customers.
- Tokens, invoice IDs and message SIDs are unique within their respective types. External provider objects are not inspected or modified by this migration.
- Active deposit aliases: **D04, D07, D09**. All nine lack the new quote snapshot, explicit puppy/litter IDs and expiry fields; one has a Checkout session-ID field. An active Sanity flag does not prove a Stripe session is payable. Preserve tokens, URLs and flags exactly; do not expire, reprice, reactivate or reissue them in this operation.
- **D01, D02, D03** carry `_system.base.id/rev` pointing to their own original identity. These are platform provenance, not business links. Retain the complete originals in backup; do not transplant stale base/revision pointers into newly created documents.
- No nonempty SMS `mediaUrls` arrays were found. This migration does not make Sanity CDN assets or previously disclosed external payment URLs private, nor recall data already downloaded.

## Exact ID And Data Transformation

Sanity IDs are immutable. A document containing a period in its ID requires authenticated read access even in a public dataset. Therefore we must create a private replacement and remove the old public document, not patch `_id` or leave a public forwarding copy. See [Sanity ID rules](https://www.sanity.io/docs/content-lake/ids).

For each root-level operational source, deterministically compute:

```text
private.legacy-<original _type>.<sha256(original _id)>
```

This is exactly `privateRecordId('legacy-' + original._type, original._id)` under the existing helper's convention. The separate `legacy-` kind avoids colliding with PR #2's event/deposit singleton identities. Authenticated lookups already locate historical records by type/token/SID/Stripe object/puppy/contact fields rather than depending on the old random `_id`.

Copy every business field, including unknown fields, unchanged. Preserve `_type`, `_createdAt`, `_updatedAt`, operational timestamps, consent, statuses, amounts, customer correlations, tokens, URLs, external IDs, public puppy/litter IDs and slugs. Do not recalculate prices, balances or payment history. Timestamps may be supplied on a new document; a new `_rev` is expected. [Sanity timestamp behavior](https://www.sanity.io/docs/studio/document-type).

Do not copy `_rev` or `_system` to a new identity. Full original values remain in the encrypted backup and ID map. Unknown `_system` shapes stop the planner. Existing revision history is not transplanted to the new document's Studio history; this is an unavoidable consequence of creating a new identity. Do not purge old history. The History API requires authentication; retention still depends on the existing plan. Archive any additionally required available revisions before deletion, without changing the subscription. [History API](https://www.sanity.io/docs/http-reference/history).

If the refreshed snapshot contains internal operational `_ref` edges, rewrite only mapped `_ref` values, including nested/array/weak references, in the same transaction. Ordinary string values must not be rewritten. If any outside document references an affected record, stop: this plan does not authorize edits to public content or undiscovered referrers. Operational drafts, release versions, duplicate IDs, unknown namespaces or destination collisions also require review.

## Independent Production Compatibility Gate

Source evidence is pinned to `main` at `96958dc2540afb6d17e3a0028ce091d2d514e96e`, not assumed to be a verified deployed artifact:

- `app/inbox/page.tsx` uses the anonymous content client. Migrated messages/inquiries/invoices/payments would disappear from those reads.
- `app/pay/[token]/page.tsx` also uses the anonymous client. Active migrated short links would return 404 even with an unchanged token/URL.
- Existing provider/operator writers in that source create records without an authenticated-only `_id`, including inquiry/alert, inbound/outbound SMS, deposit, invoice and payment creation. They could immediately recreate the exposure.
- PR #2's authenticated readers/private writes address those conventions on its branch, but PR #2 remains draft and is not permission to deploy. Its `/pay` implementation intentionally rejects legacy quote-less links; that behavior is separate from this privacy migration and must not be silently introduced by a privacy-only patch.

Before production data moves, obtain approval for a **separate, narrowly scoped privacy compatibility hotfix** based on the actual deployed production commit: use server-authenticated/no-store operational reads in Inbox and short links, and authenticated-only IDs for every operational create path. Reuse the existing server token, private-ID helper and token/SID/Stripe business lookups. Preserve the production lookup contract for existing active short links. Do not cherry-pick the full Phase 1 release, change prices/status logic, redesign pages or expand Tally functionality. Tally form/parser/UX remains untouched; any temporary write-ID change is solely a shared storage-privacy prerequisite. If that transitional writer cannot be changed within the approved scope, it must stay paused with an owner-approved retained-submission follow-up procedure until retirement.

This hotfix is **prepared locally, not deployed**. Confirm actual Vercel production Git SHA, existing token read/write permissions for dotted IDs, all operational writer entry points and required no-store/cache behavior before deployment. No dataset-only procedure can guarantee both continuity and zero recurrence with the old readers/writers still running. If production code must remain unchanged even during execution, this migration is **NO-GO**, unless the owner explicitly accepts continued operational downtime with writers paused; that is not the recommended release path.

Exact source paths for the proposed independent hotfix, subject to deployed-SHA confirmation: `app/inbox/page.tsx`, `app/pay/[token]/page.tsx`, `app/api/fluffytail/inquiry/route.ts` (inquiry and alert creates only), `app/api/fluffytail/sms/inbound/route.ts`, `app/api/fluffytail/sms/send/route.ts`, `app/api/stripe/create-deposit-session/route.ts`, `app/api/stripe/create-invoice/route.ts`, `app/api/stripe/webhook/route.ts` (both payment creates), and shared server-client/private-ID helpers. Restrict operational creation templates in `sanity.config.ts` so Studio does not recreate public operational IDs; authorized existing-record editing remains possible. No schema, pricing, form, message-copy or unrelated feature changes belong in that hotfix. Do not revive this transitional production route layout on PR #2, which already moves operator actions under `/inbox/api`.

## Backup And Execution Runbook

### 1. Prepare Secure Storage And Restore Proof

- Owner chooses a non-repo, non-synced, access-controlled backup folder, for example `C:\FluffyTail-Private-Backups\Sanity\2026-10-25`. Verify Windows ACLs and disk protection; restrict access to the owner and necessary system/backup principals. Do not place backups, manifests or keys in the repo, PR, chat, CI artifacts, Downloads or a public Page.
- Generate a random 32-byte key and escrow it separately in the owner's password manager or approved credential store. Never use the form secret, Sanity token or a password as the encryption key; never put a key on a command line or print it. Use an owner-controlled local process, not an MCP response that would expose full customer payloads in chat.
- Read the complete 54 documents with an authenticated read principal directly into process memory, including `_id`, `_rev`, both timestamps, `_system`, unknown fields and reference metadata. Include the exact execution principal/target, capture time, public-query baseline fingerprints, source revisions and deterministic old-to-new mapping in the protected bundle. Fetch all pages, check counts/ID-set completeness and repeat the reference/namespace audit; a `[0...100]` sample alone is not an execution snapshot guarantee.
- `prepareBackup`, `sealBackup` and `openBackup` in `scripts/sanity-privacy-migration.mjs` provide a tested AES-256-GCM envelope, random 96-bit nonce, authenticated version label and encrypted snapshot/plan digest. A future approved local runner must write only ciphertext with exclusive-create semantics to the protected folder; no plaintext intermediate files or console dumps. Compute a ciphertext-file SHA-256 receipt and a second independently recoverable encrypted copy. Clear/discard buffers and token/key process state when done; JavaScript memory is not a guaranteed secure-erasure medium.
- Reopen/decrypt both saved copies in a separate process, recompute snapshot and plan digests, validate all 54 documents/mapping and confirm the escrowed key works before any deletion. Keep the backups under an owner-approved retention/access policy.
- **Current status:** encryption/restore was rehearsed with synthetic records only. No real customer backup has been exported or encrypted, and no live backup location/key has been provisioned. These are execution blockers, not completed steps.

### 2. Establish The Cutover Window

- Deploy and verify only the separately approved privacy compatibility hotfix, not PR #2. Verify its exact commit and authenticated operational queries against approved synthetic Sanity data first. A hosted synthetic rehearsal must confirm token permissions, timestamp behavior, reserved-field handling and the real transaction/reference semantics; the current rehearsal is in-memory, not a Sanity-hosted mutation.
- Obtain an approved short operational write freeze covering all operational sources: operator actions, Studio edits, inbound callbacks, jobs/manual API writers and any third-party automation. Leave public puppy/litter reads available. Capture provider-event/submission cursors and verify the provider retry/fallback or manual reconciliation procedure before pausing anything; do not promise Tally/Twilio retries without checking their configuration. Preserve provider records. Do not send acknowledgements without persistence, start payments, change Stripe objects or replay customer notifications as part of this migration.
- Drain in-flight writes, capture the final encrypted backup, direct-read each source revision, reconfirm target IDs are absent and repeat authenticated incoming-reference/draft/version audits. If the 54-record set has grown or changed, refresh inventory/backup and get approval for the new manifest rather than silently widening scope. Revision guards protect edits to known records, but cannot prevent a new root-level document from an unpaused writer.
- Present a redacted receipt containing project/dataset, counts by type, backup verification result, plan digest, byte size, execution hotfix SHA and verification/rollback commitments. Obtain the user's **separate explicit authorization** for this exact data move. Current authorization is planning/rehearsal only.

### 3. Submit One Guarded Atomic Transaction

For the current 54-record set, the planner constructs **162 mutations**:

1. 54 strict `create` mutations for replacements. Never `createOrReplace`, and never silently accept a pre-existing destination.
2. 54 source `patch` mutations with the pinned `ifRevisionID`, setting a temporary `privacyMigrationGuard` to the plan digest. A real revision-checked patch is used; no assumption that a no-op asserts a revision.
3. 54 exact-ID `delete` mutations for originals, with no `purge` and no query-based deletion.

All three groups are part of **the same transaction**, so no guard field or intermediate duplicate state is committed separately. Sanity commits the group atomically. The real payload must remain under **4,000,000 bytes**; if not, stop and redesign the batch plan rather than automatically split the cutover. Use `visibility=sync` and retain the returned transaction receipt in the encrypted execution record. Do not rely solely on an eventually consistent GROQ result for revision assertions. [Transactions and optimistic locking](https://www.sanity.io/docs/content-lake/transactions), [mutation request limit](https://www.sanity.io/docs/content-lake/technical-limits).

The offline planner intentionally has **no Sanity client, network call, token/env access, filesystem writer, `--apply` option or production executor**. The separate read-only capture and offline encrypted-copy helpers are now tested with synthetic data; use the exact approved SDK mutation invocation and current-state rechecks in the canonical runbook only after real backup/manifest and data-move approval. Do not manually paste customer-bearing mutation JSON into a console or tool transcript.

### 4. Verify Before Resuming Writers

- Direct authenticated document reads: all original IDs absent; all 54 mapped private IDs present; every business value and preserved timestamp equals its encrypted source; only identity/revision/platform provenance differ as specified. Recompute canonical digests. No unexplained missing/extra operational records.
- Authenticated GROQ after query convergence: counts remain 5 inquiries, 26 messages, 0 payment records, 9 deposit links, 14 invoices, 0 rate records for this frozen snapshot. New private event records after resumption may legitimately increase totals; the migration count receipt still tracks its exact scope.
- Verify exact legacy-token resolution, invoice-ID resolution, SID resolution and Stripe-session lookups using a server-only token, without displaying results or invoking Stripe/Twilio. Confirm existing three active flags and every external URL/token remain identical. Exercise authenticated Inbox through the separately reviewed reader; no anonymous fallback.
- Compare before/after outputs and digests of the real public litter, puppy, puppy-detail and sitemap queries. Public IDs, puppy-to-litter references, counts, prices, statuses and photos must be unchanged. Verify all observed five puppy/three litter associations and exact contact-value correlations are retained.
- Anonymous operational query on the direct API must return **0**, with no `Authorization` header, cookies or token-bearing client. Also check old and new IDs cannot retrieve document bodies anonymously. Run the same count against API CDN, check cache convergence and handle stale results before claiming containment. Sanity may serve cached content during outages; a fresh origin zero does not prove every previously cached response or downloaded copy vanished. [API CDN behavior](https://www.sanity.io/docs/content-lake/api-cdn).
- Explicitly invalidate any old customer-bearing application/RSC/data caches for Inbox/short links under the approved hotfix deployment. Do not flush or redesign unrelated public pages. Preserve the hotfix's private/no-store handling.
- Resume approved writers only after these checks pass; verify a legitimate synthetic event with no customer messaging/transactions in the isolated environment, then monitor production count-only queries immediately, after the first normal operational event and again later that day/next day. Every new operational record must remain in a private namespace. The owner or a separately authorized task performs these follow-up checks; no background automation is created here.

Exact known-operational anonymous verification query, including future rate documents:

```groq
count(*[_type in ["puppyInquiry", "smsMessage", "paymentRecord", "depositLink", "invoiceRecord", "inquiryRate"]])
```

Use `https://3glz6dkx.api.sanity.io/v2025-01-01/data/query/production` with `perspective=raw` and a URL-encoded `query`; repeat against `3glz6dkx.apicdn.sanity.io`. This verifies known operational types, not a claim that every possible sensitive field/type across the whole project has been audited.

## Failure And Rollback Procedures

- **Preflight/collision/revision failure:** do not retry against fresh revisions automatically. The atomic transaction should leave originals unchanged and destinations absent. Confirm via direct reads; investigate the writer/drift and refresh encrypted backup/approval if necessary.
- **Timeout/unknown result:** keep writes frozen. `classifyMigration` distinguishes exact original state (`ready`) from exact migrated state (`already-applied`); new public records, mixed states or changed payloads cause a hard stop. Query/direct-read all IDs and the transaction receipt before any retry. Do not rerun blind or assume an HTTP timeout means no commit.
- **Post-cutover functional failure:** keep authenticated readers/private writers deployed and operations paused. Prefer forward repair or restoration of backed-up business values **under the private mapped IDs**, guarded by their current revisions. If subsequent legitimate payments/messages exist, reconcile/merge them; never overwrite newer values with an old snapshot. Do not replay external payments or customer messages.
- **Full ID reversal is break-glass only:** restoring originals to public root IDs recreates the confirmed privacy exposure. It needs separate explicit emergency authorization. Under a renewed write freeze, back up current private state, verify no drift, recreate original business documents and reverse any approved internal references, guard private revisions and delete private replacements in one atomic transaction. Preserve a new receipt. Never leave both copies visible, and do not restore old anonymous app readers as a convenience fallback. Original `_rev`/system lineage cannot simply be restored to a new revision.
- No provider payment, invoice, customer message, pricing or puppy status change is part of data migration/rollback. Provider state is intentionally untouched.

## Initial Planning Rehearsal

Prepared only:

- `scripts/sanity-privacy-migration.mjs`: deterministic offline planner, strict gates, guarded atomic payload, idempotency/drift classification and standard-library authenticated backup envelope.
- `tests/sanity-privacy-migration.test.mjs`: 12 targeted synthetic tests. The production-shaped fixture has 54 operational records with matching type counts/active-link flags and three self-base metadata cases. An additional synthetic historical $300 payment verifies that payment/balance lookups preserve history without rewriting it to $400. A break-glass reversal rehearsal restores original joins and explicitly demonstrates the return of anonymous exposure, explaining why it is not the default recovery.
- `docs/fluffytail-sanity-privacy-inventory.json`: 54 redacted alias/relationship rows, no raw operational IDs or customer fields.

Commands run:

```powershell
node --test tests/sanity-privacy-migration.test.mjs
npm test
npm run lint
npm run typecheck
```

The focused 12 tests and full **73 tests** pass. Tests cover exact preservation, existing private-ID convention, public GROQ equality, authenticated real Inbox/payment lookups, anonymous root filtering, internal reference cycles/weak links, outside refs/drafts/collisions, revision drift and new public records, transaction-size limits, encrypted restore, tamper/wrong-key rejection and break-glass reversal. TypeScript and lint pass; lint has the same ten existing image warnings. No app/runtime/schema/dependency changes require a new production build in this planning-only step. The prior candidate's production build remains separate evidence, not a hosted migration rehearsal.

## Execution Decision

**NO-GO now.** Blocking gates are: separate production-reader/private-writer compatibility approval and verification; real encrypted backup/key escrow/restore proof; Sanity-hosted synthetic rehearsal; frozen fresh source manifest/size/permissions audit; and separate explicit production data-migration authorization. The connector used here exposes read-only data tools, not a production mutation executor. This plan does not claim the existing exposure has been remediated.

The selected ID migration is feasible without changing the subscription, introducing a database, modifying public puppy/litter records or deploying PR #2. We should next approve only the privacy compatibility hotfix and isolated platform rehearsal, then present the final backed-up transaction receipt for explicit execution authorization. PR #2 stays draft and production is unchanged.
