# Integrated Website Review

Status: integration and isolated verification in progress. Production is unchanged.

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
- Actual `/test-stripe` and invalid puppy return 404; retired Tally returns 410; both provider callbacks return 503 in Preview. Final hosted verification/CI and the Preview URL are pending below. No hosted result is claimed until verified.
