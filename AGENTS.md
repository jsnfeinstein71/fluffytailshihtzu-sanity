# FluffyTail Codex Rules

FluffyTail Shih Tzu is a production Next.js and Sanity site for a small breeder. Treat this repo as the source for website code, and treat GitHub as the source of truth for reviewable changes.

## Working Rules

- Keep edits surgical. Do not redesign pages, flows, or content strategy unless explicitly asked.
- Do not touch live Stripe, Twilio, Tally, Sanity write, or Vercel deployment behavior without explicit instruction.
- Prefer read-only mapping first: inspect routes, schemas, API handlers, and public pages before changing code.
- Preserve existing customer-facing copy and legal/SMS consent language unless the task is specifically about those pages.
- Never commit secrets, tokens, Vercel project metadata, `.env*`, or `.vercel`.
- Sanity documents are operational data. Avoid schema or write-token changes unless the task requires them.
- Payment and messaging flows are high risk. Use test mode, mocks, or local stubs unless the user explicitly authorizes live behavior.

## Stack

- Next.js App Router, React, TypeScript, Tailwind/global CSS.
- Sanity CMS and embedded Studio at `/studio`.
- Vercel deployment target with `www.fluffytailshihtzu.com` as the public production domain.
- Stripe for deposit, payment, invoice, and webhook handling.
- Twilio for SMS/MMS inbound and outbound customer messaging.
- Native Next.js puppy inquiry and waitlist forms, Sanity storage and existing Twilio operator alerts. Tally is retired on the Phase 1 release branch; preserve historical submissions.
- New operational records must use authenticated-only `private.<kind>.<hash>` document IDs via `sanity/lib/private-records.ts`. Do not migrate historical records or change dataset visibility without explicit approval.

## Current Priority

- Website design is complete and locked. Integration/review is active on `codex/fluffytail-integrated-release`, combining current `main`, PR #2 and the approved `codex/fluffytail-brand-ux` snapshot. See `docs/fluffytail-integrated-release.md`. Do not resume individual-page redesigns. Merging or changing Production requires explicit approval.
- Existing Adobe `FluffyTail Brand` is the authoritative design reference: approved artwork, Brown `#58493D`, Champagne `#D8BD9D`, Cormorant Garamond SemiBold headings and Acumin Pro Regular body. No replacement logo or proprietary font redistribution. See `docs/fluffytail-brand-ux.md` for provenance and the development web kit.
- The owner approved the desktop/mobile homepage design on 2026-10-25. Preserve its composition, original two-cream-puppy photograph, branding, navigation and puppy cards. Use it as the reference for remaining pages; do not redesign the homepage again. Sanity content corrections and Production deployment still require separate approval.
- Available Puppies is also owner-approved on desktop/mobile. Preserve its layout, pricing presentation, status badges and puppy cards. Use these two approved pages as the reference for remaining pages; do not redesign either again.
- Upcoming Litters is owner-approved on desktop/mobile, including its Halloween announcement, pricing, inquiry action and active-litter section. Keep it locked, with parent information rendered only when a name or photograph is available. Do not invent missing parents or redesign approved pages while progressing through the remaining routes.
- The puppy detail template is approved through the desktop Reserved and mobile Available reviews. Preserve its photography, status handling, pricing layout, inquiry actions, typography and footer; do not redesign it while working on the native inquiry form or remaining pages.
- The native inquiry design is approved through mobile Text/SMS and simulated-confirmation reviews. Preserve its fields, context, buttons, Adobe styling and confirmation layout; only disclosure spacing/typography may be polished without altering legal wording or consent requirements. Actual inquiry persistence/notification delivery remain separate functional release checks, not implied by visual approval.
- About, Pricing & Process and Contact are owner-approved on desktop/mobile. Preserve their layouts, photos, responsive styling and shared branding. Final refinements remove About's duplicate sidebar description/action, show the validated Sanity deposit alongside price, and start general inquiries empty with a placeholder while keeping future-litter context prefilled. Do not redesign these pages or change legal wording while reviewing the remaining content pages.
- Stage 2 privacy preparation is paused by the owner. Preserve its work on `codex/stage-2-privacy-preparation` at `d2bfd3e`; do not resume backup, Twilio, Stripe or migration tasks without new authorization. The last confirmed 54 anonymously readable historical records remain an unresolved security issue and separate production-release gate.
- The owner authorized the focused audit-correction phase on PR #4 and customer-journey tests against its isolated synthetic Vercel Preview. Keep approved styles, layouts, branding and photographs unchanged. Production Sanity edits, business-policy decisions, historical status/price changes, merge and Production deployment still require approval. Do not revisit the earlier Vercel browser-origin permission problem or attempt repairs/workarounds.
- The owner subsequently requested a redesigned private business workspace for the staff Inbox; approved customer-facing design remains locked. No customer accounts or portal. The initial `/inbox/workspace` review at `6431f8a` used fictional in-memory records behind existing operator protection. Its owner-approved functional follow-up adds private saved staff records only in the exact isolated synthetic Preview; sending and payment actions remain simulated. Keep the existing Inbox available while its replacement is reviewed and proven.
- On October 26 the owner approved the staff workspace design and authorized continuing its functional implementation with synthetic data. Preserve that design while adding saved private family records, channel-specific drafts, notes and pickup preparation. Real mailbox/payment activation and Production changes remain separately gated. Development continues in the renamed Codex chat `FluffyTail — Active Development (Codex)`; `FluffyTail — Previous Development (Reference)` is historical reference, not a concurrent worker. The old review is `FluffyTail — Previous Review (ChatGPT)`. The owner will create a separate ChatGPT Work/Astra review chat manually. GitHub PR #4 and these project files carry implementation state between chats; do not assume automatic conversation-history synchronization.
- The owner then explicitly chose Jeanne's existing live Pair Pro Mail account instead of a separate test mailbox and identified `https://pairpromail.com/`. Local SMTP authentication and read-only IMAP Inbox access were verified on October 26 without sends, message-body reads or mailbox changes. The credential is encrypted for the Windows user outside the repo; never copy it or real mail into the synthetic Preview. Do not ask again for a separate test mailbox. This connection check does not activate the website email channel, authorize automatic imports/customer sends, or approve Production changes. See the local diagnostic tools and connection result in `docs/fluffytail-integrated-release.md`.

## Commands

Recovery instruction, October 26: resume the existing PR #4 branch and preserve all local files and saved records. No reset or replacement checkout. Email compose/reply drafts, held reviews and non-payable payment-link preparation are authorized for isolated fictional testing. Customer delivery remains hard-disabled. Existing mailbox reads are also paused, including message lists, bodies and reply-envelope lookups; the local companion enforces this before touching the provider and has no browser/environment activation switch. Do not run live mailbox diagnostics, enable reads, import mail, modify Production Sanity/payments, merge or deploy Production without new owner authorization. Document the recovery and verification remotely on PR #4.

- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## Next.js Note

This repo uses a modern Next.js version. Before changing framework behavior, routing, metadata, caching, middleware/proxy, or server actions, read the local Next.js docs in `node_modules/next/dist/docs/` if dependencies are installed.
