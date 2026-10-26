# Native Inquiry And Phase 1 Security Finalization

Priority reset: branding/UX is active separately on `codex/fluffytail-brand-ux`, preserving this PR #2 implementation. See [existing Adobe brand integration](fluffytail-brand-ux.md). Stage 2 privacy preparation is paused, not resolved or waived. Historical exposure and remaining operational checks stay production-release gates; redesign does not authorize provider/backup/migration work.

Date: 2026-10-25. Branch: `codex/phase-1-pricing-reliability`. PR #2 stays draft.
Status: code implemented; NOT approved for production. Production, provider settings, datasets and historical records are unchanged.

## Reused Flow

- `/puppy-inquiry` now renders a native Next.js form. `/contact` uses the same component for future-interest requests; no iframe, external form runtime, new database or dependency.
- Puppy links retain their original route/query compatibility and add `puppySlug`. Old `puppyPageUrl` context is parsed locally, never fetched. Names, IDs, litter and canonical puppy URL are resolved from fresh, published, visible Sanity inventory on submission, not trusted browser fields.
- Required name, email and message; preferred Email, Text or Either. Phone is optional for Email. Text/Either require a valid phone and explicit SMS consent. Email always stores `smsConsent: false`, even if a browser sends true.
- The existing conversational/customer-care consent wording, STOP/HELP, frequency/rates and legal links are retained. The legal pages' consent-location paragraphs now list both native form routes and distinguish Text/Either from email-only inquiries; other legal copy is unchanged. Consent timestamp/version are recorded. No customer acknowledgement SMS is sent by this form.
- `GET /api/inquiry` issues a signed 30-minute token bound to an HttpOnly/Secure (HTTPS), SameSite=Strict cookie. `POST /api/inquiry` checks that token, same-origin requests, actual body size (8 KiB), server input rules and honeypot. This is request-integrity protection for an anonymous form, not verification of the customer's identity/email/phone.
- Minimum two-second form age; persistent conditional-revision rate limits: five attempts/IP per 15-minute fixed bucket, three/email per hourly bucket. Vercel's `x-vercel-forwarded-for` supplies the platform client IP; raw IP/email rate keys are not stored. No in-memory-only limiter or browser-provided IP is used.
- Identical normalized submissions are deduplicated per UTC calendar day, including concurrent retries, before alert delivery. This is a fixed window; a repeat across midnight can be a new inquiry. Rotating the form secret resets deduplication/rate key identity. Rate documents have `expiresAt` for later approved housekeeping; there is no automatic deletion job.
- Inquiry persistence uses the existing Sanity store. Jeanne receives the existing operator SMS alert at `FLUFFYTAIL_ALERT_NUMBER`, with optional second recipient. Each recipient has a persisted delivery claim. Missing production notification configuration blocks acceptance; provider failure after save preserves the inquiry and marks it `needs-review` in Inbox. Ambiguous results are not blindly resent. Monitor pending/needs-review notifications and reconcile with Twilio logs manually.
- Inbox now retains phone-less inquiries using a separate conversation ID, provides `mailto:` follow-up, and disables customer SMS actions for native inquiries without consent/with Email preference. The send API enforces this independently. Historical phone-based conversations and payment actions retain their existing behavior. Email-only deletion is authenticated and scoped to that inquiry, not a fabricated phone key.
- There was no application email delivery service to preserve. Operator SMS alerts and Inbox are the delivery workflow; email follow-up uses Jeanne's mail application. This patch does not add or claim automatic email notifications.

## Security Boundaries

### Tally Retired On This Branch

- All active embeds and external waitlist URLs are removed. Unused iframe modal removed. Legacy Sanity external URL fields remain read-only for history, ignored by the website.
- `POST /api/fluffytail/inquiry` returns `410 Gone`, with no parsing, writes or alerts. It is not a public alias to the new form submission endpoint.
- No Tally account, forms, submissions or historical Sanity leads were changed/deleted. After approved deployment, disable the obsolete Tally webhook and redirect any externally shared Tally links to `/puppy-inquiry` or `/puppy-inquiry?interest=waitlist` in Tally itself if supported/desired. Website legacy links still work; repo code cannot redirect a `tally.so` URL owned by Tally.
- Obsolete form IDs/field mappings need no new development. No Tally secret/env is required by the replacement.

### Twilio Inbound

- `X-Twilio-Signature` is checked with the existing SDK, configured Auth Token, exact external webhook URL and all form parameters, before Sanity access. No request-supplied host determines the signing URL.
- Missing/invalid signatures return 403; missing token/configuration returns 503. Raw body capped at 32 KiB; SID, phone, body and media-count/URL validation precede writes.
- Deterministic SID IDs plus atomic create-if-absent prevent duplicate records and duplicate TwiML acknowledgements, including concurrent delivery. Existing root-level SID records are recognized. Persistence errors return retryable 503, not false success. A lost response after a successful save may suppress the acknowledgement on retry; at-most-once acknowledgement avoids duplicate texts.
- Existing acknowledgement and STOP/HELP wording preserved. Preview disables inbound callbacks and all outbound messaging. No Twilio account configuration or customer messages changed during testing.

