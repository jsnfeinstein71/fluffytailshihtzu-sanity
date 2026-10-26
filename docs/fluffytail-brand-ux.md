# Existing FluffyTail Brand And Website UX

Status: local development, NOT Production-approved. Branch `codex/fluffytail-brand-ux` starts from PR #2 head `9f71a693955eb1af68dfd4a57667b820eee49bd6`. PR #2 remains draft and unchanged remotely. No push, Vercel deployment or Production setting change occurred.

## Priority And Scope

Website branding/UX is active. Stage 2 privacy preparation is paused; its completed records are preserved in local commit `d2bfd3e` on `codex/stage-2-privacy-preparation`. Do not resume backup, Twilio, Stripe or migration tasks without new authorization. The last confirmed 54 historical operational records remain anonymously readable: documented unresolved exposure, not a new audit or waived production gate.

The redesign preserves PR #2's inventory/status logic, reservation visibility, Sanity pricing and native form/server behavior. No service/dependency, schema, operator API, provider callback, authorization or notification implementation changed. Only public puppy/litter/settings content was read for layout QA; no customer records were retrieved.

## Verified Adobe Sources

Adobe is available in this Codex session. The ACTUAL library-container manifests were inspected read-only, not just filenames. Original Adobe documents/libraries remain unchanged.

- Authoritative `FluffyTail Brand`: asset `urn:aaid:sc:US:bb05c386-b9d1-4af5-a476-c7ed06425d3c`. Active named Illustrator elements: `FluffyTail Primary Logo`, `FluffyTail One Color Logo`, `FluffyTail White-Reversed Logo`, `FluffyTail Icon`. Character styles: `FluffyTail Display` and `FluffyTail Body`.
- Additional `FluffyTail.cclibc`: asset `urn:aaid:sc:US:241e7153-6950-4d14-b20f-4922352ed529`, internal library name `FluffyTail`. Active brand-role SVGs: `FluffyTail_Logo_OneColor.svg` (primary logo role in THIS library), `FluffyTail_Logo_Color.svg` and `FluffyTail_Logo_White.svg` (secondary roles). Active header/body font roles match the authoritative library. These roles are recorded as found, not relabeled as the main library's Primary Logo.
- `FluffyTail` folder: `urn:aaid:sc:US:23c0e4da-d7e0-47bf-8fd5-e29632f11d1e`, storage organization rather than approval of every contained file.
- `FluffyTail_Logo_Working.aic`: `urn:aaid:sc:US:aab9e231-5c8f-48f7-9658-cc723da48355`, multiple working variants, NOT used as the website source. Firefly search hits are experimental, also unused. Alternate Cormorant weights/italics in `removed_elements` are not active approved styles.

## Unchanged Web Artwork

The additional library's existing SVGs were copied byte-for-byte to `public/brand`, not retraced, recolored or reconstructed. Header uses its color variant; footer uses white-reversed. No replacement logo, raw library/working file or proprietary font binary is committed.

| Website SVG | Original library component | SHA-256 |
| --- | --- | --- |
| `fluffytail-logo-one-color.svg` | `04c03e1c-2f1f-43a6-b02b-8087d08c8d3a/11dc9f35-4678-4c86-b115-d91cc7315cc7.svg` | `b07d0b270dfdcdeb38974c0c609fa97b6c7cb5d9e39eca59fe7be4949ecac06a` |
| `fluffytail-logo-color.svg` | `32951de1-36f1-4c4d-b28c-873b85a71d10/e2e8f1e9-51ad-4ebf-86df-356c8de41d75.svg` | `ccba97c37d9c252936a82b00d3765df2742c82f115009eea8362f4d07ed720e8` |
| `fluffytail-logo-white.svg` | `c0def65c-2cfa-463c-81f2-2360ff4cb2ed/ed5ab34a-6689-4d67-837b-52e816da8d7d.svg` | `9acd9032d5626f39cffe75ec416fcbcc6d5191267cb998924fd382b8e189043c` |

These exports contain vector paths, not scripts, external references, raster images or font binaries. Tests pin the original hashes. A preliminary working-document export could not be collected because its `rendition:` task ID is rejected by the connector's polling schema; no result from that request is used. Existing brand-tagged library exports avoid recreating artwork or working around that limitation.

## Website Design System

`app/brand.css` scopes public styles under `.brand-site`. `app/components/SiteChrome.tsx` provides one shared header/footer, accessible native mobile menu, active links and skip link. Inbox, Studio and Pay tools are excluded. Repeated public navigation/footer blocks were removed; legal/consent body text is unchanged.

