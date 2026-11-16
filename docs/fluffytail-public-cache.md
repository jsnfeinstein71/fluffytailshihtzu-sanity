# Public cache budget (November 15, 2026)

Owner accepts slower editorial updates and says content changes weekly or after a deposit. This patch changes public route and shared Sanity fetch fallback revalidation from 60 seconds to 3600 seconds. The lowest dependent fetch matters, so homepage settings and shared inventory both change.

Published inventory carries `public-inventory`. Verified legacy deposits and live staff payments expire that tag with `{expire: 0}` only after successful reconciliation. Idempotent paid callbacks also expire it, allowing a retry to repair an interrupted invalidation without a second ledger. Legacy deposit transactions now wait for query-index visibility before expiration. Confirmed litter-to-puppy assignment expires it after success. Payment/checkout reads and live litter-place availability remain uncached; no settlement validation or financial data is changed.

The next server request after expiry regenerates inventory rather than intentionally serving stale data. An already-open browser page is not pushed/refreshed. Direct CMS edits and changes made outside these application routes use the hourly request-triggered fallback; the first request after timeout can receive stale content while regeneration runs, and upstream failures can prolong staleness. No hard one-hour freshness guarantee is claimed.

Sitemap static URLs no longer claim they changed at every regeneration. Actual puppy `_updatedAt` dates remain.

Capacity: at sustained traffic, an hourly interval permits at most about 24 scheduled regeneration opportunities per route per day rather than 1440 at one minute, excluding deposits, deployments and errors. This is not a prediction of billable writes: traffic, output byte size/change, cache layers and rolling-window expiry determine actual units. Check the Vercel rolling-30-day ISR total and same-length post-release write window; do not promise a fixed percentage or guaranteed quota cap. Existing usage does not reset on release.

Verification uses synthetic tests/build only. No real payments, customer sends, data writes, cache-wide purges, credentials, billing or security settings are changed.
