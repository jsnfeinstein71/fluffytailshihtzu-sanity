# Hosted staff email — implementation and activation runbook

The finished interface is the existing protected `/inbox/workspace` application on Vercel. Drafts, held reviews, outgoing messages, attempts, review evidence, incoming replies and synchronization cursors persist as authenticated-only `private.*` Sanity records. No local companion, Windows credential file, local disk queue or continuously running laptop is part of application delivery or synchronization. The preserved `/inbox/mail` companion and CLI tools are development/diagnostic tools only.

## Current implementation

The application email handler is `/inbox/workspace/api/email`. Its operator authentication, same-origin writes, freeze checks, bounded JSON input and private/no-store responses remain. `runtime=nodejs` and a 60-second function budget cover the bounded SMTP/IMAP operations. No new public sending endpoint, customer account, external service, cron schedule or production activation was added.

1. Save the compose/reply draft and explicitly review it. Each saved version has one deterministic outgoing record and Message-ID, even when different tabs create different held-review request IDs. Legacy body-only drafts are preserved without destructive migration.
2. Before submission, revalidate the family, saved revision, recipient, reply headers and any current payment quote. Persist the family claim and revision-checked attempt before invoking a provider. A lost claim acknowledgement cannot lead to a blind submission.
3. Explicit non-acceptance permits a staff-triggered retry. SMTP acceptance records **accepted / delivery unconfirmed**; it does not prove inbox delivery, payment, or reservation. The draft remains saved after every outcome.
4. Timeouts, unknown provider errors, lost result persistence and interrupted submissions remain blocked for review. After two minutes, **Check interrupted attempts** records uncertainty without contacting the provider. A new draft/review cannot bypass the unresolved family claim. Message-ID alone is not an SMTP deduplication guarantee.
5. Staff can record checked provider evidence and explicitly attest acceptance or non-acceptance. This preserves the original uncertain attempt and attributed review, never submits a message, and never confirms delivery. A missing reply or missing Sent-folder copy is not evidence of non-acceptance. The owner-only live trial below remains limited to one application submission even after a reviewed outcome.
6. Synchronize replies through the same handler. Match exact sender, Jeanne recipient and known outgoing Message-ID references; do not route by subject or email address alone. Wrong-sender, unknown and cross-family/ambiguous references are skipped. Imported IDs deduplicate messages across repeated syncs and application restarts. Conflicting Message-IDs and changed UIDVALIDITY stop automatic import; no saved content is overwritten or historical cursor reset guessed. Advance the cursor only after durable imports. An interrupted sync can reread its bounded scope safely.

The fictional provider persists its own test receipts in the same isolated test store and synthesizes clearly fictional replies. Pair SMTP and IMAP adapters are shared application code, covered through the actual application handlers using fictional servers. No actual Pair request is made by these tests. Nodemailer 10.2.1 and ImapFlow 2.9.1 move from development-only to production dependencies without changing their versions; the lock changes reflect that promotion only.

Payment-link preparation/transport remains separate from financial confirmation. Fictional links cannot collect money. Dispatch and reply sync do not invoke Stripe, create an invoice/session, mark a payment paid, change a historical quote, associate a family, or reserve a puppy. Existing payment/webhook handlers remain unchanged. The owner-only real trial forbids payment links entirely.

## Configuration — not activated

No mail variable or credential was added to Vercel for this implementation. With no mail mode, the hosted application can retain prepared outgoing records but cannot submit or read a mailbox. Production remains unavailable to this review namespace. Existing operator and Vercel protection must not be weakened for testing.

| Server-only variable | Purpose |
| --- | --- |
| `FLUFFYTAIL_MAIL_MODE` | Missing/default means disabled. `fictional` is permitted only in the exact `gu1xkpsg/synthetic` Preview. `pair-owner-test` selects only the guarded owner trial below. There is no unrestricted customer/production sending mode in this release. |
| `FLUFFYTAIL_MAIL_OWNER_TEST_APPROVAL` | Must equal `FT-OWNER-EMAIL-001` for the approved trial. A browser request cannot set it. It is configuration, not a replacement for human approval. |
| `FLUFFYTAIL_MAIL_OWNER_TEST_STARTED_AT` | UTC ISO start set only after approval. Send/read permissions expire closed after 15 minutes; future/invalid timestamps are rejected. |
| `FLUFFYTAIL_PAIR_MAIL_PASSWORD` | Sensitive Vercel secret for Jeanne’s Pair account, scoped only to the approved isolated Preview branch. Never `NEXT_PUBLIC_*`, source, CI, logs or chat. Do not automatically copy the laptop credential into cloud settings. |
| `FLUFFYTAIL_PAIR_SEND_ENABLED` | Must explicitly be `1`, with the above scope, secret and active window. Missing/default disables real SMTP. |
| `FLUFFYTAIL_PAIR_READ_ENABLED` | Separate explicit `1`, with the same scope and window. Missing/default disables real IMAP, including message lists/headers/bodies. |