- Verified sRGB swatches: Brown `#58493D` (88,73,61), Champagne `#D8BD9D` (216,189,157). White/neutral surfaces and existing functional status/focus colors are UI controls, not added brand swatches.
- Display: Cormorant Garamond SemiBold, web family `cormorant-garamond`, 600 normal. Body: Acumin Pro Regular, web family `acumin-pro`, 400 normal. Font synthesis is disabled; system fallbacks are resilience, not approved replacements.
- Existing tagline `Tiny Paws, Big Love`; real Sanity hero, puppy and litter photography. No Stock/Firefly photos or new illustration.
- Photo-led homepage, current litters, quieter price summaries, generous puppy detail image, direct contextual inquiry and simplified Contact. Reserved/sold puppies remain visible in their original litters. Price/default/override/deposit/balance calculations remain the shared Sanity contract.
- The SAME native form/server handles inquiries; Email/Text/Either, consent, notifications and validation are preserved. No new form service, animation system, carousel or database.

## Adobe Fonts Development Kit

After explicit owner authorization, ONE kit was successfully created/published: `mun1gwi`, `FluffyTail Website - Development`. No failed/ambiguous creation retry or duplicate kit. No desktop font activation or subscription change.

- CSS embed: `https://use.typekit.net/mun1gwi.css` in the development layout. No JavaScript loader or downloaded proprietary font files.
- `AcuminPro-Regular`: Adobe Originals / Robert Slimbach, verified 400 normal; [catalog](https://fonts.adobe.com/fonts/acumin).
- `CormorantGaramond-SemiBold`: Google / Christian Thalmann (Catharsis Fonts), verified 600 normal; [catalog](https://fonts.adobe.com/fonts/cormorant-garamond).
- Configured domains: `localhost`, `127.0.0.1`, existing PR #2 Preview `fluffytailshihtzu-sanity-git-c-a62872-jason-feinsteins-projects.vercel.app`. No Production domain was added.
- Available tools create/publish kits but cannot list/update existing kits. After a new hosted branch's ACTUAL Preview hostname is known, update THIS kit through authorized Adobe project management; do not guess a Vercel alias or create another kit.
- Local browser confirmed actual loaded 400 Acumin / 600 Cormorant faces, computed body/heading families and correct rendering. The old unused Geist root loaders were removed; non-customer default system typography is retained.

## Verification

- 65 tests pass: existing 61 plus four for unchanged/safe SVGs, shared versus operator chrome, puppy override/status display and approved tokens/kit.
- Lint passes with zero errors and nine image-optimization advisory warnings; no suppression or new dependency.
- Local browser: 24 route/viewport checks at 320/400/768/1440 across home, puppy inventory, upcoming, detail, Contact and inquiry; no overflow, missing images or page errors. Secondary public routes also pass at 320. `/test-stripe` and an invalid puppy URL return 404; dark browser preference retains a light public site.
- Mobile menu opens/closes on Escape/navigation. Real puppy/litter context reaches the native form; Text requires phone and unchecked consent, Email removes those requirements. All browser non-GET requests were blocked; observed attempted mutations: zero. No form submission, payment, message or dataset mutation was initiated.
- Local preview uses public Sanity content and NO operational/provider credentials. Its native form is visual/request-token QA only, not persistence/delivery verification; do not use real personal details.
- `npm run typecheck` passes. `npm run build` passes: optimized compilation, TypeScript and all 26 static pages, using public Sanity configuration with operational/provider credentials removed. No hosted deployment/CI result is claimed for this new branch.

## Separate Production Gates

These are already documented release risks, not new audit work or permission to pursue paused provider/migration tasks:

1. Historical operational-document exposure remains unresolved. The design/new private IDs do not repair it; separate owner-authorized resolution is required before calling PR #2 production-ready.
2. Native inquiry persistence/notification and payment end-to-end verification still need authorized synthetic isolation and explicit execution scope. Do not publish this new Vercel branch until its isolation settings are verified, inherit live provider credentials, or point live callbacks at Preview.
3. Integrate/review compatibility with the deployed Stage 1 privacy hotfix before any production merge. Preserve private-aware readers/writers and relevant Studio/freeze protections. PR #2's existing rejection of quote-less historical deposit links needs the documented owner decision, not a silent visual-release change.
4. Previously documented live signing/subscription/notification configuration and stale payment-link risks remain separate release work needing new owner authorization. No provider settings or events are changed by a design task.
5. Owner desktop/mobile acceptance, green candidate CI/build, isolated hosted Preview and explicit Production approval remain required. PR #2 stays draft; no main merge, promotion or Production domain change.

The owner approved the desktop/mobile homepage design on 2026-10-25. Use this approved composition, original photograph, navigation, puppy cards and Adobe system as the visual reference for Available Puppies, Upcoming Litters, puppy details, Contact/inquiry and remaining pages. Do not redesign the homepage again. Any hosted Preview still needs verified isolation; production release remains separately gated.

## Original Two-Puppy Hero Proposal

Status: desktop/mobile composition approved on 2026-10-25, with the two narrowly requested refinements below. Still local only: no Sanity upload, document change, hosted deployment or production update.

- Owner-supplied original: `D:\FluffyTail Photos\00 - Master Originals\2026\apr\IMG_6731.JPEG`. Copied unchanged to `public/design-preview/IMG_6731.JPEG`: 2048 x 1536, 442,139 bytes; SHA-256 `e0d9a68a5e4b67daf2e8f810b438a32b1f72f7e27ea2dc7cc9cd927c1e2ec62b`. No AI edit, retouch, color adjustment or recompression. Adobe's similarly named Firefly results are NOT used.
- `app/components/HomeHero.tsx` keeps the existing hero markup together. `app/page.tsx` enables the proposed source/layout ONLY when `NODE_ENV === 'development'`. Normal production/hosted Preview builds continue to use the unchanged Sanity `heroImage.asset->url` / existing litter fallback, not this proposal. This is intentionally not a new public route, CMS field or remote deployment toggle.
- Desktop: full-width photo, text in the clear left-hand area. Tablet/mobile: full-width ivory (`#FBF8F3`) title band above an unframed photo. The final mobile refinement changes only the square photo frame to 9:10 (480px maximum height), enlarging both puppies by approximately 11% at 320/400px without cutting either puppy. Ultra-wide, short screens contain the original rather than cutting off the puppies. Approved logo, brown/champagne and the existing Adobe kit remain unchanged.
- Loading: one original JPEG (approximately 432 KiB), intrinsic dimensions, eager/high-priority loading and asynchronous decoding. No duplicate background request or unnecessary lossy recompression. The original remains available for a separately approved Sanity upload; eventual Sanity responsive derivatives should be quality-reviewed against this original.
- Sanity remains the normal hero source through the existing **Site Settings > Homepage Hero Image**, with its existing hotspot-enabled image field. After owner design approval, separately promote the chosen layout and select/upload this original through that field; remove the local-only proposal source. No live image has been replaced and no production approval is implied.
- Verification: 67 automated tests pass, including original-photo hash and normal Sanity-source/development-only rendering checks. TypeScript and production build pass (26 static pages). Lint has zero errors and the same nine existing image advisory warnings. The built homepage does not use the proposed source/layout.
- Local browser checks at 320, 400, 768, 1101, 1440, 1920 and 2560 pixels: both puppies fit, actual text does not overlap either face, no horizontal overflow, image loads and the following section remains visible. Actual Acumin Pro / Cormorant faces load. No page errors or attempted non-GET/HEAD requests; no submissions, messages, payments or customer records accessed.
- Files added: `app/components/HomeHero.tsx`, `public/design-preview/IMG_6731.JPEG`. Files changed: `app/page.tsx`, `app/brand.css`, `tests/brand.test.mjs`, this document. No dependencies, schemas, operational APIs or provider settings changed.

Review locally at `http://127.0.0.1:3000`. The original local preview is not yet promoted to a hosted Preview. All separate production gates above remain unchanged; Stage 2 remains paused.

## Approved Final Refinements And Sanity Copy Queue

The introductory heading is now **Raised With Love, Welcomed Into Your Family.** in local development and as the missing-content fallback. Normal builds retain the CMS-managed `siteSettings.homepageHeadline`; its production value has NOT been changed. A separately approved CMS edit should set that field to the approved phrase when integrating the design, keeping future copy manageable by Jeanne.

Read-only inspection of published public puppy `name`/`color` fields confirmed two clear typos, both in **Elsie October 17, 2026**:

| Document ID | Detail slug (preserve) | Field | Current | Proposed correction |
| --- | --- | --- | --- | --- |
| `6e181ad7-3340-4b2f-ba61-91fbd9155ca0` | `girl-1-1` | `name` | `Girl.1` | `Girl 1` |
| `136dcb97-3aaf-41dd-9a5d-b5fe194d629e` | `girl-2-1` | `color` | `Creram and Whitr` | `Cream and White` |

These are proposed Sanity edits, NOT applied corrections or frontend substitutions. No other clear name/color spelling errors were found in the 23 inspected public puppy records. Preserve slugs, IDs, references, prices, statuses and photography. No customer/operational records were accessed. Do not infer coat-color changes from photographs or normalize legitimate historical names without approval.

This refinement changes only `app/brand.css`, `app/page.tsx`, `tests/inventory.test.mjs`, `AGENTS.md` and this document. Original JPEG, desktop hero composition, fonts, colors, navigation, puppy-card styling and all operational behavior remain unchanged.

Final-refinement verification: 68 tests pass; TypeScript and production build pass (26 static pages); lint reports zero errors and the same nine image advisories. Local screenshots/checks at 320, 400, 600, 768 and 1440px confirm both puppies remain fully in frame, the new introduction appears, Adobe fonts load and there is no horizontal overflow or page error. At 320/400px the puppies render approximately 11% larger than in the approved square frame. No non-GET/HEAD browser requests or production writes were attempted.

## Available Puppies Creative Preview

Status: desktop/mobile design approved by the owner on 2026-10-25; do not redesign this page again. Still local development on `codex/fluffytail-brand-ux`. The approved homepage source, hero, brand tokens, navigation/footer and normal card presentation are unchanged by this work. No deployment, CMS publication, payment or message operation.

- Reuses the approved Adobe typefaces, logo, color palette, spacing and shared public header/footer. Page-specific styles live in `app/available-puppies/available.css`, scoped to `.available-page`; they do not restyle the homepage or other routes.
- Published Sanity inventory, status aliases, sorting, visibility and 60-second revalidation are unchanged. Each current/active litter renders its own sorted puppy list. Available, Hold, Reserved and all other existing statuses remain visible in the original litter; none are filtered into another group. The actual current content has one active litter and three puppies; automated synthetic fixtures verify three simultaneous active litters.
- Current litter heading shows birth date, the existing eight-week ready-date calculation and puppy count. Default price and deposit come from `tryPricing` and are explicitly labeled, including that the deposit is part of the total. Each puppy card shows its actual override/default total; fractional-dollar prices are displayed without rounding away cents. No pricing values, including the current $400 deposit, are hardcoded.
- `PuppyCard` has an opt-in `browsing` presentation for current litter cards: explicit total-price label, ready date for reserved puppies too, and one whole-card link with a **View puppy** action. Default/home cards keep their approved presentation. No nested buttons, extra inquiry action or eligibility change: the existing detail page still controls native inquiry availability and supplies puppy/litter context.
- Existing Sanity photos/URLs are reused, with no AI alterations or asset replacements. The two pending name/color typos above remain visible exactly as stored; no frontend substitutions or Sanity writes were made.
- Past litters move into individual, initially closed native disclosures. Existing litter photographs, parent metadata, summaries, historical prices and puppy relationships remain available when expanded. Historical $300 deposits are retained as historical content inside that archive, not substituted for current $400 deposits or presented as current quotes.
- No new library, client-side state, filter/navigation system, provider or database. Empty current inventory, empty litters, missing dates and invalid pricing remain honest, usable states; invalid prices never become zero/arbitrary quotes.

Verification: **72 tests pass**, including three-litter/status grouping, default/override and exact-cent prices, one card action, archived relationships and photos, invalid pricing, and unchanged default/home card presentation. TypeScript and production build pass (26 static pages); lint has zero errors and the same nine image advisories. Local browser checks at 320/400/768/1440px show no horizontal overflow/nested scroller, all current puppy photos loaded, visible reserved puppies and real Acumin/Cormorant faces. Native disclosures work with keyboard activation. The available puppy's card reaches its correct detail page ($1,600 total / $400 deposit / $1,200 final payment) and the native inquiry with its correct puppy slug/litter; no form was submitted and no non-GET/HEAD requests were attempted.

Files added: `app/available-puppies/available.css`. Files changed for this task: `app/available-puppies/page.tsx`, `app/components/PuppyCard.tsx`, `tests/brand.test.mjs`, `tests/inventory.test.mjs`, this document. Existing uncommitted homepage work is preserved. No schemas, data queries, backend/API handlers, credentials, dependency manifests or deployment settings changed.

Review locally at `http://127.0.0.1:3000/available-puppies`. Actual desktop (1440px), mobile (400px) and full-page screenshots are saved outside the repo in `C:\Users\jlcfe\AppData\Local\Temp\fluffytail-available-puppies-review`. Creative approval does not waive the separate production gates or authorize the pending Sanity typo corrections; Stage 2 remains paused.

## Upcoming Litters Creative Preview

Status: desktop/mobile design approved by the owner on 2026-10-25 and locked. The only requested post-approval adjustment is to hide missing parent information, described below; no other design revision. Still local development only on `codex/fluffytail-brand-ux`. Homepage and Available Puppies were not redesigned. Their page/style/shared-card/header/hero files have unchanged before/after SHA-256 checks. No production or hosted deployment and no Sanity mutations.

- `app/upcoming-litters/page.tsx` now leads with expected litters, in their existing Sanity sort order. `planned` / legacy `upcoming` use the existing normalized helper; current / legacy `active` litters remain visible in a separate **Already here / Our current litters** section using the unchanged shared `LitterTile`. Past, hidden and unpublished litters remain excluded. No query, cache/revalidation, schema or content structure changed.
- The existing announcement is shown prominently in a stable square frame with `object-fit: contain`, preserving all artwork and embedded text on desktop/mobile. Actual current source is the existing 1254 x 1254 PNG, asset `image-046cf6b2a71b9146875bad67fedbe39c6736a6ab-1254x1254-png`. It is illustrated announcement artwork already stored in Sanity, not a new dog photograph or newly approved logo. No AI generation/edit, image replacement, overlay or new brand asset was introduced; original header/footer artwork stays authoritative.
- Expected birth uses `expectedBirthDate`, falling back to the existing legacy `birthDate` convention ONLY for expected litters. Missing/invalid dates show **Date to be confirmed**, not an invented date or actual-birth claim. Current litters retain their **Active / Born** distinction. Expected availability is shown only when provided by Sanity, with no inferred go-home promise.
- Parent references render clearly as **Mother** / **Father**, with only the existing names and photographs supplied by Sanity. The owner requested that the ENTIRE **The parents** section disappear when neither parent has information. Penny's current references are absent, so no parent heading or placeholder is rendered. With partial data, only the available parent entries/name/photo appear; blank/whitespace-only names do not count as information and unknown parents are not invented. Names/relationships are not inferred from the title or announcement. Populating references remains a separate, owner-approved Sanity content task; no schema change is required. The approved Upcoming stylesheet, artwork, prices, inquiry action and active-litter section remain unchanged.
- Each expected litter has a clear **Ask about future puppies** link to the EXISTING `/puppy-inquiry?interest=waitlist` form. This remains a general future-interest inquiry, not a new litter-specific selection/prefill or invented puppy association. Native form, consent, security, notification and storage behavior are unchanged. Active litters have the existing path back to Available Puppies.
- Sanity-managed default price/deposit are shown only when valid, with exact cents where necessary and an explicit deposit-in-total explanation. The current $1,600 / $400 amounts come from CMS; there are no new payment amounts or financial behavior changes.
- Added styles are scoped to `.upcoming-page` in `app/upcoming-litters/upcoming.css`. Shared Adobe typography, approved colors, navigation and footer are reused. No dependency, new service, client-state/filter system or architectural expansion.

Verification: **75 tests pass**, preserving the existing inventory/pricing/inquiry/security cases. New cases cover multiple sorted expected litters, separate active/status aliases, original image sources, legacy/missing dates, missing/partial parent data, optional availability, exact-cent/invalid pricing, empty inventory and the native waitlist URL. Existing expected-date display assertions now check the explicit **Expected birth** label and full date; the underlying date rules remain unchanged. TypeScript and production build pass (26 static pages). Lint: zero errors, 11 native-image optimization advisories (the prior nine plus two new image render locations; none suppressed).

Local browser checks at 320/400/768/1024/1440px confirm loaded, uncropped announcement artwork; clear separation of expected/current litters; no overflow/nested horizontal scroll; and loaded Acumin Pro/Cormorant Garamond fonts. The inquiry action reaches the existing native future-interest form with its default message and Email selection. No submission, payment, message, customer/operational record read or non-GET/HEAD browser request was attempted.

Files added: `app/upcoming-litters/upcoming.css`. Files changed for this task: `app/upcoming-litters/page.tsx`, `tests/inventory.test.mjs`, `AGENTS.md` (records Available Puppies approval), this document. All prior uncommitted work is preserved. The two pending puppy name/color corrections remain unapplied. Separate production gates remain unchanged and Stage 2 stays paused.

Review locally at `http://127.0.0.1:3000/upcoming-litters`. Actual 1440px desktop / 400px mobile and full-page screenshots are saved outside the repo in `C:\Users\jlcfe\AppData\Local\Temp\fluffytail-upcoming-litters-review`.

## Individual Puppy Detail Creative Preview

Status: owner-approved through the desktop Reserved and mobile Available reviews on 2026-10-25. Preserve the detail template, original photography, status handling, prices and actions; do not redesign it. Still local development only on `codex/fluffytail-brand-ux`. Homepage, Available Puppies and Upcoming Litters are also approved and locked, with the requested parent-visibility adjustment complete. No production deployment, Sanity content publication or provider operation.

- Refined the existing `/puppies/[slug]` template using the same approved logo, fonts, colors, status badges and shared navigation/footer. Desktop keeps the original puppy image beside the information; mobile presents name/status and original litter first, then the photo, labeled facts, price breakdown and existing action. No new page, gallery, navigation system or dependency.
- Page-specific `puppy-detail.css` is scoped to `.puppy-detail-page`. Existing Sanity photo URLs are unchanged, displayed fully with `object-fit: contain` in a stable square frame; no AI edits, replacements or destructive crops. Missing photos have an honest **Photo to come** state.
- Facts are explicitly labeled **Sex**, **Color**, **Age** and **Ready from**. Existing age/date helpers are retained. Missing color/age/readiness are not invented, and an unspecified sex is labeled **To be confirmed**. Sanity notes and litter identity remain visible. Current typos remain exactly as stored; no frontend substitutions.
- The SAME `tryPricing` result supplies total, deposit and final payment, with exact-cent formatting and the unchanged deposit-applied-to-total explanation. No browser-calculated/server payment changes, arbitrary prices or historical payment reads. Invalid pricing retains the existing contact-to-confirm wording, not a fabricated quote.
- The SAME `canInquireAboutPuppy` and `buildPuppyInquiryUrl` preserve eligibility and puppy/litter/slug/page context. An available puppy in a current litter has the existing **Request Info About This Puppy** action. Reserved, Hold, Sold, Holdback, Gone Home and unknown statuses retain their existing non-reservation/contact path. No new inquiry permission, payment action or form behavior.
- Schema, inventory queries, status normalization, metadata/404 behavior, revalidation and backend/API/provider code are untouched. SHA-256 checks confirm unchanged Homepage, Available Puppies, shared brand/header/card and Upcoming stylesheet files.

Verification: **78 tests pass**, preserving prior inventory, pricing, inquiry and authorization coverage. Added cases cover parent name-only/photo-only/empty/partial data without invented entries; original detail photos and labeled facts; exact override/default/deposit/final-payment presentation and native context; reservation gates and missing-data/pricing states. TypeScript and production build pass (26 static pages). Lint: zero errors, the same 11 native-image advisories.

Local browser checks cover available and reserved detail pages at 320/400/768/1440px: original images load uncropped, real Adobe fonts load, no horizontal overflow/nested scroller or page errors, correct status/action and $1,600 total / $400 deposit / $1,200 final payment. Available inquiry navigation reaches the correct native puppy/litter context; reserved has no new-reservation inquiry action. An invalid puppy URL returns 404. Current Upcoming has zero parent sections. No form submission or non-GET/HEAD browser request was attempted; no production/customer operational data was accessed.

Files added: `app/puppies/[slug]/puppy-detail.css`. Files changed for this task: `app/puppies/[slug]/page.tsx`, `app/upcoming-litters/page.tsx` (parent visibility only), `tests/inventory.test.mjs`, `AGENTS.md` (records Upcoming approval), this document. All earlier uncommitted work is preserved. Pending Sanity typo corrections and separate production gates remain unchanged; Stage 2 stays paused.

Review available at `http://127.0.0.1:3000/puppies/girl-2-1` and reserved at `http://127.0.0.1:3000/puppies/girl-3-1`. Actual 1440px desktop / 400px mobile and full-page screenshots for both states, plus Upcoming with parents hidden, are saved outside the repo in `C:\Users\jlcfe\AppData\Local\Temp\fluffytail-puppy-details-review`.

## Native Inquiry Form Creative Preview

Status: owner-approved through the mobile Text/SMS and simulated-confirmation reviews on 2026-10-26. Preserve the design, puppy context, fields, buttons, Adobe branding and confirmation layout. The only requested refinement is disclosure spacing/typography; legal wording, consent requirements and backend behavior remain unchanged. Still local development only on `codex/fluffytail-brand-ux`. All approved browsing/detail page sources and shared navigation/brand files are unchanged in this task. Backend, security and notification source checks are also unchanged. No production deployment or Sanity/customer record mutations. Visual approval does not verify actual inquiry persistence or notification delivery.

- Simplified `/puppy-inquiry` to one centered, unframed column, using the approved Adobe typography, brown/champagne/ivory and shared header/footer. Removed duplicate sidebar explanations. Selected puppy, general and future-interest headings remain clear without additional steps or another form service.
- Server-selected puppy name/litter and its existing Sanity photograph identify the inquiry. `puppyPhotoUrl` is display-only, comes from the existing `getPuppy` projection and is NOT included in the submitted payload. Browser-supplied names/litters/photos cannot replace server-selected context. Legacy puppy links and missing-puppy 404 behavior are preserved.
- Email/Text/Either are accessible native radios in a three-option selector. Email remains the default, with optional phone and NO SMS consent checkbox. Text/Either require a phone and explicit, initially unchecked SMS consent. Switching back to Email removes the checkbox and submits `smsConsent: false`. Required name/email/message fields and all existing length limits/field keys remain intact. SMS/legal wording is unchanged.
- Message text expands on input, focus, font readiness and viewport resize; there is no manual shrink handle or inner textarea scrollbar. The page itself scrolls normally. Native labels, autocomplete, 16px inputs and keyboard radio behavior remain available; there is no iframe, nested scroll panel or multi-step flow.
- Errors retain entries, display the existing server/network message in a focused alert and re-enable the existing send action after completion. Pending submission retains the disabled **Submitting...** action and `aria-busy`. Success is still shown ONLY after the existing successful API response; its message is unchanged, selected puppy context stays visible, and the confirmation receives focus. No automatic retries, optimistic delivery claim or new notification behavior.
- The client submission function and SMS consent copy match their pre-task source. `/api/inquiry`, `lib/inquiry.ts`, `lib/inquiry-security.ts` and `sanity/lib/inquiry-service.ts` have unchanged source hashes: cookie-bound token, origin validation, honeypot, server re-resolution, validation, rate/duplicate controls and operator notification handling are preserved.
- The shared native `InquiryForm` controls also appear on Contact; its existing route copy, sidebar and links are untouched. Contact and the general/future-interest forms were checked at 320px. A full Contact-page creative redesign/approval is still separate work, not implied by this form update.

Verification: **80 tests pass**, including existing pricing/inventory/security/notification regressions and two new form-presentation cases for canonical puppy/photo context, ignored forged display parameters, native fields/Email defaults, no mandatory phone/SMS for Email, and general/future-interest states. TypeScript and production build pass (26 static pages). Lint: zero errors, 12 native-image advisories (the prior 11 plus the small selected-puppy photograph).

Local browser checks at 320/400/768/1440px cover all three contact preferences: correct phone/consent requirements, unchecked consent, no overflow or inner scrolling, loaded puppy image/Adobe fonts and 16px inputs. A 1,920-character synthetic message expands fully after narrowing the viewport, with equal client/scroll height. UI-only mocked checks confirm that missing phone/consent blocks Text submission, Text/Either payloads include consent, Email sends blank optional phone/false consent, failure keeps entered values, success retains puppy/litter context, and token errors/pending states remain disabled appropriately.

All mock POSTs were intercepted and answered IN THE LOCAL BROWSER; none reached the application API, Sanity or Twilio. Only synthetic `preview@example.test` / reserved fictional phone details were used. Success/error screenshots are explicitly simulated UI states, NOT evidence of saved inquiries, notification delivery or end-to-end production readiness. Primary desktop/mobile screenshots use the actual local page with GET-only access. Separate native persistence/delivery and production release gates remain in place.

Files added: `app/puppy-inquiry/inquiry.css`. Files changed for this task: `app/puppy-inquiry/page.tsx`, `app/components/InquiryForm.tsx`, `app/components/inquiry-form.css`, `tests/inquiries.test.mjs`, `AGENTS.md` (records detail approval), this document. No schema/query/API/provider, credential, dependency or deployment-setting changes. Earlier uncommitted work is preserved; the two Sanity typo corrections remain pending and Stage 2 stays paused.

Review locally at `http://127.0.0.1:3000/puppy-inquiry?puppySlug=girl-2-1`. Actual 1440px desktop / 400px mobile, full-page and Text-consent screenshots, plus clearly named mocked success/error captures, are saved outside the repo in `C:\Users\jlcfe\AppData\Local\Temp\fluffytail-native-inquiry-review`.

## Remaining Public Pages Creative Preview

Status: prepared for owner creative review on 2026-10-26, not yet approved. Local development only on `codex/fluffytail-brand-ux`; no deployment, production Sanity changes or provider operations. Previously approved Homepage, Available Puppies, Upcoming Litters, puppy details and inquiry composition remain locked.

- SMS disclosure readability only: `app/components/inquiry-form.css` uses 14px text, 1.85 line height, a 12px checkbox/text gap and small vertical spacing. `InquiryForm.tsx`, disclosure wording, legal links, unchecked consent, Email/Text/Either requirements and confirmation behavior are unchanged.
- About, The Breed and Puppy Resources share a scoped editorial layout in `app/content.css`, using the existing logo, Adobe fonts, palette, navigation and footer. Existing story/care content is retained, with simpler fact/checklists and quieter secondary links. Photos come from the existing published inventory helper: current litter photography for About/Breed and a photographed current puppy for Resources. The adult dog image is not presented as a portrait of Jeanne. Missing inventory/photos omit the image rather than inventing content. No new query, schema, service, dependency or photo asset; Breed/Resources now inherit the same 60-second inventory revalidation.
- Pricing & Process retains the identical calculation code for current/planned litter defaults, individual overrides, valid quote filtering, exact cents and empty/invalid fallback. Only its presentation changes: a clear CMS-derived price overview and the existing three-step process. No new hardcoded price/deposit or payment behavior.
- Contact uses the approved centered native form, existing waitlist interest and configured GoodDog destination. Existing business information and secondary links follow the form. The shared form/backend/notification implementation is unchanged.
- Privacy Policy and Terms & Conditions use a restrained reading layout. Their complete inner source, browser-visible text and link destinations match the pre-task versions. No legal wording or consent terms changed.
- All new content styles are scoped to `.content-page`, `.contact-page` or `.legal-page`. Original photography is shown uncropped with `object-fit: contain`; no AI alteration or replacement branding.

Verification: **84 automated tests pass**, including four additional cases for unchanged legal source/links, public inventory photos/empty states, CMS price ranges/overrides/invalid data and native Contact defaults. TypeScript and the production build pass (26 static pages). Lint: zero errors, 15 native-image optimization advisories (previous 12 plus the three editorial image locations); none suppressed. `git diff --check` passes. Source hashes confirm the approved page/style/header/form files, inquiry API/security/service, pricing library and payment-success implementation remain unchanged from the start of this task.

Local browser: all seven routes return 200 at 320/400/768/1440px (28 checks), with actual Acumin/Cormorant faces loaded, no visible overflow, loaded uncropped photos and no JavaScript page errors. The intentionally hidden anti-spam honeypot is unchanged and is not visible content overflow. Text consent remains required and initially unchecked; Email removes the consent checkbox. No non-GET/HEAD requests, form submissions, messages, payments or operational/customer record reads were attempted. Actual inquiry persistence and notification delivery still require separately authorized functional verification.

Files added for this task: `app/content.css`.

Files changed for this task: `app/about/page.tsx`, `app/the-breed/page.tsx`, `app/puppy-resources/page.tsx`, `app/pricing/page.tsx`, `app/contact/page.tsx`, `app/privacy-policy/page.tsx`, `app/terms-and-conditions/page.tsx`, `app/components/inquiry-form.css`, `tests/brand.test.mjs`, `tests/inventory.test.mjs`, `tests/inquiries.test.mjs`, `AGENTS.md` and this document. Earlier uncommitted work is preserved; no commit, push or deployment was performed.

Review locally at `http://127.0.0.1:3000`. Actual desktop (1440px) and mobile (400px) viewport/full-page screenshots are saved outside the repo in `C:\Users\jlcfe\AppData\Local\Temp\fluffytail-remaining-pages-review`. For each route (`about`, `the-breed`, `puppy-resources`, `pricing`, `contact`, `privacy-policy`, `terms-and-conditions`), use `<route>-desktop-full-page.png` and `<route>-mobile-full-page.png`; files marked `before` or `draft` are not the final review images. `approved-inquiry-sms-mobile-full-page.png` records the disclosure refinement on the actual local inquiry form, without submitting it. QA evidence is in `preservation-checks.json`, `responsive-checks-small.json` and `responsive-checks-final.json` in that same directory.

The two Sanity spelling corrections remain unapplied, Stage 2 remains paused and PR #2 remains draft/unchanged remotely. The existing historical privacy exposure and all separate production release gates remain documented above. This design pass does not authorize provider, migration, production content or release work.

## Approved About, Pricing And Contact Final Refinements

Status: About, Pricing & Process and Contact were approved on desktop/mobile by the owner on 2026-10-26. The requested final refinements below are complete. These three designs are now locked alongside the previously approved browsing/inquiry pages; do not redesign their layouts, typography, photography, navigation, footer or responsive styling.

- About: removed the repeated `homepageIntro` paragraph below At a glance and the duplicate sidebar browsing/contact actions. The existing final Next step section supplies one puppy-browsing action. Jeanne's personal introduction, original photograph, service-area copy and layout are preserved. The unused `homepageIntro` projection was removed from this page only; no Sanity document or schema was changed.
- Pricing & Process: shows the validated Sanity deposit with the same prominent typography as the price. Current public content renders **$1,600.00** and **$400.00**. The deposit is explicitly applied toward the total, not added on top. Deposit ranges reflect the SAME valid current/planned litter and puppy quotes as the existing price range; invalid quotes show no fabricated amount, past litters are excluded, and varied deposits are not silently replaced by $400. No hardcoded price/deposit or change to payment calculation, queries, provider behavior or the three-step process.
- Contact: uses the existing general inquiry mode, leaving Message empty with **Tell Jeanne how she can help.** as its placeholder. The existing future-litter link still opens `/puppy-inquiry?interest=waitlist` with its contextual message; puppy-specific prefills are unchanged. This supersedes the earlier Contact future-interest default described above. Only a conditional placeholder was added to `InquiryForm.tsx`; submission logic, field limits, validation, consent disclosure, notification behavior and confirmation are untouched.
- The Breed, Puppy Resources, Privacy Policy and Terms & Conditions: consistency review complete, ready for owner approval. Existing Adobe fonts, palette, shared chrome, photo treatment and desktop/mobile reading layouts are consistent; no additional revisions were needed. These four source files and shared content CSS were not changed in this task. All legal wording is preserved, with the existing full-body/link source-hash regression checks passing. This is a visual consistency review, not a legal review or new legal approval.

Verification: **86 tests pass**, including focused checks for a single About browsing action with the original photo/Jeanne introduction, default and changed Sanity price/deposit values, multi-litter deposit ranges and invalid fallback, empty general inquiries and retained future context. TypeScript and the production build pass (26 static pages). Lint has zero errors and the same 15 native-image advisories. `git diff --check` passes. The React review found no new hooks, client fetching, dependencies, or client-side financial logic; server-derived display and native accessible fields remain intact.

Local browser checks passed on all seven pages at 320/400/768/1440px: HTTP 200, no horizontal overflow and loaded Adobe fonts. At desktop/mobile, all content photographs loaded. Contact has an empty required Message (existing 5-2000 character limits); Text/Either require phone and unchecked consent, Email requires neither. Following the actual future-litter link preserves the prefilled message. No page errors or attempted non-GET/HEAD requests were observed. Original approved browsing/header sources, inquiry API/security/service and pricing-library hashes still match the prior baseline. No form was submitted and no production/customer operational data or provider behavior was accessed.

Files added: none. Files changed for this task: `app/about/page.tsx`, `app/pricing/page.tsx`, `app/contact/page.tsx`, `app/components/InquiryForm.tsx`, `tests/inventory.test.mjs`, `tests/inquiries.test.mjs`, `AGENTS.md`, `docs/fluffytail-system-map.md` and this document. Earlier uncommitted work remains preserved. No commit, push, hosted deployment or production change was performed.

Actual final desktop/mobile screenshots are in `C:\Users\jlcfe\AppData\Local\Temp\fluffytail-final-pages-review`, named `<route>-desktop.png` and `<route>-mobile.png` for `about`, `pricing`, `contact`, `the-breed`, `puppy-resources`, `privacy-policy` and `terms-and-conditions`. `contact-checks.json`, `small-viewport-checks.json` and `preserved-source-checks.json` record functional presentation/protection evidence. Development remains available at `http://127.0.0.1:3000` on `codex/fluffytail-brand-ux`.

Actual inquiry persistence/notification delivery remain separate functional release checks. The pending Sanity typo corrections are not applied, historical privacy exposure remains documented, Stage 2 stays paused and PR #2 remains draft/unchanged remotely. No production approval or migration authorization is implied by these design approvals.
