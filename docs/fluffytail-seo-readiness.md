# FluffyTail SEO readiness review

2026-10-28. Isolated branch `codex/seo-readiness`, based on clean `main` at `b9a6ade`. No production publication, CMS mutation, tracking activation, authentication, payment or messaging change is part of this patch. Original checkout and approved image files are preserved.

## Changes prepared

- All 11 sitemap-listed static pages now declare their own absolute canonical, Open Graph URL/title/description, Twitter title/description and existing approved homepage photograph. Existing titles and descriptions remain the source for those pages.
- Puppy metadata uses the published name, breed, litter, birth date, sex, color and recorded status instead of inheriting the homepage description. Litter context distinguishes repeated names. Historical profiles explicitly identify past-litter status and remain indexable; slugs and sitemap membership are unchanged.
- Puppy shares use the same approved portrait-selection guard as the visible page, yielding to a newer CMS photo. Missing photos do not fall back to a different puppy's picture.
- The homepage emits minimal `Organization` JSON-LD: name, production URL and approved logo only. Puppy pages emit `BreadcrumbList` for Home → Our puppies → the profile, matching existing navigation. CMS strings are safely serialized. There are no invented ratings, street addresses, awards, health claims, offers or Product rich-result promises.
- Approved local hero and puppy PNG files use Next Image responsive delivery. Clean original Sanity image URLs use width-only CDN variants without cropping, added backgrounds or upscaling. Custom transformed/external URLs retain their existing behavior. No CSS, original image bytes, photo identity, status or price changes.
- Analytics findings and a future consent/installation proposal are in [fluffytail-analytics-readiness.md](./fluffytail-analytics-readiness.md). This patch leaves tracking unchanged.

## Baseline supplied by coordinating audit

These are pre-change observations, not measurements of this branch:

- 34 sitemap URLs returned 200 with self-canonicals and one H1. 23 puppy pages reused the homepage description; some short titles repeated; puppy pages inherited homepage social metadata; no share images or JSON-LD.
- Three homepage puppy PNG sources total 5,245,447 bytes, with no responsive srcset. The original two-puppy hero is 442,139 bytes.
- [PageSpeed mobile report](https://pagespeed.web.dev/analysis/https-www-fluffytailshihtzu-com/psfmjkddhn?form_factor=mobile): Performance 79, Accessibility/Best Practices/SEO 100; lab LCP 5.0 s, FCP 2.3 s, CLS 0, TBT 0 on Moto G / slow 4G; estimated image savings 5,471 KiB, render-blocking 1,520 ms and total payload 16,000 KiB. CrUX field data was unavailable; this is not a field Core Web Vitals pass.
- Search Console July 27–October 26: 40 clicks, 781 impressions. October 22 indexing snapshot: 16 indexed, 15 excluded (3 redirects, 1 alternate, 10 discovered, 1 crawled). Sitemap last read October 10 contained 22 URLs; coordinator resubmitted the current sitemap at 15:37 UTC October 28.

## Deferred decisions and release checks

- Production merge/release is separate. Recheck current main and any concurrent admin work before merging. A draft is not publication approval.
- Confirm canonical apex → www redirect should be permanent, then change the authoritative Vercel/domain configuration with separate authorization. Current observed 307 is left unchanged; adding a competing code redirect could create loops or conflict with platform configuration.
- Static sitemap `lastModified` currently uses request/build time. Replace with meaningful per-page modification dates in a follow-up after choosing an auditable source; do not fabricate dates or blanket-remove historical puppies.
- The Adobe font stylesheet is render blocking. Investigate the licensed kit and measured font behavior separately; preserve approved typography and do not redistribute proprietary fonts.
- Repeated puppy names lacking both litter and birth-date context cannot be reliably disambiguated from public facts. Review CMS completeness rather than inventing identities or altering slugs.
- Responsive local images use the existing Next/Vercel optimizer. Review existing image-optimization quota and compare real delivery after an approved Preview; no paid plan or service change is authorized here.
- Validate rendered Organization/Breadcrumb markup in Google's Rich Results Test after an approved reachable Preview, then inspect representative URLs in Search Console after release. Structured data does not guarantee a search appearance.
- Repeat the same mobile PageSpeed conditions after release and monitor field data when available. Do not equate reduced image bytes with a measured LCP or ranking improvement.

## Local verification

- Final `npm test` passed **267/267** using fixture providers. The initial sandbox run's existing Windows encrypted-store temporary-file rename failure cleared when the suite ran outside the sandbox; no production integration was exercised.
- `npm run build` passed with Next.js 16.2.1/Turbopack, using only public `gu1xkpsg/synthetic` configuration and `VERCEL_ENV=preview`; 30 static pages generated. No live credentials. The Windows sandbox compile stalled; the same build completed outside that sandbox in 56 seconds compilation plus TypeScript/static generation.
- `npm run typecheck` passed. `npm run lint` passed with 13 existing image warnings in unchanged image implementations and no errors.
- Targeted metadata/image/portrait/brand tests passed (22), including preserved original asset hashes, portrait identity/update fallback, historical availability, omitted missing photos, matching social metadata, escaped JSON-LD and CSS-controlled dimensions for non-square CMS images.
- Local browser inspection used the existing public synthetic inventory. Homepage and puppy detail checked at desktop and 390px mobile; no horizontal overflow. A non-square 2048×1984 CMS image retained a square, `object-fit:contain` stage (approximately 549×549 desktop and 335×335 mobile). Canonical, Open Graph and breadcrumb values were inspected in rendered DOM. The mobile hero selected a 640px optimized source, desktop 1920px.
- Actual localhost optimizer responses at `w=640&q=75`, with `Accept: image/webp`, returned 200 and 640×640 WebP with alpha for all three approved cutouts: Girl 1 **46,276 bytes**, Girl 2 **40,102 bytes**, Girl 3 **63,664 bytes**. Total **150,042 bytes**, about **97.1% smaller** than the 5,245,447-byte originals. This is an image-response comparison at one size/format, not a page-payload, Lighthouse or LCP benchmark. Original files are unchanged.
- Browser screenshots and response evidence are retained outside the repository in the task's `seo-evidence` folder. Browser extension overlays are present in screenshots and are not part of this application.

## Implementation references

Framework behavior checked against the installed Next.js 16.2.1 metadata, JSON-LD and Image documentation. Public guidance: [Google Organization](https://developers.google.com/search/docs/appearance/structured-data/organization), [Google Breadcrumbs](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb), [Sanity image transformations](https://www.sanity.io/docs/apis-and-sdks/image-urls).
