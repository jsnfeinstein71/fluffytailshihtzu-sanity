# Four-place litter reservations — isolated implementation

Owner authorization: build and verify the four-place litter reservation journey on latest main, without Production offers, messages, live charges or real puppy changes. Baseline `d1f04b7` includes the completed passkey cutover. Preserve that work and the existing Inbox, messaging, payment history, copy and branding. Historical migration remains paused.

This first release requires `FLUFFYTAIL_LITTER_RESERVATIONS_ENABLED=1`, Preview, exact `gu1xkpsg/synthetic`, the existing test-payment configuration and marked fictional litter/puppy/family records. It fails closed against Production. No live configuration is copied into its operation. Production activation is a separate reviewed release.

## Record and payment behavior

Each litter has a private four-place aggregate guarded by Sanity revision transactions. A private family anchor prevents competing active deposit offers to the same family. A durable pending position and immutable request quote are committed before creating Stripe Checkout. Unknown creation outcomes retain the place and retry the original Stripe idempotency key. Public responses contain exactly position numbers and status labels; names, contacts, operational identifiers and history remain private. No public request can approve a reservation.

The signed test webhook re-reads its saved Checkout Session and validates test mode, amount, family, request, capability, litter and original position. Only verified paid state creates the original payment ledger and reserves a selection position. Duplicate events create no second payment. An individual puppy is never reserved by this litter deposit.

An open retryable checkout remains pending after a card decline. Expiry timestamps alone never release a place. A provider-confirmed closed/expired checkout releases only after its PaymentIntent is definitively non-processing. Signed delayed success/failure and out-of-order events use current provider state. A payment that arrives after its place was released is recorded as real test money requiring staff reconciliation; an occupied position is never taken automatically. A staff close action expires an open provider checkout before attempting release.

Transfers explicitly confirm the receiving litter's next available position, preserve all its occupied positions, and keep original payment amount/identity and transfer history. They create no second payment or credit. Assignment after birth atomically reserves the marked fictional puppy, associates the family, and records one credit application to the existing deposit ledger. Original payment time, amount, provider identity and original litter quote remain. Agreed puppy-price fields are added when a puppy is selected; the existing final-payment flow counts that one deposit and computes its remaining balance. If a puppy costs less than the existing credit, assignment blocks for an owner decision on the excess; no automatic refund or write-off is invented.

## Owner workflow

Start on Upcoming Litters → Ask Jeanne about reserving a place. The existing simple inquiry carries the litter through its private inquiry, family profile and conversation. Interest is free and does not hold a position. In the existing family details panel Jeanne records preferences, approves the displayed next position and prepares the deposit. The existing composer retains her message and receives the branded request. Email/SMS sending remains a separate explicit Send action; links can be opened/copied without messaging. Existing consent, transport and payment safeguards apply.

The same family panel shows all four positions and staff-only associated family names, processing/verified state, transfers and history. Existing places remain accessible after the litter becomes born/current. An isolated-test-only control can mark a fictional litter born to exercise selection; it never runs against real inventory. Selected puppy assignment then exposes the existing balance request in Add to message.

New branded litter requests use a versioned template so older sent email snapshots are unchanged. Customer payment/confirmation pages use the same account-free payment URL and Stripe Checkout. Litter wording never claims an individual puppy has been reserved. Test sends and automatic confirmation delivery stay disabled in the verification environment.

## Deployment and verification

Use a new exact isolated Preview alias, with new private test sign-in credentials. Production passkey origins, credentials, recovery, sessions and historical deployment containment remain unchanged. Only this newly verified synthetic alias may receive its narrow staff-path/protection exception; old review/payment aliases remain retired. No browser Basic Auth prompt should appear. Secrets must be configured privately, never in chat, source, logs or URLs.

Focused regression and provider/UI evidence, final alias, owner scenario and remaining production-release steps are appended to the release PR. Distinguish genuine sandbox Checkout/provider webhooks from signed local fixtures and any webhook replay used for duplicate testing.
