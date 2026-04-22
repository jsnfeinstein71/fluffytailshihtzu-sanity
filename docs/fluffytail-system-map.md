# FluffyTail System Map

Last mapped: 2026-04-22

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

- `/` homepage with Sanity-driven site settings, active litters, available puppies, and matched puppies.
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
- `litter`: litter metadata, status, dates, pricing, deposit, and hero image.
- `puppy`: puppy name, slug, litter reference, status, sex, color, summary, images, and optional price override.
- `faq`
- `puppyInquiry`: lead records created from Tally webhook payloads.
- `smsMessage`: inbound/outbound Twilio conversation records.
- `paymentRecord`: Stripe payment history used for balance summaries.
- `depositLink`: short token records for `/pay/[token]` redirects to Stripe Checkout.
- `invoiceRecord`: Stripe invoice tracking.

Public pages fetch Sanity content with `revalidate = 60` on inventory-heavy pages and `revalidate = 10` for `/inbox`. Write APIs use `SANITY_API_WRITE_TOKEN`.

## Tally Inquiry Flow

Puppy-specific inquiries are embedded at `/puppy-inquiry` using:

- Tally embed: `https://tally.so/embed/1Av6Dl?alignLeft=1&hideTitle=1`
- Hidden/query context: `puppy`, `litter`, `puppyPageUrl`, and `message`
- Puppy pages build a prefilled `/puppy-inquiry?...` URL.

Expected webhook target:

- `POST /api/fluffytail/inquiry`

That API parses Tally fields, creates a `puppyInquiry` Sanity document, then sends alert SMS messages through Twilio to `FLUFFYTAIL_ALERT_NUMBER` and optional `FLUFFYTAIL_ALERT_NUMBER_2`. Alert messages are also logged as `smsMessage` documents with source `fluffytail-alert`.

The `/contact` page can embed a waitlist form from `siteSettings.waitlistUrl` and links to GoodDog as a fallback. Keep waitlist and puppy-specific inquiry paths separate.

## Twilio Messaging Flow

Inbound customer SMS/MMS:

- `POST /api/fluffytail/sms/inbound`
- Twilio form payload is stored as a `smsMessage` Sanity document.
- The endpoint returns TwiML acknowledging receipt and mentions STOP/HELP.

Outbound breeder replies:

- `/inbox` renders customer conversations from Sanity.
- `POST /api/fluffytail/sms/send` sends SMS/MMS through Twilio and stores the outbound record in Sanity.
- Images are uploaded through `POST /api/fluffytail/upload-image`, which stores assets in Sanity and returns CDN URLs.

Inbox protection:

- `proxy.ts` applies Basic Auth to `/inbox/:path*` using `INBOX_BASIC_AUTH_USER` and `INBOX_BASIC_AUTH_PASS`.

## Stripe Payment Flow

Stripe is used from the protected inbox flow. Avoid changing live payment behavior without explicit authorization.

Deposit links:

- `POST /api/stripe/create-deposit-session`
- Creates a Stripe Checkout Session for a hard-coded $300 deposit.
- Creates a Sanity `depositLink` with a short token.
- `/pay/[token]` redirects active tokens to the stored Stripe Checkout URL.
- `checkout.session.completed` webhook creates a `paymentRecord`, marks the puppy `reserved`, and deactivates the deposit link.

Manual payment links:

- `POST /api/stripe/create-payment-link`
- Creates a Stripe Checkout Session for a supplied amount.
- Completion is recorded by the shared webhook as `paymentType: manual-payment`.

Invoices:

- `POST /api/stripe/create-invoice`
- Looks up puppy pricing in Sanity, subtracts paid `paymentRecord` totals, creates/finalizes a Stripe invoice, and stores an `invoiceRecord`.
- `invoice.paid` webhook creates a `paymentRecord` and updates matching `invoiceRecord` totals.

Webhook:

- `POST /api/stripe/webhook`
- Verifies `stripe-signature` with `STRIPE_WEBHOOK_SECRET`.
- Handles `checkout.session.completed` and `invoice.paid`.

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

- The repo has customer-facing mojibake in several files, likely from encoded apostrophes, bullets, and emoji. Fixing this touches visible copy and should be handled separately with careful visual review.
- Sanity schema status values and frontend status checks do not fully match. Examples: schemas use `sold` and `holdback`, while pages check `hold`, `reserved`, `gone-home`, `active`, and `upcoming` in places.
- Several page queries reference fields that are not present in the current schema files, such as `girlsCount`, `boysCount`, `summary`, `groupPhoto`, `sortOrder`, and `notes`. These may exist in Sanity data or previous schemas, but the mismatch should be verified before schema work.
- `/test-stripe` was removed from the route tree because it publicly exposed a test checkout trigger.
- `/inbox` is protected by Basic Auth, but its API routes create payment links, send Twilio messages, upload Sanity images, and delete conversations. Treat any auth or route changes here as production-sensitive.
- Tally webhook handling maps field labels/keys manually. Renaming fields in Tally can silently reduce lead quality unless the webhook parser is updated.
- Stripe deposit amount is hard-coded to $300 in the API, while Sanity litters also have a `deposit` field. Verify intended source of truth before changing pricing.
- The site has no committed Vercel project metadata or environment map. Runtime behavior depends on Vercel environment variables.
- `gh` was not available in the local workspace during this mapping, so GitHub app/CLI operations beyond cloning were not performed.

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
