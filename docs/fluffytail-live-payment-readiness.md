# Live payment readiness review — November 14, 2026

## November 16 ownership correction and merchant migration in preparation

The owner corrected the merchant ownership: Innovation Strategies LLC belongs to Jason, while FluffyTail is Jeanne Downey's independently operated sole proprietorship. The earlier account's enabled capabilities and payout configuration do not establish readiness for Jeanne's merchant business. Do not repurpose or close Jason's account, reuse its bank destination, or reinterpret its records as Jeanne's.

Focused migration preparation is on `codex/jeanne-stripe-account-migration`, based on main `86967c4` (including PR #41 public cache work). See [the migration runbook](fluffytail-jeanne-stripe-migration.md). Production cutover is blocked until Jeanne's account, bank eligibility, live credentials/webhook and closure of previous payable links are verified. No production credentials or customer records have been changed in this preparation.

Scope: current Production `426193d`, read-only provider/configuration inspection and existing records. No real request, Checkout, payment, message, refund or payout was created. No settings or operational records were intentionally changed. The historical migration and unrelated pending releases remain paused.

## Inspected Production evidence

- Real inquiries have persistent private family records. Production contains two unpaid deposit requests, no confirmed payment ledger records and no families marked as payment-test scenarios.
- The existing issued deposit link retrieves its actual `cs_live_` session through the deployed customer handler. The same session was independently identified in the authenticated FluffyTail Stripe account: $400, unpaid and expired. This proves a current live credential can retrieve that account's existing Checkout; it does not prove a new live payment or webhook delivery.
- Current litter configuration is $1,600/$400; archived $1,500/$300 prices are preserved. Requests freeze their own approved quote.
- The active live webhook destination points to `/api/stripe/webhook` on `www.fluffytailshihtzu.com`, with completed, asynchronous success/failure, expired and invoice-paid subscriptions. A signing secret is configured on both sides, but their match has not been demonstrated by a successful live payment event in this review. No secret was revealed or event replayed.
- Stripe account retrieval reports charges and payouts enabled, settlement delay two days, daily schedule, and no currently/past-due or pending-verification requirements. Dashboard settlement rules send all revenue to the Stripe financial account, rather than automatically to the linked external bank. No successful live payment or payout exists to establish actual fees, net proceeds, first-payment availability or bank arrival.
- Private account/bank identifiers and evidence snapshots remain outside the repository. The owner report identifies the account and masked destination.

## Code-path evidence, separate from live proof

The existing live handlers validate production mode, live credential/session/event, exact origin, currency, quote and family/puppy association. Signed callbacks create a deterministic ledger and conditionally update the request/family/reservation once; paid state on a return page cannot create credit. Processing and unpaid outcomes do not become paid records. Preview operations require synthetic storage and test credentials and reject live sessions/events. Marked fictional families cannot use the live adapter. Global inherited keys are not themselves sufficient to bypass these guards.

The live-shaped and synthetic handler regressions run entirely against fictional providers and in-memory records. They are not evidence of an actual charge, Pair delivery, signed live callback or bank receipt.

## Focused corrections for Preview review only

1. The shared live/test customer payment page still polled every five seconds forever, including completed/expired receipts. Refresh now stops at final states (allowing a pending confirmation email to settle), pauses provider reads while hidden and ends after five minutes. An explicit Refresh payment status control remains. Only server-verified receipt data controls payment state.
2. The live family projection previously discarded payment type/date/verification and Stripe identifiers. It now preserves these existing fields in the authenticated staff response. Payment history distinguishes verified live, test and legacy recorded entries, provides a mode-correct Stripe payment/invoice link when available, and explains that bank transfers are separate. Legacy records without reliable mode or identifiers are not assigned an invented transaction link or verification claim.

No payment calculations, ledger writes, reservation logic, customer-page layout, templates, provider configuration, public pricing or existing history are changed by these corrections. Do not merge or deploy Production without owner review.

## Owner-controlled live verification, proposed only

After the owner confirms whether automatic earnings should remain in Stripe's financial account or go to the linked bank, use the next genuine buyer's approved $400 deposit as the live verification checkpoint. Jeanne explicitly prepares the normal configured request for that buyer and puppy/litter position, the buyer completes their genuine purchase, and Jeanne checks one signed workspace record, the real Stripe transaction/fee/net and availability date, subsequent transfer/payout and the bank's matching receipt. This is a real reservation and payment, not an artificial self-charge or refundable test. All simulated testing stays isolated. No request, customer contact, charge, refund or payout is authorized by this proposal itself.

At Stripe's published standard US domestic-card rate of 2.9% + $0.30, the illustrative processing cost is $11.90 and net $388.10. This account's actual rate has not been established from a successful transaction; other methods/cards or account pricing can differ. Stop before initiating this test. First-payout timing is not confirmed merely by the account's daily schedule.

## Verification

The focused timer/visibility/terminal-state and metadata/Stripe-link tests pass, along with the existing signed live-shaped and synthetic journeys. Full regression, build, Preview deployment and browser verification results are appended below when complete.


### Completed isolated checks

All 364 tests pass, including signed fixture webhooks, duplicate/concurrent credit protection, unsuccessful/processing/expired cases, Preview/live rejection, historical link compatibility and the new bounded refresh/display tests. TypeScript and focused lint pass. The optimized Next.js build passes with the synthetic project identifiers; the first local build lacked required public Sanity environment identifiers and was rerun with explicit non-secret synthetic settings.

The actual built workspace was opened in the local browser with a new, separate offline fixture file. Desktop and 390px phone details panels show Live payment confirmed, Test payment confirmed and unqualified legacy Payment recorded correctly, with separate live/test Stripe destinations and the bank-transfer explanation. The unfinished draft remains visible. No Stripe link was followed and no send, checkout, archive or other customer action was invoked. Screenshots are private local evidence, not evidence of real financial transactions.

Production comparison retains both payment-request revisions exactly and still has no ledger records. Opening the existing staff view triggers the already-known no-op inquiry projection: family `_rev` values refreshed while their `_updatedAt` times remained before this review. This review did not patch those families or their financial/reservation data. No new production configuration or code was deployed.

This branch is for review only. Its Vercel Preview uses normal deployment protection and existing fail-closed operational guards; it is not a new live-payment test environment. Local fixture provider results must not be described as hosted persistence or actual money movement.


## Production release authorization — November 14, 2026

The owner approved releasing PR #40's two prepared corrections after the existing required checks pass: accurate live/test/legacy staff payment identification with Stripe transaction links, and bounded customer receipt refresh. This supersedes the earlier review-only gate above. No other pending PR or feature is included. The owner separately selected the existing Discover destination; ownership/destination inspection, any saved payout setting and final readback are tracked privately because bank details do not belong in source. No manual transfer, existing-balance movement, card order, customer send or charge is authorized during release verification. The next genuine buyer deposit remains the live payment-to-bank evidence checkpoint.
