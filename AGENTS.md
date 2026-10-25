# FluffyTail Codex Rules

FluffyTail Shih Tzu is a production Next.js and Sanity site for a small breeder. Treat this repo as the source for website code, and treat GitHub as the source of truth for reviewable changes.

## Working Rules

- Keep edits surgical. Do not redesign pages, flows, or content strategy unless explicitly asked.
- Do not touch live Stripe, Twilio, Tally, Sanity write, or Vercel deployment behavior without explicit instruction.
- Prefer read-only mapping first: inspect routes, schemas, API handlers, and public pages before changing code.
- Preserve existing customer-facing copy and legal/SMS consent language unless the task is specifically about those pages.
- Never commit secrets, tokens, Vercel project metadata, `.env*`, or `.vercel`.
- Sanity documents are operational data. Avoid schema or write-token changes unless the task requires them.
- Payment and messaging flows are high risk. Use test mode, mocks, or local stubs unless the user explicitly authorizes live behavior.

## Stack

- Next.js App Router, React, TypeScript, Tailwind/global CSS.
- Sanity CMS and embedded Studio at `/studio`.
- Vercel deployment target with `www.fluffytailshihtzu.com` as the public production domain.
- Stripe for deposit, payment, invoice, and webhook handling.
- Twilio for SMS/MMS inbound and outbound customer messaging.
- Native Next.js puppy inquiry and waitlist forms, Sanity storage and existing Twilio operator alerts. Tally is retired on the Phase 1 release branch; preserve historical submissions.
- New operational records must use authenticated-only `private.<kind>.<hash>` document IDs via `sanity/lib/private-records.ts`. Do not migrate historical records or change dataset visibility without explicit approval.

## Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## Next.js Note

This repo uses a modern Next.js version. Before changing framework behavior, routing, metadata, caching, middleware/proxy, or server actions, read the local Next.js docs in `node_modules/next/dist/docs/` if dependencies are installed.
