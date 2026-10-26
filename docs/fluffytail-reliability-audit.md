# FluffyTail Structural Audit and Reliability Baseline

Audit date: 2026-10-25. Scope: repository review, read-only live Sanity inspection, focused inventory corrections, and regression verification. No content was migrated, deleted, or overwritten. No production deployment or payment/message action was performed.

## Root Causes

1. Home and Available Puppies explicitly filtered `status !== 'reserved'` inside each litter, then rendered reserved puppies in a separate global list. This removed the litter context and could misleadingly leave empty sections. Shared litter rendering now includes every public puppy exactly once in its original litter.
2. Pages read only `groupPhoto`, but newer Studio records used `heroImage`. Read-only inspection confirmed the planned Penny October 31 litter has a published `heroImage` and no `groupPhoto`. Shared projections now fall back through both images and parent photos.
3. The planned litter already meets the old query's status filter. The code does NOT prove a status-based exclusion of that record; the definite defects are the missing image fallback and missing expected-date model. Cached public search results showed older inventory and cannot verify the current deployment. A fresh production browser check remains necessary.
4. Planned litters had no expected date field, so the Penny record stored October 31 in `birthDate`. Expected dates are now distinct and optional; legacy planned records still display `birthDate` as an expected date. Actual puppy ages are never derived from expected dates.
5. Puppy types, status labels, dates, queries, and litter markup were repeated across four pages. The waitlist calculation counted available puppies from any litter. Shared rules now scope it to active litters and use the same statuses in Studio and frontend.
6. Available Puppies classified every non-active litter as past, including expected/unknown statuses. Past browsing now selects only `past`; upcoming/active summaries use the appropriate statuses.
7. Unknown statuses fell back to Available. They now display Status pending and cannot produce a puppy-specific inquiry action.
8. Root metadata made every child canonical point to `/`; missing puppies rendered a success-status page. Public routes now define their own canonicals, missing/hidden puppy routes call `notFound()`, and the sitemap uses the same public inventory eligibility as detail pages.

## Live Sanity Evidence

The configured production dataset returned seven published litters and 23 puppies. At inspection there was one current litter, one planned litter, and five past litters. Puppy statuses were 20 reserved, two sold, one available. No existing dog document type was present, so parent references are optional new capabilities rather than assumptions about migrated data.

- Elsie October 17, 2026: `current`, three puppies (one available, two reserved), `heroImage`, $1,600 price, $400 deposit.
- Penny October 31, 2026: `planned`, no puppies, `heroImage`, legacy expected date stored in `birthDate`, $1,600 price, $400 deposit.
- Older litters use `groupPhoto` and sometimes `summary`. Current records must retain those fields.

The exact new shared GROQ queries were executed read-only through the Sanity connector. They returned all seven litters, all 23 puppies, the expected litter's photo, and both reserved puppies in the active litter. No customer inquiry/message/payment data was fetched for this audit.

## Established Data Rules

| Concern | Rule |
| --- | --- |
| Litter statuses | Canonical stored values: `planned`, `current`, `past`. Read/display `upcoming` as planned and `active` as current. No document rewrite. |
| Puppy statuses | `available`, `hold`, `reserved`, `sold`, `holdback`, `gone-home`. Keep all distinct and visible in their original litter. Unknown/missing values display Status pending. |
| New inquiries | Only explicitly available puppies in active litters get a puppy-specific inquiry button. Other detail pages show the status and a general Contact link. This does not change Stripe endpoint authorization or payment behavior. |
| Parent relationship | A puppy references one litter. Litters optionally reference sire/dam `dog` documents; parent name/photo come from those records. Publish parents to display them. |
| Dates | `expectedBirthDate` before birth; `birthDate` after birth. Planned records may temporarily use their existing `birthDate` as an expected date. No actual birth date is required for upcoming visibility. |
| Availability | Optional `expectedAvailability` text on upcoming litters; no invented delivery date. Eight-week readiness is derived only from actual puppy birth context. |
| Images | Prefer existing `groupPhoto`, then `heroImage`, then dam/sire photo. Both litter image fields remain editable and no assets move. |
| Copy | Prefer litter `summary`, fall back to `description`; puppy `notes`, fall back to `summary`. Notes are explicitly labeled public in Studio. |
| Pricing | Public puppy price uses `overridePrice` then parent litter `price`; public deposit uses parent litter `deposit`. General Pricing points to each puppy page for its deposit. Stripe remains unchanged. |
| Ordering | Unnumbered litters sort oldest date first. Explicit `sortOrder` values come first, lowest first; date and ID break ties. Puppies use manual order, then name and ID. |
| Visibility | Public reads use published perspective, exclude drafts/releases, and honor optional `isVisible: false`. Existing missing visibility fields mean visible. Hidden/unpublished/missing parent litters suppress puppy browsing/detail/sitemap entries. |
| Slugs | Keep existing required Sanity slugs and default uniqueness behavior; encode them when forming URLs. No slug regeneration or migration. |
| Updates | Public inventory fetches explicitly revalidate after 60 seconds with CDN bypass. Revalidation is request-driven; a loaded browser must reload. No live subscription is installed. |
| Multiple litters | Every active litter produces one section, containing only its referenced puppies. Zero litters has an empty state; no hard-coded litter IDs. |
| Past puppies | Browse through their original past-litter expandable section on Available Puppies. No global matched list or duplicate puppy cards. |
| Contact-only actions | Waitlist and GoodDog actions remain on Contact. Homepage Waitlist open is an indicator, based only on available males/females in active litters. |
| Inquiries | Keep puppy name, litter title, canonical puppy page URL, and prefilled message in the existing inquiry flow. Tally, consent disclosures, notifications, and messaging handlers remain operationally unchanged. |

