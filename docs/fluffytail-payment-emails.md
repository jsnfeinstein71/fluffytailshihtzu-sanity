# Branded payment emails — October 27, 2026

Preview only, extending `5ce3556` on PR #8. The owner confirmed real receipt of the earlier deposit email and successful Stripe test deposit Checkout. Existing customer payment pages and Checkout are approved and unchanged. Production remains separate; do not merge or publish this phase to Production. Stage 2 remains paused.

## Presentation and everyday use

The four reusable templates are deposit request, final-payment request, deposit confirmation and paid-in-full confirmation. They use the approved logo (a PNG export of the existing SVG), brown `#58493D`, champagne `#D8BD9D`, ivory, Georgia/Times headings and Arial/Helvetica body fallbacks. Email-safe tables, inline backgrounds/text colors, a visible text brand name, image alt text and responsive sizing retain readable content with images disabled and on dark backgrounds. Rendering in individual email clients may vary; a browser preview is not an inbox-client delivery test.

Requests use the current composer message and the saved payment facts. The message remains editable and Send still saves automatically, checks the existing immutable review, claims the existing outbox and submits once. A separate optional **Preview formatted email** opens a dialog showing the current unsaved text without sending, saving or changing it. Mobile width, images-blocked, dark-background and plain-text views are available. Long legacy pasted payment URLs become descriptive links in HTML; the plain-text alternative keeps a usable URL. The brown button points to the existing accountless `/pay/{token}` page. There is no email checkout form.

The optional **Payment email templates** section in Email options previews all four formats and saves a per-family personal note for future automatic confirmations. It does not change existing confirmation snapshots or the current compose/reply draft. Concurrent note edits use a base-value and revision check. Saving a note does not send; unchanged default notes require no extra step. Confirmations still originate only from the signed, verified test-payment ledger, once per Checkout session. Their amount/paid/balance facts use that payment's immutable ledger snapshot. New confirmation text is frozen when prepared, including through failure and explicit retry; historical plaintext confirmations remain unchanged.

Pair receives multipart HTML and plain text with the same Jeanne From/Reply-To, recipient, Message-ID, reply headers, envelope and TLS protections. HTML is generated server-side from escaped text and checked payment facts, never accepted from a browser. Snapshots are validated before sending. SMTP acceptance continues to mean delivery unconfirmed. Failure/uncertainty/deduplication controls and future-only matching replies remain in place. SMS stays plain text.

## Verification and limits

229 passing offline application/adapter tests cover all four templates, MIME alternatives, escaped edits, safe customer URLs, exact headers, saved-draft preservation, confirmation-note conflicts, immutable retry content, historical plaintext records, tampered snapshot rejection and existing payment/thread/deduplication/consent behavior. These provider results are fixtures, not claims of new Pair delivery. TypeScript passes; lint has zero errors and the same 16 existing image warnings. Build and hosted visual results are recorded in the final checkpoint below.

No development email/SMS is sent, no new payment is completed, and no historical mailbox import runs. Existing Preview provider configuration, owner-recipient restrictions and TEST labeling remain. DjinX's deposit and original request/confirmation records are preserved. The next legitimate owner action is the $1,200 final-payment request, left unsent for owner review. A later owner send is needed to assess formatting in the recipient's actual email app. The existing Stripe test account expires November 2, 2026.

## Hosted checkpoint

Pending deployment and visual verification on the existing stable test alias: https://fluffytail-payments-test.vercel.app/inbox/workspace. Sign in with the existing branded staff form; credentials and sessions are unchanged.
