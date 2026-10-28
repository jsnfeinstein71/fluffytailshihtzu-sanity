# FluffyTail Shih Tzu — website copy

Prepared October 27, 2026. Complete proposed public-site copy, ready for owner review and implementation. This document has not been published to the website.

Reviewed against main `f7dd7aabe9832d7d1b0468d1d55a93cda5ab0ee3`, the live public pages, and all 23 puppy profiles linked from Available Puppies. Payment work may advance separately; use the latest implementation when applying its conditional messages.

## Voice and facts

FluffyTail should sound like Jeanne welcoming a family into a conversation. Use “we” for the household and business, “I” in Jeanne’s introduction, and “you” for the visitor. The first-person introduction below is proposed website copy, not a quotation from an interview.

The useful specifics are already here: Jeanne and Jason, their home in the Mobile area, the dogs who live with them, direct conversations, early socialization and potty-training work, written care records, and a starter kit with a blanket carrying a familiar scent. Lead with those rather than repeated claims about love, quality, or being a small breeder.

Keep prices, availability, names, colors, dates, and parent associations connected to Sanity. Braces in this document identify dynamic values, not text to publish literally. Current advertised pricing is $1,600 with a $400 non-refundable deposit applied toward the total; historical $1,500/$300 records remain valid. Do not hardcode current pricing into reusable copy.

No invented founding story, years of experience, credentials, health testing, guarantees, temperament assessments, adult weights, delivery services, or response-time promises. Do not draw on private health, financial, or family information for business copy.

## 1. Homepage — /

### Hero

Keep the existing photograph, FluffyTail Shih Tzu wordmark, and “Tiny Paws, Big Love.”

Primary button: **Meet our puppies**

Secondary link: **Meet Jeanne**

### Introduction

Eyebrow: **Shih Tzu puppies in Mobile, Alabama**

Heading: **From our home to yours.**

Body:

We’re Jeanne and Jason, and FluffyTail is part of our everyday life at home. Our Shih Tzus live with us as family pets, and raising their puppies means helping them get ready for a family of their own.

Take a look at the little ones below. When a puppy catches your eye, send Jeanne a message. You can ask about that puppy, talk through timing, and get to know the person you’ll be working with.

Link: **How choosing a puppy works** → /pricing

### Current litters

Eyebrow: **Meet the little ones**

Heading: **Our current litters**

Body: **See who’s here, who’s available, and who already has a family waiting.**

Availability count: retain the existing accurate singular/plural count.

No current litters:

**Looking for our next litter?**

We don’t have a current litter listed here. See what’s coming up, or tell Jeanne when you hope to bring a puppy home.

Link: **See upcoming litters**

### Upcoming-litter invitation

Eyebrow: **Not quite ready yet?**

Heading: **Let’s talk about your timing.**

Body: **You can start a conversation before you’re ready to choose. See our upcoming litters and tell Jeanne what you have in mind.**

Button: **See upcoming litters**

Keep the actual inquiry/reservation explanation on the future-interest form and pricing page, where the visitor makes that decision.

## 2. Meet Jeanne — /about

Page title / navigation: **Meet Jeanne**

Eyebrow: **The person behind FluffyTail**

Main heading: **Hi, I’m Jeanne.**

Lead:

Before one of our puppies becomes part of your family, I’d like you to know a little about ours.

### Our home, our dogs

My husband, Jason, and I share our home in the Mobile, Alabama area with our Shih Tzus. They’re our family pets, and the puppies we raise start their lives as part of that household.

If you’ve been looking through our litters, you may already have met names like Elsie and Penny. Behind those names are our own dogs, and behind every puppy listing is a conversation you can have directly with me.

### You’ll be talking with me

Choosing a puppy is personal. I want you to feel comfortable asking about the little one you’re interested in, what to expect before pickup, and what you’ll need at home.

You don’t need to have everything figured out before you get in touch. Tell me about your household, your timing, and the puppy who caught your eye. We can start there.

### A little piece of home goes with them

We begin socialization and potty-training work while the puppies are with us. They’ll still need patience, practice, and a routine as they settle into your home.

