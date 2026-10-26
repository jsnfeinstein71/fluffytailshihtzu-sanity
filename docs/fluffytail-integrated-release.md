# Integrated Website Review

Status: integration and isolated verification in progress. Production is unchanged.

## Focused Audit Corrections — 2026-10-26

Owner-authorized correction pass, based on PR #4 at `2914c6a`. This is not another architecture review or design pass. All existing CSS, Adobe artwork, fonts, photos, price/payment rules, historical records, provider settings and production content remain unchanged.

- Saved/direct/legacy puppy inquiry links render the current status and a contact/browse path instead of collecting details for unavailable puppies. Available puppies keep the existing contextual form.
- Inquiry policy links open a separate tab, leaving all unfinished entries and reply preferences in the original form. No localStorage/sessionStorage, draft database, or extra consent persistence is introduced. Consent wording and requirements are unchanged.
- Invalid/expired/unverifiable payment links retain the same rejection and validation rules, with a scoped helpful not-found page and contact option. No provider call or replacement link is created by this page.
- Homepage availability counts current available puppies regardless of sex, avoiding a misleading waitlist-only signal when only females or only males are available. Future-interest copy explains that an inquiry does not reserve a puppy or guarantee availability. Litter singular/plural text, duplicate browser-title suffixes and repeated color-only puppy notes are corrected in presentation only.
- About is shortened to public, substantiated facts: Jeanne, Mobile area, dogs living in her home, and direct inquiry contact. No biography, credentials, motivation, health-testing practice or additional service was invented.
- Breed/resource copy removes the easy-grooming comparison, explains coat maintenance and heat sensitivity, and adds general food/travel preparation, veterinary follow-up and safe socialization advice. No medical schedule or FluffyTail-specific inclusion is promised.
- Public-claim check used read-only `siteSettings` in `3glz6dkx/production` and the linked [Jeanne/FluffyTail GoodDog profile](https://www.gooddog.com/breeders/fluffytail-shih-tzu-alabama). General care sources: [VCA Shih Tzu guidance](https://vcacanada.com/know-your-pet/shih-tzu), [AAHA first-days guidance](https://www.aaha.org/resources/what-to-do-when-you-first-bring-home-a-new-puppy/), [AVMA selecting a dog](https://www.avma.org/resources/pet-owners/petcare/selecting-pet-dog). Public pages link the care sources. No production Sanity mutation or customer-record query was made.

### Confirmed Business Facts — Owner Follow-up

The owner confirmed these facts in this chat after the audit-correction release:

- Public deposit policy: deposits are non-refundable and count toward the total puppy price. Do not expand the published policy with discretionary exceptions or additional promises.
- The remaining balance may be paid before pickup or at pickup.
- Current listed prices have no added taxes or fees. This is the owner's current pricing policy, not a tax-law determination; do not alter historical amounts or payment configuration.
- Pickup is normally in Mobile or at the airport, coordinated directly with Jeanne. Public copy makes no delivery, driving-distance or out-of-area meeting promise.
- Direct purchases include a vet check, first vaccinations/deworming, CKC registration papers, written vaccination/deworming records, a starter kit with food/treats/toys/a scented blanket, early socialization and initial potty training. The owner approved the grouped list and then explicitly confirmed paperwork and CKC. Do not turn initial training into a house-trained guarantee.
- Good Dog care-team support, Figo insurance discounts and Good Dog training/community benefits are platform benefits and are not advertised as direct-sale inclusions.

These confirmed facts are presented on Pricing & Process using its existing section styles. No CSS, photos, branding, payment calculations or operational behavior is changed.

### Remaining Business Approval Queue

1. **Payment-link delivery:** The owner confirmed that correspondence must flow through `jeanne@fluffytailshihtzu.com` and should remain in the existing website Inbox. Treat this as an unfinished integration, not a choice of a mailto shortcut. See the focused implementation brief below. Accepted payment methods beyond existing Checkout still need confirmation if they are to be advertised.
2. **Jeanne:** Supply any additional biography/practices to publish; none are invented. The minimal introduction remains based on substantiated public facts.
3. **Historical status:** Identify which past-litter Reserved records should become Sold or Gone Home. Current public data has 18 Reserved puppies in March–June past litters; age alone does not establish the replacement status. Preserve original litter links and financial history.
4. **Two typos:** Approve `girl-1-1` name `Girl.1` → `Girl 1` (document `6e181ad7-3340-4b2f-ba61-91fbd9155ca0`) and `girl-2-1` color `Creram and Whitr` → `Cream and White` (document `136dcb97-3aaf-41dd-9a5d-b5fe194d629e`). Keep slugs/IDs/photos/status/prices unchanged.
5. **Policies:** Supply the actual approved effective/revision date for each legal policy. Existing body wording and date behavior stay unchanged pending that decision.

### Next Focused Task: Jeanne's Inbox Email and Payment-Link Delivery

**Status: investigated and implementation-ready brief; no application email sender, mailbox synchronization, mailbox login or live email test has been implemented/performed in this pass.** Do not represent Email as a verified sending channel yet. Keep the approved public-site design and existing payment rules unchanged.

Owner requirements: keep the website Inbox as the working interface; correspondence uses `jeanne@fluffytailshihtzu.com`; support normal replies and deposit/payment links by either email or SMS. The owner has not used the payment-link buttons live, so creation and delivery both require controlled verification.

Verified current gap:

- `InboxClient.tsx` Send Deposit/Invoice/Payment Link handlers call `/inbox/api/sms-send`; they are text actions, not email actions. Create Link copies/opens a URL. Reply by Email is only `mailto:` and cannot enforce the sending account or capture replies in the website Inbox.
- `app/inbox/page.tsx` currently reads inquiries, SMS messages and financial records, with no mailbox reader. There is no configured application email sender in this repo.
- The prior **Pair Email API Integration** chat confirms that Jeanne's mailbox is hosted at Pair. Read-only public DNS on 2026-10-26 showed Pair Networks/OX Cloud MX hosts and OX Cloud SPF. This supports Pair-hosted email but does not establish the exact account product or authorized mailbox settings.
- Pair's official [Pro Mail setup](https://www.pairdomains.com/kb/posts/1048) documents authenticated IMAP (993) and SMTP (465/587). Its [hosting SMTP guide](https://www.pair.com/support/kb/smtp-service-at-pair-networks/) documents account-specific hostnames and TLS. Confirm the actual account's settings; do not treat MX hosts as client/server login settings or assume an OX partner API is available to the mailbox.
- No suitable Pair/IMAP connection was found among the available app tools. Do not substitute the connected Gmail account or migrate email providers.

Implementation scope for the next code pass:

1. Add an authenticated email channel to the existing operator Inbox, with a visible Email/Text choice and clear recipient, subject and delivery status. In production, From and Reply-To are server-enforced as Jeanne's address; a browser-supplied sender must never select another account.
2. Connect Pair sending and bounded Inbox/Sent synchronization using the mailbox's documented secure settings. Start with an explicit authenticated refresh; leave mailbox messages, read flags, folders and existing history intact. Do not perform an automatic bulk historical import. Associate only authorized customer correspondence with the appropriate inquiry; retain Message-ID/thread headers and deduplicate synchronization.
3. Reuse the existing server-validated deposit/payment URLs and historical-balance calculations. Creating a link, sending it, and receiving a confirmed payment remain separate states. A sent email must never reserve a puppy or mark a balance paid. Provider-generated Stripe receipts/invoices are separate from Jeanne's correspondence.
4. Keep mail content and delivery state authenticated-only, following existing private-ID/no-store conventions, operator authentication/CSRF checks and write-freeze behavior. Do not expose email history through public Sanity queries. Use explicit operator sends; an ambiguous SMTP result must require review rather than a blind resend.
5. Keep actual mail access/sending disabled by default and blocked in the current synthetic Preview. Build fixture-driven compose, reply, link and synchronization checks first. A separately scoped test mailbox and explicit operator-owned test recipient are needed for provider checks; never inherit Jeanne's real mailbox credential into the review Preview. No mailbox password belongs in chat, source, logs or test artifacts.

Acceptance checks: synthetic Email/Text/Either inquiries enter the intended conversation; email reply and both payment-link types use the correct sender/recipient/context; replies appear in the same conversation; repeated refreshes do not duplicate messages; errors/ambiguous sends retain drafts and show truthful status; no email action changes payment or reservation state; SMS consent gates remain intact; no production mailbox, customer, payment, DNS or provider configuration is changed by testing.

Connection prerequisite: confirm the actual Pair mailbox client settings and configure authorized test-mailbox credentials through the deployment's secure server settings. No credentials have been requested, retrieved, configured or tested here. Production activation and a real payment/email smoke test require separate approval after the isolated checks.

Previously documented production gates below remain in force. This correction phase does not authorize paused privacy migration, legacy-link handling, live delivery checks or release.

Local verification: all **120 tests pass** with Preview environment enabled (five new regressions plus the existing financial/privacy suite). Full lint has zero errors and the same 15 image advisories. The optimized synthetic-content build and TypeScript compilation pass. No stylesheet, photo, font, package/lockfile, pricing implementation, payment-success implementation or payment-link validation implementation changed. Hosted journey results are recorded after the matching Preview is ready.

## Initial Staff Workspace Review — October 26, 2026 (6431f8a)

The owner requested a richer private replacement for the operator Inbox that can eventually support direct business without reliance on Good Dog. This expands **staff-interface** scope only. The approved customer website remains locked. There are **no customer accounts, invitations, passwords, or portal**; families continue using public inquiries and validated payment links.

First review route: `/inbox/workspace`, alongside the unchanged existing `/inbox`. Existing operator authentication and private/no-store responses cover the new route. It returns 404 outside Vercel Preview or local development, including authenticated production-mode requests. No customer navigation link was added.

The review contains four fictional families and three fictional puppies, independent of both Sanity datasets. Seven interactive sections cover Today, Families, Conversations, Puppies, Payments, Pickups and Readiness. Actions affect browser memory only and reset on reload. No operational API, Sanity, mail, Twilio, or Stripe request is made by these actions. The approved existing artwork, fonts and original photograph are reused only within the new staff screen; customer styles and assets are unchanged.

Reviewable interactions: family/puppy/inquiry search, family filters, conversations with separate email/text drafts per family, private notes, delivery success/failure/uncertainty simulations, payment breakdowns from existing validated pricing helpers, and separate pickup checklists. SMS consent gates and duplicate-attempt checks are enforced by the local workflow. Failure/uncertainty retains drafts; uncertainty blocks an identical retry and directs the operator to activity. All delivery outcomes explicitly say simulated. A simulated reply cannot reserve a puppy, create a link, or change payment history. Payment rows count only confirmed fixture payments.

This is a functional **review prototype**, not an operational replacement or proof of live delivery. Remaining implementation includes durable private family/conversation identities, persistent drafts, actual authorized mailbox synchronization and sending from `jeanne@fluffytailshihtzu.com`, existing consent-aware SMS integration, validated payment-link creation/delivery, webhook reconciliation, reservation-state transitions, pickup record handling, and recovery/backup checks. Keep Good Dog and the existing Inbox available until the replacement is proven. Production privacy gates and paused Stage 2 remain unchanged. No additional policy decisions were invented.

Verification: all **130 offline tests pass**, including ten new workflow/access/payment regressions. Full lint has zero errors, with 16 image advisories (15 existing plus the approved small SVG in this review). Optimized build and TypeScript compilation pass. Actual local optimized HTTP checks return 401 anonymously, 200 with fixture operator credentials in Preview mode, private/no-store headers, and 404 with no prototype content in production mode. Browser journeys exercised inquiry search before puppy association, separate drafts, failure/uncertainty and duplicate protection, simulated reply, private note, payment balance review and pickup checklist. All seven sections fit 1440px, 400px and 320px viewports (21 checks); no page overflow or browser console errors were observed. Two issues found during browser review—search missing an unassigned puppy mention and stale delivery errors after changing family—were corrected and have regressions. Screenshots are outside the repository at `C:\Users\jlcfe\AppData\Local\Temp\fluffytail-workspace-review`.

## Functional Saving Phase — October 26, 2026

The owner approved the staff workspace design, authorized continuing implementation, and confirmed this Codex chat as the active development location. Chats were renamed to make their roles clear: **FluffyTail — Active Development (Codex)**, **FluffyTail — Previous Development (Reference)** and **FluffyTail — Previous Review (ChatGPT)**. The owner will create the ChatGPT Work/Astra review chat manually. No additional worker/chat was created or messaged. Keep implementation state in PR #4 and these project files rather than assuming chat histories synchronize.

This phase supersedes the initial review's memory-only behavior for **saved drafts, private notes and pickup preparation**. The approved composition, fonts, photographs, public website and existing Inbox remain unchanged. Sending and payment actions are still simulations; no customer accounts were introduced.

The new authenticated `/inbox/workspace/api/state` endpoint stores four explicitly initialized fictional family profiles under deterministic `private.staffFamily.*` IDs. Initialization is idempotent and preserves existing records. It does not run on page reads. All saved operations require the exact isolated `gu1xkpsg/synthetic` Preview configuration; Production, wrong datasets, anonymous and cross-origin writes fail closed, and the existing writer freeze is enforced. These records are a fixed review namespace, not an import of real customers or a replacement of historical payment/inquiry records. Financial fixture values and conversation examples are not copied into the new saved family profiles. No Studio schema, token, provider or deployment settings were changed.

Drafts save separately per family and email/text channel. The UI distinguishes unsaved changes from confirmed saves and warns before leaving with unsaved drafts/notes. Saving while another tab changes the same draft produces a comparison with **Use saved draft** / **Keep my draft**; an explicit subsequent save is required to replace the reviewed copy. Updates to unrelated fields use revision-checked patches and cannot silently advance another draft's comparison base. Failed or unconfirmed requests retain entries; retries after lost acknowledgements are idempotent. Private notes use stable request IDs to prevent duplicate appends, and pickup changes appear only after a confirmed save. Refreshing saved records preserves locally edited drafts. Reset simulations does not erase saved staff records.

Validation: all **140 offline tests pass**, including eight new API/storage regressions and two reducer recovery regressions. Full lint has zero errors and the same 16 image advisories; TypeScript and the optimized synthetic-content build pass. Browser testing used the optimized application with the actual route handlers backed by a local revision-aware fixture store. It verified initialization, saved drafts/notes/checklists after reload **and complete server restart**, email/text and family separation, two-tab conflicts and both resolution choices, connection loss without false save success or discarded text, and reconnect/retry. All seven sections fit 1440px, 400px and 320px viewports (21 checks). No unexpected browser errors were observed. This is fixture evidence, not proof of hosted Sanity persistence or live provider delivery.

Local repeatable review: build with public synthetic configuration, then run `node scripts/serve-workspace-fixture.mjs` from the repository. Open `http://localhost:3100/inbox/workspace` with username `fixture-operator` and password `fixture-only-password` (test-only credentials, never Vercel/Production credentials). The helper serves the optimized app on loopback, executes the real workspace route handlers with a fake Sanity client, and keeps fictional staff records at `%LOCALAPPDATA%/FluffyTail/WorkspaceReview/families.json`. It passes a limited, synthetic-only environment to its child and uses no live provider credentials. The helper is local QA tooling, not an application persistence adapter or a production server. Screenshots: `C:\Users\jlcfe\AppData\Local\Temp\fluffytail-workspace-review\saved-draft-desktop.png` and `saved-draft-mobile.png`.

Remaining work: connect actual authorized synthetic inquiries to durable family records, verify hosted saved operations with staff authentication, implement the Jeanne mailbox/outbox/reply flow using a separate authorized test mailbox, connect validated payment-link delivery/reconciliation and reservation transitions, and prove document/pickup/recovery handling. The test-mailbox availability question is pending; do not use Jeanne's production mailbox or invent its client settings. Good Dog and the existing Inbox remain available. Production privacy migration, historical link handling, remaining CMS/business decisions, merge and release remain separately gated.

## Sources And Scope

- Consolidated branch: `codex/fluffytail-integrated-release`.
- Production base: `origin/main` at `9d9eb4e`, including the deployed Stage 1 privacy hotfix `1187f4611bba1866c24d5aa41120a81626832928`.
- PR #2 native inquiry/pricing source: `9f71a693955eb1af68dfd4a57667b820eee49bd6`, still draft and unchanged remotely.
- Approved Adobe design source: `3f5625b` plus the explicitly staged 29-file design/refinement snapshot `19d6ea5`. No secrets, environment files or Vercel metadata were staged.
- All approved designs are locked. The only visual integration change enables the already-approved development hero/copy in Vercel Preview builds as well; normal production builds keep their CMS hero source. The original JPEG, all approved page composition/style files, photography and legal body text are unchanged.

## Deliberate Conflict Resolutions

| Area | Integrated decision |
| --- | --- |
| Tally | Retain PR #2's no-write 410 endpoint, not production's obsolete writer. Historical records are untouched. |
| Operator route moves | Retain authenticated `/inbox/api` routes and remove old public aliases. Move the Stage 1 freeze guards to every current writer. |
| Native inquiry | Preserve PR #2 validation, context, consent, rate/duplicate admission and notifications; add the same default-off freeze guard. |
| Operational reads | Preserve production's server-only authenticated `getOperationalClient`; PR #2's Preview-guarded client delegates to it. Inbox/payment queries remain no-store and field-based across root/private IDs. |
| Preview isolation | Reject production dataset or production project operator access. Twilio sending and both provider callbacks are disabled in Preview. No functional Stripe/Twilio credentials are available to the new branch. |
| Stripe | Keep Sanity-controlled server quotes, actual paid amounts, metadata association checks, reservation guards and deterministic private records from PR #2. Preserve historical ledger amounts. |
| Proxy | Keep PR #2's fail-closed authentication/CSRF guard and production's private/no-store authorized responses. |
| Studio | Combine both branches: no operational create templates, no duplicate action and no root-ID publish, including native inquiry rate records. Normal public content editing is unchanged. |
| Tests/lock | Retain the exact production lockfile. Port privacy assertions to the current protected routes/queries; obsolete unsigned Tally/$300 creation/non-idempotent callback assertions are replaced by the integrated contracts, not restored. Migration/backup tools remain preserved and unauthorized for production. |

## Preview Preparation

- Vercel project `prj_XDeRUHZCaiX3yWxj1FsLjzplg7ey`, team `team_lWJGveC3QNGhVJdyuooMtNuA`.
- Shared Preview settings include live credentials. They MUST NOT be inherited by the review branch.
- New scoped Editor token was created only in existing test project `gu1xkpsg`, dataset `synthetic`. Authenticated constant-only requests succeed there and return 401 in production; no production customer query was used. The prior frozen privacy Preview and its credentials are unchanged.
- The branch initially disables its own automatic deployment in `vercel.json`, preserving main and the existing PR settings. Vercel rejected branch-specific configuration before the branch existed remotely. Publish disabled first; configure and verify only this branch's complete overrides, then enable its Preview.
- Synthetic review fixtures use two current litters, one upcoming litter and Available/Hold/Reserved examples. Names and inventory are synthetic; photographs are unchanged copies of existing public Sanity media. No production CMS record or operational history was copied or mutated.
- `scripts/verify-inquiry-preview.mjs` targets only `gu1xkpsg/synthetic` and localhost/Vercel hosts, submits reserved synthetic identities, checks consent/origin/deduplication/private persistence, anonymous rejection and authenticated Inbox visibility, and confirms provider callbacks remain disabled. Synthetic leads are retained for review. It never invokes payment creation or SMS sending.

## Genuine Production Gates

1. The last confirmed 54 historical anonymously readable Sanity operational records remain an unresolved production-release gate. Integration does not repair them. Stage 2 is paused; no backup, freeze or migration operation is authorized here.
2. Three historical deposit links lack modern verifiable quotes. PR #2 rejects them instead of silently charging obsolete amounts. Earlier read-only evidence identifies two expired $300 sessions and one test-mode link; existing Sanity active flags do not establish payability. Owner-authorized retirement/reissue/handling remains required before launch; records, provider objects and the open invoice are not changed here.
3. Real notification delivery and live Stripe signing/delivery configuration require their separately authorized release checks. Preview/mocked results prove suppression and logic, not live delivery. No real payment/message is initiated by this task.
4. The original hero must remain Sanity-manageable for launch. Production hero publication, pending puppy spelling corrections, Adobe web-kit hostname confirmation, final owner customer-experience review and explicit production merge/deployment approval remain separate. No duplicate font kit or replacement brand asset is created.

## Verification Receipt

- Integrated merge commit: `44f1044`, with both `19d6ea5` and production `9d9eb4e` as parents. `main`/PR #2 have not moved.
- 115 offline tests pass, including inventory, pricing, reservation, inquiry/auth/consent, signed callbacks, freeze/resume/idempotency, mixed-ID Inbox/quote lookup, Studio controls and preserved migration/backup regressions. The latter use offline synthetic fixtures only; no production migration preparation was resumed.
- Full lint: zero errors, the same 15 image advisories. TypeScript and the production build pass; 26 static pages generate using only anonymous synthetic content configuration.
- Published the new branch with automatic deployment disabled; Vercel confirmed zero deployments. Created 17 branch-specific Preview overrides, with zero failed variable writes. Their branch/environment scopes are verified. All eleven readable values match; sensitive values were freshly set from known synthetic-only credentials and cannot be read back from Vercel. Real persistence verifies the scoped Sanity credential. Existing environment IDs/scopes/edit times, including Production and the frozen privacy Preview, are unchanged.
- The new branch alone has `FLUFFYTAIL_WRITE_FREEZE=0`, permitting synthetic inquiry tests. The separate privacy Preview remains frozen. All provider credentials are deliberately nonfunctional, alerts are empty, Twilio sending throws in Preview and both provider callbacks return 503. No live provider request/payment/message was made.
- The locally served optimized build saved Email/Text/Either inquiries in `gu1xkpsg/synthetic`, with correct puppy/litter associations, consent, duplicate responses, private IDs and anonymous rejection. Authenticated Inbox is private/no-store; its existing shared-phone grouping was preserved. The runner now uses separate reserved fictional numbers for Text/Either so each appears independently in Inbox. A real mobile browser Email submission also saved privately and displayed the actual Preview confirmation, without notification sending. Its first fast automated attempt correctly hit the existing two-second admission delay and retained all entries; the later submission succeeded without an application change.
- The local runner uses `localhost`, matching Next's canonical request origin; using `127.0.0.1` correctly failed the same-origin comparison. The application origin rule was NOT weakened to accommodate testing.
- Actual `/test-stripe` and invalid puppy return 404; retired Tally returns 410; both provider callbacks return 503 in Preview.

### Hosted Review Result

- Draft consolidated review: [PR #4](https://github.com/jsnfeinstein71/fluffytailshihtzu-sanity/pull/4). PR #2 remains draft at `9f71a693955eb1af68dfd4a57667b820eee49bd6`.
- One integrated review URL: [FluffyTail Preview](https://fluffytailshihtzu-sanity-git-c-3c7389-jason-feinsteins-projects.vercel.app). The Vercel account's normal sign-in/protection remains enabled. Do not change that protection or revisit the earlier browser-origin permission issue. Protected HTTP checks used Vercel's supported short-lived share access; no remote browser repairs or permission workarounds were attempted.
- Git-generated deployment `dpl_EJ9Zxy3dwGB9RPCDkTggBBD37aJh` at runtime commit `31141028e9463c4e254d92356079378474f92ab7` is READY. Vercel build logs confirm compilation, type checking and completed build output.
- Hosted runner completed successfully: three synthetic Email/Text/Either inquiries persisted; correct puppy/litter IDs and consent; duplicate submission produced no extra record; anonymous ID queries returned zero; authenticated Inbox showed all three and sent private/no-store; no alert records/messages created. Both provider callbacks return 503 and retired/invalid routes retain 410/404. All synthetic test leads are retained only in `gu1xkpsg/synthetic` for review. No payment creation or sending endpoint was called.
- Available Preview runtime error/fatal log counts returned no groups in the inspected window. This is a bounded observation, not a guarantee of future error-free operation.
- The optimized local build passed all 13 customer routes at 400px and 1440px (26 checks), with loaded approved Adobe fonts and no overflow/page errors. The original hero loads unchanged; existing photos load. A real browser submission and authenticated browser Inbox both confirmed the same private synthetic inquiry. Screenshots and receipts are outside the repo at `C:\Users\jlcfe\AppData\Local\Temp\fluffytail-integrated-review`.
- Initial GitHub CI found one environment-sensitive test: it set production `NODE_ENV` but inherited Preview `VERCEL_ENV`, so it incorrectly expected the CMS headline. The test now explicitly verifies development, built Preview and production, restores both variables, and all **115 tests pass with Preview environment enabled**. No application change was required. The runner gained temporary protected-access cookie support and separate reserved fictional numbers. Final CI/build status for the verification-only follow-up is recorded on PR #4; do not treat the earlier failed test run as green.
- Production remains READY at deployment `dpl_4YYdx3VyYBAFWeiTYYpBmbP1CKxA`, commit `9d9eb4e8738b31cd4ae910c34356750cc555ebd0`. Production/shared Preview settings and the separate frozen privacy Preview are unchanged. No production content, operational record, payment object, messaging setting, freeze or deployment was modified.

**Decision:** GO for final customer-experience review in the isolated Preview. NO-GO for production until the genuine gates above and explicit owner approval are satisfied. Historical privacy exposure is not resolved by this integration and must not disappear from the launch decision.

### Integration File Manifest

Added integration-specific files: `docs/fluffytail-integrated-release.md`, `scripts/verify-inquiry-preview.mjs`. Production's existing privacy documentation, tools, tests and workflow were preserved through the merge, not newly introduced systems.

Changed integration-specific paths: `AGENTS.md`, `.github/workflows/phase-1-verification.yml`, `app/page.tsx` (Preview selection only), `app/api/inquiry/route.ts`, `app/api/fluffytail/sms/inbound/route.ts`, `app/api/stripe/webhook/route.ts`, the six current mutation routes under `app/inbox/api` (`sms-send`, `create-deposit-session`, `create-payment-link`, `create-invoice`, `delete-conversation`, `upload-image`), `sanity/lib/operator-client.ts`, `sanity.config.ts`, `vercel.json`, `tests/register-typescript.mjs`, `tests/brand.test.mjs`, `tests/inventory.test.mjs`, `tests/inquiries.test.mjs`, `tests/payments.test.mjs`, `tests/privacy-hotfix.test.mjs`, `tests/sanity-privacy-migration.test.mjs`. The preceding 29-file design snapshot is recorded at `19d6ea5`; no approved layout/style file was revised during integration. The lockfile matches production exactly and no dependency was added.