### Sanity Privacy: Confirmed Existing Exposure, Not Fully Remediated

- An anonymous, count-only production query returned HTTP 200 and **54 published operational documents** across `puppyInquiry`, `smsMessage`, `paymentRecord`, `depositLink`, `invoiceRecord`. No customer payload was retrieved. This is confirmed document-read exposure, not merely a suspected frontend issue.
- New inquiry, alert, SMS, payment, invoice, deposit and rate-limit documents use opaque `private.<kind>.<hash>` IDs. Sanity requires authenticated reads for IDs containing a period, even in public datasets. Existing server-authenticated Inbox/payment readers support these IDs. Public puppy/litter queries and content IDs are unchanged. [Sanity document ID access rules](https://www.sanity.io/docs/content-lake/ids).
- Studio creation templates for operational types are removed so new records are created through the controlled server paths. This is not an ACL substitute; trusted token holders can still create/read documents.
- New payment IDs remain deterministic per Stripe object. Historical event lookups preserve old records. An active/unverifiable legacy deterministic deposit claim blocks a competing private replacement until its existing checkout is reconciled. No live record migration occurred.
- **Production blocker:** the 54 existing root-level documents remain readable until a separately approved privacy remediation. Do not claim that namespaced new writes fix historical exposure.
- Smallest no-record-migration option: explicitly approve making the current dataset private **together with** a reviewed server-only read-token change for public website content, Vercel environment setup and full public-route/Studio verification. Changing visibility alone would break today's anonymous content reads. Alternatively approve a backed-up, reference-aware operational-record namespace migration. Neither option is executed or silently authorized here.
- Sanity asset CDN URLs remain public/shareable; document privacy does not make customer MMS images private. Assess asset contents/access expectations separately; do not delete historical assets blindly.

## Required Configuration And Release Gates

1. **Historical privacy:** choose/approve the remediation above, back up affected records, test it in isolation, then verify anonymous operational count is zero while public puppy/litter pages still work. Production data/settings require explicit approval.
2. **Preview isolation:** owner confirmed settings are NOT ready. Configure a separate synthetic Sanity dataset and a scoped `SANITY_API_WRITE_TOKEN`; point Preview `NEXT_PUBLIC_SANITY_DATASET` to it. Never copy customer data. Existing operator guard rejects dataset `production` in Preview. Read-only production content can still support layout QA, not submissions.
3. **Form secret:** generate at least 32 random characters for server-only `INQUIRY_FORM_SECRET`, independently per environment. Keep out of source, client variables, logs and chat. Missing/short secret yields a clear unavailable error and no accepted submission. Do not put it in a `NEXT_PUBLIC_*` variable. Set Preview first and redeploy Preview; production only after approval.
4. **Operator workflow:** verify intended production Inbox credentials, Sanity server-token permissions, Twilio account/from number and Jeanne's alert recipients. No live alert smoke test is authorized. Notification failure states require Inbox monitoring; this patch intentionally adds no queue or automatic retry system.
5. **Twilio:** verify account Auth Token and exact externally configured callback URL. `TWILIO_SMS_WEBHOOK_URL` defaults to `https://www.fluffytailshihtzu.com/api/fluffytail/sms/inbound`; set it explicitly if the actual URL differs, including trailing slash/query. Check phone/Messaging Service callback, A2P registration and existing STOP/HELP handling in the dashboard. Do not disable validation to accommodate a URL mismatch. [Twilio validation API](https://github.com/twilio/twilio-node/blob/main/_autodocs/api-reference/webhooks.md).
6. **Stripe:** retain production credentials and Sanity's $400 litter deposits. Dashboard review must identify unpaid/open $300 Checkout sessions, Payment Links and invoices, distinguish pending asynchronous payments, and obtain authorization to expire/deactivate/void/reissue as applicable. Historical paid $300 records are correct history, not candidates for rewriting. Direct Stripe URLs cannot be invalidated by a repo-only patch. Stripe plugin discovery found an available but uninstalled Stripe connector; no authenticated Stripe account inspection was possible in this session.
7. **Stripe webhook:** verify endpoint `/api/stripe/webhook`, correct environment signing secret, subscriptions `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, delivery retries and scoped Sanity write access. Signed-event handling is tested offline; dashboard configuration/delivery is not thereby verified.
8. **Preview verification:** fresh CI and Vercel build must pass, then owner completes the manual checks below against the new candidate. Prior 34-test/visual acceptance does not cover this new form. Keep PR #2 draft; do not promote, merge or change production without explicit approval.

## Isolated Stripe Test-Mode End-To-End Plan

Not executed against Stripe; no real/test transaction was initiated in this session.

1. Use only the isolated synthetic Preview dataset, test-mode `STRIPE_SECRET_KEY`, matching test webhook secret, and a Stripe TEST endpoint for this preview. No live provider webhook may target preview. Preview code blocks live Stripe credentials and production-dataset operational writes.
2. Create synthetic litter with default total $1,600/deposit $400, one available puppy, and another with a $2,000 override. Use synthetic customer email/phone. Outbound messaging remains disabled.
3. From authenticated Inbox generate a test deposit link. Confirm server Checkout metadata binds actual puppy/litter IDs and amount 40000 cents despite forged browser pricing. Complete a TEST Checkout only after explicit test execution authorization, with Stripe test credentials/card data.
4. Confirm the signed test event stores one private $400 payment record, reserves only that puppy without removing its litter membership, deactivates its link and leaves balances $1,200/$1,600 respectively. Replay the event; no duplicate ledger entry. Invalid signature must not mutate anything.
5. Use a separate fixture for test invoice/remaining balance and async/unpaid cases. Check confirmation cannot be forged by opening its URL. Confirm missing/inconsistent CMS pricing prevents creation. No overlapping open links/invoices or production customers.
6. Record exact preview commit, Stripe test object/event IDs and test outcome without secrets; keep all synthetic artifacts in the isolated environment. Test-to-live configuration parity is a separate reviewed gate, not permission to send a live payment.

## Verification And Manual QA

- 61 local tests pass: the original 34 scenarios retained (Tally rendering/retired response expectations updated), plus 26 inquiry/messaging/privacy scenarios and one legacy-deposit-claim check. International phone normalization and multiple open form tabs have explicit regression coverage.
- Tests use real route/GROQ code against in-memory Sanity and mocked notification/payment clients; Stripe and Twilio signatures are generated/validated offline with their SDKs. No real customer notifications, transactions, dataset mutations or account changes.
- TypeScript and lint pass (zero errors, ten existing image warnings); all 11 schemas compile; local production build passes. Latest published commit still requires its own CI/Vercel result.
- No browser automation attempted, per owner instruction. No visual or provider end-to-end success is claimed.

Manual checklist, on the updated preview:

- At 400px, puppy inquiry and Contact waitlist forms fit, labels/errors are readable, no horizontal overflow or embedded/nested scrolling. Keyboard labels/radios/checkbox and submit feedback work.
- Click two different puppy inquiries: correct puppy/litter, including an old `puppyPageUrl` link. Forged display names must not change saved associations. Missing puppy route returns 404.
- Email: valid name/email/message submits without phone or SMS checkbox; Inbox keeps it visible and offers email follow-up, with SMS sending unavailable.
- Text/Either: phone and unchecked-by-default consent are required; consent/legal language is visible. Email switch removes the consent requirement. Do not use real customer details.
- Once isolated Preview settings are ready: submit synthetic lead, see confirmation and matching private Inbox record; preview sends no messages. Double-click/retry results in one lead. Check invalid input, error retention, expiration/reload and rate-limit messages.
- Confirm old Tally POST returns 410; website loads no Tally embed. `/test-stripe` remains 404; reserved puppies/litter photos/pricing and original success/invalid-URL checks remain intact.
- Verify callback signature/deduplication with offline tests, not live customer messages. Test-mode Stripe flow waits for isolated configuration and execution authorization.

Recommendation: **NO-GO for production** until historical privacy remediation, isolated submission/payment verification, provider configuration and revised manual QA are complete. Phase 2 branding has not started.

## Files In This Follow-Up

Added:

- `app/api/inquiry/route.ts`
- `app/components/InquiryForm.tsx`
- `app/components/inquiry-form.css`
- `docs/fluffytail-native-inquiry-release.md`
- `lib/inquiry.ts`
- `lib/inquiry-security.ts`
- `lib/request-body.ts`
- `sanity/lib/inquiry-service.ts`
- `sanity/lib/private-records.ts`
- `sanity/lib/twilio.ts`
- `sanity/schemaTypes/inquiryRate.ts`
- `tests/inquiries.test.mjs`

Modified:

- `AGENTS.md`
- `app/api/fluffytail/inquiry/route.ts`
- `app/api/fluffytail/sms/inbound/route.ts`
- `app/api/stripe/webhook/route.ts`
- `app/contact/page.tsx`
- `app/inbox/InboxClient.tsx`
- `app/inbox/api/create-deposit-session/route.ts`
- `app/inbox/api/create-invoice/route.ts`
- `app/inbox/api/delete-conversation/route.ts`
- `app/inbox/api/sms-send/route.ts`
- `app/inbox/page.tsx`
- `app/puppy-inquiry/page.tsx`
- `app/privacy-policy/page.tsx`
- `app/terms-and-conditions/page.tsx`
- `docs/fluffytail-codex-ops.md`
- `docs/fluffytail-phase-1-release.md`
- `docs/fluffytail-system-map.md`
- `lib/inventory.ts`
- `sanity.config.ts`
- `sanity/schemaTypes/index.ts`
- `sanity/schemaTypes/puppyInquiry.ts`
- `sanity/schemaTypes/siteSettings.ts`
- `sanity/schemaTypes/smsMessage.ts`
- `tests/inventory.test.mjs`
- `tests/payments.test.mjs`
- `tests/register-typescript.mjs`

Removed: `app/components/WaitlistModal.tsx` (unused Tally iframe component).

No dependency/lockfile/env changes in this follow-up.
