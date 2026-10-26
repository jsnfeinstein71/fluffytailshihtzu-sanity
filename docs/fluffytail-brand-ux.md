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

Next design step: owner review of the local preview, then a safe isolated hosted Preview plan for this branch. The existing approved brand is sufficient; no replacement identity is needed.