At pickup, your puppy comes with written vaccination and deworming records, CKC registration papers, and a starter kit with food, treats, toys, and a blanket carrying the scent of mom and littermates. A little piece of their first home goes with them.

### Let’s meet your next little companion

Have a look at our puppies, or send me a note if you’re planning ahead. I’d love to hear what you’re looking for.

Primary button: **Meet our puppies**

Secondary link: **Send Jeanne a message**

Portrait caption: **Jeanne · FluffyTail Shih Tzu**

Portrait alt text: **Jeanne smiling, wearing pink glasses and a teal shirt.**

Compact facts, if the existing aside remains:

- Mobile, Alabama area
- Puppies raised in our home
- Direct conversations with Jeanne
- Pickup arranged together

Implementation note: use Jeanne’s edited portrait in place of the current litter photograph on this page. Retain the established fonts, palette, responsive structure, and readable image proportions. The supplied portrait is a photo-edit proposal; its generated background is decorative, not a representation of the actual home. Do not label it “Jeanne at home.”

## 3. Available Puppies — /available-puppies

Eyebrow: **Meet our puppies**

Heading: **Available Puppies**

Lead: **Take a closer look at each puppy’s photos and details. If one catches your eye, Jeanne can tell you more.**

Status explanation, once beneath the introduction:

**Reserved puppies stay with their litter on this page, so you can still see all the little ones together. Check each puppy’s status before asking about a reservation.**

Change “active litter(s)” to **current litter(s)**. Keep counts and pluralization dynamic.

Litter price label: **Litter price**

Deposit label: **Deposit toward the total**

Pricing note: **See each puppy’s profile for the exact price. The deposit counts toward that total.**

Litter with no puppy entries: **Individual puppy details will appear here when they’re added. You can ask Jeanne about this litter in the meantime.**

No current litters: use the homepage’s empty-litter wording.

Archive heading: **Past litters**

Archive note: **A look back at our earlier litters. Prices and details below belong to those litters; see current puppies for today’s availability.**

Do not relabel historical Reserved puppies as Gone Home without record reconciliation.

## 4. Shared litter and puppy cards

Replace “Default puppy price” throughout public litter displays with **Litter price**.

Compact price sentence:

**Litter price: {price}. A {deposit} deposit counts toward the total. See each puppy for its exact price.**

Use **Mother** and **Father** instead of Sire and Dam in customer-facing cards. Show only actual parent records.

Keep **View puppy**, **Meet {puppyName}**, and **Ask Jeanne about pricing**. These are already clear.

Photo placeholder: **Photo coming soon**

Missing name: **Puppy details** rather than Unnamed puppy.

Date label: **Estimated ready date** rather than an unconditional promise. Preserve the existing date calculation. Add once where appropriate: **Jeanne will confirm pickup timing with you.**

## 5. Individual puppy profiles — /puppies/{slug}

Keep each puppy’s real name, photos, sex, color, litter, price, age, and status. The reviewed profiles do not contain meaningful individual personality notes to rewrite. Do not manufacture “cuddliest,” “calmest,” “great with children,” or similar claims from a photograph.

Litter label: **From {litterTitle}**

Pricing labels:

- **Total puppy price**
- **Deposit toward the total**
- **Balance after deposit**

Pricing note: **The deposit is non-refundable and counts toward the total price. The remaining balance is due before or at pickup.**

Missing-price note: **Ask Jeanne to confirm this puppy’s price and deposit before paying.**

Available / eligible inquiry button: **Ask Jeanne about {puppyName}**

Reserved notice: **{puppyName} is reserved. You’re welcome to ask Jeanne about another puppy or an upcoming litter.**

Other unavailable notice: **{puppyName} isn’t available for a new reservation. See our current puppies or ask Jeanne what’s coming up.**

Unavailable buttons: **See available puppies** and **Ask about future puppies**.

Preserve the canonical underlying status. Do not infer that a Sold puppy has physically gone home.

## 6. Upcoming Litters — /upcoming-litters

Eyebrow: **Planning ahead**

Heading: **Upcoming Litters**

Lead: **Not choosing a puppy today? Here’s what we’re looking forward to. Tell Jeanne when you hope to bring your little one home.**

