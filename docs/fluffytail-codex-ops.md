# FluffyTail Codex Ops

This repo is a long-lived Codex workspace for FluffyTail Shih Tzu. Future work should be production-aware, GitHub-centered, and conservative around payment, messaging, and lead-capture behavior.

## Default Approach

1. Start with `git status --short --branch` and identify user changes before editing.
2. Read the relevant route, API handler, Sanity schema, and docs before proposing changes.
3. Treat GitHub as source of truth and Vercel as deployment target.
4. Keep changes scoped to the task. Do not redesign the site or rewrite copy opportunistically.
5. Prefer local verification with `npm run lint` and `npm run build` when code changes are made.
6. Summarize exact files changed and any production risks.

## High-Risk Areas

Ask for explicit confirmation before changing:

- Stripe session, invoice, webhook, payment amount, or payment metadata behavior.
- Twilio inbound/outbound messaging, STOP/HELP wording, alert recipients, or media handling.
- Native inquiry submission, contact preference or SMS consent collection. Tally is retired on the release branch; do not improve its old integration or delete its historical records.
- Sanity schema changes that affect live content, operational records, or Studio editing.
- Vercel deployment settings, domains, redirects, environment variables, or production build behavior.
- Legal page copy, especially SMS consent, privacy, and terms language.

## Safe First Tasks

Good first Codex tasks in this repo:

- Map route behavior and data dependencies.
- Add or update docs.
- Add tests or small validation around pure helpers.
- Improve type safety in a narrow module.
- Fix clear typos or encoding problems after explicit approval.
- Add environment variable documentation.

## Integration Boundaries

Do not assume direct access to connected services. Call out when work needs app/plugin/MCP access or account access:

- GitHub: PRs, issues, secrets, branch protection, checks, deployment history.
- Vercel: project linkage, production/preview environment variables, domains, logs, and deploy settings.
- Sanity: project ID/dataset verification, content documents, Studio permissions, API tokens, webhook config.
- Stripe: test/live mode confirmation, webhook endpoint config, Checkout/Invoice records, event delivery logs.
- Tally: historical submissions/account only; after approved native-form release, owner can retire obsolete external webhook/form configuration. No ongoing development dependency.
- Twilio: messaging service/phone number config, inbound webhook URL, A2P/10DLC status, STOP/HELP behavior, logs.

## Route Orientation

- Marketing and content routes live under `app/`.
- Public puppy inventory depends on Sanity `litter` and `puppy` documents.
- `/studio` is the embedded Sanity Studio.
- `/inbox` is the protected operator surface for conversations, payments, and deletion actions.
- API routes live under `app/api` and `app/inbox/api`.
- `proxy.ts` protects `/inbox/:path*` with Basic Auth.

## Pricing And Payment Maintenance

- Read docs/fluffytail-phase-1-release.md before payment/operator changes.
- Keep integer-cent calculations in lib/pricing.ts; use fresh Sanity prices server-side, never arbitrary defaults or browser total/deposit fields.
- Preserve actual historical payments. New metadata captures server-selected puppy/litter IDs; recording requires signed paid Stripe events.
- Operator actions belong under /inbox/api and must call requireOperator before provider calls. No public aliases for removed operator routes.
- Preview needs Stripe test credentials and an isolated synthetic Sanity dataset. Messaging/provider callbacks are disabled. No live financial/operational writes are needed for regression tests.
- A repo patch cannot revoke direct Stripe links. Review obsolete/pending unpaid quotes before approval; verify production dataset privacy and exact Twilio callback configuration separately.

## Native Inquiry And Privacy Maintenance

- Read `docs/fluffytail-native-inquiry-release.md` before inquiry/messaging/privacy changes. Keep PR #2 draft until revised QA and explicit production approval.
- Keep `/puppy-inquiry` and old puppy-context URLs working. Resolve puppy/litter context from Sanity on the server; never trust display names or contact preferences without validation.
- Email requires no phone/SMS consent; Text/Either require both. New native requests have recorded consent evidence. Do not enable customer texts for Email-only requests; preserve phone-less Inbox visibility and separate conversation IDs.
- Reuse Sanity, operator SMS alerts and Inbox. No email delivery service exists in this codebase. Do not add a provider/database/queue without authorization.
- New operational writes must use `privateRecordId` from `sanity/lib/private-records.ts`, not random public root IDs. Keep Stripe/SID deduplication deterministic and preserve lookup compatibility with historical records.
- Authenticated-only new IDs do not hide old records. Confirmed anonymous production count: 54 published operational documents on 2026-10-25. No content migration/dataset visibility change is authorized. Approval and isolated verification are required to resolve this release blocker.
- Keep server secrets server-only; Preview requires a synthetic isolated dataset and a separate `INQUIRY_FORM_SECRET`. Never point live callbacks at Preview or send test customer messages. Do not bypass Preview's production-dataset guard.
- Verify Twilio signatures against the exact configured external URL and all parameters before persistence. SID retries must not generate duplicate records or acknowledgements. Ambiguous outbound alert outcomes require operator log review rather than automatic resend.
- Monitor pending/needs-review inquiry notifications. Rate-limit records expire logically, not automatically on disk; any cleanup must be explicitly scoped and reviewed.

## Verification Checklist

For docs-only changes:

- Confirm files are added or changed as intended.
- No build is required unless docs include code examples that should be validated.

For code changes:

- Run `npm test` for the inventory/query/rendering and mocked payment/auth suites (Node 22.15+; verified on Node 24).
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build` for route, API, schema, Stripe, Twilio, or Next config changes.
- Manually inspect affected pages locally when UI changes are made.
- Use test-mode Stripe/Twilio or mocks unless live behavior is explicitly authorized.

## Inventory Maintenance

- Read `docs/fluffytail-reliability-audit.md` before changing inventory behavior.
- Keep public queries in `sanity/lib/inventory-queries.ts` and their published/revalidation options in `sanity/lib/inventory.ts`.
- Keep statuses, grouping, sorting, date formatting, waitlist rules, and inquiry URLs in `lib/inventory.ts`.
- Render puppy cards and litter sections through the shared components; never remove reserved puppies from a litter to create a matched section.
- `planned/current/past` remain the stored canonical litter values. Keep legacy `upcoming/active` read compatibility. Do not equate `sold` with `gone-home`, or `hold` with `holdback`, without business confirmation.
- New parent records and optional expected-date/visibility fields require no content migration. Publishing a parent/litter/puppy remains an operator action.
- Production build verification needs access to Google Fonts and the configured Sanity dataset. Stripe initializes lazily; no Stripe key is needed merely to build inventory pages. Never use live credentials for compilation or regression tests.

## Handoff Format

End future work with:

- Exact files added.
- Exact files changed.
- Verification performed.
- Recommended next integrations.
- Any remaining work that needs direct GitHub, Vercel, Sanity, Stripe, Tally, or Twilio access.
