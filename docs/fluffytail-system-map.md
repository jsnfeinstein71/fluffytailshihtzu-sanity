# FluffyTail System Map

Last mapped: 2026-10-25. See [the reliability audit](fluffytail-reliability-audit.md) for current data rules, verification results, and remaining operational risks.

## Source And Deployment

- GitHub repository: `jsnfeinstein71/fluffytailshihtzu-sanity`
- Local package: `fluffytailshihtzu-sanity`
- Primary branch observed locally: `main`
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
- `puppyInquiry`: lead records created from Tally webhook payloads.
- `smsMessage`: inbound/outbound Twilio conversation records.
- `paymentRecord`: Stripe payment history used for balance summaries.
- `depositLink`: short token records for `/pay/[token]` redirects to Stripe Checkout.
- `invoiceRecord`: Stripe invoice tracking.

Public pages fetch Sanity content with `revalidate = 60` on inventory-heavy pages and `revalidate = 10` for `/inbox`. Write APIs use `SANITY_API_WRITE_TOKEN`.

Public inventory has shared queries in `sanity/lib/inventory-queries.ts`, explicit published perspective and 60-second fetch revalidation in `sanity/lib/inventory.ts`, and shared rules/types in `lib/inventory.ts`. Updates appear after request-driven revalidation and a reload; there is no active Live Content subscription.

Public inventory excludes drafts, release versions, explicitly hidden records, and puppies without a published, visible parent litter. Existing records without `isVisible` remain visible. Past puppies remain accessible under their original litter on Available Puppies. Litter images prefer `groupPhoto`, then `heroImage`, then parent photos. Existing image and copy fields are retained.

## Tally Inquiry Flow

Puppy-specific inquiries are embedded at `/puppy-inquiry` using:

- Tally embed: `https://tally.so/embed/1Av6Dl?alignLeft=1&hideTitle=1`
- Hidden/query context: `puppy`, `litter`, `puppyPageUrl`, and `message`
- Puppy pages build a prefilled `/puppy-inquiry?...` URL.

Expected webhook target:

- `POST /api/fluffytail/inquiry`

That API parses Tally fields, creates a `puppyInquiry` Sanity document, then sends alert SMS messages through Twilio to `FLUFFYTAIL_ALERT_NUMBER` and optional `FLUFFYTAIL_ALERT_NUMBER_2`. Alert messages are also logged as `smsMessage` documents with source `fluffytail-alert`.

The `/contact` page can embed a waitlist form from `siteSettings.waitlistUrl` and links to GoodDog as a fallback. Keep waitlist and puppy-specific inquiry paths separate.

> Phase 1 branch update: the pricing/auth changes below describe a proposed release, not verified production. See docs/fluffytail-phase-1-release.md.

## Twilio Messaging Flow

Inbound customer SMS/MMS:

- `POST /api/fluffytail/sms/inbound`
- Twilio form payload is stored as a `smsMessage` Sanity document.
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

Both pages describe puppy inquiries, waitlist requests, SMS consent, STOP/HELP, and third-party service use. The legal copy states that SMS consent is collected only through `/puppy-inquiry`.

Lead capture paths:

- Puppy page inquiry button to `/puppy-inquiry` with puppy/litter/page context.
- `/puppy-inquiry` embedded Tally form for specific puppy inquiries and SMS consent.
- `/contact` waitlist embed from Sanity `siteSettings.waitlistUrl`.
- GoodDog profile fallback: `https://my.gooddog.com/fluffytail-shih-tzu-alabama`.
- Tally webhook to `/api/fluffytail/inquiry`.

## Operational Risks And Mismatches

- The old missing-field/status mismatch is reconciled without migrating documents: `planned/current/past` are canonical litter values; `upcoming/active` remain supported aliases. All six puppy statuses are supported in Studio and frontend; unknown statuses are not labeled Available.
- Earlier mojibake observations were based on shell output and are not sufficient evidence of damaged source. Preserve the existing UTF-8 copy.
- `/test-stripe` was removed from the route tree because it publicly exposed a test checkout trigger.
- All operator actions are under /inbox/api with explicit Basic Auth and cross-origin mutation checks, plus proxy protection. Missing credentials fail closed. Old public operator paths are removed.
- Tally webhook handling maps field labels/keys manually. Renaming fields in Tally can silently reduce lead quality unless the webhook parser is updated.
- Sanity is the pricing source of truth; payment creation and short-link validation use no-store reads. Public inventory may lag CMS edits by up to 60 seconds.
- Read-only inspection on 2026-10-25 found $400 deposits/$1,600 defaults on current/expected litters. This branch corrects the $300 mismatch; old unpaid Stripe sessions still require dashboard retirement. Paid historical records are preserved.
- The site has no committed Vercel project metadata or environment map. Runtime behavior depends on Vercel environment variables.
- Local Git metadata is read-only; use the GitHub app for a separate release branch/PR, never merge without approval.
- Preview rejects live Stripe keys and production-dataset operator access; messaging/provider callbacks are disabled. Production Sanity ACLs and unsigned Tally/Twilio callbacks remain release risks.

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
- `FLUFFYTAIL_ALERT_NUMBER`
- `FLUFFYTAIL_ALERT_NUMBER_2`
- `INBOX_BASIC_AUTH_USER`
- `INBOX_BASIC_AUTH_PASS`
