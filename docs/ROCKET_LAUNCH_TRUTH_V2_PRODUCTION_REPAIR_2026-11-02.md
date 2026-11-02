# Launch Truth v2 Production Reliability Fix
November 2, 2026

## Production defect observed
After Launch Truth v2 merged, the public evidence API reported 105 active records and an overdue source observation. The LL2 primary group returned exactly 100 rows but reported `count:256`, meaning 156 future records were outside that result page. The other provider group returned 9 records with 5 accepted. The live application correctly reported an incomplete/truncated group and stale evidence; it did not invent a GO state.

## Official provider limits
Launch Library v2.3 documents an anonymous API allowance of 15 requests/hour and `limit` up to 100 on its upcoming-list endpoint. It supports `net__lte`, `offset`, and the per-response `count` and `next` pagination fields. In a direct check on Nov 2, the primary coast group's count was 7 within 45 days and 68 through March 2 (~120 days), versus 256 with no date limit.

## Repair
1. Restrict frequent launch-planning observations to the next **120 days** with server-side `net__lte`. This bounds the operational schedule without asserting the far-future catalog is complete. If the scoped provider count grows beyond the first 100 records, keep the group explicitly `truncated`; do not silently erase missing records or misrepresent a count as a scrub.
2. Preserve the existing signed GitHub Actions source watch with its 15-minute nominal trigger and Postgres lease.
3. Add a second, authenticated Vercel Cron trigger `GET /api/rocket-launch-refresh` on minutes 8, 23, 38, 53. Vercel injects `Authorization: Bearer <CRON_SECRET>` when the project has a configured CRON_SECRET. The endpoint refuses requests if that variable is absent or the bearer is incorrect, using timing-safe comparison. It never bypasses GitHub OIDC on the official KSC monitoring endpoint.
4. The fallback calls **the same** `runNationalWatch` and uses the same Postgres lease and 28-minute minimum collector cadence. No parallel extra LL2 pulls are intentionally introduced. It derives the Florida schedule and Launch Truth enrichment from precisely that shared observation. Both live public visitor endpoints remain read-only from Postgres.
5. Set function maxDuration=35 and source regression tests for auth, source coverage, shared-state derivation, and fail-closed behavior.

## Verification criteria
- Cron endpoint GET without CRON_SECRET returns 401 and makes zero upstream calls; non-GET always returns 405.
- Scheduled Postgres source checks include the 120-day filter and never claim coverage beyond it.
- Both sources can report complete within the scoped horizon; truncation is visible if count exceeds returned records.
- After first production trigger, public national and Florida source observation timestamps advance and are genuinely recent; no HTTP-200-only success claims.
- Existing Google SEO, Open Graph, canonical, official weather and site access checks pass before merge.
- If CRON_SECRET is missing in production, do not call the cron healthy; update or verify the secret using the existing Vercel project admin before relying on this path.

## Caveat
The 120-day decision horizon does **not** include all 256 long-range placeholder and far-future records; that's deliberate and displayed honestly. A separate, slower long-range archive collector could eventually cover the rest with pagination and an independent quota budget. This fix instead makes the time-sensitive experience useful while maintaining the anonymous API allowance.
