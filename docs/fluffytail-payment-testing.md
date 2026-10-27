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
## Hosted verification — completed October 27

- Initial Preview deployment `dpl_HJxyPAD3bv9oDNDWTNmGRGH8K6CA`, commit `e81b4b8`, uses the stable test alias. Its alias-only protection override removes the Vercel challenge; the branded staff session still protects private pages and APIs. Anonymous workspace/Inbox navigation redirects to branded sign-in, private APIs return 401 without `WWW-Authenticate`, and an unsigned test webhook returns 400.
- A fresh browser on the new alias began signed out. One password-form sign-in opened the workspace. Refresh, navigation to the existing Inbox and its refresh, both Stripe Checkout returns, and return to the family required no further authentication. No developer Basic session or owner-link token was used.
- Through the hosted family UI, requested the verification deposit, copied its link ("Nothing was sent"), opened Stripe Sandbox Checkout and paid $400 with the standard test card. Stripe generated event `evt_1UVCpWRbnssrQ3Z0LjREm0Ba`; the separate webhook recorded $400, reserved Verification Clover and left $1,200 due.
- Requested and completed the $1,200 balance through the same hosted UI. Stripe generated event `evt_1UVCqxRbnssrQ3Z0wNyGKb8N`. Both real test-mode Checkout sessions are paid (`livemode:false`); both original provider events have zero pending webhooks. The private receipt/history shows two records, $1,600 paid, $0 remaining, and the fictional puppy reserved. These original payments were completed on Stripe Checkout, not manufactured handler fixtures.
- Subsequently replayed each original event payload with a fresh signature generated from the dedicated test endpoint secret. Both hosted responses reported `duplicate:true`; before/after receipts and two-entry ledger were identical. This is an explicit duplicate replay test after the real Stripe callbacks, not a substitute for provider payment verification. Re-requesting deposit and final balance each returned 409 with a concrete paid/ineligible explanation.
- Sanity authenticated readback: Practice Poppy remains **available**, with **zero payment requests and zero payment records**. Verification Clover is reserved with exactly two requests/two payments. Existing records were preserved. No email/SMS sends or Pair reads occurred.
- Handoff polish opens payment-testing mode directly to Conversations, removes its obsolete simulation-reset control and duplicate fixture payment snapshot, and prevents an early receipt-return click before the family is loaded. The existing Payments tab reuses the same test request controls and verified ledger, so either normal navigation path works. Normal Production layout/behavior is unchanged.

The Preview-only branch/PR stays unmerged. Production remains main `4a203e8`; no Production deployment, environment change or data write is part of this phase. The owner can use the fresh Poppy scenario now; the temporary sandbox's November 2 expiration is the only time limit, not a blocker for the current test.
