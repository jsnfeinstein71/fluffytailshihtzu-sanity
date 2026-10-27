# Customer-facing payment journey — isolated owner test

This phase extends Preview PR #8 only. Production stays on main `4a203e8`, with its configuration, routing, customer records and inventory unchanged. Existing completed Poppy and Verification Clover payments are preserved. Stage 2 remains paused.

## Prepared scenario and workflow

At https://fluffytail-payments-test.vercel.app/inbox/workspace select **DjinX — TEST CUSTOMER**, associated with **DjinX Daisy — TEST PUPPY**. The approved owner-controlled email/phone are stored only in the private synthetic records and Preview secrets, not this repository. Price $1,600; non-refundable deposit $400 applied to the price; final balance $1,200. The fresh family starts unpaid, with no messages sent and SMS consent unset.

From Conversations, request the deposit and insert its public payment link into email or text. Existing unfinished text and the email subject are preserved, the inserted message is editable, and Send uses the existing saved-draft/durable-attempt workflow. Copy/open remains independent of sending. After the verified deposit, the next payment action automatically becomes the final balance. After $1,600 is verified, the panel shows paid in full and blocks another request. Full payment leaves the fictional puppy Reserved, never Gone Home.

Customer payment links open the approved branded payment card without a staff or customer account. They show Jeanne/FluffyTail, puppy, total/requested/paid/remaining amounts, balance after the proposed payment, deposit terms and contact/next steps. Checkout returns and cancellation stay on that public payment page, never the private workspace. A URL parameter cannot confirm payment. Pending payments ask the buyer to wait rather than pay twice; expired/unavailable links give a contact option. Reopening a paid link shows its verified confirmation with no checkout action. Expired Stripe sessions can be replaced through the normal staff request action.

## Communications and confirmations

Only the owner-approved contact pair can activate test communications. Preview-only recipient settings are additionally bound by a contact-pair hash; other saved families remain blocked. Separate test credential names prevent inherited Production fallback. Pair uses its existing secure adapter, Jeanne's From/Reply-To and the one-recipient allowlist. Email threads receive a future-only mailbox watermark before their first send. Only matching sender/recipient/Message-ID replies enter the test family, with idempotent private imports. No historical email import or setup send is authorized.

Payment confirmations are sent by **Jeanne's Pair email adapter**, through the existing persistent outbox after a signed test callback has committed the ledger. Each checkout has one immutable confirmation identity and recorded attempts. Duplicate callbacks never resend it. Uncertain attempts are retained for review, and explicit rejection can be retried by staff. Confirmations include the amount, cumulative paid, remaining, reservation/pickup next steps and public receipt link. Drafts are untouched. SMTP acceptance remains delivery-unconfirmed; the customer's actual inbox receipt must be checked by the owner. Stripe sandbox receipts are not assumed to be automatically emailed: https://docs.stripe.com/receipts#test-receipts.

## Approved SMS routing exception

The owner explicitly approved: “Allow my test replies to pass through the existing live SMS route, accepting those Production test records.” The Preview-only SMS gate is enabled for that approved number. Production configuration and routing stay unchanged. The existing Production inbound handler will retain those owner test replies and may send its existing acknowledgment; this is the expressly accepted exception to test-record isolation. No other production/customer records are changed, and no message was sent during setup.

The test SMS adapter and existing composer require the exact approved family, an explicit recipient consent checkbox recorded with wording/time, the latest inquiry's consent and opt-out rechecks. After the first owner send, scoped provider reads import only this approved number's new replies into the private test family, once, and refresh only saved message delivery states. Twilio's own STOP enforcement is retained. The adapter uses separate Preview credentials and never changes number/service webhook routing. This permission does not authorize messaging anyone else or importing other correspondence.

## Verification

222 application-handler tests pass (eight new customer-journey tests): accountless public projection; editable email request and no settlement from sending; signed deposit and final callbacks; matching email reply import once; per-payment confirmation claims and duplicate handling; rejected/uncertain confirmation recovery without draft loss; cancel/pending/expired/paid reopening and expired checkout replacement; signed delayed-payment failure and explicit provider opt-out rejection; recorded SMS consent, future scoped reply imports, delivery status and STOP blocking; wrong-recipient and activation failure guards. These provider results are explicit local fixtures, not claims of real delivery.

Actual Stripe test Checkout/signed-provider accounting was already verified in the preceding phase and then confirmed by the owner on Poppy. This phase sends no live setup email/SMS and makes no new paid checkout that could trigger a live confirmation. Hosted UI/public-page and final deployment evidence will be appended after verification. Owner testing must confirm actual email/SMS receipt and reply on the authorized devices; sandbox expiration remains November 2, 2026.


## Hosted verification checkpoint

Deployment `47fa75f` was tested on the stable alias. Existing staff sign-in survives refresh. A separate temporary unpaid page-check family was used so DjinX still has zero requests/payments/messages. Its public link returned HTTP 200 without cookies; the public status exposes only payment/puppy information. Mobile rendering had no horizontal overflow or private staff links. The real Stripe Sandbox checkout displayed FluffyTail, Jeanne and the exact $400 amount/terms. Stripe's standard declined test card produced an actual decline; cancel returned to the public unpaid request with a clear explanation, no ledger entry and no confirmation email.

UI insertion retained the custom unfinished subject and message while adding the editable link. The fixed conversation columns and bounded composer stayed in place. Pair authenticated to IMAP from the hosted application through the existing future-only watermark action, importing zero messages; local SMTP authentication also passed using the same encrypted credential, without sending. Actual SMTP submission/delivery and phone receipt remain the owner's explicit test steps.

The separate Stripe test webhook now includes completed, delayed success, delayed failure and expiration events with the existing dedicated signing secret unchanged. A signed unpaid failure/expiration never records payment or reserves a puppy; it disables only that request and allows a replacement. The approved SMS routing exception and final gate activation are included in the next Preview deployment. No setup messages or production changes have occurred.
