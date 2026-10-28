# FluffyTail analytics readiness

2026-10-28. Documentation only; no tracking, account settings, legal copy, environment variables or deployment changed. Source baseline: `b9a6ade`.

## Verified baseline and limits

- Account `287981353`, property `409905182`, web stream `6251904848`, measurement ID `G-Y8FN5J7876`: the coordinating audit found the stream named **Fluffytailshihtzu**, URL `https://www.fluffytailshihtzu.net`, and no data received in 48 hours. This is not verified active measurement for the current `.com` site. The old URL setting alone does not establish why data is absent; changing it does not install a tag.
- `app/layout.tsx` imports `@vercel/analytics/next` and renders `<Analytics />` unconditionally outside `SiteChrome`. No Google tag, `gtag`, Google consent gate or Vercel `beforeSend` was found in the inspected `app`, `lib` and `sanity` source.
- `SiteChrome` bypasses branding for `/inbox`, `/studio` and `/pay`; this does not bypass root-layout analytics. Source reach therefore includes staff, form and payment pages. This audit did **not** observe actual private analytics payloads or inspect account retention. Do not report a confirmed disclosure from code placement alone.
- The locally installed Vercel SDK is 1.6.1. Its Next adapter passes pathname and a computed route to pageview; reading search parameters for route templating is not proof that raw queries were sent. The hosted analytics script and actual network payload need separate controlled verification. A token can nevertheless exist in a pathname such as `/pay/[token]`.
- `app/privacy-policy/page.tsx` describes inquiries, contact details, technical/form context and service providers. It has no explicit Google Analytics/cookie choice section. Inquiry SMS consent concerns messaging; it cannot be reused as analytics consent. Preserve this text pending an approved policy update.

## Proposed activation sequence

1. **Resolve the existing stream.** In the same property, verify ownership and any remaining `.net` use. If this is the same continuing business website, reuse stream `6251904848` and ID `G-Y8FN5J7876`, update its website URL/name to the `.com` site, retain historical data and record the cutover date. If `.net` is a separately active site, resolve reporting separation before changing its stream. No new account or paid service is needed for this proposal.
2. **Agree on collection and disclosure.** Review an explicit analytics choice with equally accessible accept/decline and a persistent settings/withdrawal control; approve the policy wording, retention and account settings before release. Initial scope is aggregate public-page traffic only. Do not enable Google Signals, advertising personalization, Ads linking, user-provided data, User-ID, enhanced conversions or audience exports. Review data-sharing defaults explicitly.
3. **Constrain existing Vercel analytics first.** Replace the global mount in a separately reviewed follow-up with the same public-route gate and consent state described below. Add a fail-closed `beforeSend` that drops excluded events and strips query/hash from accepted URLs. Confirm the hosted SDK respects it on initial load and client navigation; if any payload cannot be safely filtered, leave that provider disabled until resolved. Vercel documents `beforeSend` route rejection and URL redaction. [Vercel redaction guidance](https://vercel.com/docs/analytics/redacting-sensitive-data)
4. **Implement GA behind an off-by-default switch.** Enable only for the approved production hostname, approved public page, and explicit analytics consent. Store the measurement ID as public configuration, never a service credential. Keep development, Preview and synthetic test environments off. Use mocked network requests for implementation tests; any live DebugView check is a distinct approved validation step.

## Public-page and data contract

Allow exactly `/`, `/available-puppies`, `/upcoming-litters`, `/about`, `/pricing`, `/the-breed`, `/puppy-resources`, `/privacy-policy`, `/terms-and-conditions`, and a successfully resolved **published** `/puppies/[slug]` page. Do not use a broad starts-with rule that admits arbitrary slugs or 404s. Reject every other route by default.

Explicitly exclude `/contact` and `/puppy-inquiry` (both host lead forms), `/inbox/**`, `/studio/**`, `/pay/**`, `/payment-success`, all `/api/**`, sign-in/return/error/preview routes and unknown future pages. No form listeners, submission events, payment conversions, customer identifiers, messages, contact details, tokens, CMS document IDs or free text enter analytics. Initial reporting has pageviews only; it will not report inquiry or sales conversion counts.

Build `page_location` from fixed origin `https://www.fluffytailshihtzu.com` plus the allowlisted canonical pathname. Discard **all** query parameters and fragments, including UTMs; campaign attribution is intentionally limited in this first phase. Use approved public titles, never arbitrary DOM/form text. Sanitize `page_referrer`: allow only a prior approved public canonical URL or an external origin; use an empty value for excluded/unknown same-site referrers. Apply these rules to configuration and every event, and inspect both payload and HTTP referrer behavior.

## Consent and navigation mechanics

Use **basic consent mode**: do not load Google scripts or make Google analytics requests before consent, or after a decline. Queue denied defaults for `analytics_storage`, `ad_storage`, `ad_user_data`, and `ad_personalization` locally before tag loading; after consent grant only analytics storage. Advanced consent mode sends cookieless measurements while denied and is outside this proposal. Consent Mode itself is not the choice UI. [Google consent-mode behavior](https://developers.google.com/tag-platform/security/concepts/consent-mode)

Persist only the necessary consent preference/version, not an analytics identifier before consent. On withdrawal, stop event dispatch immediately, persist decline, remove analytics cookies within the site's control, and reload into a document that does not load analytics. Verify SDK background requests also stop; a hidden banner or unmounted React component is insufficient.

The tag can survive a Next.js client transition. Provide a tested full-document boundary between instrumented public pages and excluded surfaces, with analytics disabled before leaving. Never let a loaded tag observe a payment token or staff route during client navigation. Coordinate this future change with active authentication/payment work; do not alter those flows as part of this SEO patch.

Use one manual pageview dispatcher after consent and a committed allowed route change. Configure `send_page_view: false` on every initialization and disable Enhanced Measurement history pageviews in the stream; that history setting operates independently. Keep other Enhanced Measurement options off, including forms, outbound clicks, downloads, site search, video and scroll. Deduplicate initialization/re-renders; query-only/hash-only changes do not create views. Explicitly update the sanitized public location/referrer for each event. [Google manual pageviews](https://developers.google.com/analytics/devguides/collection/ga4/views)

## Release evidence required

- Fresh browser, no choice, decline, grant, reload, withdraw, and expired preference: verify expected storage and zero analytics requests while not consented.
- Allowlisted direct loads and Next links/back/forward: exactly one pageview per eligible navigation; no duplicates from automatic history tracking or React re-renders.
- Test synthetic sensitive query/hash values, invalid slugs, and direct/client transitions into excluded routes. Inspect every analytics request, including automatic engagement/session traffic and unload beacons; no excluded URL, title, token, query, referrer or form value may appear. Use fictional data only.
- Verify both GA and existing Vercel behavior independently, plus Preview/localhost denial. No real inquiry, payment or message is needed.
- After activation approval, use an owner-controlled browser and temporary debug mode to confirm only sanitized `.com` public events in GA DebugView, then remove debug mode and verify Realtime. Google recommends comparing location/referrer across SPA pageviews. [Google SPA verification](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)

Outstanding: owner approval for collection/policy/account changes; implementation and controlled network evidence; authorized production release. Nothing in this document confirms that tracking was installed or activated.
