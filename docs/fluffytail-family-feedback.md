# Invitation-only family feedback — review release

Status: owner authorized completion and Production release on November 20, 2026, after the Preview review. The earlier review-only boundaries below describe the completed Preview phase. Based on main `3ae4605`; preserves the portrait, payment, passkey, communications, family-management and availability work already published.

## Production release follow-through — November 20

The owner instructed: “its our clients, we don't need permission, see this through to completion.” This authorizes completing and releasing the feedback feature. No customer permission checkbox or separate permission-request step is added to invitations. The form retains the straightforward notice that the submitted story/display name/optional photograph may appear on FluffyTail. Internal approval remains required before publication.

Production configuration adds only `FLUFFYTAIL_FEEDBACK_ENABLED=1` and a separately generated sensitive `FEEDBACK_INVITATION_SECRET`. The existing production operational client, live namespace, public domain and passkey protection remain in use. The synthetic Preview configuration and fictional records remain separate. No mail/payment settings or existing credentials are changed.

Fresh release verification ran the complete suite: **406 passed, 2 skipped, 0 failed (408 total)**; type checking passed; lint reported 0 errors and 16 existing warnings. GitHub verification for the implementation/review head also passed. Production deployment and live smoke-check evidence are recorded on PR #46 when completed.

Live staff verification requires an owner passkey session; the current cloud browser reaches the correct protected unlock screen. No recovery credential, bypass session or replacement passkey is created for testing. A real invitation delivery test has not occurred and must not be described as proven by fictional transport tests. Real family invitations remain deliberate staff actions.

The Good Dog migration is still distinct from feature release. The terms inspected during release retain the copying/collection restrictions described below; the owner's customer relationship does not itself establish authorship of customer-written content. No Good Dog story has been imported or published in this release. Original material supplied directly by the owner/author can be processed through the existing private import helper with accurate provenance; uncertain rights must not be recorded as confirmed facts.

## Review addresses and records

- Staff entry: `https://fluffytail-feedback-test.vercel.app/inbox/access`
- Public collection: `https://fluffytail-feedback-test.vercel.app/our-families`
- Customer form: `/feedback`, accessible only through a valid private invitation.
- Isolated storage: `gu1xkpsg`, dataset `synthetic`.
- New fictional families: **Casey Review — TEST** and **Robin Review — TEST**. Existing Rowan/Juniper, payment tests and conversations are preserved.
- Email/SMS sending and mailbox synchronization are disabled in this Preview. No Stripe credentials or payment activation are added.

## Staff workflow

1. Select a family and choose **Invite feedback**. Review the prepared message in the existing composer. Personal text and attachments remain intact. Creating or attaching an invitation does not send it.
2. Use the existing deliberate Send action after release. The email contains a branded **Share your feedback** button and a plain-text alternative; SMS keeps the existing consent and delivery checks. In this review Preview, use **Open feedback form** or **Copy invitation** in the private invitation history instead of sending.
3. Open **Feedback** in the workspace sidebar. Invitations/delivery attempts and received stories have separate states. Review the untouched original and optional photo, then edit the separate public excerpt/display name if needed.
4. Choose Publish, Keep private or Unpublish. Feature and order controls determine homepage presentation. Publication changes record the staff identity and timestamp. Archiving the family does not change publication; feedback records block permanent family deletion.

Invitations expire after 30 days. Preparing the same active invitation supports a deliberate resend; reissuing revokes the previous unused link. A submitted invitation cannot produce a second submission. Delivery acceptance is not described as confirmed delivery.

## Storage and access evidence

Fresh read-only checks on November 20 confirmed both relevant Sanity datasets are public. Anonymous access returned zero private dotted-ID documents, including a query for an exact known private ID. Authenticated counts were 157 private documents in synthetic and 135 in production at the pre-test checkpoint. Normal Sanity image asset URLs returned HTTP 200 anonymously (5 synthetic assets, 72 production assets).

Therefore this feature does **not** upload originals to Sanity's public asset CDN. Invitations, originals, family associations and provenance use authenticated-only `private.*` documents. Original images are stored inline in those private documents and served only through authenticated staff routes. Uploads are limited to 2.5 MB JPG/PNG/WebP and 20 megapixels. Images are decoded, oriented/resized and re-encoded using Sharp; the public JPEG has no original EXIF/GPS metadata. No generative image alteration occurs.

Only an explicit publication transaction creates the minimal `familyStory` public document: public text/name, optional puppy name/date, display order/feature setting, publication time, and the prepared image derivative. No family/contact/source/token fields are copied. Unpublishing removes that projection; its image endpoint then returns 404. Public reads bypass the Sanity CDN and page/image responses do not persist stale published copies. Previously downloaded public material cannot be recalled.

Invitation secrets are in the URL fragment and are removed from the address bar after the form reads them. The server receives them only in same-origin POST bodies, not query paths or referrers. A private HMAC-bound invitation and saved token hash validate the correct environment/family, expiry, revocation and once-only submission. Originals are never replaced by edits to a public excerpt. Family revision guards coordinate new records with deletion.

