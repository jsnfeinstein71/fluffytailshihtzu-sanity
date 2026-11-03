# Synthetic API traffic — October 31, 2026

Scope: test traffic only. Preserve all completed Previews, records, payments and production behavior. No plan, billing, credentials, data deletion or migration change.

## Meter and reset

Authenticated Sanity management reads identify separate projects and separate 250,000 monthly API-request quotas, both currently unblocked:

| Project | Reported API requests | Remaining | Meter timestamp (UTC) |
| --- | ---: | ---: | --- |
| gu1xkpsg — FluffyTail Synthetic Privacy Test | 201,162 (80.46%) | 48,838 | 2026-10-31 01:02:37 |
| 3glz6dkx — FluffyTailShihTzu | 124,200 (49.68%) | 125,800 | 2026-10-31 12:56:56 |

These are the provider's reported snapshots, not real-time promises. Detailed request-log counts do not exactly equal quota-meter totals. The next calendar reset is November 1 at 00:00 UTC, October 31 at 7:00 p.m. America/Chicago. At the observed recent synthetic rate of 115,351 metered requests/day, the reported remaining quota would last roughly ten hours if that traffic resumed. No upgrade or billing activation was performed or recommended as necessary.

## Evidence and cause

The owner's warning was sent October 30 at 21:58 UTC. Existing secure CLI login was reused for read-only management access and an on-demand request-log export; no new credentials were issued. Raw exports stay in the owner's private local evidence folder, outside Git. Do not publish URLs, payment tokens, private IDs, IP addresses or raw logs.

The synthetic export covers October 25–30 and contains 220,534 rows. Successful live API traffic includes 143,699 document reads, 75,455 queries and 1,157 mutations. Nearly all callers report Node; API CDN traffic was only 24. A single test payment capability was read 14,352 times from October 29 18:12 UTC through October 30 21:53 UTC, median interval 6.985 seconds, including uninterrupted overnight periods. Related repeated family/payment/receipt/confirmation reads match the customer test payment handler's fan-out. `CustomerTestPayment` scheduled another read five seconds after each completed request, including after payment confirmation and while hidden. This is the dominant identified source. Smaller recurring staff conversation/reservation reads also appear.

There is no repository cron configuration or FluffyTail/Sanity scheduled task. Unit suites use fictional clients/providers. Build-time public reads exist, but their volume and short execution cannot explain the observed same-capability overnight cadence. Vercel's one-hour log retention cannot attribute the historical Sanity reads to exact deployments; the exported Node requests have no referrer or application tag. Do not claim the export identifies a particular owner's device. Production has its own independent mix of public inventory and staff reads; its behavior is unchanged.

## Correction

Test customer payment pages stop polling on a settled result (including verified confirmation), pause when hidden, check every 15 seconds only during a two-minute confirmation window, and offer Refresh test payment status. Payment state still comes from server-validated records and signed webhooks. A paid result awaiting its email outcome can use the remaining bounded window; uncertain delivery stays labeled uncertain. No send, payment or ledger change is triggered by the refresh control.

Synthetic staff polling is enabled only by a server-computed isolated-project guard. Conversation/reservation checks run at most once a minute, stop in hidden tabs and pause after five minutes without interaction. Existing manual refresh/actions still work. Live workspace and customer refresh branches retain their original intervals and behavior. No generic API/CDN switch, private response caching or payment-validation shortcut is used.

Old already-loaded JavaScript cannot be replaced remotely. Close or refresh old test payment/workspace tabs once after this deployment; completed receipts and records remain available. There is no unattended backend polling job to stop.

## Verification

Fake-clock regression checks cover a full day with a maximum eight test payment polls, final-result stopping, hidden-tab pause/return, idle staff pause/resume, overlap prevention and delayed-payment/uncertain-confirmation states. Existing customer/Stripe fixture journeys verify payment handling without real sends or payments. Hosted Preview verification is read-only. Production remains at f81fa5a.
