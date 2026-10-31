# Puppy profile photography pilot — October 27, 2026

## Penny litter recovery — October 31, 2026

The owner requested recovery of the interrupted Puppy Photo Workflow and
completion of its authorized export/publication. Seven finished Adobe PNGs were
recovered: Audrey, Connie, Diane, Hugo, Janet, Klaus and Luis. Connie uses the
corrected `transparent-v2.png`; the other six use `transparent-v1.png`.
All are 1254 × 1254 RGBA exports. Their approved masks, retained hands and wrist
fades are preserved; editable masters remain in Adobe.

The original PNG bytes were staged as Sanity image assets, without adding
duplicate binaries to this repository. The scoped publication sets each
matching puppy's `mainImage` to its own asset using document revision guards.
The seven fields were published atomically in transaction
`AQEGaVBj9U2U0n0Irc54QL`; readback confirmed every expected asset reference and
all unrelated fields unchanged. Puppy status, pricing, reservations and other
records are preserved. Public release verification follows the code deployment.

`lib/puppy-portraits.ts` associates each exact puppy/asset pair with the existing
transparent portrait presentation. Cards, detail pages, inquiry thumbnails
and social images reuse those CDN originals. The existing width-only Sanity
variants provide responsive delivery without cropping or adding a background.
The separate website shadow and approved layouts remain unchanged. A later
CMS photo automatically supersedes this treatment through the source guard.

| Puppy | Puppy document | Approved export | Sanity asset SHA-1 |
| --- | --- | --- | --- |
| Audrey | `98cce32b-4bbc-4d7a-a934-f8a74128b167` | `penny-2026-10-31-audrey-transparent-v1.png` | `c27a1020b482919d99c0041e1003d346f8262868` |
| Connie | `b6f038ba-f581-4373-9451-0e3b7f41d46e` | `penny-2026-10-31-connie-transparent-v2.png` | `573e48baf9d144e2b39fb43ccec95396d9cab604` |
| Diane | `293b3662-1b69-4f9c-bf0c-26131fe942ad` | `penny-2026-10-31-diane-transparent-v1.png` | `ea309af20e7d513689e95e6e7ea4bf511f8c60f6` |
| Hugo | `d77aee5f-0007-459a-b265-14a7de70a0e4` | `penny-2026-10-31-hugo-transparent-v1.png` | `7b91b77629b3355b3d2faf0073e0f4cb31b8bdb2` |
| Janet | `34407f50-212d-476c-b667-8ab11b4c3b5d` | `penny-2026-10-31-janet-transparent-v1.png` | `0997327a9071e688f59c2b526302e61c38afd008` |
| Klaus | `21e0b642-9e85-4197-937c-5cd9ef373dde` | `penny-2026-10-31-klaus-transparent-v1.png` | `6616ac669198d2c4947e2591532f9552214d1910` |
| Luis | `e7397ed4-e064-480e-926c-6d159e40acbd` | `penny-2026-10-31-luis-transparent-v1.png` | `ee911f5d9151ec8fadcb1dffde1545b8c2dc0cf1` |

## Completed Elsie portraits: Girls 1, 2 and 3

After approving Girl 2 on the live site, the owner completed and supplied the
other two transparent Photoshop exports for the same treatment. Both are
1254 × 1254 RGBA PNGs and are copied unchanged:

- Girl 1: `public/puppies/elsie-girl1-profile.png`, document
  `6e181ad7-3340-4b2f-ba61-91fbd9155ca0`, route `/puppies/girl-1-1`.
- Girl 3: `public/puppies/elsie-girl3-profile.png`, document
  `54a22bbc-7966-437e-8c0e-0fff6c4d1e8e`, route `/puppies/girl-3-1`.

These use the approved generated concepts with natural-looking nail cleanup,
followed by the owner's Photoshop masks and lowermost wrist/torso fade.
Both retain their existing Reserved status and original Sanity records.
The existing shared card/detail presentation and website shadow apply without
layout changes. Girl 2's approved export and the homepage hero remain intact.
All three exact puppy/source-image guards yield to newer CMS photographs.

## Current version: approved Photoshop export v2

The owner approved `elsie-girl2-profile-v2.png` and requested proceeding with
Girl 2's homepage card, Available Puppies card, and detail page. This supersedes
the first pilot's detail-only scope below. The homepage hero remains unchanged.

- The supplied 1254 × 1254 RGBA PNG is copied unchanged to
  `public/puppies/elsie-girl2-profile-v2.png`.
- It was made from the owner's preferred generated concept and finished in
  Photoshop with a layer mask and a transparent bottom/right wrist fade.
  This is not represented as a pixel-identical edit of the original puppy.
- The exact puppy/source-image matching guard remains, so a newer Sanity
  photograph takes precedence. No Sanity record or schema is changed.
- Both card contexts and the detail page use the same asset and shared
  `.puppy-ground-shadow` CSS. The shadow is separate from the PNG.
- Cards preserve their approved 4:3 image area. A centered square stage fits
  the whole PNG inside it without cropping the ears or outstretched paws.
- The small straight edge at the lower-left wrist remains a review item at
  actual display size. Original exports and the owner's editable PSD remain.

## First pilot (superseded)

The owner requested putting the first Photoshop export on the website before
processing the other two puppies. This authorizes this focused photo release.

- Asset: `public/puppies/elsie-girl2-profile-transparent.png`, the supplied
  2048 × 2048 RGBA export, copied without editing or recompression.
- Puppy: Elsie's October 17, 2026 cream-and-white Girl 2, document
  `136dcb97-3aaf-41dd-9a5d-b5fe194d629e`, route `/puppies/girl-2-1`.
- The detailed fur mask and soft bottom/right hand fade are in the PNG.
  The owner's editable Photoshop PSD remains their master.
- The website supplies a separate faint warm-brown elliptical shadow beneath
  the cutout. Do not use a rectangular box shadow or outline the hands/fur.
- The cutout shows through to the existing page background. Existing page
  composition, information, pricing and inquiry behavior remain intact.
- Homepage hero, listing cards, all other puppy photos and Sanity records stay
  unchanged. No schema or write-token change is needed for this first pilot.
- `lib/puppy-portraits.ts` associates this approved asset with the exact puppy
  ID and original source image URL. A subsequent CMS photo change takes
  precedence, preventing the older infant portrait from hiding a newer photo.

Evaluate this first profile before deciding how to manage future approved
cutouts in Sanity or expanding the treatment to listing cards.
