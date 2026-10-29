# Voluntary price and inclusions detail — October 29, 2026

Owner authorized Production release from latest main `e29d552`. Preserve approved browsing copy/analytics removal, branding and images, operational services, passkeys, customer history, payments and four-place reservations. No messages, payments, customer changes, reservation offers or migration during this phase.

## Implementation

One `PriceDetails` component serves individual puppy pages, current-litter pricing on Available Puppies, upcoming-litter pricing, and the current/upcoming `LitterTile` variant. Historical litter tiles retain their prior price presentation. The visible summary uses the configured amount and deposit, followed by View price & what's included. Puppy-card inquiry/detail navigation and the existing litter-aware inquiry and reservation display remain.

The branded ivory/brown/champagne dialog uses the existing Acumin/Cormorant web fonts. It mounts only after explicit activation, in the document body's native modal top layer. Closed browsing contains no modal policy text and no automatic popup. Native modal focus/inert behavior, a 44px Close control, Escape, scroll locking/restoration and focus return to the original trigger support keyboard and small-screen use. The long dialog scrolls internally, with Close sticky at the top. No provider call, payment or reservation action belongs to opening it.

Details show the deposit applied toward price, the established balance payable before or at pickup and total price. For a litter, the balance is explicitly based on its current price and Jeanne confirms the selected puppy's price/balance. Upcoming details explain picking order, no guaranteed sex/color/litter size, and transfer to the next available future position without displacing existing families. The owner-approved non-refundable explanation is confined to the opened dialog; existing payment-request and pre-checkout disclosures remain unchanged.

The six approved direct-sale benefits are veterinary check; initial vaccinations/deworming; CKC papers; written vaccination/deworming records; starter kit with food/treats/toys/scented blanket; and early socialization/initial potty-training work. No financing, insurance, protection, training-program, full house-training promise or added guarantee is introduced.

## Pricing and actual source

Presentation uses the existing strict cents validation and puppy override precedence. It never changes checkout math or stored quotes. A separately configured optional litter `pricingStatus` supports established, estimated and unset display, projected through the real public inventory queries. Blank legacy status retains an existing valid established price. A valid individual puppy override is established independently of an estimated litter default. Estimated/unset totals, missing deposits and invalid/inconsistent data never produce an invented final balance. Known deposits may still be displayed with an unconfirmed total.

Read the actual published Production inventory: existing real litters have numeric configured prices/deposits and no estimate label; all remain unchanged. No CMS mutation is needed. The optional schema field affects future editorial display only; no default is written to records or financial history. Private public-document and record-revision backups are retained under `C:/Users/jlcfe/AppData/Local/FluffyTail/PriceDetailsRelease`.

## Verification

343 regression tests pass, including configured cents/overrides, missing/estimated/unset/inconsistent pricing, closed-summary policy absence, approved benefits, upcoming transfer/no-guarantee wording, real query projection and existing payment disclosures. Typecheck passes; lint has zero errors and the same 16 image warnings. Existing visible-copy assertions were updated for the deliberate compact summary; financial response/balance assertions remain.

Before release, a write-frozen local app used published inventory read-only. Keyboard Enter opened the native modal with Close focused; Escape closed it, restored scrolling and returned focus. The puppy quote was $400 / $1,200 / $1,600. Upcoming details showed the correct picking-order and transfer terms. At 390×844, the panel is 358px wide, fits the viewport and scrolls internally with Close accessible. Mobile button activation and Close work; no claim is made that physical iPhone/Android hardware was tested. Direct low-level touch injection is unavailable in this browser tooling, so native controls and responsive activation were verified without inventing a hardware result.

Release PR records required checks, deployment identity, live desktop/mobile examples, modal behavior and read-only preservation proof. Do not create estimated/unset real records merely to demonstrate those fixture-tested states. Keep the completed isolated reservation Preview available and migration paused.
