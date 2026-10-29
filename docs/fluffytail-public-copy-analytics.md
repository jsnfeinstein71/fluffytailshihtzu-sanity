# Public copy and optional analytics removal — October 29, 2026

Owner authorized Production publication on latest main `1fa1877`, preserving the released litter workflow, staff passkeys, payments, correspondence, records, approved branding/layouts/photos and completed isolated Preview. No customer sends, payments, reservation offers or historical migration are part of this release.

## Changes

- Removed the Google/Vercel optional analytics runtime, route tracking, puppy registration marker, popup, settings control and associated styles. There is no provider loader in the application. Existing saved analytics consent is removed; only legacy `_ga` / `_ga_*` cookies are expired. Essential storage, inquiry drafts, staff cookies and payment behavior are untouched. The privacy page's analytics section now accurately describes disabled analytics; all other formal/SMS wording and revision dates remain unchanged.
- Upcoming Litters uses the supplied personal introduction and exact approved deposit/transfer/expectation wording. Each litter's deposit paragraph uses the validated configured amount, including cents where necessary; missing pricing never invents $400. General transfer/expectation paragraphs appear once, alongside the first announced litter. Each four-position display and litter-aware inquiry button remains. Repetitive prior introductions, reservation-policy paragraphs and price-note duplication were removed without changing the grid, photography or branding. The button says Ask Jeanne about this litter.
- Removed non-refundable wording from the public puppy detail note and Pricing & Process. Homepage, Available Puppies, About, Contact, shared browsing content and published CMS fields were checked. Payment request emails/texts, checkout pages and applicable formal disclosures remain; receipts are not the first disclosure. No payment/message template snapshot, signed record or financial history is edited.

## Actual Sanity source

Read the real `3glz6dkx/production` published `siteSettings`, `faq`, `puppy`, `litter` and `dog` documents: 31 records (one settings, 23 puppies, seven litters; no FAQ/dog documents). None contain non-refundable wording. The affected current text comes from the page components, not a Sanity override. No CMS mutation or draft publication is required or performed. Backups of public records and all record revision metadata are saved privately outside the repository for preservation verification. Prices/statuses/reservations and unrelated drafts stay intact.

## Verification and release

Retired tests specific to the removed opt-in tracking feature were replaced with checks that no provider loader/control is reachable, previously accepted analytics storage is cleared without clearing essential state, differing litter deposits render correctly with common guidance only once, and both puppy/litter deposit pages disclose terms before checkout. Existing payment, inquiry, communication, passkey and reservation regression suites remain.

Final checks, hosted desktop/mobile evidence, deployed commit and read-only record-preservation results are recorded on the release PR. Verify published public browsing pages, a real existing payment page and pre-checkout fixture rendering; do not initiate a checkout or create a new real reservation for verification. Keep the completed litter-reservation Preview pinned to its existing isolated deployment.
