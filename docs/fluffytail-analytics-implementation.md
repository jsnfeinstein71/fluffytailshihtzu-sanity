# Consented public analytics

October 28, 2026. Prepared on `codex/consented-public-analytics` from production commit `0219fda`. This follow-up is separate from the released SEO PR #15. The owner approved configuring Google Analytics for consenting public visitors and restricting Vercel Analytics; a new PR still requires specific release approval.

## Account configuration reported by the coordinating task

Existing account `287981353`, property `409905182`, stream `6251904848`, measurement ID `G-Y8FN5J7876` are reused. The coordinating task verified the stream URL changed from `.net` to `https://www.fluffytailshihtzu.com`, Enhanced Measurement is off, Google Signals and user-provided data are off, and advertising personalization is disallowed in all 307 regions. No connected site tags were found. Existing granular location/device settings were not changed. This code task does not repeat console changes or request credentials.

## Collection contract

- Nothing from Google or Vercel Analytics loads before explicit acceptance. The equally presented Accept/Decline controls have no preselected choice. A persistent Analytics settings control allows withdrawal.
- The necessary browser-local consent preference contains only a version, choice and timestamp, expiring after 180 days. Storage failure is fail-closed. Cross-tab denial and expiry stop collection.
- Production must be Vercel's `production` environment at the exact HTTPS `www.fluffytailshihtzu.com` origin. Localhost, Preview, aliases and old domains do not send analytics. There is no query-string activation switch or test endpoint in the site.
- Allowed static paths are `/`, `/available-puppies`, `/upcoming-litters`, `/about`, `/pricing`, `/the-breed`, `/puppy-resources`, `/privacy-policy` and `/terms-and-conditions`. A puppy page becomes eligible only after its server loader successfully resolves a published record and renders its marker. Arbitrary puppy slugs and 404s do not qualify.
- Contact and inquiry forms, staff/Inbox/Studio, payment/confirmation/API routes, unknown routes and customer information are excluded. No form, identity, group, payment, advertising or custom conversion calls are added.
- Manual pageviews use a fixed `.com` origin, validated public path, and literal approved title. Puppy pages use the generic title “Shih Tzu puppy profile” while their public canonical path identifies the page. Google referrer is explicitly empty. No query, fragment, user input, CMS internal ID or private record enters a dispatched event.
- As a conservative bound, an initial URL with any query or fragment, or an incoming referrer that contains unsupported path/query/credentials, disables analytics for that document. This intentionally loses some attribution and visits instead of attempting to scrub unsupported vendor fields.
- Google still collects its normal consented device/browser/language, session and engagement information and cookie identifiers. Providers receive network data to process requests. This is neither truly anonymous nor literally pageview-only transport. No inquiry/sales conversion reporting is implied.

## Provider and navigation controls

The unconditional `@vercel/analytics/next` component was removed. The generic Vercel SDK uses `disableAutoTrack:true`, manual pageviews, and a persistent fail-closed `beforeSend`. Custom events are rejected, and event URLs are reconstructed without query or fragment.

The currently deployed Vercel script reads incoming referrer, `__va_attribution` and flag data outside the supported URL filter. It offers no supported referrer rewrite or runtime teardown API. Collection is therefore omitted when incoming referrer is unsafe, the attribution storage key exists, storage is unavailable, or flag-value elements are present. Global `no-referrer` metadata prevents outgoing request referrers from carrying sensitive URLs. An incoming referrer cannot be rewritten retroactively.

Google gets denied consent defaults locally before its script is loaded; acceptance grants only analytics storage. Advertising consent remains denied. Every config sets `send_page_view:false`, disables Google Signals/personalization, supplies sanitized context and empty campaign overrides. GA cookies are host-only (`cookie_domain:'none'`), Secure/SameSite=Lax, and expire after 180 days without extending their lifetime on subsequent visits. Enhanced Measurement must remain disabled in the account. One manual view is emitted per committed public route; repeated registration does not add another view.

Navigation guards install before provider loading. Entering forms, private/unknown routes or any unverified puppy destination stops collection synchronously and uses a full document load. Clean static public navigation retains Next navigation. History mutations, pagehide, back/forward and bfcache are handled; native skip-link focus behavior is preserved. This avoids moving or rewriting authentication/payment route files.

Withdrawal immediately sets Google's documented property disable flag and makes Vercel's filter reject events, removes site-controlled GA cookies, and reloads the document to clear loaded provider runtimes. Removing a script or React component alone is not treated as stopping analytics. Already transmitted information is not deleted by withdrawal.

## Release and verification

The draft Preview demonstrates the consent controls and exclusions while both providers remain disabled by its environment/hostname gates. Unit/integration tests exercise actual controller and navigation code using fictional data and adapters; provider-network browser evidence is recorded separately. Mocked provider behavior is not proof that a downloaded provider script obeys the same contract.

Local validation: 303 repository tests passed; the final browser-history fix also passed all 36 focused runtime/navigation tests. Typecheck passed and lint reported zero errors (13 pre-existing image warnings). Browser checks with the actual downloaded Google tag verified sanitized canonical page-view payloads, host-only cookies, and revocation removing both GA cookies. An isolated synthetic payment transition created a fresh document with no provider scripts; an incoming query disabled collection. The final fixture blocks provider event transport using a restrictive CSP. An earlier interception session lost its browser connection; delivery of a small number of synthetic public-page test events in that observation gap is uncertain. No customer or private-page data was used. The localhost fixture cannot prove successful Vercel production delivery because its real origin is deliberately rejected; this remains a post-release verification step.

Before release: require passing tests/typecheck/lint/build, terminal CI and Preview, clean scoped diff, consent/withdrawal layout review and complete synthetic transport checks. Merge only after the owner approves this specific PR. The existing GitHub-to-Vercel production workflow then enables the production gate; no environment secret or new account is required. After authorized release, verify an owner-controlled consenting visit in actual transport and GA Realtime/DebugView, plus excluded and revoked states. Do not count Preview silence as proof of production delivery.

## Primary references

- Google privacy and disable controls: https://developers.google.com/tag-platform/security/guides/privacy
- Google configuration and campaign/page overrides: https://developers.google.com/analytics/devguides/collection/ga4/reference/config
- Manual pageviews and Enhanced Measurement interaction: https://developers.google.com/analytics/devguides/collection/ga4/views
- Cookie domain and lifetime controls: https://developers.google.com/tag-platform/security/guides/customize-cookies
- Automatically collected events: https://support.google.com/analytics/answer/9234069
- Basic consent mode: https://developers.google.com/tag-platform/security/concepts/consent-mode
- Vercel supported redaction: https://vercel.com/docs/analytics/redacting-sensitive-data
- Installed Vercel SDK: `@vercel/analytics` 1.6.1; hosted script was read without executing it during the design review.