Expected date label: **Expected around**

Date note: **Expected dates are estimates. Jeanne will confirm timing as the litter develops.**

Keep the real litter announcement, parent details, and dynamic pricing.

Inquiry heading: **Interested in this litter?**

Body: **Tell Jeanne which litter you’re following and a little about the home you have in mind. Asking now starts a conversation; it doesn’t reserve a puppy.**

Button: **Ask Jeanne about this litter**

Retain the current working future-interest destination unless contextual litter support already exists. Do not add an unimplemented query parameter or claim the litter is preselected when it is not.

No planned litters:

**Nothing announced just yet.**

If you’re planning for a future puppy, you can still tell Jeanne what you’re looking for and ask about timing.

Button: **Ask about future puppies**

Current-litter heading: **Already here**

## 7. Pricing & Process — /pricing

Eyebrow: **Choosing your puppy**

Heading: **Pricing & Process**

Lead: **Know what your puppy costs, what comes home with them, and what happens next.**

### Your puppy’s price

**Current and upcoming litters: {priceOrRange}**

Each puppy’s profile shows the exact price. Under our current direct-sale pricing, no additional taxes or fees are added to the advertised puppy price.

### Your deposit

**Deposit: {depositOrRange}**

Your deposit is non-refundable and counts toward your puppy’s total price. It is not an extra charge. Jeanne will confirm the puppy and next steps with you before you pay.

If a single validated current price and deposit apply, show this calculated example:

**{total} total − {deposit} deposit = {remaining} to pay before or at pickup.**

At the current published figures this is $1,600 − $400 = $1,200. Derive the values from the same quote; omit this example when ranges make it ambiguous.

### From your first message to pickup

**1. Find a puppy you’d like to know more about.**

Open the puppy’s profile and send Jeanne your questions. You can also get in touch about an upcoming litter.

**2. Talk it through with Jeanne.**

Ask about the puppy, your timing, and getting ready at home. Jeanne can explain the deposit and arrange a payment request when you’re ready to proceed.

**3. Reserve your puppy and plan pickup.**

Once your deposit is confirmed, Jeanne can confirm the reservation with you. A message or payment request alone does not reserve a puppy.

### Pickup and the remaining balance

The remaining balance is due before or at pickup. Pickup is normally arranged in Mobile, Alabama, or at the airport. Work out the time and meeting place directly with Jeanne before making travel plans.

### What comes home with your puppy

- A veterinary check, initial vaccinations, and deworming.
- CKC registration papers.
- Written vaccination and deworming records for your veterinarian.
- A starter kit with food, treats, toys, and a blanket with mom and littermates’ scent.
- Early socialization and the beginnings of potty training, ready for you to continue at home.

Your puppy is still learning. Plan for a patient routine and accidents as they settle in.

### Something you’d like to ask first?

Send Jeanne a message. You can talk through the details before deciding on a puppy.

Buttons: **Meet our puppies** / **Ask Jeanne a question**

## 8. Contact Jeanne — /contact

Eyebrow: **Let’s talk puppies**

Heading: **Contact Jeanne**

Lead: **A puppy caught your eye? Wondering about a future litter? Tell me a little about what you’re looking for, and choose how you’d like me to reply.**

Use the existing native form.

Below the form:

### You’ll be talking directly with me.

I handle FluffyTail’s puppy conversations here in the Mobile, Alabama area. Whether you’re ready to choose or just beginning to look, you’re welcome to ask.

Links: **Meet our puppies** / **Ask about future litters** / **FluffyTail on GoodDog**

Do not add a guaranteed response time, visiting hours, or a public home address.

## 9. Inquiry form and confirmation

General heading: **Say hello to Jeanne.**

General introduction: **Tell me what you’d like to know about our puppies or upcoming litters.**

Puppy heading: **Ask Jeanne about {puppyName}.**

Puppy introduction: **Tell Jeanne what you’d like to know about this puppy, and a little about the home you have in mind.**

Future-interest heading: **Let’s talk about a future puppy.**

Future-interest introduction: **Tell Jeanne your timing and what you’re looking for. This starts a conversation; it doesn’t reserve a puppy or guarantee availability.**