## Files Changed

Added:

- `lib/inventory.ts`: public types, status options, grouping/sorting, dates, pricing formatting, waitlist and inquiry URL helpers.
- `sanity/lib/inventory-queries.ts`: published/visible inventory projections and image/copy compatibility.
- `sanity/lib/inventory.ts`: cached request helpers with explicit published perspective and 60-second revalidation.
- `app/components/PuppyCard.tsx`, `LitterSection.tsx`, `LitterTile.tsx`: shared presentation using the existing CSS classes.
- `sanity/schemaTypes/dog.ts`: minimal optional parent records.
- `tests/register-typescript.mjs`, `tests/inventory.test.mjs`: actual page/query regression testing with in-memory Sanity; no external writes.
- `scripts/preview-inventory.mjs`: optional offline layout preview of projected public query snapshots; external resources are disabled and images use placeholders.
- `docs/fluffytail-reliability-audit.md`: this audit.

Modified:

- `app/page.tsx`, `app/available-puppies/page.tsx`, `app/upcoming-litters/page.tsx`, `app/puppies/[slug]/page.tsx`: shared inventory, statuses, grouping, eligibility, and detail 404/canonicals.
- `sanity/schemaTypes/litter.ts`, `puppy.ts`, `index.ts`: expected dates, parents, optional public visibility, shared status choices; existing fields retained.
- `app/home.css`: preserve breakpoints/layout; allow long puppy names and badges to wrap, style unknown statuses and optional parent photos.
- `app/about/page.tsx`, `app/contact/page.tsx`: canonical metadata, explicit content revalidation, framework Home link.
- `app/the-breed/page.tsx`, `app/puppy-resources/page.tsx`, `app/pricing/page.tsx`: remove unused CMS requests, canonical metadata and framework Home links; Pricing directs deposits to the Sanity-backed puppy pages.
- `app/privacy-policy/page.tsx`, `app/terms-and-conditions/page.tsx`, `app/puppy-inquiry/page.tsx`: canonical metadata only; legal/consent text preserved.
- `app/inbox/InboxClient.tsx`: Home link uses Next Link to clear the existing lint error; no inbox actions changed.
- `app/layout.tsx`, `app/sitemap.ts`: remove inherited root canonical; align sitemap eligibility, encoded slugs and puppy modification dates.
- `package.json`: add `test` and `typecheck` scripts, no dependency additions or version changes.
- `docs/fluffytail-system-map.md`, `docs/fluffytail-codex-ops.md`: current architecture and verification guidance.

## Verification

