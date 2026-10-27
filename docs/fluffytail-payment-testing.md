# Isolated payment-testing workspace — October 27, 2026

Preview only; leave this phase unmerged. Baseline: published main `4a203e8`.

Entry: https://fluffytail-payments-test.vercel.app/inbox/workspace

This deployment uses only `gu1xkpsg/synthetic`, the existing separate Stripe test account, a dedicated test key and a separate `/api/stripe/test-webhook` signing secret. Missing test configuration fails closed. No Production configuration, data, inventory or payment migration. Stage 2 remains paused.

## Owner scenario

Select **Poppy Practice Family — TEST**, associated with **Practice Poppy — TEST**. Total $1,600; deposit $400; final payment $1,200. The separate **Verification Test Family / Verification Clover — TEST** is used for agent verification; the Poppy scenario stays unpaid for the owner. All operational documents are authenticated-only private records. Only the marked fictional puppy can be reserved by this test webhook.

Use the normal right-hand family details panel to request a deposit, open or copy its link, pay in Stripe test Checkout, return to the signed-webhook receipt, then request the final payment. No email or SMS is needed or sent. Both mail sending and mailbox synchronization are disabled in payment-testing mode; SMS remains disabled in Preview.

Test card: `4242 4242 4242 4242`, any future expiration such as `12/34`, any three-digit CVC and postal code. No real card details.

## Sign-in and isolation

The branded password form creates the existing secure, HttpOnly, eight-hour, host-bound staff session for `/inbox`. It covers both the workspace and existing Inbox. Preview failures redirect HTML navigation to that form and never issue a browser Basic Auth challenge. Only the stable test alias receives a Vercel protection override; application authentication remains enforced. Project-wide and Production protection are unchanged. Credentials remain in the private local handoff window, never source, URLs, logs or this document.

The payment return page distinguishes Stripe reporting payment from the signed webhook recording it. The webhook checks test mode, exact saved family, marked puppy, quote, request/session identity, email and amount. Its private ledger, request status and deposit reservation change commit atomically with revision guards. Duplicate Checkout events create one ledger entry and one reservation change. Paid deposits and zero balances cannot be requested again. Payment-link creation remains separate from messaging.

## Verification checkpoint

Local application-handler regression: 214 passing tests, including signed deposit/balance webhook transactions, duplicate and concurrent event handling, bad signatures/live events/mismatched families, repeat requests and branded-session coverage. TypeScript and optimized build pass. Lint has zero errors and 16 existing image warnings.

Hosted signed-out login, actual Stripe test Checkout/webhook results, final deployment and owner-unpaid checks will be recorded below after verification. The reused temporary Stripe sandbox currently expires November 2, 2026; it must be renewed or replaced before testing beyond that date, with its test credentials and endpoint kept separate.