Keep field labels Your name, Email address, Phone number, Message, and How should Jeanne reply? Keep Email, Text, and Either.

General placeholder: **Tell Jeanne what you’d like to know.**

Puppy prefill: **Hi Jeanne, I’d like to know more about {puppyName}.**

Future prefill: **Hi Jeanne, I’m interested in a future puppy. Here’s what I have in mind:**

Submit button: **Send to Jeanne**

Pending: **Sending…**

Successful save heading: **Thank you — your message is saved.**

Successful save body: **Your inquiry is ready for Jeanne to review. You selected {contactPreference} for her reply.**

Render this only after the existing successful API response. Do not treat a saved inquiry as proof that an email or SMS notification was delivered. Keep authoritative duplicate-submission handling and any server-specific error messages.

Generic failed submission: **We couldn’t confirm that your message was submitted. Your details are still here. Please try again in a moment.**

Form loading failure: **The form couldn’t load. Please refresh the page and try again.**

Unavailable puppy: use the accurate profile notice; keep the existing block on submitting an inquiry for an unavailable puppy.

SMS consent, STOP/HELP disclosures, opt-in controls, and policy links: preserve the existing wording and behavior. They perform a different job from marketing copy.

## 10. Life with a Shih Tzu — /the-breed

Eyebrow: **Getting to know the breed**

Heading: **Life with a Shih Tzu**

Lead: **Small enough to fit beside you, with plenty of personality to fill the house. A Shih Tzu is a companion first — and bringing one home means making room in your daily life as well as on the sofa.**

### Company matters

Many Shih Tzus enjoy being close to their people. Think about your everyday routine and how much companionship you can offer. Every puppy has a personality of its own; a breed description is a starting point, not a promise about an individual dog.

### A small dog still needs a routine

Make time for gentle play, short walks, and patient training. Use praise and rewards, and keep learning sessions manageable.

### Make room for grooming

A long coat needs daily brushing. A shorter trim can make upkeep easier, but it still needs regular care. Talk with a groomer about a routine that suits your dog and your household.

### Take Alabama heat seriously

Shih Tzus can struggle in heat and humidity. Choose cooler times for outdoor activity and give them a cool place to rest. Ask your veterinarian about your dog’s needs.

### Thinking about your first Shih Tzu?

Talk with Jeanne about the puppy you’re considering and read our guide to bringing one home.

Buttons: **Meet our puppies** / **Getting ready for home** / **Ask Jeanne**

The shorter copy intentionally replaces the repeated temperament and “at a glance” paragraphs. Retain the established visual style; unused text blocks can be removed without rebuilding the page.