The previously paused historical privacy migration remains separate and unchanged. This feature does not assert that legacy operational records have been migrated.

## Existing Good Dog feedback

The existing FluffyTail profile was located at `https://www.gooddog.com/breeders/fluffytail-shih-tzu-alabama`; it reports 10 owner stories. No original reviews, photos or family matches were copied into this Preview or published.

The current [Good Dog terms](https://www.gooddog.com/terms-of-service), sections 3.10.20–3.10.23 and 4.3–4.4, restrict commercial copying/collections and distinguish content ownership. No permitted export or reuse authorization was available. Being the subject of a customer's review does not establish ownership of their text/photo. This is the specific import blocker, not a technical failure.

Practical paths:

- Invite an existing known family through FluffyTail to submit its own feedback/photo directly.
- Obtain a permitted source export or a copy supplied by the author with reuse permission. Record the original wording, displayed date (leave unknown dates unknown), attribution, original source ID/URL and permission evidence. Import into private review first; never match to a family by name alone. The import helper deduplicates by source/source ID and rejects attempts to overwrite a different original.

The homepage testimonial link now stays on FluffyTail. The unrelated Contact-page **FluffyTail on GoodDog** referral link is inventoried and left unchanged. Stored Sanity GoodDog URL fields are not edited.

## Configuration and release boundary

Branch-only Preview configuration: `FLUFFYTAIL_FEEDBACK_ENABLED=1`, `FLUFFYTAIL_FEEDBACK_PREVIEW=1`, exact `FEEDBACK_PUBLIC_ORIGIN`, dedicated `FEEDBACK_INVITATION_SECRET` (at least 43 characters), synthetic project/dataset and its scoped write credential. Preview staff access uses the existing branded sign-in/session flow with owner-set branch-only credentials. Secrets are not committed or reported.

The deployment-protection exception is limited to the feedback review alias/branch. It permits the customer-facing review form to open while staff routes retain the branded private session gate. It does not reopen historical production deployments, restore old production credentials, or replace production passkeys.

Production remains unchanged. A future approved release would enable the feature against the existing production operational client, use an independent invitation secret and the real public origin, and retain passkey staff protection. The Preview no-send switch must remain restricted to review deployments; it is not a replacement for production message safeguards.

## Verification

Checked the hosted Preview through `1b3c6b1` on November 20, 2026. Automated checks: **408 tests passed**, TypeScript passed, ESLint had **0 errors and 16 existing warnings**, and the Vercel build succeeded. The tests use isolated records and fictional providers; they do not demonstrate real invitation delivery.

Hosted results:

- The owner completed a fresh sign-in using the branded Preview entry screen. The private workspace opens through the owner-facing alias; this check did not rely on a developer's old session.
- Casey's fictional customer feedback and uploaded photo persisted. Private feedback/original-photo access and the minimal public story/photo separation were checked. After Unpublish, the actual public photo endpoint returned **HTTP 404** with **Cache-Control: no-store**. The story was then republished through the staff controls and the untouched original was confirmed again.
- Robin's personal email text followed immediately by **Invite feedback** saved without a false conflict. After refreshing, the personal text and approved invitation wording remained in the branded preview. The Send control stayed disabled; no message was submitted.
- At **375 px** phone width, the Feedback area, family conversation and Details panel were exercised through the visible controls. The invitation form and public story/photo presentation were reviewed at phone and desktop widths. Page scroll widths were **360 px at a 375 px viewport** and **1,425 px at a 1,440 px viewport**, with no horizontal overflow. Desktop staff and full-page mobile story screenshots were captured.
- Permanent family deletion was blocked with an explicit feedback-history explanation. Archiving only the new fictional Robin family retained its published story; Robin was then restored and its drafts were confirmed intact. No preserved test family was archived or deleted.
- The **194 pre-existing synthetic records remained unchanged**. Tests used only the two newly created feedback-review families and their linked records. Production customer, payment, reservation and staff-access records were not changed.

Three concrete browser findings were corrected and rechecked: opening a different invitation in the same tab now clears the previous invitation's form state and ignores stale responses; native browser `fetch` is bound to its window instead of the options object; and an invitation save queued behind autosave advances only through revisions confirmed by that same browser. Real other-tab edits still produce a conflict, and clearing a sent draft cannot overwrite newer writing.

The positive email-handler regression exercises save → review → dispatch with the fictional provider, checks HTML/plain-text alternatives and reply threading, and confirms a repeated dispatch produces only one accepted attempt/receipt. Its status remains **delivery unconfirmed**; acceptance does not mark the invitation submitted or publish a story. Revoked, expired and wrong-family invitations are rejected at send time, including pasted links. Preview email/SMS sends and mailbox reads remain disabled regardless of provider settings.

No customer send, payment, reservation change or historical import is part of this review. Actual Pair/Twilio invitation delivery and any production enablement remain outside this phase's authorization.