The existing branch-scoped synthetic Sanity writer, operator authentication and write freeze still apply. Never inherit shared Preview live Stripe/Twilio credentials, use production Sanity for this test, or put real customer records into fixtures. All application state is server-side/private in the existing non-production Sanity project. Only the proposed owner-authored test email/reply may be stored there after explicit approval of that scope.

Pair transport is fixed to `smtp.pairpromail.com:465` and `imap.pairpromail.com:993`, implicit TLS with normal certificate validation and TLS 1.2 minimum, fixed From/Reply-To/account `jeanne@fluffytailshihtzu.com`, bounded timeouts and disabled protocol logging. No browser-controlled host, credentials, attachments, URL/file content loading or HTML tracking content. Verify outbound TCP/DNS/TLS connectivity from the deployed Vercel region during the approved trial; local sign-in success does not prove hosted connectivity or delivery. IMAP is read-only: no Seen/Answered flag, move, deletion, append or Sent-folder modification.

Hosted reply synchronization is staff-triggered; Pair retains replies when the browser/laptop is off. The next hosted synchronization continues from its persistent cursor. There is no local worker dependency or enabled background mailbox reader. Scheduling unattended synchronization later requires separately approved read scope and authenticated application scheduling, not a laptop process.

## One proposed owner-only send-and-reply test — approval required

**Not performed. No activation/configuration changes made.**

- Interface: protected hosted staff workspace, using the fictional Jordan test conversation solely as the trial’s associated test record. The actual To field and every snapshot explicitly show Jeanne as the owner-only recipient; Jordan’s fictional address is not used for Pair.
- From, Reply-To and only recipient: **jeanne@fluffytailshihtzu.com**. No customer, CC or BCC recipient.
- Subject: **FluffyTail owner-only email test [FT-OWNER-EMAIL-001]**
- Exact body: **Jeanne, this is the owner-only FluffyTail Inbox email test. Please reply with: Owner reply received. No puppy is being reserved and no payment is requested.**
- Scope: one application SMTP attempt only, no links, attachments, payment/reservation action or automatic retry. The handler rejects other text, recipients, payment attachments or initial reply context. Persistent global trial/family guards prevent another real submission, including another tab or another test family.
- Before sending, initialize the future-only IMAP UIDVALIDITY/UIDNEXT watermark. This reads mailbox metadata only, not historical message envelopes/subjects/bodies.
- Jeanne manually replies to the received test message in Pair webmail with **Owner reply received.** Then use the hosted synchronization button.
- For at most 15 minutes, search only new UIDs after that watermark, from Jeanne to Jeanne, referencing the exact outgoing test Message-ID. Fetch only matching reply envelopes/references and bounded plain text (50 KB maximum), never unrelated/historical/customer message bodies, attachments or HTML. No mailbox flags or folders are changed.
- Persist only the owner-authored test draft/outgoing/attempt/reply and cursor in private records of the isolated non-production Preview dataset; no existing correspondence import. Re-sync once to verify one displayed reply/import and correct conversation/threading.
- Observe SMTP acceptance and owner reply separately. A self-addressed test does not prove external-domain deliverability or trustworthy delivery notifications. There is no automatic Delivered claim or reliable delivery-event integration in this release.
- At completion or any failure/uncertainty, disable/remove the send/read flags and trial start/approval settings; remove the temporary cloud mailbox secret. Keep the private test audit records. Do not retry a real attempt without another explicit approval.

## Evidence and remaining work before customer use

Current verification: **190 local tests pass**, including 24 new application/Pair adapter contracts; the two Windows-only encryption tests pass locally and skip on Linux CI. Lint has zero errors and the same 16 image advisories; TypeScript and the optimized synthetic-content build pass. Browser testing exercised the actual hosted-workspace components/handler against the local persistent fixture: balance email accepted, imported reply, duplicate-free re-sync, threaded reply submission, deposit rejection/explicit retry, uncertain result without resend, attributed evidence review, and complete server restart. Drafts, outgoing/attempt history, staff evidence and imported replies survived. 400px/320px checks fit without horizontal overflow. No real mail access/send occurred. Logs/screenshots are outside source in `%TEMP%/fluffytail-workspace-review/application-mail-*`.

Local fixture tests exercise real application handlers and the shared Pair adapter against fictional SMTP/IMAP clients, plus the optimized hosted-workspace UI with a disk-backed fake Sanity client. They establish logic, persistence/restart behavior and suppression; they do **not** establish authenticated hosted Sanity persistence, Pair acceptance from Vercel, actual message delivery or actual reply import. GitHub CI and Vercel Preview build results are recorded on PR #4 for the published commit.

Before Jeanne can use hosted email for customers: verify staff access and real hosted private persistence; approve/configure/perform the one scoped owner trial; verify deployed connectivity and reply behavior; connect actual authorized inquiries/family identities and validated real payment-link references rather than this fixed fictional namespace; approve the reviewed production mail namespace/recipient policy and rollout; complete privacy/recovery and historical-link release gates; and explicitly approve merge/production deployment. General customer sending is deliberately unavailable in this release. Retain the existing Inbox and Good Dog until those checks pass. Historical financial records, production Sanity and the approved customer-facing design remain untouched.