Further reading: [AKC’s Shih Tzu breed guide](https://www.akc.org/dog-breeds/shih-tzu/). This is breed information, not a claim that FluffyTail puppies are AKC registered; the purchase information correctly says CKC.

## 11. Getting ready for home — /puppy-resources

Eyebrow: **Your puppy’s next chapter**

Heading: **Getting ready for home**

Lead: **The bowls, the blanket, the first ride home — a little preparation lets you spend more time getting to know your puppy.**

### Before pickup

**Ask what your puppy is used to.**

Check with Jeanne about the food your puppy is eating and the routine to continue at home. Your starter kit includes food, so you’ll have some familiar things to begin with.

**Make a small, safe space.**

Move cords and chewable hazards out of reach. Have water, bedding, and a quiet resting place ready. Choose bowls, a suitable harness or collar, a leash, puppy-safe toys, and cleaning supplies.

**Plan the ride home.**

Confirm the meeting place and time with Jeanne. Bring a suitable carrier or restraint for the journey.

### In your puppy’s bag

Your FluffyTail starter kit includes food, treats, toys, and a blanket with mom and littermates’ scent. You’ll also receive CKC registration papers and written vaccination and deworming records. Keep the health records ready for your veterinarian.

### The first few days

**Give your puppy time.**

A new home is a lot to take in. Keep introductions calm and brief, with time to rest. If you use a crate, introduce it gently with positive experiences.

**Build on the beginning we’ve made.**

We start socialization and potty-training work before pickup. Continue with a predictable routine, patient practice, and rewards. Accidents are part of learning.

**Arrange veterinary follow-up.**

Bring the vaccination and deworming records to your puppy’s visit. Your veterinarian can plan further care and help you choose safe activities and introductions.

### Keep the practical details close

Before pickup, make sure you have the agreed meeting details, your puppy’s food information, and the care records. If a pickup detail is unclear, ask Jeanne before you travel.

Primary link: **Ask Jeanne a question**

Further reading: [AAHA’s guide to a puppy’s first days](https://www.aaha.org/resources/what-to-do-when-you-first-bring-home-a-new-puppy/).

## 12. Customer payment copy

Apply to the latest live-payment implementation being completed separately. These are words for existing verified states; they do not authorize changes to payment accounting or trigger new sends.

Request heading: **A payment request from Jeanne**

Deposit introduction: **Here are the deposit details for {puppyName}. Your {deposit} deposit is non-refundable and counts toward the {total} puppy price.**

Final-payment introduction: **Here is the remaining balance for {puppyName}. Once payment is confirmed, the total paid will be {total}, with {remainingAfter} left to pay.**

Email buttons: **View deposit request** / **View final payment request**

Payment-page button: **Continue to secure checkout · {amount}**

Unpaid request note: **A payment request does not reserve a puppy. Jeanne will confirm the reservation after the deposit is verified.**

Verified deposit: **Thank you — your {amount} deposit for {puppyName} is confirmed. Your remaining balance is {remaining}.**

Add **Your puppy is reserved.** only when the reservation record confirms that state.

Verified paid-in-full: **Thank you — {puppyName} is paid in full. Arrange the pickup time and meeting place directly with Jeanne.**

Payment still processing: **Your payment is still being confirmed. Please don’t pay again. You can refresh this page or contact Jeanne for help.**

Invalid or expired link: **This payment link is no longer available. Ask Jeanne for a current link before paying.**

Unconfirmed payment: **We couldn’t confirm a completed payment. If you just paid, contact Jeanne before trying again.**

Confirmation email accepted by Pair: **Your confirmation email has been sent to the mail provider. Check your inbox and spam folder.**

Email not sent: **Your payment is confirmed, but the confirmation email hasn’t been sent. Contact Jeanne if you need a copy.**

Help line: **Questions? Reply to Jeanne’s email or text.**

Keep test labels in testing. Do not put engineering terms such as “signed webhook” into ordinary customer copy. Do not promise email receipt based on provider acceptance.

## 13. Navigation, footer, and search previews

Navigation: **Our puppies · Upcoming litters · Pricing & process · Meet Jeanne**

Contact button: **Ask Jeanne**

Footer: **Tiny Paws, Big Love** / **Raised in our home in the Mobile, Alabama area.**

Resource link: **Getting ready for home**

Keep Privacy Policy and Terms & Conditions clearly named.

Suggested metadata descriptions:

| Page | Description |
| --- | --- |
| Home | Meet FluffyTail’s home-raised Shih Tzu puppies in the Mobile, Alabama area. Browse current litters and talk directly with Jeanne. |
| Meet Jeanne | Get to know Jeanne and the home behind FluffyTail Shih Tzu. Meet our puppies and learn what comes with them when they join your family. |
| Available Puppies | See FluffyTail’s current Shih Tzu puppies, photos, prices, and availability. Ask Jeanne about the puppy who catches your eye. |
| Upcoming Litters | Follow upcoming FluffyTail Shih Tzu litters and talk with Jeanne about your timing and a future puppy. |
| Pricing & Process | See current puppy pricing, deposits, what’s included, and how to arrange pickup with Jeanne at FluffyTail Shih Tzu. |
| Contact | Ask Jeanne about a FluffyTail puppy or upcoming litter. Choose an email or text reply and start a conversation. |
| The Breed | Learn about companionship, grooming, and everyday life with a Shih Tzu before choosing your puppy. |
| Resources | Prepare for your FluffyTail puppy’s trip home, starter kit, first days, and veterinary follow-up. |

Keep the existing title template so the business name is not repeated twice. Retain all established route URLs and canonical links.

## 14. Reviewed content that needs a different treatment

### Legal pages and SMS consent

Both legal pages and the SMS disclosure were read. Preserve their operative wording during this voice pass. Their purpose is accuracy and disclosure, not brand storytelling. Do not invent a new effective date; the currently displayed year comes from the clock rather than an owner-approved revision date. The already-tracked effective-date decision remains open. This is an editorial review, not a new legal audit.

### Sanity content

- `girl-1-1` still displays **Girl.1**. Proposed spelling correction: **Girl 1**. Keep its slug, status, price, and relationships.
- `girl-2-1` now displays **Cream and White** correctly on the live site. Do not repeat the earlier typo repair.
- The March 23 archived litter still says photos will be added when eyes open. Replace its public summary with: **Born March 23, 2026: seven puppies, two girls and five boys.** Preserve the original wording in revision history. This is stale announcement copy, not a reason to rewrite historic prices or statuses.
- Do not replace per-puppy descriptions with invented personality copy. When Jeanne supplies observations, edit those observations into short individual introductions.
- Homepage introduction and service-area text can come from Sanity. Updating a code fallback alone will not replace existing published CMS copy. Apply the new introduction through the actual content source or explicitly coordinate a narrow source change; preserve future CMS editing rather than masking it with an unconditional override.

### Jeanne’s story

The introduction above uses known facts. A future personal detail from Jeanne — how she first fell for Shih Tzus or something she enjoys about raising a litter — would make it more individual still. It is an enhancement, not a reason to leave the existing generic page in place or invent an origin story.

## Implementation handoff

Use the copy above as finished editorial material, not an instruction to generate another generic rewrite. Reconcile with the newest branch before editing because live payment and portrait work is proceeding separately.

Scope: public editorial copy, customer-facing labels and accurate conditional messages, metadata, Jeanne’s portrait, and the two identified stale/typo content edits. Preserve layouts, logo, fonts, routing, financial calculations, status truth, inquiry behavior, historical records, and working workspace functionality.

Map homepage text to `app/page.tsx` and its actual Sanity fields; Meet Jeanne to `app/about/page.tsx`; navigation/footer to `app/components/SiteChrome.tsx`; litter labels to the shared litter components; puppy labels/actions to `app/components/PuppyCard.tsx` and `app/puppies/[slug]/page.tsx`; the form to `app/components/InquiryForm.tsx` plus the existing server response source. Other page sections map to their named routes. Only change human-facing strings and the portrait reference unless a small conditional is required to keep the wording truthful.

Use the actual generated portrait supplied with this review, not a recreation. Store an optimized web asset without overwriting the original, preserve its proportions, and make sure mobile cropping retains Jeanne’s face and glasses. This copy package and portrait are review-ready; neither has been deployed by this review task.

Validate in the existing responsive layouts, check current and unavailable puppy states, and confirm that displayed prices still use Sanity. Reuse existing meaningful regression checks; update wording assertions where appropriate. Do not submit real inquiries, send messages, create payment requests, or change puppy reservations as part of copy verification.

## Source record

- [Repository snapshot used for copy review](https://github.com/jsnfeinstein71/fluffytailshihtzu-sanity/tree/f7dd7aabe9832d7d1b0468d1d55a93cda5ab0ee3).
- Live review: homepage, Meet Jeanne, Available Puppies, Upcoming Litters, Pricing & Process, Contact, general inquiry, The Breed, Puppy Resources, both legal pages, and all 23 profiles linked from Available Puppies. Source review also covered contextual inquiry states, shared components, metadata, and payment-success copy. No customer records were read.
- Business facts: owner-confirmed project handoff and subsequent conversation. No private personal biography was repurposed.
- General care references checked October 27, 2026: [AKC Shih Tzu guide](https://www.akc.org/dog-breeds/shih-tzu/), [AAHA puppy first days](https://www.aaha.org/resources/what-to-do-when-you-first-bring-home-a-new-puppy/), [AAHA puppy life stage](https://www.aaha.org/resources/puppy-life-stage/), and [AVMA selecting a dog](https://avma.org/resources/pet-owners/petcare/selecting-pet-dog). Advice is general; no veterinary schedule or individual health guarantee is introduced.
