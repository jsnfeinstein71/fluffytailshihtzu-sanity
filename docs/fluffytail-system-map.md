# FluffyTail System Map

Last mapped: 2026-10-25. See [the reliability audit](fluffytail-reliability-audit.md) for current data rules, verification results, and remaining operational risks.

## Source And Deployment

- GitHub repository: `jsnfeinstein71/fluffytailshihtzu-sanity`
- Local package: `fluffytailshihtzu-sanity`
- Production source branch: `main`; current draft release: `codex/phase-1-pricing-reliability` (PR #2).
- Deployment target: Vercel
- Public production domain: `https://www.fluffytailshihtzu.com`
- Framework: Next.js App Router with React, TypeScript, Sanity, Stripe, Twilio, and Vercel Analytics.

GitHub should be treated as the source of truth for code review and history. Vercel should be treated as the deployment/runtime target. The repo ignores `.vercel`, so local Vercel project linkage is intentionally not part of source control.

## Public Site Routes

Static and content-backed routes observed in the repo and live sitemap:

- `/` homepage with Sanity-driven site settings and active litter sections. All puppy statuses remain in their original litter; there is no separate matched-puppy list.
- `/about`
- `/the-breed`
- `/puppy-resources`
- `/pricing`
- `/available-puppies`
- `/upcoming-litters`
- `/contact`
- `/puppy-inquiry`
- `/privacy-policy`
- `/terms-and-conditions`
- `/puppies/[slug]`
- `/payment-success`
- `/pay/[token]`
- `/studio`
- `/inbox`

The live sitemap on 2026-04-22 included the static marketing/legal routes plus current puppy detail URLs such as `/puppies/female-1`, `/puppies/female-3`, `/puppies/boy-5`, `/puppies/girl-2`, `/puppies/boy-1`, `/puppies/boy-2`, `/puppies/male-1`, `/puppies/boy-4`, `/puppies/boy-3`, `/puppies/girl-1`, and `/puppies/female-2`.

## Sanity CMS Role

Sanity is the content and operational record store for the site. Studio is embedded at `/studio` with schema types:

- `siteSettings`: homepage copy/images, GoodDog URL, waitlist URL, puppy inquiry form URL, service area.
- `dog`: optional sire/dam records with name, sex, and photo, referenced by litters.
- `litter`: metadata, status, actual/expected dates, parent references, availability notes, pricing, deposit, images, sort order, and public visibility.
- `puppy`: puppy name, slug, litter reference, status, sex, color, summary, images, and optional price override.
- `faq`
- `puppyInquiry`: native inquiry/waitlist leads, contact preferences, SMS consent evidence, server-selected puppy/litter context and operator-notification state. Historical Tally leads are preserved.
- `smsMessage`: inbound/outbound Twilio conversation records.
- `paymentRecord`: Stripe payment history used for balance summaries.
- `depositLink`: short token records for `/pay/[token]` redirects to Stripe Checkout.
- `invoiceRecord`: Stripe invoice tracking.
- `inquiryRate`: authenticated-only fixed-bucket form admission counters; no raw IP/email stored.

Public pages fetch Sanity content with `revalidate = 60` on inventory-heavy pages and authenticated no-store reads for `/inbox`. Write APIs use `SANITY_API_WRITE_TOKEN`.

Public inventory has shared queries in `sanity/lib/inventory-queries.ts`, explicit published perspective and 60-second fetch revalidation in `sanity/lib/inventory.ts`, and shared rules/types in `lib/inventory.ts`. Updates appear after request-driven revalidation and a reload; there is no active Live Content subscription.

Public inventory excludes drafts, release versions, explicitly hidden records, and puppies without a published, visible parent litter. Existing records without `isVisible` remain visible. Past puppies remain accessible under their original litter on Available Puppies. Litter images prefer `groupPhoto`, then `heroImage`, then parent photos. Existing image and copy fields are retained.

## Native Inquiry Flow (Draft Release)

- `/puppy-inquiry` and Contact's general inquiry form share `app/components/InquiryForm.tsx`. General messages start empty with a helpful placeholder; explicit `/puppy-inquiry?interest=waitlist` links retain their future-litter message. Puppy context is prefilled from published inventory, then re-resolved server-side on submit.
- `GET /api/inquiry` issues/reuses a cookie-bound signed token; `POST /api/inquiry` validates origin, body, fields, contact preference, SMS consent, honeypot, rate limits and duplicates.
- The existing Sanity `puppyInquiry` record and Twilio operator alerts to `FLUFFYTAIL_ALERT_NUMBER` / optional `FLUFFYTAIL_ALERT_NUMBER_2` are reused. New inquiry/alert records require authenticated document reads.
- Inbox retains phone-less Email inquiries, provides mailto follow-up and independently enforces native SMS preferences/consent in the send API.
- There is no configured application email sender in this repo; no new email service is added.
- Old website inquiry links remain valid. `siteSettings.waitlistUrl` and `puppyInquiryUrl` are preserved but ignored/read-only.
- Tally embeds/runtime removed; old `POST /api/fluffytail/inquiry` is a no-write `410 Gone`. Tally account/history remains untouched. Disabling old external forms/webhooks is a later owner action after approved release.
- See [native inquiry release gates and QA](fluffytail-native-inquiry-release.md). These branch changes are not yet production.

## Twilio Messaging Flow

Inbound customer SMS/MMS:

- `POST /api/fluffytail/sms/inbound`
- Exact configured external URL, all form fields and `X-Twilio-Signature` are verified with the Twilio SDK before writes. Valid callbacks use private SID-based IDs; duplicate/legacy SIDs do not create records or repeated acknowledgements. Failed persistence returns retryable 503.
- The endpoint returns TwiML acknowledging receipt and mentions STOP/HELP.

Outbound breeder replies:

- `/inbox` renders customer conversations from Sanity.
- `POST /inbox/api/sms-send` sends SMS/MMS through Twilio and stores the outbound record in Sanity.
- Images are uploaded through `POST /inbox/api/upload-image`, which stores assets in Sanity and returns CDN URLs.

Inbox protection:

- `proxy.ts` applies Basic Auth to `/inbox/:path*` using `INBOX_BASIC_AUTH_USER` and `INBOX_BASIC_AUTH_PASS`.

## Stripe Payment Flow

Stripe is used from the protected inbox flow. Avoid changing live payment behavior without explicit authorization.

Deposit links:

- `POST /inbox/api/create-deposit-session`
- Uses the associated Sanity litter deposit and puppy override/litter total; invalid pricing blocks creation.
- Creates one conditional-revision deposit claim per puppy with a secure token, one-hour expiry, quote snapshot and Stripe idempotency.
- `/pay/[token]` rechecks new unexpired quotes against fresh Sanity eligibility/pricing before redirecting to Stripe. Legacy unverifiable quotes must be reissued.
- `checkout.session.completed` webhook creates a `paymentRecord`, marks the puppy `reserved`, and deactivates the deposit link.

Manual payment links:

- `POST /inbox/api/create-payment-link`
- Creates an authenticated operator-selected partial payment capped by the server-calculated outstanding balance.
- Completion is recorded by the shared webhook as `paymentType: manual-payment`.

Invoices:

- `POST /inbox/api/create-invoice`
- Looks up puppy pricing in Sanity, subtracts paid `paymentRecord` totals, creates/finalizes a Stripe invoice, and stores an `invoiceRecord`.
- `invoice.paid` webhook creates a `paymentRecord` and updates matching `invoiceRecord` totals.

Webhook:

- `POST /api/stripe/webhook`
- Verifies `stripe-signature` with `STRIPE_WEBHOOK_SECRET`.
- Handles checkout.session.completed, checkout.session.async_payment_succeeded and invoice.paid; records actual paid Stripe amounts with new quote/association checks and idempotent transactional recording.

## Legal Pages And Lead Capture

Legal pages:

- `/privacy-policy`
- `/terms-and-conditions`

Both pages describe puppy inquiries, waitlist requests, SMS consent, STOP/HELP, and third-party service use. The branch updates only the consent-location paragraphs to list `/puppy-inquiry` and `/contact`, with consent required for Text/Either but not Email.

Lead capture paths:

- Puppy page inquiry button to `/puppy-inquiry` with puppy/litter/page context.
- `/puppy-inquiry` native puppy/general inquiry form with conditional SMS consent.
- `/contact` native general inquiry form and `/puppy-inquiry?interest=waitlist` future-interest links.
- GoodDog profile fallback: `https://my.gooddog.com/fluffytail-shih-tzu-alabama`.
- Native submission to `/api/inquiry`; retired Tally webhook returns 410 on the release branch.

## Operational Risks And Mismatches

- The old missing-field/status mismatch is reconciled without migrating documents: `planned/current/past` are canonical litter values; `upcoming/active` remain supported aliases. All six puppy statuses are supported in Studio and frontend; unknown statuses are not labeled Available.
- Earlier mojibake observations were based on shell output and are not sufficient evidence of damaged source. Preserve the existing UTF-8 copy.
- `/test-stripe` was removed from the route tree because it publicly exposed a test checkout trigger.
- All operator actions are under /inbox/api with explicit Basic Auth and cross-origin mutation checks, plus proxy protection. Missing credentials fail closed. Old public operator paths are removed.
- Tally is retired on the branch. Do not spend additional development effort improving its former webhook parser; preserve historical submissions.
- Sanity is the pricing source of truth; payment creation and short-link validation use no-store reads. Public inventory may lag CMS edits by up to 60 seconds.
- Read-only inspection on 2026-10-25 found $400 deposits/$1,600 defaults on current/expected litters. This branch corrects the $300 mismatch; old unpaid Stripe sessions still require dashboard retirement. Paid historical records are preserved.
- The site has no committed Vercel project metadata or environment map. Runtime behavior depends on Vercel environment variables.
- The earlier Git write sandbox restriction was resolved; current branch push works. Keep PR #2 draft and never merge without approval.
- Preview rejects live Stripe keys and production-dataset operator access; messaging/provider callbacks are disabled. Native form submission requires a synthetic isolated dataset and a form secret; owner confirmed Preview setup is not yet ready.
- Anonymous count-only inspection confirmed 54 published operational documents readable in production. New writes use authenticated-only dotted IDs, but historical records remain a production blocker requiring an explicitly approved privacy change. Do not change dataset visibility or migrate blindly.
- Exact Twilio callback URL/Auth Token and Stripe dashboard webhook/obsolete $300 quote cleanup remain verification gates; no live messages/payments or production changes were performed.

## Runtime Environment Variables

Observed required or relevant variables:

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION`
- `SANITY_API_WRITE_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `TWILIO_SMS_WEBHOOK_URL` (exact external inbound signing URL)
- `FLUFFYTAIL_ALERT_NUMBER`
- `FLUFFYTAIL_ALERT_NUMBER_2`
- `INBOX_BASIC_AUTH_USER`
- `INBOX_BASIC_AUTH_PASS`
- `INQUIRY_FORM_SECRET` (server-only, at least 32 random characters)