- `npm test`: eleven regression tests pass, executing the actual server pages and shared GROQ against an in-memory Content Lake fixture.
- Zero/one/three active litters, default/manual ordering and litter isolation verified.
- All puppy statuses, unknown/null statuses, retained original litter, no duplicate cards, and status-specific inquiry actions verified.
- Upcoming-before-birth visibility, image/copy fallbacks, parents, expected availability, legacy dates and Upcoming-to-Active transition verified without changing live data.
- Draft/release/hidden records, hidden/unpublished parents, orphan references, missing puppy 404s and sitemap eligibility verified.
- Active-litter-only waitlist calculation, encoded puppy links, inquiry context, Contact-only waitlist/GoodDog actions and all 11 public static routes verified via server rendering.
- `npm run typecheck`: passed.
- Local `Schema.compile` against all registered Sanity types: passed, including the new parent references. CLI schema extraction was attempted but could not resolve the Sanity API host in this restricted environment; it was not a Studio deployment.
- `npm run lint`: passed with ten image-optimization warnings and zero errors (baseline had eight errors and fourteen warnings). Existing image rendering is intentionally retained.
- `npm run build`: attempted, blocked by network failures fetching the existing Geist and Geist Mono fonts from Google. Public Sanity variables and a nonfunctional placeholder Stripe key were supplied for module initialization; no live credentials or Stripe requests were used.
- Browser access was denied for both production and local preview. No screenshots or real mobile/device validation could be performed. Existing 980px/680px/520px breakpoints and core layout classes are retained; visual QA remains outstanding.
- Optional local QA preview: `node scripts/preview-inventory.mjs .next/inventory-snapshot.json`, then `http://127.0.0.1:4175/mobile`. The supplied local snapshot contains only projected public inventory/settings from the read-only connector inspection. Snapshot files live under ignored `.next/` and are not committed. This is static server rendering for layout review, not a production Next server or a live-content subscription; images are placeholders.
- Payment, SMS, upload, deletion and inquiry webhook handlers, Stripe client configuration and `proxy.ts` were not modified. No live payment/form submission/message was sent; end-to-end delivery is not claimed.

## Follow-Up Release

The later authorized pricing/security patch is documented in docs/fluffytail-phase-1-release.md. Findings below describe the earlier inventory-only baseline, not the newer branch or a deployed release.

## Remaining Operational Findings

1. **Deposit mismatch:** live upcoming/current litters specify $400 while Stripe session creation and payment recording hard-code $300. Public pages now accurately use Sanity and Pricing avoids a blanket $300 claim, but payment reconciliation needs a separate explicitly authorized change.
2. **API authorization boundary:** Basic Auth covers `/inbox/:path*`, including deletion, but not the `/api` SMS send/upload and Stripe creation handlers. Those handlers have no operator authentication in code. Verify any Vercel protection and plan a separate auth correction without blocking provider webhooks.
3. **Webhook reliability:** Twilio inbound and Tally inquiry code lack provider-signature validation and deterministic deduplication. Inquiry persistence happens before alerts; an alert failure can return an error after saving a lead, so retries may duplicate records/alerts. No delivery-status callback handling is present for outbound messages. Separate integration work is needed.
4. **Data access:** CMS content and customer operational records share a dataset; the inbox read client has no token. Verify dataset read permissions and protection of lead/SMS/payment data without fetching or exposing customer records in audit output.
5. **Payment scope:** deposit creation does not check reservation eligibility; deleting the public test page did not authenticate the endpoint. The success page is unconditional copy, and no live reconciliation or signed webhook delivery was tested. Inventory UI fixes do not resolve payment concurrency, idempotency or refund/async-event handling.
6. **Deployment checks:** run a network-enabled production build, inspect a preview at desktop/mobile sizes with real images/fonts, then check inventory freshness following an authorized Sanity publication. The cached public search results cannot establish deployment parity. No deployment was requested or performed.
7. **Dependency baseline:** this checkout has working installed dependencies, but previous clean-install attempts reported manifest/lock drift. No lockfile repair or fresh install was included; CI should verify `npm ci` separately before release.
8. **Deferred cleanup:** `WaitlistModal` and `sanity/lib/live.ts` have no active importers; they are not relied on for updates. Shared navigation beyond the touched Home links, image optimization, generic Open Graph defaults and static sitemap generation timestamps can be addressed later if needed.

## Operator Workflow After Deployment

Create an expected litter with Upcoming status, expected date, optional image/parents and summary; publish it. Add expected availability notes if known. When born, enter the actual date and change status to Active; publish. Create puppies referencing that litter, with unique slugs and their actual availability status. Reserved, Hold and Gone Home changes retain each puppy in that litter. Move the litter to Past when appropriate. Use Show on Website only to explicitly hide a record. No routine inventory update requires an application edit.
