# Availability and education review — Preview only

This branch continues main `f81fa5a` (the AKC removal is already published). Do not merge or publish the new copy until the owner reviews it in the discussion chat. No Production environment, CMS, photograph, customer, financial, staff-authentication or reservation changes are authorized here.

## Review guide

Open the hosted branch Preview. The review-only bar selects Current published records, Puppy available, All reserved/upcoming places available, Upcoming positions occupied, No litter announced, or Availability data unavailable. Selection now applies immediately, without a separate View scenario submission or document reload. The bar shows Applying until the server-rendered invitation, buttons, card labels and positions have committed, then identifies the Active scenario. The fictional fixtures live in memory only and carry `review-` IDs. The selection cookie and explicit polling scenario are only honored when both VERCEL_ENV=preview and FLUFFYTAIL_PUBLIC_REVIEW=1. Controls and scenario routes are inactive in Production. Return to Current published records before assessing real photographs and configured pricing.

The original selector only changed a native form field and required the separate View scenario button. Earlier verification clicked that button, missing the change-only failure reported by the owner. The corrected client applies the review cookie with a same-origin POST and refreshes the React server payload in place. Availability context is committed with the server cards rather than painted separately. Position panels remount on changed scenario/board snapshots. Polling pauses during selection and explicitly pins its review scenario, so an old request or another tab's cookie cannot replace a selected fictional view with live data.

Scenarios affect the homepage, puppy list and Upcoming Litters availability. The bar explains that educational copy stays the same while its inventory illustration/pricing can vary. Switching on an individual puppy or inquiry returns to the puppy list rather than applying a fictional identity to a real record. Shortcuts in the bar reach the three main review pages. All of this is Preview-only; no record is edited by selection.

The committed page also reports its scenario to the review bar. This keeps the Active label correct when Next.js reuses the root layout during puppy-profile-to-list navigation; otherwise the cards could update while the bar kept its old server prop and timed out.

The live review reads published public Sanity inventory and the existing four-position public API. It has no operational credentials. New branch-scoped Preview variables are only the public project/dataset and the review/write-freeze flags. Forms explain that submissions are disabled; the existing server write freeze remains active. No test email, text, charge, inquiry or reservation is needed.

Homepage identity and “I am Jeanne” are unchanged. The hero action and lower invitation follow actual availability. Available Puppies keeps all current portraits/statuses; Upcoming Litters keeps its positions, corrected phone card and pricing dialogs. Reserved puppy pages point toward the current offering. Occupied positions include Pending deposit; they are never presented as available. Missing/incomplete data gives a confirmation invitation instead of invented unavailability.

Production-style inventory continues its existing 60-second revalidation. The read-only review bypasses inventory caching to show current records during review. Invitations recheck every 30 seconds; a changed public-inventory fingerprint also refreshes the server-rendered cards without discarding browser scroll position. Position indicators keep their existing 15-second refresh. A failed refresh switches to uncertainty rather than keeping an old positive offer. Tests change isolated status/board fixtures through the actual availability handler without any CMS writes, including swapping which puppy is available while the available count stays the same.

## Educational drafts

The full drafts are rendered in the existing `/the-breed` and `/puppy-resources` pages. They cover companionship/household fit, routines, coat care, heat/dental habits, supplies, safe space/transport, confirmed take-home items, settling in, realistic toilet-training expectations, selecting a puppy, upcoming selection order and agreed pickup arrangements. No new section, photos, guarantees, medical schedule or invented Jeanne biography/practice is introduced.

General care is labeled separately from confirmed FluffyTail items. Existing approved benefits are retained. Footer links say Living with a Shih Tzu, Getting ready for home, and Choosing a FluffyTail puppy and lead to existing pages. The main navigation stays stable. No replacement external links have been added.

Owner-specific details deliberately omitted: exact current food/amounts and daily schedule, puppy-specific veterinary follow-up dates, and any special travel arrangement. These can be supplied directly per family; they are not barriers to reviewing the draft. No promises of full house-training, insurance, financing, platform benefits or new support services.

