# Website copy and Jeanne portrait review

Source: the owner's finished [manuscript](source/FluffyTail-Website-Copy.md), supplied October 28, 2026. Base is current main `bdaeb56`, retaining the complete production payment release and approved puppy portraits. This branch is for review; no merge or Production deployment is authorized in this phase.

## Implemented

The manuscript now supplies the homepage, Meet Jeanne, available/upcoming litters, pricing/process, contact, inquiry states, breed/resources pages, navigation/footer and search descriptions. The established routes, canonical URLs, title template, palette, Adobe fonts, page structures, homepage photograph and puppy portraits remain. Jeanne's supplied image is exported as `public/brand/jeanne-portrait.webp` (960×1200, about 118 KB); the source file remains intact. The full portrait fits its frame on mobile and desktop. Its caption/alt describe Jeanne, never the decorative background as her home.

Prices, dates, sex, color, parent associations, individual observations and canonical statuses remain record-driven. The pricing example appears only when all relevant valid quotes agree on one total/deposit pair. Historical prices and Reserved/Sold/Gone Home states are preserved. Inquiry submission, consent/STOP/HELP, duplicate handling, anti-abuse, notification delivery and payment accounting are unchanged. Copy distinguishes saved inquiries, provider acceptance, pending payments and verified payment/reservation states.

New payment emails use presentation version 3 for the supplied request/confirmation wording. Versions 1 and 2 retain exact earlier rendering for stored reviews and immutable outgoing snapshots. Future confirmation snapshots freeze the verified reservation flag alongside the existing note and facts; reservation wording appears only for that confirmed state. There are no new provider calls or triggers. Staff layout, attachments, original Inbox, message history and existing payment links remain intact. The deferred Stripe subscription setting and paused historical migration are not resumed.

## Actual CMS changes — unpublished

Three drafts were prepared in `3glz6dkx/production` using revision checks and draft IDs only:

| Published document | Draft fields changed |
| --- | --- |
| Site settings `2cbf546c-550a-4cd0-8fb5-b7719f1c0c9c` | `homepageHeadline`: “From our home to yours.”; `homepageIntro`: both supplied introduction paragraphs; `serviceArea`: empty to avoid a repeated generic regional sentence |
| Puppy `6e181ad7-3340-4b2f-ba61-91fbd9155ca0`, slug `girl-1-1` | `name`: “Girl 1” |
| Litter `4f2729d8-568c-4bb6-8db9-7679ca057183` | `summary`: “Born March 23, 2026: seven puppies, two girls and five boys.” |

All 31 existing published/unrelated content records retained their revisions. Published source text, prices, statuses, relationships, photographs and all operational records were not changed. Girl 2's already-correct color was left alone. These drafts have not been published.

The copy Preview reads real **published** public inventory. To show the three unpublished draft changes without adding any CMS credential, a branch-only `FLUFFYTAIL_COPY_REVIEW_CONTENT` variable mirrors their exact `_id`, `_rev` and approved copy fields. The server applies only these named text fields, and only in the Production-content copy-review Preview. It cannot override prices, status, photographs, visibility or relationships. Production ignores the mirror; it continues to use actual published CMS fields. Synthetic payment previews also ignore it. Later changes to these drafts require refreshing the mirror and rebuilding the copy Preview; this is deliberately a bounded review snapshot, not a new general draft-preview system.

Branch-only configuration selects the existing public Production dataset, freezes operational writes and provides a separate Preview inquiry-form token secret solely so the form can load. Production configuration and the payment-testing alias are unchanged. No real inquiry, send, payment request, Checkout, payment or reservation is performed during verification. The Preview is for content/layout review; submitting forms or operating the staff workspace is intentionally unavailable.

## Validation

The existing regression suite was updated for the supplied wording while retaining status, quote, relationship, duplicate-send and consent assertions. Added checks cover the exact personal introduction/portrait, constrained draft mirror, future CMS editing, ambiguous price ranges, payment/reservation conditions and earlier email-version rendering. Local build, hosted verification, desktop/mobile review and the final Preview URL are recorded below once complete.

## Finished review — October 28

Working entry: **https://fluffytail-copy-review.vercel.app/**. Meet Jeanne: **https://fluffytail-copy-review.vercel.app/about**. These public review pages open in a fresh browser without Vercel or staff sign-in. Only this review alias has the public-page access exception; project-wide protection, Production access, the private staff API and the existing payment-test alias are unchanged. The app's staff authentication remains enforced, and this copy Preview has all operational writes frozen.

Runtime `60e19f0`, deployment `dpl_Fs2UYdvR1wN5osnYyaKXvuoENAru`, passed **257 tests**, TypeScript, lint (zero errors; eighteen existing image warnings), local optimized build, GitHub verification and Vercel's Preview build. PR #14 remains a draft for owner review; it has not been merged.

Hosted checks returned 200 for all eight public editorial routes, future-interest inquiry, available Girl 2 inquiry and reserved Girl 1 inquiry. They verified the real CMS-derived $1,600/$400/$1,200 current pricing and the archived $1,500/$300 figures, the exact new CMS introduction, corrected Girl 1 spelling, archived summary, preserved homepage/puppy images, helpful unavailable state, loaded form token and private staff API (401). Browser review at desktop 1365×900 and mobile 390×844 found no horizontal overflow on the checked pages. Jeanne's portrait retained its full face/glasses and 4:5 proportions; mobile navigation closed after selection. Girl 2's form had the supplied prefill, and Text displayed the unchanged consent/STOP/HELP/policy wording. Reserved Girl 1's direct inquiry link showed the accurate notice and no form. No inquiry was submitted.

Read-only CMS rechecks confirmed that all three published documents were byte-for-byte unchanged and all three draft revisions still matched the reviewed snapshot. The real Production homepage retained its prior published text. No real email/SMS, payment, Checkout, reservation or production deployment occurred. Payment behavior was exercised only with the existing isolated provider fixtures; no live payment trial or deferred Stripe setting was resumed.

Screenshots and structured hosted/browser proof are saved outside the repository at `C:/Users/jlcfe/AppData/Local/FluffyTail/CopyReview/`, including `jeanne-desktop.jpg`, `jeanne-mobile.jpg`, page screenshots and `hosted-proof.json` / `browser-proof.json`. The manuscript and optimized portrait are committed; the original source portrait is unmodified at the owner's supplied path.

After owner review, publish only the three listed CMS drafts alongside the approved code release. Production then continues reading the actual published CMS fields without a text override. Refresh the bounded mirror only if review drafts change before approval; do not publish or reset unrelated content.
