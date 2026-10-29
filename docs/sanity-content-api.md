# Targeted Sanity copy commands

Target is pinned to project `3glz6dkx`, dataset `production`. `scripts/sanity-content.mjs` is a local command, not a public endpoint or new service. The helper intentionally allows only public copy fields, not prices, statuses, customers or financial records.

Use an existing secure process environment `SANITY_CONTENT_TOKEN` (or the existing `SANITY_API_WRITE_TOKEN`/`SANITY_AUTH_TOKEN`). On this Windows computer, `--cli-login` can instead reuse the existing official Sanity CLI login in the user's private configuration. Tokens are never arguments, logged output, checked-in configuration or Preview content. Do not paste them into chat.

Read-only commands from the repository:

```powershell
node scripts/sanity-content.mjs check --cli-login
node scripts/sanity-content.mjs list --type siteSettings --cli-login
node scripts/sanity-content.mjs read --id 2cbf546c-550a-4cd0-8fb5-b7719f1c0c9c --cli-login
```

`check` verifies authenticated reads and reports available role evidence without printing the account identity or token. The existing account's Administrator role was verified; no actual write was attempted. A future least-privilege replacement credential should have read/update permission for the intended public content in this dataset only, with no project administration or operational-record access. If custom roles are unavailable, Editor is broader than necessary; discuss that tradeoff before provisioning. This task did not create a token.

For a **future separately authorized update**, put an explicit input JSON outside the repository:

```json
{"updates":[{"id":"PUBLISHED_DOCUMENT_ID","set":{"homepageIntro":"Exact owner-approved replacement copy"}}]}
```

Prepare a new, non-overwriting plan file (read-only):

```powershell
node scripts/sanity-content.mjs plan --input C:/private-copy-change.json --out C:/private-reviewed-plan.json --cli-login
```

The plan displays only the affected fields, their existing values, exact replacements/unsets, original revisions and a digest. Review those exact values and obtain approval for that change. **Do not run apply under the current Preview-only authorization.** After separate explicit authorization:

```powershell
node scripts/sanity-content.mjs apply --plan C:/private-reviewed-plan.json --approve REVIEWED_DIGEST --cli-login
```

Apply validates the target, digest, field allowlist and every revision, then submits one atomic transaction with per-document revision guards. It patches only the requested fields on explicit published IDs. Draft/version/private IDs and financial/status fields are rejected. It never publishes, removes or replaces an unrelated draft. Results are read back and checked. A revision conflict requires a newly reviewed plan; uncertain responses/readback differences require inspection, not blind retries. Keep plans private and out of Git.

Unit tests use fictional clients only to verify transactions, conflicts, changed-plan rejection, forbidden fields, draft preservation and readback. No test mutation was made against Production.