## Research and external-destination review

Recommended supporting references (research sources, not automatically added visitor links):

- Cornell, [Summer heat safety tips for dogs](https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/summer-heat-safety-tips-dogs): heat precautions and warning signs relevant to Alabama.
- Cornell, [Dental disease and home dental care](https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-information/dental-disease-and-home-dental-care): brushing, safer chewing and veterinary care.
- Cornell, [Brachycephalic Obstructive Airway Syndrome (BOAS)](https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/brachycephalic-obstructive-airway-syndrome-boas): includes Shih Tzus; optional deeper breathing-health information.

All three were inspected through their content on a 390px mobile viewport during the preceding read-only review. No puppy-shopping prompts, display ads or intrusive promotional popup was observed; the shared navigation has Membership & Giving, Donate and Shop Riney links. Dental also links to the Veterinary Oral Health Council product list. These observations are limited to the inspected sessions; third-party destinations can change.

The existing AAHA destination, [What to do when you first bring home a new puppy](https://www.aaha.org/resources/what-to-do-when-you-first-bring-home-a-new-puppy/), was inspected again on mobile. It is readable and has useful supervision, calm settling-in and reward-based routine material. It includes Advertisement slots, newsletter signup forms and professional-association navigation. No prominent buy/find-a-puppy prompt or intrusive popup was observed. Not every ad creative rendered; advertising may vary by visitor. The existing link is retained for owner discussion, not newly recommended as a distraction-free destination.

Additional research, not proposed external links: [RSPCA puppy care](https://www.rspca.org.uk/adviceandwelfare/pets/dogs/health/puppycare), [AVSAB socialization statement](https://avsab.org/resources/position-statements/), [PDSA Shih Tzu care](https://www.pdsa.org.uk/pet-help-and-advice/looking-after-your-pet/puppies-dogs/small-dogs/shih-tzu), and USDA [Preventing matted hair](https://www.aphis.usda.gov/sites/default/files/AC-Aids-for-Dogs_Coat-Care-Preventing-Matted-Hair_0.pdf). PDSA has insurance promotion, and rescue/rehoming organizations can have adoption navigation; these are supporting research rather than visitor-facing recommendations. Original prose summarizes practical guidance without copying articles.

## Photograph workflow: investigation only

Main Image supplies the original photo/normal fallback and Studio thumbnail. Gallery is stored but not projected/rendered publicly. The three approved transparent 1254px RGBA exports are unchanged website files in `public/puppies`: elsie-girl1-profile.png, elsie-girl2-profile-v2.png and elsie-girl3-profile.png. `lib/puppy-portraits.ts` matches each exact puppy ID and original Main Image URL. Cards, details, inquiry previews and shares use that guard. Replacing Main Image with a different asset disables the old cutout; it does not generate a new one. Re-selecting the same asset retains it. Crop/hotspot edits are not included in public queries and do not change the displayed portrait.

The PNG contains the approved mask/fades; the site fits it without cropping, leaves its background transparent and supplies a separate soft brown CSS shadow. Ordinary cards can crop photos to their frames. To replace a normal image, select the correct Sanity puppy, upload Main Image and publish. To retain the approved cutout treatment, prepare a transparent square PNG (matching the existing 1254x1254 exports), retain the PSD, then have a developer add the asset, update the ID/source mapping, deploy and verify cards/details/inquiry/share image. New puppies currently need a new mapping entry.

Smallest future improvement: one optional Sanity “Website portrait — transparent PNG” field, reusing the existing cutout presentation. It would remove per-puppy mapping/deploy work while keeping Main Image as the original. It would not remove backgrounds automatically. No field, image, mapping or workflow change has been made in this review.

## Sanity API readiness

See `docs/sanity-content-api.md`. The existing CLI login was reused locally. Authenticated Production reads succeeded, and the current account's project Administrator role explicitly grants dataset read/write. That is non-mutating permission evidence; actual Production writes remain untested and unauthorized. No new token or owner action is needed for reads. No credential is deployed to the review Preview.
